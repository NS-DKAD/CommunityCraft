import React from "react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-8 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">
              CommunityCraft — Open Source Community Project
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Independent site not officially affiliated with ArtCraft. Repositories and
              project files remain hosted with their authors on GitHub.
            </p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            Phase 1: Catalog and filters (Local preview)
          </div>
        </div>
      </div>
    </footer>
  );
}
