export type NamedSaveFailure = {
  name: string;
  error: string;
};

export type GroupedSaveOutcome = {
  savedNames: string[];
  failed: NamedSaveFailure[];
};

export function isSameDraft<T>(current: T, initial: T): boolean {
  return JSON.stringify(current) === JSON.stringify(initial);
}

export function formatGroupedSaveStatus(outcome: GroupedSaveOutcome): string {
  const saved = outcome.savedNames.length;
  const failed = outcome.failed.length;
  if (saved === 0 && failed === 0) {
    return "Nothing was saved.";
  }
  if (failed === 0) {
    return saved === 1 ? `${outcome.savedNames[0]} saved.` : `${saved} drafts saved.`;
  }
  const failedList = outcome.failed.map((item) => item.name).join(", ");
  if (saved === 0) {
    return `Save all failed. Nothing was written. Failed: ${failedList}.`;
  }
  return `${saved} saved; ${failed} failed (${failedList}). Failed drafts remain available.`;
}

export function shouldGuardUnload(dirtyCount: number): boolean {
  return dirtyCount > 0;
}
