export type ProjectCategory =
  | "Tools"
  | "Mods"
  | "Shaders"
  | "Rendering & Assets"
  | "Libraries";

export interface Project {
  id: string;
  name: string;
  author: string;
  description: string;
  category: ProjectCategory;
  tags: string[];
  githubUrl: string;
  stars: number;
  lastUpdated: string;
  license: string;
  isDemo: boolean;
}
