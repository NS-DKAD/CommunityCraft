import { PROJECT_CATEGORIES, ProjectCategory } from "@/types/project";

export interface SubmissionInput {
  name?: string;
  goal?: string;
  githubUrl?: string;
  websiteUrl?: string;
  discussionUrl?: string;
  authorName?: string;
  description: string;
  category: ProjectCategory;
  status?: string;
  tags: string[];
}

export interface SubmissionValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: SubmissionValidationError[];
  normalizedUrl?: string;
  normalizedWebsiteUrl?: string;
  normalizedDiscussionUrl?: string;
  owner?: string;
  repo?: string;
}

const VALID_STATUSES = [
  "Proposed",
  "Seeking collaborators",
  "In development",
  "Completed",
  "Inactive",
] as const;

const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/;

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TAG_COUNT = 10;
const MAX_TAG_LENGTH = 32;
const TAG_PATTERN = /^[a-z0-9_-]+$/;
const URL_PATTERN = /^https?:\/\//i;

/**
 * Validates submission input on the server side.
 * Returns normalized values if valid.
 */
export function validateSubmissionInput(
  input: Partial<SubmissionInput>,
  allowedCategories: readonly string[] = PROJECT_CATEGORIES
): ValidationResult {
  const errors: SubmissionValidationError[] = [];

  const rawName = (input.name ?? "").trim();
  if (!rawName) {
    errors.push({ field: "name", message: "Project name is required." });
  } else if (rawName.length > 120) {
    errors.push({
      field: "name",
      message: "Project name must not exceed 120 characters.",
    });
  }

  const rawGoal = (input.goal ?? "").trim();
  if (rawGoal && rawGoal.length > 500) {
    errors.push({
      field: "goal",
      message: "Project goal must not exceed 500 characters.",
    });
  }

  const rawAuthorName = (input.authorName ?? "").trim();
  if (!rawAuthorName) {
    errors.push({
      field: "author_name",
      message: "Author name or pseudonym is required.",
    });
  } else if (rawAuthorName.length > 100) {
    errors.push({
      field: "author_name",
      message: "Author name must not exceed 100 characters.",
    });
  }

  const rawUrl = (input.githubUrl ?? "").trim();
  let normalizedUrl: string | undefined;
  let owner: string | undefined;
  let repo: string | undefined;

  if (rawUrl) {
    const cleaned = rawUrl.replace(/\/+$/, "").replace(/\.git$/, "");
    const match = GITHUB_URL_PATTERN.exec(cleaned) ?? GITHUB_URL_PATTERN.exec(rawUrl);

    if (!match) {
      errors.push({
        field: "githubUrl",
        message:
          "If provided, GitHub must be a valid repository URL (https://github.com/owner/repo).",
      });
    } else {
      owner = match[1];
      repo = match[2];
      normalizedUrl = `https://github.com/${owner}/${repo}`;
    }
  }

  const rawWebsiteUrl = (input.websiteUrl ?? "").trim();
  let normalizedWebsiteUrl: string | undefined;
  if (rawWebsiteUrl) {
    if (!URL_PATTERN.test(rawWebsiteUrl)) {
      errors.push({
        field: "website_url",
        message: "Website URL must start with http:// or https://.",
      });
    } else {
      normalizedWebsiteUrl = rawWebsiteUrl;
    }
  }

  const rawDiscussionUrl = (input.discussionUrl ?? "").trim();
  let normalizedDiscussionUrl: string | undefined;
  if (rawDiscussionUrl) {
    if (!URL_PATTERN.test(rawDiscussionUrl)) {
      errors.push({
        field: "discussion_url",
        message: "Discussion URL must start with http:// or https://.",
      });
    } else {
      normalizedDiscussionUrl = rawDiscussionUrl;
    }
  }

  const desc = (input.description ?? "").trim();
  if (!desc) {
    errors.push({ field: "description", message: "Description is required." });
  } else if (desc.length < 20) {
    errors.push({
      field: "description",
      message: "Description must be at least 20 characters.",
    });
  } else if (desc.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: "description",
      message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    });
  }

  const cat = input.category;
  if (!cat) {
    errors.push({ field: "category", message: "Category is required." });
  } else if (cat.trim().toLocaleLowerCase() === "by artcraft" || !allowedCategories.includes(cat)) {
    errors.push({ field: "category", message: "Invalid category selected." });
  }

  const status = (input.status ?? "Proposed").trim();
  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    errors.push({ field: "status", message: "Invalid status selected." });
  }

  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (tags.length > MAX_TAG_COUNT) {
    errors.push({
      field: "tags",
      message: `Maximum ${MAX_TAG_COUNT} tags allowed.`,
    });
  } else {
    for (const tag of tags) {
      const t = tag.trim();
      if (!TAG_PATTERN.test(t)) {
        errors.push({
          field: "tags",
          message: `Tag "${t}" is invalid. Only lowercase letters, numbers, hyphens and underscores are allowed.`,
        });
        break;
      }
      if (t.length > MAX_TAG_LENGTH) {
        errors.push({
          field: "tags",
          message: `Tag "${t}" exceeds maximum length of ${MAX_TAG_LENGTH} characters.`,
        });
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedUrl,
    normalizedWebsiteUrl,
    normalizedDiscussionUrl,
    owner,
    repo,
  };
}

export interface GitHubRepoMetadata {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  defaultBranch: string;
  lastPushedAt: string | null;
  isPrivate: boolean;
  isArchived: boolean;
}

/**
 * Fetches public GitHub repository metadata without authentication.
 * Uses the public GitHub REST API (rate-limited at 60 req/h per IP without a token).
 */
export async function fetchGitHubRepoMetadata(
  owner: string,
  repo: string
): Promise<
  { ok: true; data: GitHubRepoMetadata } | { ok: false; status: number; message: string }
> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CommunityCraft-App",
      },
      next: { revalidate: 0 },
    });

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        message:
          "Repository not found. Ensure it is public and the URL is correct.",
      };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        ok: false,
        status: response.status,
        message:
          "GitHub API rate limit reached. Please try again in a few minutes.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `GitHub API returned an unexpected status: ${response.status}.`,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    return {
      ok: true,
      data: {
        name: data.name as string,
        fullName: data.full_name as string,
        description: (data.description as string | null) ?? null,
        stars: (data.stargazers_count as number) ?? 0,
        forks: (data.forks_count as number) ?? 0,
        openIssues: (data.open_issues_count as number) ?? 0,
        license: (data.license?.spdx_id as string | null) ?? null,
        defaultBranch: (data.default_branch as string) ?? "main",
        lastPushedAt: (data.pushed_at as string | null) ?? null,
        isPrivate: (data.private as boolean) ?? false,
        isArchived: (data.archived as boolean) ?? false,
      },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        "Failed to connect to GitHub API. Check your network connection.",
    };
  }
}

