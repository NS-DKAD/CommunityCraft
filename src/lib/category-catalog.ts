import type { Project } from "@/types/project";

export type CategoryCatalogRecord = {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  color: string | null;
  is_active: boolean;
  sort_order?: number;
};

export type PublicCategoryOption = {
  name: string;
  label: string;
  color: string | null;
  count: number;
};

export function categorySlug(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function validateCreateCategoryInput(value: unknown):
  | { valid: true; name: string; slug: string; displayName: string | null; color: string | null }
  | { valid: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, error: "Category details are required." };
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["name", "displayName", "color"].includes(key))) return { valid: false, error: "Only category name, display label, and color are accepted." };
  if (typeof input.name !== "string") return { valid: false, error: "Category name must contain 2 to 50 characters." };
  const name = input.name.trim();
  if (name.length < 2 || name.length > 50 || !/^[\p{L}\p{N}][\p{L}\p{N} .&+_-]*$/u.test(name)) return { valid: false, error: "Use 2 to 50 letters, numbers, spaces, or . & + _ - in the category name." };
  if (name.toLocaleLowerCase() === "by artcraft") return { valid: false, error: "By ArtCraft is a reserved editorial status, not a category." };
  const slug = categorySlug(name);
  if (!slug) return { valid: false, error: "The category name must produce a valid slug." };
  const presentation = validateCategoryPresentationInput({ displayName: input.displayName ?? null, color: input.color ?? null, isActive: true });
  if (!presentation.valid) return presentation;
  return { valid: true, name, slug, displayName: presentation.displayName, color: presentation.color };
}

export function validateCategoryPresentationInput(value: unknown):
  | { valid: true; displayName: string | null; color: string | null; isActive: boolean }
  | { valid: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, error: "Category presentation is required." };
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["displayName", "color", "isActive"].includes(key))) return { valid: false, error: "Only the display label, color, and active state can be changed." };
  const displayName = input.displayName === null || input.displayName === "" ? null : input.displayName;
  const color = input.color === null || input.color === "" ? null : input.color;
  if (displayName !== null && (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.trim().length > 60)) return { valid: false, error: "The display label must contain 1 to 60 characters." };
  if (color !== null && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) return { valid: false, error: "Choose a valid six-digit hex color." };
  if (typeof input.isActive !== "boolean") return { valid: false, error: "Choose whether the category is active." };
  return { valid: true, displayName: typeof displayName === "string" ? displayName.trim() : null, color: typeof color === "string" ? color.toUpperCase() : null, isActive: input.isActive };
}

export function buildPublicCategoryOptions(projects: Array<Pick<Project, "category"> & Partial<Pick<Project, "categoryLabel" | "categoryColor">>>): PublicCategoryOption[] {
  const byName = new Map<string, PublicCategoryOption>();
  for (const project of projects) {
    const existing = byName.get(project.category);
    if (existing) existing.count += 1;
    else byName.set(project.category, {
      name: project.category,
      label: project.categoryLabel || project.category,
      color: project.categoryColor ?? null,
      count: 1,
    });
  }
  return Array.from(byName.values()).sort((a, b) => {
    const left = a.label.toLowerCase();
    const right = b.label.toLowerCase();
    return left < right ? -1 : left > right ? 1 : 0;
  });
}
