
import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Project } from "@/types/project";
import { categoryChipColor, getTintedChipStyle } from "@/lib/chip-style";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const categoryColor = categoryChipColor(project.category, project.categoryColor);
  const projectHref = project.slug ? `/projects/${project.slug}` : `/projects/${project.id}`;
  const pathname = usePathname();

  // Reset navigation animation when route changes
  
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNavigating(false);
  }, [pathname]);

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:-translate-y-0.5 focus-within:shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:hover:-translate-y-1.5 md:hover:shadow-[0_30px_90px_rgba(15,23,42,0.12)] ${
        isNavigating ? "animate-pulse ring-2 ring-emerald-500/50 scale-[0.99] opacity-80" : ""
      }`}
    >
      <div className="relative p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={getTintedChipStyle(categoryColor)}>
                {project.categoryLabel || project.category}
              </span>
              {project.status ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {project.status}
                </span>
              ) : null}
            </div>

            <Link
              href={projectHref}
              onClick={() => setIsNavigating(true)}
              className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              aria-label={`Open ${project.name} details`}
            >
              <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--text)] transition-colors duration-300 group-hover:text-[var(--text-soft)]">
                {project.name}
              </h3>
            </Link>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              by <span className="font-medium text-[var(--text-soft)]">{project.author}</span>
            </p>
          </div>

          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-lg font-semibold text-[var(--text)] shadow-inner shadow-[rgba(15,23,42,0.05)]">
            {project.name.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>{project.lastUpdated}</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span>{project.license} License</span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
          {project.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-[var(--text-soft)]" style={getTintedChipStyle(project.tagColors?.[tag])}>
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-hidden">
          <div className="max-h-0 opacity-0 translate-y-3 overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-h-80 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:max-h-80 group-focus-within:opacity-100 group-focus-within:translate-y-0">
            <div className="space-y-4 border-t border-[var(--border)] pt-4">
              {project.goal ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Objective
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{project.goal}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-3 text-xs text-[var(--text-muted)]">
                  No goal published yet.
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-soft)]">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 fill-amber-500" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {project.stars}
                </span>

                {project.githubUrl ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-strong)]"
                    aria-label={`Explore ${project.name} on GitHub (opens in a new tab)`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    GitHub
                  </a>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No repo</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
