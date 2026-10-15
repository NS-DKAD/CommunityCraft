import React from "react";

export function CatalogSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading projects catalog..."
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse"
    >
      {/* Notice banner skeleton */}
      <div className="mb-8 h-16 w-full rounded-xl bg-zinc-200/70 dark:bg-zinc-800/60" />

      {/* Search bar skeleton */}
      <div className="mb-6 h-12 w-full rounded-xl bg-zinc-200/70 dark:bg-zinc-800/60" />

      {/* Category filters skeleton */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="h-7 w-16 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
        <div className="h-7 w-20 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
        <div className="h-7 w-18 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
        <div className="h-7 w-22 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
        <div className="h-7 w-28 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
        <div className="h-7 w-24 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60" />
      </div>

      {/* Results counter skeleton */}
      <div className="mb-6 h-4 w-40 rounded bg-zinc-200/70 dark:bg-zinc-800/60" />

      {/* Cards grid skeleton (6 items matching 1 / 2 / 3 columns) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                </div>
                <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3.5 w-full rounded bg-zinc-100 dark:bg-zinc-800/60" />
                <div className="h-3.5 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                <div className="h-3.5 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/60" />
              </div>
              <div className="mt-4 flex gap-1.5">
                <div className="h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                <div className="h-4 w-14 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                <div className="h-4 w-10 rounded bg-zinc-100 dark:bg-zinc-800/60" />
              </div>
            </div>
            <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                <div className="h-3.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading catalog projects...</span>
    </div>
  );
}
