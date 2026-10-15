import React from "react";
import { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
}

const CATEGORY_COLORS: Record<string, string> = {
  Tools:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300",
  Mods: "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-300",
  Shaders:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300",
  "Rendering & Assets":
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300",
  Libraries:
    "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950/60 dark:text-cyan-300",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const categoryStyle =
    CATEGORY_COLORS[project.category] ||
    "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <article className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              by <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.author}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${categoryStyle}`}
            >
              {project.category}
            </span>
            {project.isDemo && (
              <span
                className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                title="Sample project from demo dataset"
              >
                Demo
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
          {project.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300"
              title={project.isDemo ? "GitHub stars (demo data)" : "GitHub stars"}
            >
              <svg
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{project.stars}</span>
            </span>

            <span>{project.license} License</span>
          </div>

          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
            aria-label={`Explore ${project.name} on GitHub (opens in a new tab)`}
          >
            <span>GitHub</span>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
