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

export interface ProposedReplacementInput {
  name: string;
  level: ReplacementLevel;
}

export interface ReplacementValidationResult {
  valid: boolean;
  replacements: ReplacementInput[];
  proposedReplacements?: ProposedReplacementInput[];
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

export function validateProposedReplacementsInput(value: unknown): {
  valid: boolean;
  proposed: ProposedReplacementInput[];
  error?: string;
} {
  if (value === undefined || value === null) {
    return { valid: true, proposed: [] };
  }
  if (!Array.isArray(value)) {
    return { valid: false, proposed: [], error: "Proposed replacement applications must be a list." };
  }
  if (value.length > 10) {
    return { valid: false, proposed: [], error: "Propose no more than 10 applications." };
  }

  const proposed: ProposedReplacementInput[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { valid: false, proposed: [], error: "Each proposed replacement must specify an application name." };
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const level = record.level;
    if (!name || name.length < 2 || name.length > 80) {
      return { valid: false, proposed: [], error: "Proposed application name must be between 2 and 80 characters." };
    }
    if (typeof level !== "string" || !REPLACEMENT_LEVELS.includes(level as ReplacementLevel)) {
      return { valid: false, proposed: [], error: "Choose a valid replacement level for proposed application." };
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      return { valid: false, proposed: [], error: "An application can only be proposed once." };
    }
    seen.add(lower);
    proposed.push({ name, level: level as ReplacementLevel });
  }

  return { valid: true, proposed };
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
