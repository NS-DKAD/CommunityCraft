import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/projects";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://communitycraft.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const { projects } = await getProjects();
    const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
      url: `${baseUrl}/projects/${project.slug || project.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...projectRoutes];
  } catch {
    return staticRoutes;
  }
}
