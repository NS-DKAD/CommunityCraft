import {
  validateSubmissionInput,
  slugFromGitHubFullName,
} from "@/lib/submission";
import {
  getProjectBySlug,
  matchesProjectCategory,
  matchesProjectQuery,
} from "@/lib/projects";
import { getSupabaseClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabaseClient: jest.fn(),
}));

describe("matchesProjectQuery", () => {
  test("matches project tags and category metadata while ignoring case", () => {
    const project = {
      name: "PhotoCraft Studio",
      author: "Mika",
      description: "A rendering toolkit for ArtCraft.",
      tags: ["rendering", "shaders", "photorealism"],
    };

    expect(matchesProjectQuery(project, "SHADERS")).toBe(true);
    expect(matchesProjectQuery(project, "mika")).toBe(true);
    expect(matchesProjectQuery(project, "toolkit")).toBe(true);
    expect(matchesProjectQuery(project, "nonexistent")).toBe(false);
  });

  test("handles projects without associations gracefully", () => {
    const project = {
      name: "Untitled",
      author: "Solo dev",
      description: "A minimal project.",
      tags: [],
    };

    expect(matchesProjectQuery(project, "solo")).toBe(true);
    expect(matchesProjectQuery(project, "rendering")).toBe(false);
  });
});

describe("matchesProjectCategory", () => {
  test("accepts the canonical category list and keeps All as a global selector", () => {
    expect(matchesProjectCategory({ category: "Rendering & Assets" }, "All")).toBe(true);
    expect(matchesProjectCategory({ category: "Games" }, "Games")).toBe(true);
    expect(matchesProjectCategory({ category: "Website" }, "Mods")).toBe(false);
  });
});

// ─── validateSubmissionInput ─────────────────────────────────────────────────

