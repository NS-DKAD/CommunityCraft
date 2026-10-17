import {
  buildPublicCategoryOptions,
  categorySlug,
  validateCategoryPresentationInput,
  validateCreateCategoryInput,
} from "@/lib/category-catalog";
import { getTintedChipStyle } from "@/lib/chip-style";

describe("category catalog", () => {
  test("creates a normalized slug for an admin-provided category", () => {
    expect(categorySlug("Audio & Video")).toBe("audio-video");
    expect(validateCreateCategoryInput({ name: "Audio & Video", displayName: "Media", color: "#aabbcc" })).toEqual({
      valid: true, name: "Audio & Video", slug: "audio-video", displayName: "Media", color: "#AABBCC",
    });
  });

  test("rejects editorial status and unknown fields as categories", () => {
    expect(validateCreateCategoryInput({ name: "By ArtCraft" }).valid).toBe(false);
    expect(validateCreateCategoryInput({ name: "Audio", slug: "hijacked" }).valid).toBe(false);
  });

  test("only permits presentation and activation fields on existing categories", () => {
    expect(validateCategoryPresentationInput({ displayName: "Creative", color: "#abcdef", isActive: false })).toEqual({
      valid: true, displayName: "Creative", color: "#ABCDEF", isActive: false,
    });
    expect(validateCategoryPresentationInput({ name: "Renamed", slug: "new-slug", displayName: null, color: null, isActive: true }).valid).toBe(false);
  });

  test("public category filters only include categories used by visible projects", () => {
    const projects = [
      { category: "Software", categoryLabel: "Creative apps", categoryColor: "#112233" },
      { category: "Software" },
      { category: "Legacy" },
    ];
    expect(buildPublicCategoryOptions(projects)).toEqual([
      { name: "Software", label: "Creative apps", color: "#112233", count: 2 },
      { name: "Legacy", label: "Legacy", color: null, count: 1 },
    ]);
  });
});

describe("themed custom chip colors", () => {
  test("uses a subtle theme-aware tint and foreground instead of replacing the chip surface with the selected color", () => {
    const style = getTintedChipStyle("#000000");
    expect(style?.backgroundColor).toContain("16%, var(--surface-strong)");
    expect(style?.borderColor).toContain("54%, var(--border)");
    expect(style?.color).toContain("78%, #000000");
  });

  test("uses neutral component styles when no valid custom color exists", () => {
    expect(getTintedChipStyle(null)).toBeUndefined();
    expect(getTintedChipStyle("black")).toBeUndefined();
  });
});
