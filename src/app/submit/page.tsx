"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ProjectCategory } from "@/types/project";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSupabaseClient } from "@/lib/supabase/client";

type FieldErrors = Record<string, string | undefined>;

type TagSuggestion = {
  value: string;
  canonical: string;
  displayLabel: string;
};

interface SubmitResult {
  ok: boolean;
  message: string;
  slug?: string;
  name?: string;
}

const CATEGORIES: ProjectCategory[] = [
  "Software",
  "Website",
  "Plugin",
  "Games",
  "Mods",
];

const DEFAULT_TAG_SUGGESTIONS = [
  "rendering",
  "textures",
  "shaders",
  "lighting",
  "modding",
  "voxels",
  "multiplayer",
  "networking",
  "nodes",
  "automation",
  "weather",
  "biomes",
  "materials",
  "foliage",
  "entities",
  "editor",
  "tools",
  "performance",
  "procedural",
  "ui",
];

const INITIAL_STATE = {
  name: "",
  goal: "",
  authorName: "",
  githubUrl: "",
  websiteUrl: "",
  discussionUrl: "",
  description: "",
  category: "" as ProjectCategory | "",
  status: "Proposed",
};

function normalizeTagToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]+/g, "")
    .replace(/^-+|-+$/g, "");
}

function dedupeTags(values: string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const value of values) {
    const normalized = normalizeTagToken(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    clean.push(normalized);
  }

  return clean;
}