/**
 * Generates a URL-safe slug from a GitHub full name (owner/repo).
 */
export function slugFromGitHubFullName(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugFromText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "project";
}

export interface ContributionRequestInput {
  displayName: string;
  contactType: string;
  contact: string;
  skills: string;
  contributionType: string;
  message?: string;
}

export interface ProjectReportInput {
  reporterName?: string;
  reason: string;
  details?: string;
}

export interface ContributionValidationResult {
  valid: boolean;
  errors: SubmissionValidationError[];
}

const VALID_CONTACT_TYPES = ["email", "discord", "github", "website", "other"] as const;
const VALID_CONTRIBUTION_TYPES = ["coding", "design", "testing", "documentation", "community", "other"] as const;
const VALID_REPORT_REASONS = ["misleading", "suspicious", "broken_link", "spam", "other"] as const;

export function validateContributionRequestInput(
  input: Partial<ContributionRequestInput>
): ContributionValidationResult {
  const errors: SubmissionValidationError[] = [];

  const displayName = (input.displayName ?? "").trim();
  if (!displayName) {
    errors.push({ field: "displayName", message: "Name or pseudonym is required." });
  } else if (displayName.length < 2 || displayName.length > 80) {
    errors.push({
      field: "displayName",
      message: "Name or pseudonym must be between 2 and 80 characters.",
    });
  }

  const contactType = (input.contactType ?? "").trim();
  if (!contactType || !(VALID_CONTACT_TYPES as readonly string[]).includes(contactType)) {
    errors.push({ field: "contactType", message: "Please select a valid contact method." });
  }

  const contact = (input.contact ?? "").trim();
  if (!contact) {
    errors.push({ field: "contact", message: "Contact information is required." });
  } else if (contact.length > 200) {
    errors.push({ field: "contact", message: "Contact information is too long." });
  }

  const skills = (input.skills ?? "").trim();
  if (!skills) {
    errors.push({ field: "skills", message: "Skills or area of contribution is required." });
  } else if (skills.length > 200) {
    errors.push({ field: "skills", message: "Skills field must not exceed 200 characters." });
  }

  const contributionType = (input.contributionType ?? "").trim();
  if (!contributionType || !(VALID_CONTRIBUTION_TYPES as readonly string[]).includes(contributionType)) {
    errors.push({ field: "contributionType", message: "Please choose how you want to contribute." });
  }

  const message = (input.message ?? "").trim();
  if (message && message.length > 800) {
    errors.push({ field: "message", message: "Message must not exceed 800 characters." });
  }

  return { valid: errors.length === 0, errors };
}

export function validateProjectReportInput(
  input: Partial<ProjectReportInput>
): ContributionValidationResult {
  const errors: SubmissionValidationError[] = [];

  const reason = (input.reason ?? "").trim();
  if (!reason || !(VALID_REPORT_REASONS as readonly string[]).includes(reason)) {
    errors.push({ field: "reason", message: "Please select a valid report reason." });
  }

  const reporterName = (input.reporterName ?? "").trim();
  if (reporterName && reporterName.length > 80) {
    errors.push({
      field: "reporterName",
      message: "Reporter name must not exceed 80 characters.",
    });
  }

  const details = (input.details ?? "").trim();
  if (details && details.length > 800) {
    errors.push({
      field: "details",
      message: "Report details must not exceed 800 characters.",
    });
  }

  return { valid: errors.length === 0, errors };
}
