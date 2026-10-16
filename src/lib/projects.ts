import { Project, ProjectCategory, ProjectReplacement } from "@/types/project";
import { DEMO_PROJECTS } from "@/data/demo-projects";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client";
import { matchesReplacementApplication } from "./replacements";

export type ProjectDataSource = "database" | "demo" | "error";

export interface GetProjectsResult {
  projects: Project[];
  source: ProjectDataSource;
  errorMessage?: string;
}

function normalizeLegacyTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const normalized = rawTags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
}

export function normalizeProjectTags(rawTags: unknown): string[] {
  if (Array.isArray(rawTags)) {
    return normalizeLegacyTags(rawTags);
  }

  if (!rawTags || typeof rawTags !== "object") {
    return [];
  }

  const values = Object.values(rawTags as Record<string, unknown>);
  return normalizeLegacyTags(values);
}

export function scoreSimilarProject(
  project: Pick<Project, "category" | "status" | "tags">,
  candidate: Pick<Project, "category" | "status" | "tags" | "slug">
): {
  overlap: number;
  categoryMatch: boolean;
  statusMatch: boolean;
  score: number;
} {
  const projectTags = new Set(
    (project.tags ?? []).map((tag) => tag.trim().toLowerCase())
  );
  const candidateTags = new Set(
    (candidate.tags ?? []).map((tag) => tag.trim().toLowerCase())
  );

  const overlap = [...projectTags].filter((tag) => candidateTags.has(tag)).length;
  const categoryMatch = candidate.category === project.category;
  const statusMatch =
    Boolean(project.status) &&
    Boolean(candidate.status) &&
    project.status === candidate.status;

  const score =
    overlap * 12 +
    (categoryMatch ? 4 : 0) +
    (statusMatch ? 1 : 0);

  return { overlap, categoryMatch, statusMatch, score };
}

export async function loadProjectTagNamesByProjectId(
  projectIds: string[]
): Promise<{ tagNamesByProjectId: Map<string, string[]>; readSucceeded: boolean }> {
  const map = new Map<string, string[]>();

  if (projectIds.length === 0 || !isSupabaseConfigured()) {
    return { tagNamesByProjectId: map, readSucceeded: false };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { tagNamesByProjectId: map, readSucceeded: false };
  }

  const uniqueProjectIds = Array.from(new Set(projectIds.filter(Boolean)));
  if (uniqueProjectIds.length === 0) {
    return { tagNamesByProjectId: map, readSucceeded: true };
  }

  const { data: projectTagRows, error: projectTagError } = await supabase
    .from("project_tags")
    .select("project_id, tag_id")
    .in("project_id", uniqueProjectIds);

  if (projectTagError) {
    console.error("[CommunityCraft] Failed to fetch normalized project tags:", projectTagError.message);
    return { tagNamesByProjectId: map, readSucceeded: false };
  }

  if (!projectTagRows || projectTagRows.length === 0) {
    return { tagNamesByProjectId: map, readSucceeded: true };
  }

  const tagIds = Array.from(
    new Set(
      projectTagRows
        .map((row) => (typeof row.tag_id === "string" ? row.tag_id : String(row.tag_id ?? "")))
        .filter(Boolean)
    )
  );

  if (tagIds.length === 0) {
    return { tagNamesByProjectId: map, readSucceeded: true };
  }

  const { data: tagRows, error: tagError } = await supabase
    .from("tags")
    .select("id, name")
    .in("id", tagIds);

  if (tagError) {
    console.error("[CommunityCraft] Failed to fetch normalized tag names:", tagError.message);
    return { tagNamesByProjectId: map, readSucceeded: false };
  }

  const tagNameById = new Map<string, string>();
  for (const tag of tagRows ?? []) {
    const tagId = typeof tag.id === "string" ? tag.id : String(tag.id ?? "");
    const tagName = typeof tag.name === "string" ? tag.name.trim() : "";
    if (tagId && tagName) {
      tagNameById.set(tagId, tagName);
    }
  }

  for (const row of projectTagRows) {
    const projectId = typeof row.project_id === "string" ? row.project_id : String(row.project_id ?? "");
    const tagId = typeof row.tag_id === "string" ? row.tag_id : String(row.tag_id ?? "");
    if (!projectId || !tagId) {
      continue;
    }

    const tagName = tagNameById.get(tagId);
    if (!tagName) {
      continue;
    }

    const existingTags = map.get(projectId) ?? [];
    map.set(projectId, Array.from(new Set([...existingTags, tagName])));
  }

  return { tagNamesByProjectId: map, readSucceeded: true };
}

export function resolveProjectTags(
  projectId: string,
  legacyTags: unknown,
  normalizedTagNames: Map<string, string[]>,
  normalizedReadSucceeded: boolean
): string[] {
  const normalizedTags = normalizedTagNames.get(projectId);
  if (normalizedTags !== undefined) return normalizedTags;
  return normalizedReadSucceeded ? [] : normalizeProjectTags(legacyTags);
}

export function matchesProjectCategory(
  project: Pick<Project, "category">,
  selectedCategory: "All" | ProjectCategory
): boolean {
  return selectedCategory === "All" || project.category === selectedCategory;
}

export function matchesProjectQuery(
  project: Pick<Project, "name" | "author" | "description" | "tags" | "replacing">,
  query: string
): boolean {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return true;
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  const matchesName = project.name.toLowerCase().includes(normalizedQuery);
  const matchesAuthor = project.author.toLowerCase().includes(normalizedQuery);
  const matchesDescription = project.description.toLowerCase().includes(normalizedQuery);
  const matchesTags = project.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

  return matchesName || matchesAuthor || matchesDescription || matchesTags ||
    matchesReplacementApplication(project.replacing, normalizedQuery);
}

