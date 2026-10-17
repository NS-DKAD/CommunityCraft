import { ProjectCategory, ProjectStatus } from "@/types/project";

export type AdminModerationStatus = "pending" | "approved" | "rejected";
export type AdminProjectFields = {
  name: string;
  authorName: string;
  description: string;
  category: ProjectCategory;
  goal: string;
  status: ProjectStatus;
  githubUrl: string;
  websiteUrl: string;
  discussionUrl: string;
};

const PROJECT_STATUSES: ProjectStatus[] = ["Proposed", "Seeking collaborators", "In development", "Completed", "Inactive"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validUrl(value: unknown, github = false): value is string | null | undefined {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const validProtocol = url.protocol === "https:" || url.protocol === "http:";
    const isGithubRepository = !github || (
      url.hostname.toLowerCase() === "github.com" && url.pathname.split("/").filter(Boolean).length >= 2
    );
    return validProtocol && isGithubRepository;
  } catch { return false; }
}

export function validateAdminProjectUpdate(value: unknown):
  | { valid: true; fields: AdminProjectFields; moderationStatus: AdminModerationStatus }
  | { valid: false; error: string } {
  if (!isRecord(value) || !isRecord(value.fields)) return { valid: false, error: "Project fields are required." };
  const input = value.fields;
  if (value.moderationStatus !== "pending" && value.moderationStatus !== "approved" && value.moderationStatus !== "rejected") {
    return { valid: false, error: "Choose a valid moderation action." };
  }
  for (const [field, min, max] of [["name",2,100],["authorName",2,80],["description",20,5000]] as const) {
    const text = input[field];
    if (typeof text !== "string" || text.trim().length < min || text.trim().length > max) {
      return { valid: false, error: `Check the ${field} field (${min} to ${max} characters).` };
    }
  }
  if (typeof input.category !== "string" || input.category.trim().length < 2 || input.category.trim().length > 50 || input.category.trim().toLocaleLowerCase() === "by artcraft") {
    return { valid: false, error: "Choose a valid category." };
  }
  if (typeof input.status !== "string" || !PROJECT_STATUSES.includes(input.status as ProjectStatus)) {
    return { valid: false, error: "Choose a valid project status." };
  }
  if (typeof input.goal !== "string" || input.goal.length > 2000) return { valid: false, error: "Check the goal field." };
  for (const key of ["githubUrl", "websiteUrl", "discussionUrl"] as const) {
    if (!validUrl(input[key], key === "githubUrl")) {
      return { valid: false, error: key === "githubUrl" ? "The repository link must use http(s) and point to github.com." : "Links must use http(s)." };
    }
  }
  return {
    valid: true,
    moderationStatus: value.moderationStatus,
    fields: {
      name: (input.name as string).trim(), authorName: (input.authorName as string).trim(),
      description: (input.description as string).trim(), category: input.category as ProjectCategory,
      goal: input.goal.trim(), status: input.status as ProjectStatus,
      githubUrl: typeof input.githubUrl === "string" ? input.githubUrl.trim() : "",
      websiteUrl: typeof input.websiteUrl === "string" ? input.websiteUrl.trim() : "",
      discussionUrl: typeof input.discussionUrl === "string" ? input.discussionUrl.trim() : "",
    },
  };
}
