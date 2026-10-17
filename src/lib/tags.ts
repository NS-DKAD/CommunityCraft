export interface CanonicalTagRecord {
  id: string;
  name: string;
  slug: string;
}

export interface TagAliasRecord {
  alias: string;
  tagId: string;
}

export interface ResolvedSubmissionTags {
  valid: boolean;
  tags: CanonicalTagRecord[];
  unknownTags: string[];
}

export function normalizeTagLookup(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, "-");
}

/** Resolves submitted slugs, canonical names, or aliases to active canonical tags. */
export function resolveSubmissionTags(
  submitted: string[],
  canonicalTags: CanonicalTagRecord[],
  aliases: TagAliasRecord[]
): ResolvedSubmissionTags {
  const tagsById = new Map(canonicalTags.map((tag) => [tag.id, tag]));
  const byKey = new Map<string, Map<string, CanonicalTagRecord>>();
  const addCandidate = (key: string, tag: CanonicalTagRecord) => {
    const normalized = normalizeTagLookup(key);
    if (!normalized) return;
    const candidates = byKey.get(normalized) ?? new Map<string, CanonicalTagRecord>();
    candidates.set(tag.id, tag);
    byKey.set(normalized, candidates);
  };
  for (const tag of canonicalTags) {
    addCandidate(tag.slug, tag);
    addCandidate(tag.name, tag);
  }
  for (const alias of aliases) {
    const canonical = tagsById.get(alias.tagId);
    if (canonical) addCandidate(alias.alias, canonical);
  }

  const resolved = new Map<string, CanonicalTagRecord>();
  const unknownTags: string[] = [];
  for (const raw of submitted) {
    const key = normalizeTagLookup(raw);
    const candidates = byKey.get(key);
    if (!candidates || candidates.size !== 1) {
      unknownTags.push(raw);
      continue;
    }
    const tag = candidates.values().next().value as CanonicalTagRecord;
    resolved.set(tag.id, tag);
  }

  return {
    valid: unknownTags.length === 0,
    tags: Array.from(resolved.values()),
    unknownTags,
  };
}
