import React from "react";
export const revalidate = 60; // ISR: cache catalog for 60 seconds
import { getProjects } from "@/lib/projects";
import { buildDiscoverTagOptions, type DiscoverTagRecord } from "@/lib/discover-tags";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProjectCatalog } from "./ProjectCatalog";

async function loadPublicTagFilters(projects: Awaited<ReturnType<typeof getProjects>>["projects"], source: string) {
  if (source === "demo") {
    const counts = new Map<string, number>();
    for (const project of projects) for (const name of new Set(project.tags)) counts.set(name, (counts.get(name) ?? 0) + 1);
    return Array.from(counts, ([name, count]) => ({
      id: name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name,
      display_name: null, color: null, is_active: true, count,
    }));
  }
  const projectIds = projects.map((project) => project.id);
  if (source !== "database" || !projectIds.length || !isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data: associations, error: associationError } = await supabase
    .from("project_tags").select("project_id, tag_id").in("project_id", projectIds);
  if (associationError || !associations?.length) return [];
  const tagIds = Array.from(new Set(associations.map((row) => row.tag_id)));
  let { data: catalog, error: catalogError } = await supabase
    .from("tags")
    .select("id, slug, name, display_name, color, is_active")
    .in("id", tagIds)
    .eq("is_active", true);
  if (catalogError) {
    // Keep Discover usable before the optional presentation migration is applied.
    const legacyCatalog = await supabase.from("tags").select("id, slug, name, is_active").in("id", tagIds).eq("is_active", true);
    catalog = legacyCatalog.data?.map((tag) => ({ ...tag, display_name: null, color: null })) ?? null;
    catalogError = legacyCatalog.error;
  }
  if (catalogError || !catalog) return [];
  return buildDiscoverTagOptions(catalog as DiscoverTagRecord[], associations, projectIds);
}

export async function ProjectCatalogServer({ initialQuery = "" }: { initialQuery?: string }) {
  const { projects, source, errorMessage } = await getProjects();
  const tagFilters = await loadPublicTagFilters(projects, source);

  return (
    <ProjectCatalog
      initialProjects={projects}
      dataSource={source}
      errorMessage={errorMessage}
      initialQuery={initialQuery}
      tagFilters={tagFilters}
    />
  );
}
