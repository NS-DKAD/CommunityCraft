import React from "react";
import { getProjects } from "@/lib/projects";
import { ProjectCatalog } from "./ProjectCatalog";

export async function ProjectCatalogServer({ initialQuery = "" }: { initialQuery?: string }) {
  const { projects, source, errorMessage } = await getProjects();

  return (
    <ProjectCatalog
      initialProjects={projects}
      dataSource={source}
      errorMessage={errorMessage}
      initialQuery={initialQuery}
    />
  );
}
