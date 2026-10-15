"use client";

import React, { useState, useTransition } from "react";
import { ProjectCategory } from "@/types/project";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type FieldErrors = Record<string, string | undefined>;

interface SubmitResult {
  ok: boolean;
  message: string;
  slug?: string;
  name?: string;
}

const CATEGORIES: ProjectCategory[] = [
  "Tools",
  "Mods",
  "Shaders",
  "Rendering & Assets",
  "Libraries",
];

const INITIAL_STATE = {
  githubUrl: "",
  description: "",
  category: "" as ProjectCategory | "",
  tags: "",
};

export default function SubmitPage() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const tags = form.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    startTransition(async () => {
      setFieldErrors({});
      setResult(null);

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubUrl: form.githubUrl,
            description: form.description,
            category: form.category,
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
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Submit a Project
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Share an open-source ArtCraft creation with the community. The repository
              must be public on GitHub. Project files will remain hosted on your GitHub
              account — CommunityCraft only stores the listing.
            </p>
          </div>

          {/* Auth notice */}
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">🔑</span>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Account required in the future
                </p>
                <p className="mt-0.5 text-xs text-blue-800 dark:text-blue-300">
                  User authentication is not yet implemented. Submissions are currently
                  reviewed manually before appearing in the catalog. In a future version,
                  a GitHub account will be required to submit or manage projects.
                </p>
              </div>
            </div>
          </div>

          {/* Success state */}
          {result?.ok && (
            <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">✅</span>
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {result.name ? `"${result.name}" submitted!` : "Submission received!"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                    {result.message}
                  </p>
                  <a
                    href="/"
                    className="mt-3 inline-flex items-center text-xs font-medium text-emerald-700 underline hover:no-underline dark:text-emerald-400"
                  >
                    ← Back to catalog
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Global error state */}
          {result && !result.ok && (
            <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">⚠️</span>
                <p className="text-rose-900 dark:text-rose-200">{result.message}</p>
              </div>
            </div>
          )}

          {/* Submission form */}
          {!result?.ok && (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="space-y-6">
                {/* GitHub URL */}
                <div>
                  <label
                    htmlFor="githubUrl"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    GitHub Repository URL
                    <span className="ml-1 text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    e.g.{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-800">
                      https://github.com/username/repository-name
                    </code>
                  </p>
                  <input
                    id="githubUrl"
                    name="githubUrl"
                    type="url"
                    required
                    value={form.githubUrl}
                    onChange={handleChange}
                    placeholder="https://github.com/username/my-artcraft-project"
                    aria-describedby={fieldErrors.githubUrl ? "githubUrl-error" : undefined}
                    aria-invalid={!!fieldErrors.githubUrl}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                      fieldErrors.githubUrl
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
                    }`}
                  />
                  {fieldErrors.githubUrl && (
                    <p id="githubUrl-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
                      {fieldErrors.githubUrl}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Category
                    <span className="ml-1 text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={form.category}
                    onChange={handleChange}
                    aria-describedby={fieldErrors.category ? "category-error" : undefined}
                    aria-invalid={!!fieldErrors.category}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
                      fieldErrors.category
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
                    }`}
                  >
                    <option value="" disabled>
                      Select a category…
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p id="category-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
                      {fieldErrors.category}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Description
                    <span className="ml-1 text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
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
                    className={`mt-2 block w-full resize-none rounded-lg border px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                      fieldErrors.description
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
                    }`}
                  />
                  <p
                    id="description-hint"
                    className="mt-1 text-right text-[11px] text-zinc-400"
                    aria-live="polite"
                  >
                    {form.description.length} / 500
                  </p>
                  {fieldErrors.description && (
                    <p id="description-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
                      {fieldErrors.description}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label
                    htmlFor="tags"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Tags{" "}
                    <span className="text-xs font-normal text-zinc-400">(optional)</span>
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Comma-separated, lowercase, no spaces. Up to 10 tags.{" "}
                    <span className="text-zinc-400">
                      e.g. shaders, post-process, glsl
                    </span>
                  </p>
                  <input
                    id="tags"
                    name="tags"
                    type="text"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="modding, cli, voxels, open-source"
                    aria-describedby={fieldErrors.tags ? "tags-error" : undefined}
                    aria-invalid={!!fieldErrors.tags}
                    className={`mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                      fieldErrors.tags
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
                    }`}
                  />
                  {fieldErrors.tags && (
                    <p id="tags-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
                      {fieldErrors.tags}
                    </p>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-between pt-2">
                  <a
                    href="/"
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    ← Back to catalog
                  </a>
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
