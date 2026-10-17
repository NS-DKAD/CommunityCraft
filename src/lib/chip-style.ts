import type { CSSProperties } from "react";

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  Tools: "#0EA5E9",
  Mods: "#8B5CF6",
  Shaders: "#06B6D4",
  "Rendering & Assets": "#10B981",
  Libraries: "#D946EF",
  Software: "#0EA5E9",
  Website: "#10B981",
  Plugin: "#06B6D4",
  Games: "#F59E0B",
};

export function categoryChipColor(category: string, customColor?: string | null): string | null {
  if (customColor && /^#[0-9a-fA-F]{6}$/.test(customColor)) return customColor;
  return DEFAULT_CATEGORY_COLORS[category] ?? null;
}

/** Uses the saved hue as a tint, with border and text clearly matching the category color while remaining legible on dark surfaces. */
export function getTintedChipStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface-strong))`,
    borderColor: `color-mix(in srgb, ${color} 65%, var(--border))`,
    color: `color-mix(in srgb, ${color} 88%, #ffffff)`,
  };
}
