export type DiscoverTagRecord = {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  color: string | null;
  is_active: boolean;
};

export type DiscoverTag = DiscoverTagRecord & { count: number };

/** Only associations to projects already returned by the public approved-project query count. */
export function buildDiscoverTagOptions(
  catalog: DiscoverTagRecord[],
  associations: Array<{ project_id: string; tag_id: string }>,
  visibleProjectIds: string[]
): DiscoverTag[] {
  const visibleIds = new Set(visibleProjectIds);
  const counts = new Map<string, number>();
  for (const relation of associations) {
    if (visibleIds.has(relation.project_id)) {
      counts.set(relation.tag_id, (counts.get(relation.tag_id) ?? 0) + 1);
    }
  }
  return catalog
    .filter((tag) => tag.is_active && (counts.get(tag.id) ?? 0) > 0)
    .map((tag) => ({ ...tag, count: counts.get(tag.id) ?? 0 }))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));
}

export function validateTagPresentationInput(value: unknown):
  | { valid: true; displayName: string | null; color: string | null }
  | { valid: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, error: "Tag presentation is required." };
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "displayName" && key !== "color")) {
    return { valid: false, error: "Only the display label and color can be changed." };
  }
  const displayName = input.displayName === null || input.displayName === "" ? null : input.displayName;
  const color = input.color === null || input.color === "" ? null : input.color;
  if (displayName !== null && (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.trim().length > 60)) {
    return { valid: false, error: "The display label must contain 1 to 60 characters." };
  }
  if (color !== null && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) {
    return { valid: false, error: "Choose a valid six-digit hex color." };
  }
  return { valid: true, displayName: typeof displayName === "string" ? displayName.trim() : null, color: typeof color === "string" ? color.toUpperCase() : null };
}
