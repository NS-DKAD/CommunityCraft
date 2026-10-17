"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Project, ProjectCategory } from "@/types/project";
import { matchesProjectCategory, matchesProjectQuery } from "@/lib/projects";
import type { DiscoverTag } from "@/lib/discover-tags";
import { buildPublicCategoryOptions } from "@/lib/category-catalog";
import { ProjectCard } from "./ProjectCard";
import { categoryChipColor, getTintedChipStyle } from "@/lib/chip-style";

interface ProjectCatalogProps {
  initialProjects: Project[];
  dataSource?: "database" | "demo" | "error";
  errorMessage?: string;
  initialQuery?: string;
  tagFilters?: DiscoverTag[];
}

export function ProjectCatalog({
  initialProjects,
  dataSource = "demo",
  errorMessage,
  initialQuery = "",
  tagFilters = [],
}: ProjectCatalogProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<"All" | ProjectCategory>("All");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const categoryOptions = useMemo(() => buildPublicCategoryOptions(initialProjects), [initialProjects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim();

    return initialProjects.filter((project) => {
      if (!matchesProjectCategory(project, selectedCategory)) {
        return false;
      }
      if (selectedTag && !project.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }

      return matchesProjectQuery(project, query);
    });
  }, [initialProjects, searchQuery, selectedCategory, selectedTag]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedTag(null);
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
                placeholder="Search projects, tags, or replacement apps..."
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
          {[
            { name: "All", label: "All", count: initialProjects.length, color: null },
            ...categoryOptions,
          ].map((option) => {
            const category = option.name as "All" | ProjectCategory;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-[var(--border-strong)] bg-[var(--text)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
                style={!isSelected ? getTintedChipStyle(categoryChipColor(category, option.color)) : undefined}
              >
                <span>{option.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? "bg-[var(--bg)] text-[var(--text)]" : "bg-[var(--brand-soft)] text-[var(--text-muted)]"}`}>
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>
            {filteredProjects.length === 0 ? "No projects found" : `Showing ${filteredProjects.length} of ${initialProjects.length}`}
          </p>

          {(searchQuery || selectedCategory !== "All" || selectedTag) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-medium text-[var(--text)] transition-colors hover:text-[var(--text-soft)]"
            >
              Reset filters
            </button>
          )}
        </div>

        {tagFilters.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TagFilterDropdown tags={tagFilters} selectedTag={selectedTag} onSelect={setSelectedTag} />
            <span className="text-xs text-[var(--text-muted)]">Categories above and tags here are separate filters.</span>
          </div>
        )}

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

function TagFilterDropdown({ tags, selectedTag, onSelect }: {
  tags: DiscoverTag[];
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const filteredTags = useMemo(() => tags.filter((tag) => (tag.display_name || tag.name).toLowerCase().includes(query.trim().toLowerCase())), [tags, query]);
  const activeOptionId = activeIndex === 0 ? "discover-tag-option-all" : `discover-tag-option-${filteredTags[activeIndex - 1]?.id}`;

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  function choose(value: string | null) {
    onSelect(value);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const lastIndex = filteredTags.length;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, lastIndex)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === "End") { event.preventDefault(); setActiveIndex(lastIndex); }
    else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex === 0 ? null : filteredTags[activeIndex - 1]?.name ?? null);
    } else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
  }

  const selected = tags.find((tag) => tag.name === selectedTag);
  return (
    <div className="relative w-full max-w-sm">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-left text-sm text-[var(--text)] hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
        <span className="truncate">{selected ? `Tag: ${selected.display_name || selected.name}` : "Filter by tag"}</span>
        <span aria-hidden="true" className="text-[var(--text-muted)]">{open ? "⌃" : "⌄"}</span>
      </button>
      {open && <div className="absolute z-30 mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-2 shadow-2xl">
        <label className="sr-only" htmlFor="discover-tag-search">Search tags</label>
        <input ref={searchRef} id="discover-tag-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="discover-tag-options" aria-activedescendant={activeOptionId} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleSearchKeyDown} placeholder="Search tags…" className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]" />
        <div id="discover-tag-options" role="listbox" aria-label="Tags" className="max-h-64 overflow-y-auto">
          <div id="discover-tag-option-all" role="option" aria-selected={!selectedTag} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(null)} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${activeIndex === 0 ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}>
            <span>All tags</span><span className="text-xs text-[var(--text-muted)]">Clear</span>
          </div>
          {filteredTags.map((tag, index) => <div id={`discover-tag-option-${tag.id}`} key={tag.id} role="option" aria-selected={selectedTag === tag.name} onMouseEnter={() => setActiveIndex(index + 1)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(tag.name)} style={getTintedChipStyle(tag.color)} className={`mt-1 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${activeIndex === index + 1 ? "outline outline-1 outline-[var(--ring)]" : ""}`}><span>{tag.display_name || tag.name}</span><span className="text-xs opacity-80">{tag.count}</span></div>)}
          {filteredTags.length === 0 && <p role="status" className="px-3 py-4 text-sm text-[var(--text-muted)]">No tags match your search.</p>}
        </div>
      </div>}
    </div>
  );
}
