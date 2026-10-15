import {
  validateSubmissionInput,
  slugFromGitHubFullName,
} from "@/lib/submission";

// ─── validateSubmissionInput ─────────────────────────────────────────────────

describe("validateSubmissionInput", () => {
  const validBase = {
    githubUrl: "https://github.com/example/my-mod",
    description: "A very useful mod for ArtCraft that does cool things.",
    category: "Mods" as const,
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

  test("rejects missing githubUrl", () => {
    const r = validateSubmissionInput({ ...validBase, githubUrl: "" });
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
    const cats = ["Tools", "Mods", "Shaders", "Rendering & Assets", "Libraries"] as const;
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

  test("collects all errors when multiple fields are invalid", () => {
    const r = validateSubmissionInput({
      githubUrl: "",
      description: "short",
      category: undefined,
      tags: [],
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
