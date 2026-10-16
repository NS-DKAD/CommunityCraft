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
import { findUnknownApplicationIds, validateReplacementInput } from "@/lib/replacements";
import { getPersistenceHttpOutcome, persistProjectWithReplacements } from "@/lib/project-persistence";
import { resolveSubmissionTags } from "@/lib/tags";

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
  if (payload.tags !== undefined && (!Array.isArray(payload.tags) || payload.tags.some((tag) => typeof tag !== "string"))) {
    return NextResponse.json(
      { error: "Tags must be selected from the catalog.", fieldErrors: [{ field: "tags", message: "Choose tags from the existing catalog." }] },
      { status: 422 }
    );
  }
  const replacementValidation = validateReplacementInput(payload.replacements);
  if (!replacementValidation.valid) {
    return NextResponse.json(
      { error: replacementValidation.error ?? "Invalid replacement applications.", fieldErrors: [{ field: "replacements", message: replacementValidation.error ?? "Invalid replacement applications." }] },
      { status: 422 }
    );
  }
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

  const submittedTags = Array.isArray(tags) ? tags as string[] : [];
  let canonicalTags: Array<{ id: string; name: string; slug: string }> = [];
  if (submittedTags.length > 0) {
    const [{ data: tagRows, error: tagsError }, { data: aliasRows, error: aliasesError }] = await Promise.all([
      supabase.from("tags").select("id, name, slug").eq("is_active", true).limit(1000),
      supabase.from("tag_aliases").select("alias, tag_id").limit(1000),
    ]);
    if (tagsError || aliasesError) {
      console.error("[submit] Tag catalog lookup failed:", tagsError?.message ?? aliasesError?.message);
      return NextResponse.json({ error: "The tag catalog is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    const resolution = resolveSubmissionTags(
      submittedTags,
      (tagRows ?? []).map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
      (aliasRows ?? []).map((alias) => ({ alias: alias.alias, tagId: alias.tag_id }))
    );
    if (!resolution.valid) {
      return NextResponse.json(
        { error: "One or more selected tags are not in the approved catalog.", fieldErrors: [{ field: "tags", message: `Unknown tags: ${resolution.unknownTags.join(", ")}. Choose existing tags or ask a moderator to add them.` }] },
        { status: 422 }
      );
    }
    canonicalTags = resolution.tags;
  }

  if (replacementValidation.replacements.length > 0) {
    const applicationIds = replacementValidation.replacements.map((item) => item.applicationId);
    const { data: knownApplications, error: applicationError } = await supabase
      .from("applications")
      .select("id")
      .in("id", applicationIds);
    if (applicationError) {
      console.error("[submit] Application catalog lookup failed:", applicationError.message);
      return NextResponse.json({ error: "The application catalog is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    const unknownIds = findUnknownApplicationIds(replacementValidation.replacements, (knownApplications ?? []).map((application) => application.id));
    if (unknownIds.length > 0) {
      return NextResponse.json({ error: "One or more selected applications are not in the shared catalog. Refresh the form and choose existing applications." }, { status: 422 });
    }
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
  const cleanTags = canonicalTags.map((tag) => tag.slug);

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

  const persistence = await persistProjectWithReplacements({
    replacements: replacementValidation.replacements,
    hasTagAssociations: canonicalTags.length > 0,
    insertProject: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert(insertPayload)
        .select("id, slug")
        .single();
      return { project: data, error: error?.message ?? null };
    },
    insertReplacements: async (projectId, replacements) => {
      if (canonicalTags.length > 0) {
        const { error: tagInsertError } = await supabase.from("project_tags").insert(
          canonicalTags.map((tag) => ({ project_id: projectId, tag_id: tag.id }))
        );
        if (tagInsertError) return { error: tagInsertError.message };
      }
      if (replacements.length > 0) {
        const { error: replacementInsertError } = await supabase.from("project_replacements").insert(
          replacements.map((replacement) => ({
            project_id: projectId,
            application_id: replacement.applicationId,
            replacement_level: replacement.level,
          }))
        );
        if (replacementInsertError) return { error: replacementInsertError.message };
      }
      return { error: null };
    },
    deleteProject: async (projectId) => {
      const { data, error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select("id")
        .maybeSingle();
      return { deleted: Boolean(data), error: error?.message ?? null };
    },
  });

  const persistenceOutcome = getPersistenceHttpOutcome(persistence);
  if (!persistenceOutcome.received) {
    console.error("[submit] Project submission was not saved:", persistence.error);
    return NextResponse.json(
      { error: persistenceOutcome.message },
      { status: persistenceOutcome.status }
    );
  }

  const newProject = persistence.project;
  if (!newProject) {
    console.error("[submit] Persistence returned no project unexpectedly.");
    return NextResponse.json({ error: "The submission status could not be confirmed. Please contact a moderator before resubmitting." }, { status: 503 });
  }

  const persistenceWarning = persistence.kind === "saved-with-incomplete-relations";
  if (persistenceWarning) {
    console.error("[submit] Project was saved, but tag/replacement relations and cleanup failed:", {
      projectId: newProject.id,
      replacementError: persistence.error,
      cleanupError: persistence.cleanupError,
    });
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
      message: persistenceOutcome.message,
      slug: newProject.slug,
      name: insertPayload.name,
    },
    { status: persistenceOutcome.status }
  );
}

// Reject non-POST methods explicitly
export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