export default function SubmitPage() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSuggestions() {
      try {
        const supabase = getSupabaseClient();

        if (!supabase) {
          if (!isCancelled) {
            setTagSuggestions(
              DEFAULT_TAG_SUGGESTIONS.map((tag) => ({
                value: tag,
                canonical: tag,
                displayLabel: tag,
              }))
            );
          }
          return;
        }

        const [{ data: tagRows }, { data: aliasRows }] = await Promise.all([
          supabase.from("tags").select("name, slug").eq("is_active", true).limit(200),
          supabase.from("tag_aliases").select("alias, tag_id").limit(200),
        ]);

        const canonicalNames = (tagRows ?? []).map((row) => String(row.name ?? "").trim());
        const aliasMap = new Map<string, string>();

        for (const row of aliasRows ?? []) {
          const alias = String(row.alias ?? "").trim();
          const tagId = typeof row.tag_id === "string" ? row.tag_id : String(row.tag_id ?? "");
          if (!alias || !tagId) continue;

          aliasMap.set(normalizeTagToken(alias), alias);
        }

        const known = new Map<string, string>();
        for (const tag of canonicalNames) {
          const normalized = normalizeTagToken(tag);
          if (normalized) {
            known.set(normalized, normalized);
          }
        }

        for (const [alias, rawAlias] of aliasMap.entries()) {
          if (!known.has(alias)) {
            known.set(alias, normalizeTagToken(rawAlias));
          }
        }

        const mergedSuggestions = Array.from(known.keys())
          .map((tag) => ({
            value: tag,
            canonical: tag,
            displayLabel: tag,
          }))
          .sort((a, b) => a.value.localeCompare(b.value));

        if (!isCancelled) {
          setTagSuggestions(mergedSuggestions.length > 0 ? mergedSuggestions : DEFAULT_TAG_SUGGESTIONS.map((tag) => ({ value: tag, canonical: tag, displayLabel: tag })));
        }
      } catch {
        if (!isCancelled) {
          setTagSuggestions(
            DEFAULT_TAG_SUGGESTIONS.map((tag) => ({
              value: tag,
              canonical: tag,
              displayLabel: tag,
            }))
          );
        }
      }
    }

    void loadSuggestions();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredTagSuggestions = useMemo(() => {
    const query = normalizeTagToken(tagInput);
    const source = tagSuggestions.filter((suggestion) => {
      const normalizedValue = normalizeTagToken(suggestion.value);
      const normalizedCanonical = normalizeTagToken(suggestion.canonical);

      if (!normalizedValue && !normalizedCanonical) {
        return false;
      }

      if (!query) {
        return !selectedTags.includes(normalizedValue || suggestion.canonical);
      }

      return (
        !selectedTags.includes(normalizedValue || suggestion.canonical) &&
        (normalizedValue.includes(query) ||
          normalizedCanonical.includes(query) ||
          suggestion.displayLabel.toLowerCase().includes(query))
      );
    });

    return source.slice(0, 8);
  }, [selectedTags, tagInput, tagSuggestions]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  function addSelectedTag(tagName: string) {
    const canonical = normalizeTagToken(tagName);
    if (!canonical) {
      return;
    }

    setSelectedTags((prev) => dedupeTags([...prev, canonical]));
    setTagInput("");
    setActiveTagIndex(0);
    tagInputRef.current?.focus();
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!filteredTagSuggestions.length) {
      if (event.key === "Enter" && normalizeTagToken(tagInput)) {
        event.preventDefault();
        addSelectedTag(tagInput);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveTagIndex((prev) => (prev + 1) % filteredTagSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveTagIndex((prev) => (prev - 1 + filteredTagSuggestions.length) % filteredTagSuggestions.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      addSelectedTag(filteredTagSuggestions[activeTagIndex]?.value ?? tagInput);
      return;
    }

    if (event.key === "Escape") {
      setTagInput("");
      setActiveTagIndex(0);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const tags = dedupeTags(selectedTags);

    startTransition(async () => {
      setFieldErrors({});
      setResult(null);

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            goal: form.goal,
            authorName: form.authorName,
            githubUrl: form.githubUrl.trim(),
            websiteUrl: form.websiteUrl.trim(),
            discussionUrl: form.discussionUrl.trim(),
            description: form.description,
            category: form.category,
            status: form.status,
            tags,
          }),
        });

        const json: {
          message?: string;
          error?: string;
          slug?: string;
          name?: string;
          fieldErrors?: Array<{ field: string; message: string }>;
        } = await res.json();

        if (res.ok) {
          setResult({
            ok: true,
            message: json.message ?? "Project submitted successfully.",
            slug: json.slug,
            name: json.name,
          });
          setForm(INITIAL_STATE);
          setSelectedTags([]);
          setTagInput("");
        } else if (res.status === 422 && json.fieldErrors) {
          const errors: FieldErrors = {};
          for (const fe of json.fieldErrors) {
            errors[fe.field] = fe.message;
          }
          setFieldErrors(errors);
          setResult(null);
        } else {
          setResult({
            ok: false,
            message: json.error ?? "An unexpected error occurred. Please try again.",
          });
        }
      } catch {
        setResult({
          ok: false,
          message: "Network error. Please check your connection and try again.",
        });
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />

      <main className="flex-1 bg-[var(--bg)]">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              Submit a Project
            </h1>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Share an ArtCraft project with the community. You can provide a GitHub
              repository when available, or submit without one if the project is still
              in early stages. CommunityCraft only stores the listing and keeps the
              project files hosted with their authors.
            </p>
          </div>

          <div className="mb-8 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">🔑</span>
              <div>
                <p className="font-semibold text-emerald-100">
                  Moderation before publication
                </p>
                <p className="mt-0.5 text-xs text-emerald-200/80">
                  Submissions are reviewed manually before appearing in the catalog. If a
                  GitHub repository is provided, it must be public and valid.
                </p>
              </div>
            </div>
          </div>

          {result?.ok && (
            <div className="mb-8 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">✅</span>
                <div>
                  <p className="font-semibold text-emerald-100">
                    {result.name ? `"${result.name}" submitted!` : "Submission received!"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    {result.message}
                  </p>
                  <Link
                    href="/"
                    className="mt-3 inline-flex items-center text-xs font-medium text-emerald-200 underline hover:no-underline"
                  >
                    ← Back to catalog
                  </Link>
                </div>
              </div>
            </div>
          )}

          {result && !result.ok && (
            <div className="mb-8 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-100">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">⚠️</span>
                <p className="text-rose-100">{result.message}</p>
              </div>
            </div>
          )}

          {!result?.ok && (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl"
            >
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Project name
                    <span className="ml-1 text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="My ArtCraft Project"
                    aria-describedby={fieldErrors.name ? "name-error" : undefined}
                    aria-invalid={!!fieldErrors.name}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.name
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="authorName"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Author name or pseudonym
                    <span className="ml-1 text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="authorName"
                    name="authorName"
                    type="text"
                    value={form.authorName}
                    onChange={handleChange}
                    placeholder="Your name, nickname or project lead"
                    aria-describedby={fieldErrors.author_name ? "authorName-error" : undefined}
                    aria-invalid={!!fieldErrors.author_name}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.author_name
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.author_name && (
                    <p id="authorName-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.author_name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="goal"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Goal or problem to solve
                    <span className="text-xs font-normal text-[var(--text-muted)]"> (optional)</span>
                  </label>
                  <textarea
                    id="goal"
                    name="goal"
                    rows={3}
                    value={form.goal}
                    onChange={handleChange}
                    placeholder="What need does this project address? What is its main purpose?"
                    aria-describedby={fieldErrors.goal ? "goal-error" : undefined}
                    aria-invalid={!!fieldErrors.goal}
                    className={`mt-2 block w-full resize-none rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.goal
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.goal && (
                    <p id="goal-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.goal}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Category
                    <span className="ml-1 text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={form.category}
                    onChange={handleChange}
                    aria-describedby={fieldErrors.category ? "category-error" : undefined}
                    aria-invalid={!!fieldErrors.category}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.category
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  >
                    <option value="" disabled>
                      Select a category…
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p id="category-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Status
                    <span className="ml-1 text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    aria-describedby={fieldErrors.status ? "status-error" : undefined}
                    aria-invalid={!!fieldErrors.status}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.status
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Seeking collaborators">Seeking collaborators</option>
                    <option value="In development">In development</option>
                    <option value="Completed">Completed</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {fieldErrors.status && (
                    <p id="status-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.status}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="githubUrl"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    GitHub Repository URL
                    <span className="text-xs font-normal text-[var(--text-muted)]"> (optional)</span>
                  </label>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Add a public GitHub repository if available. Leave blank for a project
                    that is not yet tied to a GitHub repo.
                  </p>
                  <input
                    id="githubUrl"
                    name="githubUrl"
                    type="url"
                    value={form.githubUrl}
                    onChange={handleChange}
                    placeholder="https://github.com/username/my-artcraft-project"
                    aria-describedby={fieldErrors.githubUrl ? "githubUrl-error" : undefined}
                    aria-invalid={!!fieldErrors.githubUrl}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.githubUrl
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.githubUrl && (
                    <p id="githubUrl-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.githubUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="websiteUrl"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Website URL
                    <span className="text-xs font-normal text-[var(--text-muted)]"> (optional)</span>
                  </label>
                  <input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={form.websiteUrl}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    aria-describedby={fieldErrors.website_url ? "websiteUrl-error" : undefined}
                    aria-invalid={!!fieldErrors.website_url}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.website_url
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.website_url && (
                    <p id="websiteUrl-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.website_url}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="discussionUrl"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Discussion URL
                    <span className="text-xs font-normal text-[var(--text-muted)]"> (optional)</span>
                  </label>
                  <input
                    id="discussionUrl"
                    name="discussionUrl"
                    type="url"
                    value={form.discussionUrl}
                    onChange={handleChange}
                    placeholder="https://community.example.com/topic/123"
                    aria-describedby={fieldErrors.discussion_url ? "discussionUrl-error" : undefined}
                    aria-invalid={!!fieldErrors.discussion_url}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.discussion_url
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  {fieldErrors.discussion_url && (
                    <p id="discussionUrl-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.discussion_url}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Description
                    <span className="ml-1 text-rose-400" aria-hidden="true">*</span>
                  </label>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Briefly describe what the project does (20 to 500 characters).
                  </p>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe your project: what it does, who it's for, and what makes it useful for ArtCraft creators…"
                    aria-describedby={fieldErrors.description ? "description-error" : "description-hint"}
                    aria-invalid={!!fieldErrors.description}
                    className={`mt-2 block w-full resize-none rounded-lg border px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:outline-none focus:ring-2 bg-[var(--surface-strong)] ${
                      fieldErrors.description
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-[var(--border)] focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                  <p
                    id="description-hint"
                    className="mt-1 text-right text-[11px] text-[var(--text-muted)]"
                    aria-live="polite"
                  >
                    {form.description.length} / 500
                  </p>
                  {fieldErrors.description && (
                    <p id="description-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="tag-search"
                    className="block text-sm font-medium text-[var(--text-soft)]"
                  >
                    Tags <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Choose from existing canonical tags and known aliases. Up to 10 tags.
                  </p>

                  <div className="mt-2 relative">
                    <input
                      id="tag-search"
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={(event) => {
                        setTagInput(event.target.value);
                        setActiveTagIndex(0);
                      }}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Search tags like shaders, weather, nodes…"
                      className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      aria-label="Search and select project tags"
                      aria-autocomplete="list"
                      aria-controls="tag-suggestions"
                    />

                    {selectedTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
                        {selectedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTags((prev) => prev.filter((item) => item !== tag))}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/20"
                            aria-label={`Remove ${tag} tag`}
                          >
                            {tag}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {tagInput.trim() && filteredTagSuggestions.length > 0 && (
                      <ul
                        id="tag-suggestions"
                        role="listbox"
                        aria-label="Suggested tags"
                        className="absolute z-20 mt-2 max-h-52 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-1 shadow-xl"
                      >
                        {filteredTagSuggestions.map((suggestion, index) => (
                          <li key={`${suggestion.value}-${index}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={index === activeTagIndex}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => addSelectedTag(suggestion.value)}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                index === activeTagIndex
                                  ? "bg-emerald-500/15 text-emerald-100"
                                  : "text-[var(--text)] hover:bg-white/5"
                              }`}
                            >
                              <span>{suggestion.displayLabel}</span>
                              {suggestion.value !== suggestion.canonical && (
                                <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                                  alias
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {tagInput.trim() && filteredTagSuggestions.length === 0 && (
                      <div className="mt-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--text-muted)]">
                        No matching tags found. Try a broader keyword like “shader”, “weather”, “multiplayer”, or “editor”.
                      </div>
                    )}
                  </div>

                  {fieldErrors.tags && (
                    <p id="tags-error" className="mt-1 text-xs text-rose-400" role="alert">
                      {fieldErrors.tags}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    href="/"
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    ← Back to catalog
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      "Submit Project"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
