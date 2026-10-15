import { Project } from "@/types/project";
import { DEMO_PROJECTS } from "@/data/demo-projects";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client";

export type ProjectDataSource = "database" | "demo" | "error";

export interface GetProjectsResult {
  projects: Project[];
  source: ProjectDataSource;
  errorMessage?: string;
}

/**
 * Retrieves projects from Supabase if configured and reachable.
 * If Supabase is not configured, gracefully falls back to the typed demo dataset.
 * If Supabase is configured but the query fails, explicitly returns source: "error"
 * so that errors are not silently masked as genuine live projects.
 */
export async function getProjects(): Promise<GetProjectsResult> {
  if (!isSupabaseConfigured()) {
    return {
      projects: DEMO_PROJECTS,
      source: "demo",
    };
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        projects: DEMO_PROJECTS,
        source: "error",
        errorMessage: "Supabase client initialization failed.",
      };
    }

    const { data, error } = await supabase
      .from("projects_with_stats")
      .select("*")
      .eq("is_approved", true)
      .order("stars", { ascending: false });

    if (error) {
      console.error(
        "[CommunityCraft] Supabase query failed:",
        error.message
      );
      return {
        projects: DEMO_PROJECTS,
        source: "error",
        errorMessage: `Supabase query error: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        projects: [],
        source: "database",
      };
    }

    const projects: Project[] = data.map((row) => {
      const sourceDate = row.last_github_commit_at
        ? new Date(row.last_github_commit_at)
        : new Date(row.updated_at);

      const normalizedStatus =
        row.status === "Proposed" ||
        row.status === "Seeking collaborators" ||
        row.status === "In development" ||
        row.status === "Completed" ||
        row.status === "Inactive"
          ? row.status
          : null;

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        author: row.author,
        description: row.description,
        category: row.category,
        tags: Array.isArray(row.tags) ? row.tags : [],
        githubUrl: row.githubUrl ?? null,
        stars: typeof row.stars === "number" ? row.stars : 0,
        lastUpdated: Number.isNaN(sourceDate.getTime())
          ? new Date().toISOString().split("T")[0]
          : sourceDate.toISOString().split("T")[0],
        license: row.license || "MIT",
        isDemo: false,
        goal: row.goal ?? null,
        status: normalizedStatus,
        sourceType:
          row.source_type === "official" ||
          row.source_type === "community" ||
          row.source_type === "external" ||
          row.source_type === "unverified"
            ? row.source_type
            : null,
        sourceVerified:
          typeof row.source_verified === "boolean" ? row.source_verified : null,
        discussionUrl: row.discussion_url ?? null,
        websiteUrl: row.website_url ?? null,
      };
    });

    return {
      projects,
      source: "database",
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown network or database error";
    console.error(
      "[CommunityCraft] Unexpected error fetching projects from Supabase:",
      message
    );
    return {
      projects: DEMO_PROJECTS,
      source: "error",
      errorMessage: `Database connection failure: ${message}`,
    };
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_PROJECTS.find((project) => project.slug === slug) ?? null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects_with_stats")
    .select("*")
    .eq("is_approved", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[CommunityCraft] Failed to fetch project by slug:", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data;
  const sourceDate = row.last_github_commit_at
    ? new Date(row.last_github_commit_at)
    : new Date(row.updated_at);

  const normalizedStatus =
    row.status === "Proposed" ||
    row.status === "Seeking collaborators" ||
    row.status === "In development" ||
    row.status === "Completed" ||
    row.status === "Inactive"
      ? row.status
      : null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    author: row.author,
    description: row.description,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    githubUrl: row.githubUrl ?? null,
    stars: typeof row.stars === "number" ? row.stars : 0,
    lastUpdated: Number.isNaN(sourceDate.getTime())
      ? new Date().toISOString().split("T")[0]
      : sourceDate.toISOString().split("T")[0],
    license: row.license || "MIT",
    isDemo: false,
    goal: row.goal ?? null,
    status: normalizedStatus,
    sourceType:
      row.source_type === "official" ||
      row.source_type === "community" ||
      row.source_type === "external" ||
      row.source_type === "unverified"
        ? row.source_type
        : null,
    sourceVerified:
      typeof row.source_verified === "boolean" ? row.source_verified : null,
    discussionUrl: row.discussion_url ?? null,
    websiteUrl: row.website_url ?? null,
  };
}

export async function getSimilarProjects(project: Project, limit = 4): Promise<Project[]> {
  if (!project.slug) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return DEMO_PROJECTS.filter((candidate) => {
      if (candidate.slug === project.slug) {
        return false;
      }

      const sharedTags = new Set(
        (candidate.tags ?? []).map((tag) => tag.toLowerCase())
      );
      const overlap = (project.tags ?? []).filter((tag) => sharedTags.has(tag.toLowerCase())).length;

      return overlap > 0 || candidate.category === project.category;
    }).slice(0, limit);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects_with_stats")
    .select("*")
    .eq("is_approved", true)
    .neq("slug", project.slug)
    .order("stars", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[CommunityCraft] Failed to fetch similar projects:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const currentTags = new Set((project.tags ?? []).map((tag) => tag.toLowerCase()));

  const scored = data
    .map((row) => {
      const candidate = mapProjectRow(row);
      const candidateTags = new Set((candidate.tags ?? []).map((tag) => tag.toLowerCase()));
      const overlap = (project.tags ?? []).filter((tag) => candidateTags.has(tag.toLowerCase())).length;
      let score = overlap * 3;

      if (candidate.category === project.category) {
        score += 2;
      }

      if (candidate.status === project.status && candidate.status) {
        score += 1;
      }

      return { candidate, score };
    })
    .filter(({ candidate }) => candidate.slug !== project.slug)
    .sort((a, b) => b.score - a.score || b.candidate.stars - a.candidate.stars)
    .map(({ candidate }) => candidate)
    .slice(0, limit);

  if (scored.length > 0) {
    return scored;
  }

  return data
    .map((row) => mapProjectRow(row))
    .filter((candidate) => candidate.slug !== project.slug)
    .slice(0, limit);
}

function mapProjectRow(row: Record<string, unknown>): Project {
  const sourceDate = row.last_github_commit_at
    ? new Date(String(row.last_github_commit_at))
    : new Date(String(row.updated_at));

  const normalizedStatus =
    row.status === "Proposed" ||
    row.status === "Seeking collaborators" ||
    row.status === "In development" ||
    row.status === "Completed" ||
    row.status === "Inactive"
      ? (String(row.status) as Project["status"])
      : null;

  const normalizedSourceType =
    row.source_type === "official" ||
    row.source_type === "community" ||
    row.source_type === "external" ||
    row.source_type === "unverified"
      ? (String(row.source_type) as Project["sourceType"])
      : null;

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    author: String(row.author),
    description: String(row.description),
    category: (row.category as Project["category"]) || "Tools",
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : [],
    githubUrl: typeof row.githubUrl === "string" ? row.githubUrl : null,
    stars: typeof row.stars === "number" ? row.stars : 0,
    lastUpdated: Number.isNaN(sourceDate.getTime())
      ? new Date().toISOString().split("T")[0]
      : sourceDate.toISOString().split("T")[0],
    license: typeof row.license === "string" ? row.license : "MIT",
    isDemo: false,
    goal: typeof row.goal === "string" ? row.goal : null,
    status: normalizedStatus,
    sourceType: normalizedSourceType,
    sourceVerified:
      typeof row.source_verified === "boolean" ? row.source_verified : null,
    discussionUrl: typeof row.discussion_url === "string" ? row.discussion_url : null,
    websiteUrl: typeof row.website_url === "string" ? row.website_url : null,
  };
}
