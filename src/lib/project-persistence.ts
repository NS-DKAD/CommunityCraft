import { ReplacementInput } from "@/lib/replacements";

export interface InsertedProject {
  id: string;
  slug: string;
}

export interface PersistProjectResult {
  kind: "saved" | "failed-before-save" | "rolled-back" | "saved-with-incomplete-relations";
  project?: InsertedProject;
  error?: string;
  cleanupError?: string;
}

export function getPersistenceHttpOutcome(result: PersistProjectResult): {
  status: 201 | 500;
  received: boolean;
  message: string;
} {
  if (result.kind === "failed-before-save" || result.kind === "rolled-back") {
    return {
      status: 500,
      received: false,
      message: "The submission was not saved. You can safely try again.",
    };
  }
  if (result.kind === "saved-with-incomplete-relations") {
    return {
      status: 201,
      received: true,
      message: "Your project submission was received, but some tag or replacement details could not be saved. Please do not submit it again; a moderator will need to review the incomplete details.",
    };
  }
  return {
    status: 201,
    received: true,
    message: "Project submitted successfully. It will appear in the catalog once reviewed.",
  };
}

interface PersistProjectOptions {
  replacements: ReplacementInput[];
  hasTagAssociations?: boolean;
  insertProject: () => Promise<{ project: InsertedProject | null; error: string | null }>;
  insertReplacements: (projectId: string, replacements: ReplacementInput[]) => Promise<{ error: string | null }>;
  deleteProject: (projectId: string) => Promise<{ deleted: boolean; error: string | null }>;
}

/**
 * Saves the project and its normalized tag/replacement links. If relation persistence fails,
 * remove the just-created pending project. If that cleanup also fails, return
 * the saved project so the caller can confirm receipt and prevent a duplicate
 * retry; the project remains unapproved and the failure is logged.
 */
export async function persistProjectWithReplacements({
  replacements,
  hasTagAssociations = false,
  insertProject,
  insertReplacements,
  deleteProject,
}: PersistProjectOptions): Promise<PersistProjectResult> {
  let inserted: Awaited<ReturnType<typeof insertProject>>;
  try {
    inserted = await insertProject();
  } catch (error) {
    return { kind: "failed-before-save", error: error instanceof Error ? error.message : "Project insert failed." };
  }
  if (inserted.error || !inserted.project) {
    return { kind: "failed-before-save", error: inserted.error ?? "Project insert returned no project." };
  }

  if (replacements.length === 0 && !hasTagAssociations) return { kind: "saved", project: inserted.project };

  let replacementError: string | null = null;
  try {
    replacementError = (await insertReplacements(inserted.project.id, replacements)).error;
  } catch (error) {
    replacementError = error instanceof Error ? error.message : "Replacement insert failed.";
  }
  if (!replacementError) return { kind: "saved", project: inserted.project };

  let cleanupError: string | null = null;
  try {
    const cleanup = await deleteProject(inserted.project.id);
    cleanupError = cleanup.error ?? (cleanup.deleted ? null : "Project cleanup did not confirm deletion.");
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : "Project cleanup failed.";
  }
  if (!cleanupError) {
    return { kind: "rolled-back", project: inserted.project, error: replacementError };
  }
  return {
    kind: "saved-with-incomplete-relations",
    project: inserted.project,
    error: replacementError,
    cleanupError,
  };
}
