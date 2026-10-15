"use client";

import React, { useState, useMemo } from "react";
import { Project, ProjectCategory } from "@/types/project";
import { ProjectCard } from "./ProjectCard";

interface ProjectCatalogProps {
  initialProjects: Project[];
  dataSource?: "database" | "demo" | "error";
  errorMessage?: string;
}

const CATEGORIES: Array<"All" | ProjectCategory> = [
  "All",
  "Tools",
  "Mods",
  "Shaders",
  "Rendering & Assets",
  "Libraries",
];

export function ProjectCatalog({
  initialProjects,
  dataSource = "demo",
  errorMessage,
}: ProjectCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ProjectCategory>("All");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: initialProjects.length,
    };
    for (const project of initialProjects) {
      counts[project.category] = (counts[project.category] || 0) + 1;
    }
    return counts;
  }, [initialProjects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return initialProjects.filter((project) => {
      const matchesCategory =
        selectedCategory === "All" || project.category === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchesName = project.name.toLowerCase().includes(query);
      const matchesAuthor = project.author.toLowerCase().includes(query);
      const matchesDescription = project.description.toLowerCase().includes(query);
      const matchesTags = project.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesName || matchesAuthor || matchesDescription || matchesTags;
    });
  }, [initialProjects, searchQuery, selectedCategory]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
  };

  return (
    <section id="catalog" className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
        {dataSource === "database" && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-[var(--success)] p-4 text-sm text-emerald-900">
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden="true">✓</span>
              <div>
                <p className="font-semibold">Live Database Connected</p>
                <p className="mt-1 text-xs text-emerald-800/80">
                  Displaying {initialProjects.length} approved projects from Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {dataSource === "error" && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-[var(--danger)] p-4 text-sm text-rose-900">
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden="true">⚠</span>
              <div>
                <p className="font-semibold">Database Connection Issue</p>
                <p className="mt-1 text-xs text-rose-800/80">{errorMessage || "Failed to load projects from Supabase."}</p>
              </div>
            </div>
          </div>
        )}

        {dataSource === "demo" && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-[var(--warning)] p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden="true">ℹ</span>
              <div>
                <p className="font-semibold">Demo Data Mode</p>
                <p className="mt-1 text-xs text-amber-800/80">
                  Sample catalog preview. Add Supabase keys to switch to the live directory.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Catalog</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-3xl">
              Featured projects in motion
            </h2>
          </div>

          <div className="w-full max-w-xl">
            <label htmlFor="search-input" className="sr-only">Search projects</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--text-muted)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mods, tools, tags..."
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-strong)] py-3 pl-11 pr-10 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--border-strong)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label="Clear search query"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] || 0;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-[var(--border-strong)] bg-[var(--text)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{category}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? "bg-[var(--bg)] text-[var(--text)]" : "bg-[var(--brand-soft)] text-[var(--text-muted)]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>
            {filteredProjects.length === 0 ? "No projects found" : `Showing ${filteredProjects.length} of ${initialProjects.length}`}
          </p>

          {(searchQuery || selectedCategory !== "All") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-medium text-[var(--text)] transition-colors hover:text-[var(--text-soft)]"
            >
              Reset filters
            </button>
          )}
        </div>

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-12 text-center text-[var(--text-soft)]">
            No projects match the current filters.
          </div>
        )}
      </div>
    </section>
  );
}
