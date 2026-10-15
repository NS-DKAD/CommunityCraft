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
      const matchesTags = project.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );

      return matchesName || matchesAuthor || matchesDescription || matchesTags;
    });
  }, [initialProjects, searchQuery, selectedCategory]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Notice banner based on data source */}
      {dataSource === "database" && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              ✅
            </span>
            <div>
              <p className="font-semibold">Live Database Connected</p>
              <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                Connected to Supabase PostgreSQL database. Displaying {initialProjects.length} live catalog projects.
              </p>
            </div>
          </div>
        </div>
      )}

      {dataSource === "error" && (
        <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <p className="font-semibold">Database Connection Issue</p>
              <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
                {errorMessage || "Failed to load projects from Supabase."}
              </p>
              <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                Notice: Displaying offline demo fallback data for preview purposes only. These are not live database records.
              </p>
            </div>
          </div>
        </div>
      )}

      {dataSource === "demo" && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              ℹ️
            </span>
            <div>
              <p className="font-semibold">Demo Data Mode</p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                The listings displayed below are sample projects to test search, filtering, and
                responsiveness. Configure Supabase credentials in{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/50">
                  .env.local
                </code>{" "}
                to connect your live database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <label htmlFor="search-input" className="sr-only">
          Search projects, mods, shaders, or authors
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, author, keyword (e.g., shaders, voxel, biomes)..."
            className="w-full rounded-xl border border-zinc-300 bg-white py-3.5 pl-11 pr-10 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear search query"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-1">
          Categories:
        </span>
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category;
          const count = categoryCounts[category] || 0;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{category}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results counter & reset */}
      <div className="mb-6 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <p>
          {filteredProjects.length === 0 ? (
            <span>No projects found</span>
          ) : (
            <span>
              Showing{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {filteredProjects.length}
              </strong>{" "}
              {filteredProjects.length === 1 ? "project" : "projects"} of {initialProjects.length}
            </span>
          )}
        </p>

        {(searchQuery || selectedCategory !== "All") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Projects grid or empty state */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg
              className="h-6 w-6 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No results found
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Try adjusting your search keyword or selecting another category.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Reset search
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
