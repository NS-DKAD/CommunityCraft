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
      // The database is connected, but the table contains 0 rows.
      return {
        projects: [],
        source: "database",
      };
    }

    const projects: Project[] = data.map((row) => ({
      id: row.slug || row.id,
      name: row.name,
      author: row.author,
      description: row.description,
      category: row.category,
      tags: Array.isArray(row.tags) ? row.tags : [],
      githubUrl: row.githubUrl,
      stars: typeof row.stars === "number" ? row.stars : 0,
      lastUpdated: row.last_github_commit_at
        ? new Date(row.last_github_commit_at).toISOString().split("T")[0]
        : new Date(row.updated_at).toISOString().split("T")[0],
      license: row.license || "MIT",
      isDemo: false,
    }));

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
