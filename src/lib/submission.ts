import { ProjectCategory } from "@/types/project";

export interface SubmissionInput {
  githubUrl: string;
  description: string;
  category: ProjectCategory;
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
  owner?: string;
  repo?: string;
}

const VALID_CATEGORIES: ProjectCategory[] = [
  "Tools",
  "Mods",
  "Shaders",
  "Rendering & Assets",
  "Libraries",
];

const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/;

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TAG_COUNT = 10;
const MAX_TAG_LENGTH = 32;
const TAG_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Validates submission input on the server side.
 * Returns normalized values if valid.
 */
export function validateSubmissionInput(
  input: Partial<SubmissionInput>
): ValidationResult {
  const errors: SubmissionValidationError[] = [];

  // GitHub URL validation
  const rawUrl = (input.githubUrl ?? "").trim();
  let normalizedUrl: string | undefined;
  let owner: string | undefined;
  let repo: string | undefined;

  if (!rawUrl) {
    errors.push({ field: "githubUrl", message: "GitHub repository URL is required." });
  } else {
    // Strip trailing slashes and .git suffix for normalization
    const cleaned = rawUrl.replace(/\/+$/, "").replace(/\.git$/, "");
    const match = GITHUB_URL_PATTERN.exec(cleaned) ?? GITHUB_URL_PATTERN.exec(rawUrl);
    if (!match) {
      errors.push({
        field: "githubUrl",
        message:
          "Must be a valid GitHub repository URL (https://github.com/owner/repo).",
      });
    } else {
      owner = match[1];
      repo = match[2];
      normalizedUrl = `https://github.com/${owner}/${repo}`;
    }
  }

  // Description validation
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

  // Category validation
  const cat = input.category;
  if (!cat) {
    errors.push({ field: "category", message: "Category is required." });
  } else if (!VALID_CATEGORIES.includes(cat)) {
    errors.push({ field: "category", message: "Invalid category selected." });
  }

  // Tags validation
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
): Promise<{ ok: true; data: GitHubRepoMetadata } | { ok: false; status: number; message: string }> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CommunityCraft-App",
      },
      // Do not cache at the Next.js layer — this is a submission flow
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
