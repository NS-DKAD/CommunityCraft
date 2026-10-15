import { NextRequest, NextResponse } from "next/server";
import {
  validateSubmissionInput,
  fetchGitHubRepoMetadata,
  slugFromGitHubFullName,
  slugFromText,
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

  const payload = body as Record<string, unknown>;
  const { name, goal, authorName, githubUrl, websiteUrl, discussionUrl, description, category, status, tags } = payload;

  const validation = validateSubmissionInput({
    name: typeof name === "string" ? name : undefined,
    goal: typeof goal === "string" ? goal : undefined,
    authorName:
      typeof authorName === "string"
        ? authorName
        : typeof payload.author_name === "string"
          ? payload.author_name
          : undefined,
    githubUrl: typeof githubUrl === "string" ? githubUrl : undefined,
    websiteUrl: typeof websiteUrl === "string" ? websiteUrl : undefined,
    discussionUrl: typeof discussionUrl === "string" ? discussionUrl : undefined,
    description: typeof description === "string" ? description : undefined,
    category: typeof category === "string" ? (category as ProjectCategory) : undefined,
    status: typeof status === "string" ? status : "Proposed",
    tags: Array.isArray(tags) ? (tags as string[]) : [],
  });

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed.", fieldErrors: validation.errors },
      { status: 422 }
    );
  }

  const normalizedUrl = validation.normalizedUrl;
  const normalizedWebsiteUrl = validation.normalizedWebsiteUrl;
  const normalizedDiscussionUrl = validation.normalizedDiscussionUrl;
  const owner = validation.owner;
  const repo = validation.repo;
  const projectName = (typeof name === "string" ? name.trim() : "").slice(0, 120) || "Untitled project";
  const projectGoal = typeof goal === "string" ? goal.trim() : "";
  const projectAuthorName = (
    typeof authorName === "string"
      ? authorName
      : typeof payload.author_name === "string"
        ? payload.author_name
        : ""
  ).trim() || "Community";
  const projectStatus = typeof status === "string" && status.trim() ? status.trim() : "Proposed";

  let githubMetadata: Awaited<ReturnType<typeof fetchGitHubRepoMetadata>> | null = null;
  let resolvedName = "";
  let resolvedSlug = "";

  // If a GitHub URL is provided, fetch and validate the repository metadata
  if (normalizedUrl && owner && repo) {
    githubMetadata = await fetchGitHubRepoMetadata(owner, repo);

    if (!githubMetadata.ok) {
      return NextResponse.json(
        { error: githubMetadata.message },
        { status: githubMetadata.status === 404 ? 422 : 502 }
      );
    }

    if (githubMetadata.data.isPrivate) {
      return NextResponse.json(
        { error: "Only public repositories can be submitted." },
        { status: 422 }
      );
    }

    if (githubMetadata.data.isArchived) {
      return NextResponse.json(
        { error: "Archived repositories cannot be submitted." },
        { status: 422 }
      );
    }

    resolvedName = githubMetadata.data.name;
    resolvedSlug = slugFromGitHubFullName(githubMetadata.data.fullName);
  }

  // 4. Connect to Supabase (service role — bypasses RLS for this insert)
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database connection is unavailable." },
      { status: 503 }
    );
  }

  // 5. If a GitHub URL is provided, check for duplicates in the database
  if (normalizedUrl) {
    const { data: existingRows, error: lookupError } = await supabase
      .from("projects")
      .select("id, slug")
      .eq("github_url", normalizedUrl)
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
  }

  // 6. Generate a unique slug for the project
  const safeName = (resolvedName || projectName || "project").trim();
  const baseSlug = resolvedSlug || slugFromText(safeName);
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

  // 7. Prepare tags and insert the new project into the database
  const cleanTags = (Array.isArray(tags) ? (tags as string[]) : [])
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => t.length > 0);

  const insertPayload = {
    slug,
    name: projectName,
    author_name: projectAuthorName,
    description: (description as string).trim(),
    goal: projectGoal || null,
    status: projectStatus,
    category: category as ProjectCategory,
    tags: cleanTags,
    github_url: normalizedUrl ?? null,
    website_url: normalizedWebsiteUrl ?? null,
    discussion_url: normalizedDiscussionUrl ?? null,
    is_approved: false,
  };

  const { data: newProject, error: insertError } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id, slug")
    .single();

  if (insertError || !newProject) {
    console.error("[submit] Insert failed:", insertError?.message);
    return NextResponse.json(
      { error: "Failed to save project. Please try again." },
      { status: 500 }
    );
  }

  // 8. If GitHub metadata was fetched, insert or update the GitHub stats
  if (githubMetadata) {
    await supabase.from("project_github_stats").insert({
      project_id: newProject.id,
      stars: githubMetadata.data.stars,
      forks: githubMetadata.data.forks,
      open_issues: githubMetadata.data.openIssues,
      license: githubMetadata.data.license,
      default_branch: githubMetadata.data.defaultBranch,
      last_github_commit_at: githubMetadata.data.lastPushedAt,
      synced_at: new Date().toISOString(),
    });
  }

  // 9. Return a success response with the new project's details
  return NextResponse.json(
    {
      message: "Project submitted successfully. It will appear in the catalog once reviewed.",
      slug: newProject.slug,
      name: insertPayload.name,
    },
    { status: 201 }
  );
}

// Reject non-POST methods explicitly
export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
