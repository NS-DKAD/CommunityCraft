export const PROJECT_CATEGORIES = [
  "Software",
  "Website",
  "Plugin",
  "Games",
  "Mods",
] as const;

export const HISTORICAL_PROJECT_CATEGORIES = ["Tools", "Shaders", "Rendering & Assets", "Libraries"] as const;

// Category names are database-managed. This remains a string so projects can
// retain historical values and admins can add approved catalog entries.
export type ProjectCategory = string;

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

export interface ProposedReplacement {
  name: string;
  level: ReplacementLevel;
}

export interface Project {
  id: string;
  slug?: string;
  name: string;
  author: string;
  description: string;
  category: ProjectCategory;
  categoryLabel?: string;
  categoryColor?: string | null;
  tags: string[];
  tagColors?: Record<string, string | null>;
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
