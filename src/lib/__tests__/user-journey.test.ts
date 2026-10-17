import { getProjects, getProjectBySlug, matchesProjectQuery } from "@/lib/projects";
import { DEMO_PROJECTS } from "@/data/demo-projects";
import { validateContributionRequestInput, validateProjectReportInput } from "@/lib/submission";

describe("User Journey & Resiliency Tests", () => {
  describe("Public catalog exploration", () => {
    test("loads demo fallback cleanly when database is unconfigured", async () => {
      const result = await getProjects();
      expect(result.projects.length).toBeGreaterThan(0);
      expect(result.projects.some((p) => p.isDemo)).toBe(true);
    });

    test("filters projects by query across name, author and tags", () => {
      const queryResults = DEMO_PROJECTS.filter((p) => matchesProjectQuery(p, "cad"));
      expect(queryResults.length).toBeGreaterThan(0);
      expect(queryResults.every((p) => p.tags.includes("cad") || p.name.toLowerCase().includes("cad"))).toBe(true);
    });

    test("retrieves a project by slug in fallback mode", async () => {
      const project = await getProjectBySlug("artcraft-studio-tools");
      expect(project).toBeDefined();
      expect(project?.name).toBe("ArtCraft Studio Tools");
      expect(project?.category).toBe("Software");
    });
  });

  describe("Contribution workflow input validation", () => {
    test("accepts a valid collaboration request", () => {
      const validPayload = {
        displayName: "Alice",
        contactType: "email",
        contact: "alice@example.com",
        skills: "Rust, 3D graphics",
        contributionType: "coding",
        message: "I'd love to help with the CAD viewer pipeline.",
      };

      const outcome = validateContributionRequestInput(validPayload);
      expect(outcome.valid).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    });

    test("rejects an invalid contribution request without contact info", () => {
      const invalidPayload = {
        displayName: "Bob",
        contactType: "email",
        contact: "",
        skills: "",
        contributionType: "coding",
      };

      const outcome = validateContributionRequestInput(invalidPayload);
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some((e) => e.field === "contact")).toBe(true);
    });
  });

  describe("Report workflow input validation", () => {
    test("accepts a legitimate report submission", () => {
      const outcome = validateProjectReportInput({
        reason: "broken_link",
        details: "The repository URL points to a deleted 404 page.",
      });

      expect(outcome.valid).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    });

    test("rejects an empty report reason", () => {
      const outcome = validateProjectReportInput({
        reason: "",
        details: "Some message",
      });

      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some((e) => e.field === "reason")).toBe(true);
    });
  });
});
