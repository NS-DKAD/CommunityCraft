import { validateAdminProjectUpdate } from "../validation";

const validPayload = {
  moderationStatus: "approved",
  fields: {
    name: "Example project",
    authorName: "Example author",
    description: "A sufficiently long project description for review.",
    category: "Software",
    goal: "Build a useful tool",
    status: "In development",
    githubUrl: "https://github.com/example/project",
    websiteUrl: "https://example.org",
    discussionUrl: "",
  },
};

describe("admin project update validation", () => {
  test("accepts validated edits and moderation state", () => {
    expect(validateAdminProjectUpdate(validPayload)).toMatchObject({
      valid: true,
      moderationStatus: "approved",
      fields: { name: "Example project", category: "Software" },
    });
  });

  test("rejects invalid moderation states and the reserved editorial label", () => {
    expect(validateAdminProjectUpdate({ ...validPayload, moderationStatus: "public" }).valid).toBe(false);
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, category: "By ArtCraft" } }).valid).toBe(false);
  });

  test("accepts a database-managed category while keeping the editorial badge reserved", () => {
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, category: "Audio & Video" } }).valid).toBe(true);
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, category: "By ArtCraft" } }).valid).toBe(false);
  });

  test("rejects unsafe and non-GitHub repository URLs", () => {
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, githubUrl: "javascript:alert(1)" } }).valid).toBe(false);
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, githubUrl: "https://evil.example/repo" } }).valid).toBe(false);
  });

  test("rejects blank project names and oversized descriptions", () => {
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, name: " " } }).valid).toBe(false);
    expect(validateAdminProjectUpdate({ ...validPayload, fields: { ...validPayload.fields, description: "x".repeat(5001) } }).valid).toBe(false);
  });
});
