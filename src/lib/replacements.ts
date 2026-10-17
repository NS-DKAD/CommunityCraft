import { ProjectReplacement, ReplacementLevel } from "@/types/project";

export const REPLACEMENT_LEVELS: ReplacementLevel[] = [
  "Complete",
  "Partial",
  "Specialized",
];

export interface ReplacementInput {
  applicationId: string;
  level: ReplacementLevel;
}

export interface ReplacementValidationResult {
  valid: boolean;
  replacements: ReplacementInput[];
  error?: string;
}

export function validateReplacementInput(value: unknown): ReplacementValidationResult {
  if (value === undefined || value === null) {
    return { valid: true, replacements: [] };
  }
  if (!Array.isArray(value)) {
    return { valid: false, replacements: [], error: "Replacement applications must be a list." };
  }
  if (value.length > 10) {
    return { valid: false, replacements: [], error: "Choose no more than 10 applications." };
  }

  const replacements: ReplacementInput[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { valid: false, replacements: [], error: "Each replacement must use a known application." };
    }
    const record = item as Record<string, unknown>;
    const applicationId = typeof record.applicationId === "string" ? record.applicationId.trim() : "";
    const level = record.level;
    if (!applicationId || typeof level !== "string" || !REPLACEMENT_LEVELS.includes(level as ReplacementLevel)) {
      return { valid: false, replacements: [], error: "Choose a known application and a valid replacement level." };
    }
    if (seen.has(applicationId)) {
      return { valid: false, replacements: [], error: "An application can only be added once." };
    }
    seen.add(applicationId);
    replacements.push({ applicationId, level: level as ReplacementLevel });
  }

  return { valid: true, replacements };
}

export function matchesReplacementApplication(
  replacements: ProjectReplacement[] | undefined,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return Boolean(normalizedQuery) && (replacements ?? []).some((replacement) =>
    replacement.applicationName.toLocaleLowerCase().includes(normalizedQuery)
  );
}

export function findUnknownApplicationIds(
  replacements: ReplacementInput[],
  knownApplicationIds: Iterable<string>
): string[] {
  const known = new Set(knownApplicationIds);
  return replacements.filter((item) => !known.has(item.applicationId)).map((item) => item.applicationId);
}

export function replacementLevelLabel(level: ReplacementLevel): string {
  switch (level) {
    case "Complete": return "Full alternative";
    case "Partial": return "Covers some features";
    case "Specialized": return "Specialized alternative";
  }
}
