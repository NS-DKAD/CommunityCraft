"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { Project } from "@/types/project";
import { ProjectCard } from "@/components/ProjectCard";
import { replacementLevelLabel } from "@/lib/replacements";
import { categoryChipColor, getTintedChipStyle } from "@/lib/chip-style";

interface ProjectDetailClientProps {
  project: Project;
  similarProjects: Project[];
}

const CONTACT_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "discord", label: "Discord" },
  { value: "github", label: "GitHub" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

const CONTRIBUTION_OPTIONS = [
  { value: "coding", label: "Coding" },
  { value: "design", label: "Design" },
  { value: "testing", label: "Testing" },
  { value: "documentation", label: "Documentation" },
  { value: "community", label: "Community / outreach" },
  { value: "other", label: "Other" },
];

const REPORT_OPTIONS = [
  { value: "misleading", label: "Misleading project" },
  { value: "suspicious", label: "Suspicious or harmful" },
  { value: "broken_link", label: "Broken link" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function ProjectDetailClient({ project, similarProjects }: ProjectDetailClientProps) {
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [contributionSubmitState, setContributionSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [contributionSubmitMessage, setContributionSubmitMessage] = useState("");
  const [reportSubmitState, setReportSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [reportSubmitMessage, setReportSubmitMessage] = useState("");
  const [isContributionSubmitting, setIsContributionSubmitting] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    displayName: "",
    contactType: "email",
    contact: "",
    skills: "",
    contributionType: "coding",
    message: "",
  });
  const [reportState, setReportState] = useState({
    reporterName: "",
    reason: "misleading",
    details: "",
  });

  const metadata = [
    { label: "Status", value: project.status ?? "Proposed" },
    { label: "Category", value: project.categoryLabel || project.category },
    { label: "Author", value: project.author },
    { label: "License", value: `${project.license} License` },
    { label: "Last update", value: project.lastUpdated },
  ];

  const links = [
    project.websiteUrl && { label: "Website", href: project.websiteUrl },
    project.discussionUrl && { label: "Discussion", href: project.discussionUrl },
    project.githubUrl && { label: "GitHub", href: project.githubUrl },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  async function handleContributionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContributionSubmitState("idle");
    setContributionSubmitMessage("");
    setIsContributionSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.slug}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          ...formState,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to submit your contribution request.");
      }

      setContributionSubmitState("success");
      setContributionSubmitMessage(json.notificationStatus === "pending"
        ? "Your request has been recorded. Email notification is delayed, but moderators can still review it in the admin panel."
        : json.notificationStatus === "not_configured"
          ? "Your request has been recorded. Email notification is not configured, but moderators can still review it in the admin panel."
        : json.message ?? "Your interest has been sent to the project maintainer.");
      setFormState({
        displayName: "",
        contactType: "email",
        contact: "",
        skills: "",
        contributionType: "coding",
        message: "",
      });
    } catch (error) {
      setContributionSubmitState("error");
      setContributionSubmitMessage(error instanceof Error ? error.message : "Unable to submit your request.");
    } finally {
      setIsContributionSubmitting(false);
    }
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportSubmitState("idle");
    setReportSubmitMessage("");
    setIsReportSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          ...reportState,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to submit the report.");
      }

      setReportSubmitState("success");
      setReportSubmitMessage(json.message ?? "Thanks for reporting this project. It will be reviewed by a moderator.");
      setReportState({ reporterName: "", reason: "misleading", details: "" });
    } catch (error) {
      setReportSubmitState("error");
      setReportSubmitMessage(error instanceof Error ? error.message : "Unable to submit the report.");
    } finally {
      setIsReportSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
        >
          ← Back to catalog
        </Link>
        {project.githubUrl ? (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
          >
            Open on GitHub
          </a>
        ) : null}
      </div>

      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-semibold" style={getTintedChipStyle(categoryChipColor(project.category, project.categoryColor))}>
            {project.categoryLabel || project.category}
          </span>
          {project.status ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
              {project.status}
            </span>
          ) : null}
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--text)]">
          {project.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          by <span className="font-medium text-[var(--text-soft)]">{project.author}</span>
        </p>

        <p className="mt-6 text-base leading-7 text-[var(--text-soft)]">
          {project.description}
        </p>

        {project.goal ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Objective
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{project.goal}</p>
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {item.label}
              </dt>
              <dd className="mt-2 text-sm font-medium text-[var(--text)]">{item.value}</dd>
            </div>
          ))}
        </dl>

        {links.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Links
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-soft)]">
            No additional links have been published for this project yet.
          </div>
        )}

        {project.tags.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Tags
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--text-soft)]"
                  style={getTintedChipStyle(project.tagColors?.[tag])}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {project.replacing && project.replacing.length > 0 ? (
          <section className="mt-8" aria-labelledby="replacing-heading">
            <h2 id="replacing-heading" className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Replaces / Alternatives to
            </h2>
            <ul className="mt-3 space-y-2">
              {project.replacing.map((replacement) => (
                <li key={replacement.applicationId} className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-[var(--text)]">{replacement.applicationName}</span>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                      {replacementLevelLabel(replacement.level)}
                    </span>
                    <Link href={`/?q=${encodeURIComponent(replacement.applicationName)}`} className="font-medium text-emerald-300 underline-offset-2 hover:underline">
                      Find other alternatives
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <section className="mt-8 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Collaboration</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">
              {project.status === "Seeking collaborators" ? "This project is looking for collaborators" : "Project participation"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsContributionOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {isContributionOpen ? "Close form" : "Contribute to this project"}
          </button>
        </div>

        {project.status === "Seeking collaborators" && (
          <p className="mt-3 text-sm text-emerald-300">This project is explicitly open to collaboration.</p>
        )}

        {isContributionOpen && (
          <form onSubmit={handleContributionSubmit} className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-[var(--text-soft)]">
                Name or pseudonym
                <input
                  value={formState.displayName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                  placeholder="Your name or alias"
                  required
                />
              </label>

              <label className="block text-sm text-[var(--text-soft)]">
                Preferred contact
                <select
                  value={formState.contactType}
                  onChange={(e) => setFormState((prev) => ({ ...prev, contactType: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-emerald-500"
                >
                  {CONTACT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm text-[var(--text-soft)]">
              Contact details
              <input
                type="text"
                value={formState.contact}
                onChange={(e) => setFormState((prev) => ({ ...prev, contact: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                placeholder="email@example.com, Discord handle, GitHub profile..."
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-[var(--text-soft)]">
                Skills or domain
                <input
                  value={formState.skills}
                  onChange={(e) => setFormState((prev) => ({ ...prev, skills: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                  placeholder="UI, shaders, performance, docs..."
                  required
                />
              </label>

              <label className="block text-sm text-[var(--text-soft)]">
                How do you want to contribute?
                <select
                  value={formState.contributionType}
                  onChange={(e) => setFormState((prev) => ({ ...prev, contributionType: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-emerald-500"
                >
                  {CONTRIBUTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm text-[var(--text-soft)]">
              Short message (optional)
              <textarea
                value={formState.message}
                onChange={(e) => setFormState((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                placeholder="Tell the project maintainer what you can help with."
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text-muted)]">
                This request is stored privately and only sent to the project owner or moderator review channel.
              </p>
              <button
                type="submit"
                disabled={isContributionSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isContributionSubmitting ? "Sending…" : "Send interest"}
              </button>
            </div>
          </form>
        )}

        {contributionSubmitState !== "idle" && (
          <div
            role={contributionSubmitState === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mt-4 rounded-xl border p-4 text-sm ${
              contributionSubmitState === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {contributionSubmitMessage}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Moderation</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">Report this project</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsReportOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
          >
            {isReportOpen ? "Close report" : "Report project"}
          </button>
        </div>

        {isReportOpen && (
          <form onSubmit={handleReportSubmit} className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
            <label className="block text-sm text-[var(--text-soft)]">
              Reporter name (optional)
              <input
                value={reportState.reporterName}
                onChange={(e) => setReportState((prev) => ({ ...prev, reporterName: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                placeholder="Your name or alias"
              />
            </label>

            <label className="block text-sm text-[var(--text-soft)]">
              Reason
              <select
                value={reportState.reason}
                onChange={(e) => setReportState((prev) => ({ ...prev, reason: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-emerald-500"
              >
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-[var(--text-soft)]">
              Additional detail (optional)
              <textarea
                value={reportState.details}
                onChange={(e) => setReportState((prev) => ({ ...prev, details: e.target.value }))}
                rows={4}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                placeholder="Describe what seems wrong or suspicious."
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isReportSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isReportSubmitting ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}

        {reportSubmitState !== "idle" && (
          <div
            role={reportSubmitState === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mt-4 rounded-xl border p-4 text-sm ${
              reportSubmitState === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {reportSubmitMessage}
          </div>
        )}
      </section>

      {similarProjects.length > 0 ? (
        <section className="mt-8 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Discover</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">Similar projects</h2>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {similarProjects.map((similarProject) => (
              <ProjectCard key={similarProject.id} project={similarProject} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--text-soft)]">
          No similar project is available yet. Explore the wider catalog to discover related work.
        </section>
      )}
    </>
  );
}
