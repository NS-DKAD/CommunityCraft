export const PROJECT_CATEGORIES = [
  "Tools",
  "Mods",
  "Shaders",
  "Rendering & Assets",
  "Libraries",
  "Software",
  "Website",
  "Plugin",
  "Games",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type ProjectStatus =
  | "Proposed"
  | "Seeking collaborators"
  | "In development"
  | "Completed"
  | "Inactive";

export type ProjectSourceType = "official" | "community" | "external" | "unverified";

export type ReplacementLevel = "Complete" | "Partial" | "Specialized";

export interface ProjectReplacement {
  applicationId: string;
  applicationName: string;
  applicationSlug: string;
  level: ReplacementLevel;
}

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
  replacing?: ProjectReplacement[];
}