describe("validateSubmissionInput", () => {
  const validBase = {
    name: "My Awesome Mod",
    goal: "Helps players build better worlds and share ideas.",
    authorName: "Example Dev",
    githubUrl: "https://github.com/example/my-mod",
    description: "A very useful mod for ArtCraft that does cool things.",
    category: "Mods" as const,
    status: "Proposed" as const,
    tags: ["voxels", "gameplay"],
  };

  test("accepts a fully valid input", () => {
    const r = validateSubmissionInput(validBase);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.normalizedUrl).toBe("https://github.com/example/my-mod");
    expect(r.owner).toBe("example");
    expect(r.repo).toBe("my-mod");
  });

  test("allows a missing githubUrl when no repo is provided", () => {
    const r = validateSubmissionInput({ ...validBase, githubUrl: "" });
    expect(r.valid).toBe(true);
    expect(r.errors.some((e) => e.field === "githubUrl")).toBe(false);
  });

  test("allows a project without a goal when it is optional", () => {
    const r = validateSubmissionInput({ ...validBase, goal: "" });
    expect(r.valid).toBe(true);
    expect(r.errors.some((e) => e.field === "goal")).toBe(false);
  });

  test("rejects invalid GitHub URLs if one is provided", () => {
    const r = validateSubmissionInput({
      ...validBase,
      githubUrl: "https://gitlab.com/example/repo",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "githubUrl")).toBe(true);
  });

  test("rejects non-GitHub URLs", () => {
    const r = validateSubmissionInput({
      ...validBase,
      githubUrl: "https://gitlab.com/example/repo",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "githubUrl")).toBe(true);
  });

  test("normalises URLs with trailing slash", () => {
    const r = validateSubmissionInput({
      ...validBase,
      githubUrl: "https://github.com/example/my-mod/",
    });
    expect(r.valid).toBe(true);
    expect(r.normalizedUrl).toBe("https://github.com/example/my-mod");
  });

  test("normalises URLs ending in .git", () => {
    const r = validateSubmissionInput({
      ...validBase,
      githubUrl: "https://github.com/example/my-mod.git",
    });
    expect(r.valid).toBe(true);
    expect(r.normalizedUrl).toBe("https://github.com/example/my-mod");
  });

  test("rejects description shorter than 20 chars", () => {
    const r = validateSubmissionInput({ ...validBase, description: "Too short." });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "description")).toBe(true);
  });

  test("rejects description longer than 500 chars", () => {
    const r = validateSubmissionInput({
      ...validBase,
      description: "x".repeat(501),
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "description")).toBe(true);
  });

  test("rejects an invalid category", () => {
    const r = validateSubmissionInput({
      ...validBase,
      category: "Weapons" as never,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "category")).toBe(true);
  });

  test("accepts all valid categories", () => {
    const cats = [
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
    for (const cat of cats) {
      const r = validateSubmissionInput({ ...validBase, category: cat });
      expect(r.valid).toBe(true);
    }
  });

  test("rejects tags with spaces or uppercase", () => {
    const r = validateSubmissionInput({ ...validBase, tags: ["My Tag"] });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "tags")).toBe(true);
  });

  test("rejects more than 10 tags", () => {
    const r = validateSubmissionInput({
      ...validBase,
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "tags")).toBe(true);
  });

  test("allows empty tags array", () => {
    const r = validateSubmissionInput({ ...validBase, tags: [] });
    expect(r.valid).toBe(true);
  });

  test("requires an author name or pseudonym", () => {
    const r = validateSubmissionInput({ ...validBase, authorName: "" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === "author_name")).toBe(true);
  });

  test("collects all errors when multiple fields are invalid", () => {
    const r = validateSubmissionInput({
      name: "",
      goal: "",
      authorName: "",
      githubUrl: "https://gitlab.com/example/repo",
      description: "short",
      category: undefined,
      tags: ["Bad Tag", "long-value-".repeat(10)],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── slugFromGitHubFullName ───────────────────────────────────────────────────

describe("slugFromGitHubFullName", () => {
  test("converts owner/repo to kebab slug", () => {
    expect(slugFromGitHubFullName("example/my-mod")).toBe("example-my-mod");
  });

  test("lowercases the result", () => {
    expect(slugFromGitHubFullName("ArtCraft/ShaderPack")).toBe("artcraft-shaderpack");
  });

  test("handles underscores and dots", () => {
    expect(slugFromGitHubFullName("user/my_cool.project")).toBe("user-my-cool-project");
  });
});

describe("getProjectBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("queries by slug, not by UUID", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        slug: "artcraft-studio-tools",
        name: "ArtCraft Studio Tools",
        author: "Studio Team",
        description: "Description is long enough.",
        category: "Tools",
        tags: ["tools"],
        githubUrl: null,
        is_approved: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        stars: 12,
        forks: 2,
        open_issues: 0,
        license: "MIT",
        last_github_commit_at: null,
        synced_at: "2026-01-01T00:00:00Z",
        goal: null,
        status: "Proposed",
        source_type: null,
        source_verified: null,
        discussion_url: null,
        website_url: null,
      },
      error: null,
    });

    const inProjectTags = jest.fn().mockResolvedValue({ data: [], error: null });
    const selectProjectTags = jest.fn().mockReturnValue({ in: inProjectTags });
    const fromProjectTags = jest.fn().mockReturnValue({ select: selectProjectTags });

    const inTags = jest.fn().mockResolvedValue({ data: [], error: null });
    const selectTags = jest.fn().mockReturnValue({ in: inTags });
    const fromTags = jest.fn().mockReturnValue({ select: selectTags });

    const eqBySlug = jest.fn().mockReturnValue({ maybeSingle });
    const eqApproved = jest.fn().mockReturnValue({ eq: eqBySlug });
    const select = jest.fn().mockReturnValue({ eq: eqApproved });
    const from = jest.fn((table: string) => {
      if (table === "project_tags") return fromProjectTags();
      if (table === "tags") return fromTags();
      return { select };
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({ from });

    const result = await getProjectBySlug("artcraft-studio-tools");

    expect(result).not.toBeNull();
    expect(from).toHaveBeenCalledWith("projects_with_stats");
    expect(select).toHaveBeenCalledWith("*");
    expect(eqApproved).toHaveBeenCalledWith("is_approved", true);
    expect(eqBySlug).toHaveBeenCalledWith("slug", "artcraft-studio-tools");
    expect(eqBySlug).not.toHaveBeenCalledWith("id", "artcraft-studio-tools");
  });
});
