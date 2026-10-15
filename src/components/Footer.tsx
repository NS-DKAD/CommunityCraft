import React from "react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              CommunityCraft — Open Source Community Project
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Independent site not officially affiliated with ArtCraft. Repositories and
              project files remain hosted with their authors on GitHub.
            </p>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Phase 1: Catalog and filters (Local preview)
          </div>
        </div>
      </div>
    </footer>
  );
}
