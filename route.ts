import { NextRequest, NextResponse } from "next/server";
import {
  validateSubmissionInput,
  fetchGitHubRepoMetadata,
  slugFromGitHubFullName,
} from "@/lib/submission";
import {
  getSupabaseServiceClient,
  isServiceClientConfigured,
} from "@/lib/supabase/server-client";
import { ProjectCategory } from "@/types/project";

// Rate limiting: simple in-memory map (sufficient for single-instance dev/preview).
// For production, replace with an edge-compatible store (e.g., Upstash Redis).
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 submissions per IP per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  // 1. Service client availability check
  if (!isServiceClientConfigured()) {
    return NextResponse.json(
      {
        error: "Submissions are not yet enabled on this instance.",
        detail:
          "The SUPABASE_SERVICE_ROLE_KEY environment variable is not configured. See SUPABASE_SETUP.md for instructions.",
      },
      { status: 503 }
    );
  }

  // 2. Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before submitting again." },
      { status: 429 }
    );
  }

  // 3. Parse and validate request body (server-side — never trust the client)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { githubUrl, description, category, tags } = body as Record<string, unknown>;

  const validation = validateSubmissionInput({
    githubUrl: typeof githubUrl === "string" ? githubUrl : undefined,
    description: typeof description === "string" ? description : undefined,
    category: typeof category === "string" ? (category as ProjectCategory) : undefined,
    tags: Array.isArray(tags) ? (tags as string[]) : [],
  });

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed.", fieldErrors: validation.errors },
      { status: 422 }
    );
  }

  const { normalizedUrl, owner, repo } = validation;

  // 4. Verify the repository exists on GitHub and is public
  const githubResult = await fetchGitHubRepoMetadata(owner!, repo!);

  if (!githubResult.ok) {
    return NextResponse.json(
      { error: githubResult.message },
      { status: githubResult.status === 404 ? 422 : 502 }
    );
  }

  const ghMeta = githubResult.data;

  if (ghMeta.isPrivate) {
    return NextResponse.json(
      { error: "Only public repositories can be submitted." },
      { status: 422 }
    );
  }

  if (ghMeta.isArchived) {
    return NextResponse.json(
      { error: "Archived repositories cannot be submitted." },
      { status: 422 }
    );
  }

  // 5. Connect to Supabase (service role — bypasses RLS for this insert)
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database connection is unavailable." },
      { status: 503 }
    );
  }

  // 6. Duplicate detection by github_url
  const { data: existingRows, error: lookupError } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("github_url", normalizedUrl!)
    .limit(1);

  if (lookupError) {
    console.error("[submit] Duplicate check failed:", lookupError.message);
    return NextResponse.json(
      { error: "Database error during duplicate check." },
      { status: 500 }
    );
  }

  if (existingRows && existingRows.length > 0) {
    return NextResponse.json(
      { error: "This repository has already been submitted.", slug: existingRows[0].slug },
      { status: 409 }
    );
  }

  // 7. Generate unique slug
  const baseSlug = slugFromGitHubFullName(ghMeta.fullName);
  let slug = baseSlug;
  let slugSuffix = 1;

  while (true) {
    const { data: slugCheck } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (!slugCheck || slugCheck.length === 0) break;
    slug = `${baseSlug}-${slugSuffix++}`;
  }

  // 8. Insert the project
  const cleanTags = (Array.isArray(tags) ? (tags as string[]) : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0);

  const { data: newProject, error: insertError } = await supabase
    .from("projects")
    .insert({
      slug,
      name: ghMeta.name,
      author_name: owner!,
      description: (description as string).trim(),
      category: category as ProjectCategory,
      tags: cleanTags,
      github_url: normalizedUrl!,
      is_approved: false, // All submissions start as pending review
    })
    .select("id, slug")
    .single();

  if (insertError || !newProject) {
    console.error("[submit] Insert failed:", insertError?.message);
    return NextResponse.json(
      { error: "Failed to save project. Please try again." },
      { status: 500 }
    );
  }

  // 9. Insert GitHub stats (best-effort; non-fatal if it fails)
  await supabase.from("project_github_stats").insert({
    project_id: newProject.id,
    stars: ghMeta.stars,
    forks: ghMeta.forks,
    open_issues: ghMeta.openIssues,
    license: ghMeta.license,
    default_branch: ghMeta.defaultBranch,
    last_github_commit_at: ghMeta.lastPushedAt,
    synced_at: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      message: "Project submitted successfully. It will appear in the catalog once reviewed.",
      slug: newProject.slug,
      name: ghMeta.name,
    },
    { status: 201 }
  );
}

// Reject non-POST methods explicitly
export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
