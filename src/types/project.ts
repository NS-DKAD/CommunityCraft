export type ProjectCategory =
  | "Tools"
  | "Mods"
  | "Shaders"
  | "Rendering & Assets"
  | "Libraries";

export type ProjectStatus =
  | "Proposed"
  | "Seeking collaborators"
  | "In development"
  | "Completed"
  | "Inactive";

export type ProjectSourceType = "official" | "community" | "external" | "unverified";

export interface Project {
  id: string;
  slug?: string;
  name: string;
  author: string;
  description: string;
  category: ProjectCategory;
  tags: string[];
  githubUrl: string | null;
  stars: number;
  lastUpdated: string;
  license: string;
  isDemo: boolean;
  goal?: string | null;
  status?: ProjectStatus | null;
  sourceType?: ProjectSourceType | null;
  sourceVerified?: boolean | null;
  discussionUrl?: string | null;
  websiteUrl?: string | null;
}