export async function loadProjectReplacementsByProjectId(
  projectIds: string[]
): Promise<Map<string, ProjectReplacement[]>> {
  const result = new Map<string, ProjectReplacement[]>();
  if (!projectIds.length || !isSupabaseConfigured()) return result;
  const supabase = getSupabaseClient();
  if (!supabase) return result;

  const { data: relationRows, error: relationError } = await supabase
    .from("project_replacements")
    .select("project_id, application_id, replacement_level")
    .in("project_id", Array.from(new Set(projectIds.filter(Boolean))));
  if (relationError) {
    console.error("[CommunityCraft] Failed to fetch project replacements:", relationError.message);
    return result;
  }
  if (!relationRows?.length) return result;

  const applicationIds = Array.from(new Set(relationRows.map((row) => row.application_id)));
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, name, slug")
    .in("id", applicationIds);
  if (applicationsError) {
    console.error("[CommunityCraft] Failed to fetch replacement applications:", applicationsError.message);
    return result;
  }
  const applicationById = new Map((applications ?? []).map((app) => [app.id, app]));
  for (const row of relationRows) {
    const app = applicationById.get(row.application_id);
    if (!app || (row.replacement_level !== "Complete" && row.replacement_level !== "Partial" && row.replacement_level !== "Specialized")) continue;
    const existing = result.get(row.project_id) ?? [];
    existing.push({
      applicationId: app.id,
      applicationName: app.name,
      applicationSlug: app.slug,
      level: row.replacement_level,
    });
    result.set(row.project_id, existing);
  }
  return result;
}

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

    const projectIds = data
      .map((row) => (typeof row.id === "string" ? row.id : String(row.id ?? "")))
      .filter(Boolean);
    const normalizedTagResult = await loadProjectTagNamesByProjectId(projectIds);
    const replacementMap = await loadProjectReplacementsByProjectId(projectIds);

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

      const projectId = typeof row.id === "string" ? row.id : String(row.id ?? "");
      const tags = resolveProjectTags(
        projectId,
        (row as Record<string, unknown>).tags,
        normalizedTagResult.tagNamesByProjectId,
        normalizedTagResult.readSucceeded
      );

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        author: row.author,
        description: row.description,
        category: row.category,
        tags,
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
        replacing: replacementMap.get(projectId) ?? [],
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

  const projectId = typeof row.id === "string" ? row.id : String(row.id ?? "");
  const normalizedTagResult = await loadProjectTagNamesByProjectId([projectId]);
  const replacementMap = await loadProjectReplacementsByProjectId([projectId]);
  const tags = resolveProjectTags(
    projectId,
    (row as Record<string, unknown>).tags,
    normalizedTagResult.tagNamesByProjectId,
    normalizedTagResult.readSucceeded
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    author: row.author,
    description: row.description,
    category: row.category,
    tags,
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
    replacing: replacementMap.get(projectId) ?? [],
  };
}

export async function getSimilarProjects(project: Project, limit = 4): Promise<Project[]> {
  if (!project.slug) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    const scored = DEMO_PROJECTS.filter((candidate) => candidate.slug !== project.slug)
      .map((candidate) => ({
        candidate,
        ...scoreSimilarProject(project, candidate),
      }))
      .filter(({ overlap, categoryMatch }) => overlap > 0 || categoryMatch)
      .sort((a, b) => b.score - a.score || b.candidate.stars - a.candidate.stars)
      .slice(0, limit)
      .map(({ candidate }) => candidate);

    if (scored.length > 0) {
      return scored;
    }

    return DEMO_PROJECTS.filter((candidate) => candidate.slug !== project.slug)
      .slice(0, limit);
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

  const projectIds = data
    .map((row) => (typeof row.id === "string" ? row.id : String(row.id ?? "")))
    .filter(Boolean);
  const normalizedTagResult = await loadProjectTagNamesByProjectId(projectIds);

  const scored = data
    .map((row) => {
      const candidateId = typeof row.id === "string" ? row.id : String(row.id ?? "");
      const candidate = mapProjectRow(row, resolveProjectTags(
        candidateId,
        row.tags,
        normalizedTagResult.tagNamesByProjectId,
        normalizedTagResult.readSucceeded
      ));
      const similarity = scoreSimilarProject(project, candidate);
      return { candidate, ...similarity };
    })
    .filter(({ candidate, overlap, categoryMatch }) => {
      const keep = candidate.slug !== project.slug && (overlap > 0 || categoryMatch);
      return keep;
    })
    .sort((a, b) => b.score - a.score || b.candidate.stars - a.candidate.stars)
    .map(({ candidate }) => candidate)
    .slice(0, limit);

  if (scored.length > 0) {
    return scored;
  }

  return data
    .map((row) => {
      const candidateId = typeof row.id === "string" ? row.id : String(row.id ?? "");
      return mapProjectRow(row, resolveProjectTags(
        candidateId,
        row.tags,
        normalizedTagResult.tagNamesByProjectId,
        normalizedTagResult.readSucceeded
      ));
    })
    .filter((candidate) => candidate.slug !== project.slug)
    .slice(0, limit);
}

function mapProjectRow(row: Record<string, unknown>, explicitTags?: string[]): Project {
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
    tags: explicitTags ?? normalizeProjectTags(row.tags ?? []),
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
    replacing: [],
  };
}
