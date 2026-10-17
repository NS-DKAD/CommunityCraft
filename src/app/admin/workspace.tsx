"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HISTORICAL_PROJECT_CATEGORIES, PROJECT_CATEGORIES, ProjectCategory, ProjectStatus } from "@/types/project";
import { getTintedChipStyle } from "@/lib/chip-style";
import { formatGroupedSaveStatus, isSameDraft, shouldGuardUnload } from "@/lib/admin/workspace-drafts";

export type AdminProject = {
  id: string;
  slug: string;
  name: string;
  author_name: string;
  description: string;
  category: ProjectCategory;
  tags: string[];
  github_url: string | null;
  is_approved: boolean;
  moderation_status: "pending" | "approved" | "rejected";
  goal: string | null;
  status: ProjectStatus | null;
  source_type: string | null;
  source_verified: boolean | null;
  discussion_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
  replacing: Array<{ name: string; level: string }>;
};

type ProjectDraftFields = {
  name: string;
  authorName: string;
  description: string;
  category: ProjectCategory;
  goal: string;
  status: ProjectStatus;
  githubUrl: string;
  websiteUrl: string;
  discussionUrl: string;
};

function initialProjectDraft(project: AdminProject): ProjectDraftFields {
  return {
    name: project.name,
    authorName: project.author_name,
    description: project.description,
    category: project.category,
    goal: project.goal ?? "",
    status: project.status ?? "Proposed",
    githubUrl: project.github_url ?? "",
    websiteUrl: project.website_url ?? "",
    discussionUrl: project.discussion_url ?? "",
  };
}

type TagDraftFields = {
  displayName: string;
  color: string;
  useColor: boolean;
};

type CategoryDraftFields = {
  displayName: string;
  color: string;
  useColor: boolean;
  isActive: boolean;
};

type NewCategoryDraftFields = {
  name: string;
  displayName: string;
  color: string;
  useColor: boolean;
};

const EMPTY_NEW_CATEGORY: NewCategoryDraftFields = {
  name: "",
  displayName: "",
  color: "#0F766E",
  useColor: false,
};

function initialTagDraft(tag: AdminTag): TagDraftFields {
  return {
    displayName: tag.display_name ?? "",
    color: tag.color ?? "#0F766E",
    useColor: Boolean(tag.color),
  };
}

function initialCategoryDraft(category: AdminCategory): CategoryDraftFields {
  return {
    displayName: category.display_name ?? "",
    color: category.color ?? "#0F766E",
    useColor: Boolean(category.color),
    isActive: category.is_active,
  };
}

export type AdminContribution = {
  id: string;
  project_id: string;
  projectName: string;
  display_name: string;
  contact_type: string;
  contact: string;
  skills: string;
  contribution_type: string;
  message: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

export type AdminReport = {
  id: string;
  project_id: string;
  projectName: string;
  reporter_name: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
};

export type AdminEvent = {
  id: string;
  actor_id: string;
  entity_type: "project" | "contribution_request" | "project_report";
  entity_id: string;
  action: string;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

export type AdminTag = {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  color: string | null;
  is_active: boolean;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
};

const PROJECT_STATUSES: ProjectStatus[] = ["Proposed", "Seeking collaborators", "In development", "Completed", "Inactive"];
const STATE_LABELS: Record<AdminProject["moderation_status"], string> = { pending: "Pending", approved: "Published", rejected: "Rejected" };
const CONTRIBUTION_LABELS: Record<string, string> = { new: "New", reviewed: "In progress", replied: "Treated", dismissed: "Dismissed" };
const REPORT_LABELS: Record<AdminReport["status"], string> = { open: "Open", reviewed: "Reviewed", dismissed: "Dismissed" };

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AdminWorkspace({ projects, contributions, reports, events, tags, categories, loadErrors, adminId }: {
  projects: AdminProject[];
  contributions: AdminContribution[];
  reports: AdminReport[];
  events: AdminEvent[];
  tags: AdminTag[];
  categories: AdminCategory[];
  loadErrors: string[];
  adminId: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState<"projects" | "contributions" | "reports" | "tags" | "categories">("projects");
  const [projectState, setProjectState] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [contributionFilter, setContributionFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState<"all" | AdminReport["status"]>("open");
  const [drafts, setDrafts] = useState<Record<string, ProjectDraftFields>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, TagDraftFields>>({});
  const [tagErrors, setTagErrors] = useState<Record<string, string>>({});
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraftFields>>({});
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});
  const [newCategoryDraft, setNewCategoryDraft] = useState<NewCategoryDraftFields>(EMPTY_NEW_CATEGORY);
  const [newCategoryMessage, setNewCategoryMessage] = useState("");
  const [savingProjectIds, setSavingProjectIds] = useState<string[]>([]);
  const [savingTagIds, setSavingTagIds] = useState<string[]>([]);
  const [savingCategoryIds, setSavingCategoryIds] = useState<string[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavingNewCategory, setIsSavingNewCategory] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const visibleProjects = useMemo(() => projects.filter((project) => project.moderation_status === projectState), [projects, projectState]);
  const visibleContributions = useMemo(() => contributionFilter === "all" ? contributions : contributions.filter((item) => item.status === contributionFilter), [contributions, contributionFilter]);
  const visibleReports = useMemo(() => reportFilter === "all" ? reports : reports.filter((item) => item.status === reportFilter), [reports, reportFilter]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const dirtyProjectIds = useMemo(() => Object.keys(drafts).filter((id) => {
    const project = projects.find((item) => item.id === id);
    return project ? !isSameDraft(drafts[id], initialProjectDraft(project)) : false;
  }), [drafts, projects]);
  const dirtyTagIds = useMemo(() => Object.keys(tagDrafts).filter((id) => {
    const tag = tags.find((item) => item.id === id);
    return tag ? !isSameDraft(tagDrafts[id], initialTagDraft(tag)) : false;
  }), [tagDrafts, tags]);
  const dirtyCategoryIds = useMemo(() => Object.keys(categoryDrafts).filter((id) => {
    const category = categories.find((item) => item.id === id);
    return category ? !isSameDraft(categoryDrafts[id], initialCategoryDraft(category)) : false;
  }), [categoryDrafts, categories]);
  const newCategoryDirty = !isSameDraft(newCategoryDraft, EMPTY_NEW_CATEGORY);
  const dirtyCount = dirtyProjectIds.length + dirtyTagIds.length + dirtyCategoryIds.length + (newCategoryDirty ? 1 : 0);
  const isSavingAny = savingProjectIds.length > 0 || savingTagIds.length > 0 || savingCategoryIds.length > 0 || isSavingNewCategory;

  useEffect(() => {
    if (!shouldGuardUnload(dirtyCount)) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const confirmInternalNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      const stayingOnAdmin = destination.pathname === window.location.pathname;
      if (destination.origin === window.location.origin && !stayingOnAdmin && !window.confirm("You have unsaved drafts. They will be lost if you leave this admin page. Continue?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", confirmInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("click", confirmInternalNavigation, true);
    };
  }, [dirtyCount]);

  function updateProjectDraft(project: AdminProject, fields: ProjectDraftFields) {
    setDrafts((current) => {
      const next = { ...current };
      if (isSameDraft(fields, initialProjectDraft(project))) delete next[project.id];
      else next[project.id] = fields;
      return next;
    });
    setDraftErrors((current) => { const next = { ...current }; delete next[project.id]; return next; });
    setSaveFeedback("");
  }

  function updateTagDraft(tag: AdminTag, fields: TagDraftFields) {
    setTagDrafts((current) => {
      const next = { ...current };
      if (isSameDraft(fields, initialTagDraft(tag))) delete next[tag.id];
      else next[tag.id] = fields;
      return next;
    });
    setTagErrors((current) => { const next = { ...current }; delete next[tag.id]; return next; });
    setSaveFeedback("");
  }

  function updateCategoryDraft(category: AdminCategory, fields: CategoryDraftFields) {
    setCategoryDrafts((current) => {
      const next = { ...current };
      if (isSameDraft(fields, initialCategoryDraft(category))) delete next[category.id];
      else next[category.id] = fields;
      return next;
    });
    setCategoryErrors((current) => { const next = { ...current }; delete next[category.id]; return next; });
    setSaveFeedback("");
  }

  async function persistProjectDraft(project: AdminProject, moderationStatus: AdminProject["moderation_status"]): Promise<{ ok: boolean; error?: string }> {
    const fields = drafts[project.id] ?? initialProjectDraft(project);
    setSavingProjectIds((current) => current.includes(project.id) ? current : [...current, project.id]);
    setDraftErrors((current) => { const next = { ...current }; delete next[project.id]; return next; });
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields, moderationStatus }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The project could not be saved.");
      setDrafts((current) => { const next = { ...current }; delete next[project.id]; return next; });
      return { ok: true };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The project could not be saved.";
      setDraftErrors((current) => ({ ...current, [project.id]: message }));
      return { ok: false, error: message };
    } finally {
      setSavingProjectIds((current) => current.filter((id) => id !== project.id));
    }
  }

  async function persistTagDraft(tag: AdminTag): Promise<{ ok: boolean; error?: string }> {
    const fields = tagDrafts[tag.id] ?? initialTagDraft(tag);
    setSavingTagIds((current) => current.includes(tag.id) ? current : [...current, tag.id]);
    setTagErrors((current) => { const next = { ...current }; delete next[tag.id]; return next; });
    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: fields.displayName.trim() || null, color: fields.useColor ? fields.color : null }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The tag appearance could not be saved.");
      setTagDrafts((current) => { const next = { ...current }; delete next[tag.id]; return next; });
      return { ok: true };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The tag appearance could not be saved.";
      setTagErrors((current) => ({ ...current, [tag.id]: message }));
      return { ok: false, error: message };
    } finally {
      setSavingTagIds((current) => current.filter((id) => id !== tag.id));
    }
  }

  async function persistCategoryDraft(category: AdminCategory): Promise<{ ok: boolean; error?: string }> {
    const fields = categoryDrafts[category.id] ?? initialCategoryDraft(category);
    setSavingCategoryIds((current) => current.includes(category.id) ? current : [...current, category.id]);
    setCategoryErrors((current) => { const next = { ...current }; delete next[category.id]; return next; });
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: fields.displayName.trim() || null, color: fields.useColor ? fields.color : null, isActive: fields.isActive }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The category could not be saved.");
      setCategoryDrafts((current) => { const next = { ...current }; delete next[category.id]; return next; });
      return { ok: true };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The category could not be saved.";
      setCategoryErrors((current) => ({ ...current, [category.id]: message }));
      return { ok: false, error: message };
    } finally {
      setSavingCategoryIds((current) => current.filter((id) => id !== category.id));
    }
  }

  async function saveProject(project: AdminProject, moderationStatus: AdminProject["moderation_status"]) {
    setSaveFeedback("");
    const result = await persistProjectDraft(project, moderationStatus);
    if (result.ok) {
      setSaveFeedback(`${project.name} saved.`);
      router.refresh();
    } else {
      setSaveFeedback(`${project.name} could not be saved. Its draft is still available.`);
    }
  }

  async function saveTag(tag: AdminTag) {
    setSaveFeedback("");
    const result = await persistTagDraft(tag);
    if (result.ok) {
      setSaveFeedback(`${tag.name} saved.`);
      router.refresh();
    } else {
      setSaveFeedback(`${tag.name} could not be saved. Its draft is still available.`);
    }
  }

  async function saveCategory(category: AdminCategory) {
    setSaveFeedback("");
    const result = await persistCategoryDraft(category);
    if (result.ok) {
      setSaveFeedback(`${category.name} saved.`);
      router.refresh();
    } else {
      setSaveFeedback(`${category.name} could not be saved. Its draft is still available.`);
    }
  }

  async function createCategory() {
    setIsSavingNewCategory(true);
    setNewCategoryMessage("");
    setSaveFeedback("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newCategoryDraft.name,
          displayName: newCategoryDraft.displayName.trim() || null,
          color: newCategoryDraft.useColor ? newCategoryDraft.color : null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The category could not be created.");
      setNewCategoryDraft(EMPTY_NEW_CATEGORY);
      setNewCategoryMessage("Category created");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The category could not be created.";
      setNewCategoryMessage(message);
    } finally {
      setIsSavingNewCategory(false);
    }
  }

  async function saveAllDrafts() {
    if (isSavingAll || (dirtyProjectIds.length === 0 && dirtyTagIds.length === 0 && dirtyCategoryIds.length === 0)) return;
    setIsSavingAll(true);
    setSaveFeedback("");
    const savedNames: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    for (const id of dirtyProjectIds) {
      const project = projects.find((item) => item.id === id);
      if (!project) continue;
      const result = await persistProjectDraft(project, project.moderation_status);
      if (result.ok) savedNames.push(project.name);
      else failed.push({ name: project.name, error: result.error ?? "The project could not be saved." });
    }
    for (const id of dirtyTagIds) {
      const tag = tags.find((item) => item.id === id);
      if (!tag) continue;
      const result = await persistTagDraft(tag);
      if (result.ok) savedNames.push(tag.name);
      else failed.push({ name: tag.name, error: result.error ?? "The tag appearance could not be saved." });
    }
    for (const id of dirtyCategoryIds) {
      const category = categories.find((item) => item.id === id);
      if (!category) continue;
      const result = await persistCategoryDraft(category);
      if (result.ok) savedNames.push(category.name);
      else failed.push({ name: category.name, error: result.error ?? "The category could not be saved." });
    }
    if (savedNames.length > 0) router.refresh();
    setSaveFeedback(formatGroupedSaveStatus({ savedNames, failed }));
    setIsSavingAll(false);
  }

  return (
    <main className={`min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8 ${dirtyCount > 0 || saveFeedback ? "pb-28" : ""}`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">CommunityCraft</p><h1 className="mt-2 text-3xl font-bold">Admin panel</h1></div>
          <div className="flex items-center gap-4"><span className="hidden text-xs text-[var(--text-muted)] sm:inline">Admin {adminId.slice(0, 8)}…</span><form action="/auth/signout" method="post"><button className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface)]">Sign out</button></form><Link href="/" className="text-sm text-[var(--text-soft)] hover:text-[var(--text)]">View public site</Link></div>
        </header>

        {loadErrors.map((error) => <p key={error} role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>)}

        <nav className="mb-5 flex gap-2" aria-label="Admin sections">
          <button onClick={() => setSection("projects")} aria-pressed={section === "projects"} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">Projects ({projects.length})</button>
          <button onClick={() => setSection("contributions")} aria-pressed={section === "contributions"} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">Collaboration inbox ({contributions.length})</button>
          <button onClick={() => setSection("reports")} aria-pressed={section === "reports"} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">Project reports ({reports.filter((report) => report.status === "open").length} open)</button>
          <button onClick={() => setSection("tags")} aria-pressed={section === "tags"} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">Discover tags ({tags.length})</button>
          <button onClick={() => setSection("categories")} aria-pressed={section === "categories"} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">Categories ({categories.length})</button>
        </nav>

        {section === "projects" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(250px,0.65fr)_minmax(0,1.35fr)]">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-4 flex flex-wrap gap-2">{(["pending", "approved", "rejected"] as const).map((state) => <button key={state} onClick={() => { setProjectState(state); setSelectedProjectId(null); }} aria-pressed={projectState === state} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs aria-pressed:bg-[var(--text)] aria-pressed:text-[var(--bg)]">{STATE_LABELS[state]} ({projects.filter((project) => project.moderation_status === state).length})</button>)}</div>
              {visibleProjects.length === 0 ? <p className="p-4 text-sm text-[var(--text-muted)]">No projects in this queue.</p> : <ul className="space-y-2">{visibleProjects.map((project) => <li key={project.id}><button onClick={() => setSelectedProjectId(project.id)} aria-pressed={selectedProjectId === project.id} className="w-full rounded-xl border border-[var(--border)] p-3 text-left aria-pressed:border-[var(--text-soft)] aria-pressed:bg-[var(--surface-strong)]"><span className="block font-semibold">{project.name}{dirtyProjectIds.includes(project.id) && <span className="ml-2 text-xs text-amber-300">Unsaved</span>}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{project.category} · {project.author_name} · {dateLabel(project.created_at)}</span>{draftErrors[project.id] && <span role="alert" className="mt-2 block text-xs text-rose-300">Save failed: {draftErrors[project.id]}</span>}</button></li>)}</ul>}
            </section>
              <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">{selectedProject ? <ProjectReview key={selectedProject.id} project={selectedProject} categories={categories} fields={drafts[selectedProject.id] ?? initialProjectDraft(selectedProject)} error={draftErrors[selectedProject.id] ?? ""} saving={savingProjectIds.includes(selectedProject.id)} onDraftChange={(fields) => updateProjectDraft(selectedProject, fields)} onSave={(status) => void saveProject(selectedProject, status)} /> : <p className="p-6 text-sm text-[var(--text-muted)]">Select a project to review its submitted information.</p>}</section>
          </div>
        ) : section === "contributions" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Collaboration requests</h2><label className="text-sm">Status <select value={contributionFilter} onChange={(event) => setContributionFilter(event.target.value)} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"><option value="all">All</option>{Object.entries(CONTRIBUTION_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            {visibleContributions.length === 0 ? <p className="py-8 text-sm text-[var(--text-muted)]">No collaboration requests to show.</p> : <div className="space-y-4">{visibleContributions.map((request) => <ContributionCard key={request.id} request={request} />)}</div>}
          </section>
        ) : section === "reports" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Project reports</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Review reports separately from collaboration requests. Decisions are recorded in moderation activity.</p></div><label className="text-sm">Status <select value={reportFilter} onChange={(event) => setReportFilter(event.target.value as typeof reportFilter)} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"><option value="open">Open</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="all">All</option></select></label></div>
            {visibleReports.length === 0 ? <p className="py-8 text-sm text-[var(--text-muted)]">No project reports to show.</p> : <div className="space-y-4">{visibleReports.map((report) => <ReportCard key={report.id} report={report} />)}</div>}
          </section>
        ) : section === "tags" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-xl font-semibold">Discover tag presentation</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Edit the display label and stored color of existing canonical tags. Public category chips use the category palette. Canonical tag names, slugs, and project associations remain unchanged; new tags cannot be created here.</p>
            {tags.length === 0 ? <p className="py-8 text-sm text-[var(--text-muted)]">No canonical tags are available.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{tags.map((tag) => <TagPresentationCard key={tag.id} tag={tag} fields={tagDrafts[tag.id] ?? initialTagDraft(tag)} error={tagErrors[tag.id] ?? ""} saving={savingTagIds.includes(tag.id)} dirty={dirtyTagIds.includes(tag.id)} onDraftChange={(fields) => updateTagDraft(tag, fields)} onSave={() => void saveTag(tag)} />)}</div>}
          </section>
        ) : (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-xl font-semibold">Project categories</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Create admin-approved categories and manage their public label, color, and availability. Existing project category values are retained. “By ArtCraft” is an editorial status and cannot be added here.</p>
            {categories.length === 0 ? <p className="py-5 text-sm text-[var(--text-muted)]">No category catalog loaded. The category migration must be applied before category management is available.</p> : <><NewCategoryForm fields={newCategoryDraft} message={newCategoryMessage} saving={isSavingNewCategory} onDraftChange={(fields) => { setNewCategoryDraft(fields); setNewCategoryMessage(""); setSaveFeedback(""); }} onCreate={() => void createCategory()} /><div className="mt-4 grid gap-3 md:grid-cols-2">{categories.map((category) => <CategoryPresentationCard key={category.id} category={category} fields={categoryDrafts[category.id] ?? initialCategoryDraft(category)} error={categoryErrors[category.id] ?? ""} saving={savingCategoryIds.includes(category.id)} dirty={dirtyCategoryIds.includes(category.id)} onDraftChange={(fields) => updateCategoryDraft(category, fields)} onSave={() => void saveCategory(category)} />)}</div></>}
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Recent moderation activity</h2>
          {events.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">No recorded admin changes yet.</p> : <ul className="mt-3 divide-y divide-[var(--border)]">{events.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{event.entity_type === "project" ? "Project" : event.entity_type === "project_report" ? "Project report" : "Collaboration request"} · {event.action.replaceAll("_", " ")} · admin {event.actor_id.slice(0, 8)}</span><time className="text-xs text-[var(--text-muted)]">{dateLabel(event.created_at)}</time></li>)}</ul>}
        </section>
      </div>
      {(dirtyCount > 0 || saveFeedback) && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface-strong)]/95 px-4 py-3 shadow-2xl motion-reduce:backdrop-blur-none backdrop-blur-md" role="status" aria-live="polite"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--text-soft)]">{saveFeedback ? `${saveFeedback}${dirtyCount > 0 ? ` · ${dirtyCount} unsaved ${dirtyCount === 1 ? "draft remains" : "drafts remain"}.` : ""}` : `${dirtyCount} unsaved ${dirtyCount === 1 ? "draft" : "drafts"} kept while you move between records and sections.${newCategoryDirty ? " Finish creating a new category in Categories; Save all does not submit that form." : ""}`}</p><div className="flex items-center gap-3">{(dirtyProjectIds.length > 0 || dirtyTagIds.length > 0 || dirtyCategoryIds.length > 0) && <button type="button" onClick={() => void saveAllDrafts()} disabled={isSavingAll || isSavingAny} className="rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:cursor-wait disabled:opacity-60">{isSavingAll ? "Saving all…" : "Save all"}</button>}</div></div></div>}
    </main>
  );
}

function NewCategoryForm({ fields, message, saving, onDraftChange, onCreate }: {
  fields: NewCategoryDraftFields;
  message: string;
  saving: boolean;
  onDraftChange: (fields: NewCategoryDraftFields) => void;
  onCreate: () => void;
}) {
  function set<K extends keyof NewCategoryDraftFields>(key: K, value: NewCategoryDraftFields[K]) {
    onDraftChange({ ...fields, [key]: value });
  }
  return <form onSubmit={(event) => { event.preventDefault(); onCreate(); }} className="mt-5 grid gap-3 rounded-xl border border-[var(--border)] p-4 md:grid-cols-[1fr_1fr_auto_auto]"><label className="text-xs text-[var(--text-muted)]">Canonical category name<input required minLength={2} maxLength={50} value={fields.name} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></label><label className="text-xs text-[var(--text-muted)]">Optional public label<input maxLength={60} value={fields.displayName} onChange={(event) => set("displayName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></label><div className="flex items-end gap-2"><label className="flex items-center gap-1 pb-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={fields.useColor} onChange={(event) => set("useColor", event.target.checked)} />Color</label>{fields.useColor && <input aria-label="New category color" type="color" value={fields.color} onChange={(event) => set("color", event.target.value)} className="h-9 w-12 rounded border border-[var(--border)]" />}</div><div className="flex items-end gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-[var(--text)] px-3 py-2 text-xs font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Creating…" : "Create category"}</button>{message && <span role={message === "Category created" ? "status" : "alert"} className="max-w-48 text-xs text-[var(--text-muted)]">{message}</span>}</div></form>;
}

function CategoryPresentationCard({ category, fields, error, saving, dirty, onDraftChange, onSave }: {
  category: AdminCategory;
  fields: CategoryDraftFields;
  error: string;
  saving: boolean;
  dirty: boolean;
  onDraftChange: (fields: CategoryDraftFields) => void;
  onSave: () => void;
}) {
  function set<K extends keyof CategoryDraftFields>(key: K, value: CategoryDraftFields[K]) {
    onDraftChange({ ...fields, [key]: value });
  }
  return <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="space-y-3 rounded-xl border border-[var(--border)] p-4"><div><p className="font-semibold">{category.name}{dirty && <span className="ml-2 text-xs text-amber-300">Unsaved</span>}{!category.is_active && <span className="ml-2 text-xs text-[var(--text-muted)]">Inactive · historical</span>}</p><p className="text-xs text-[var(--text-muted)]">Stable slug: {category.slug}</p><span className="mt-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide" style={fields.useColor ? getTintedChipStyle(fields.color) : getTintedChipStyle(category.color)}>{fields.displayName.trim() || category.display_name || category.name}</span></div><label className="block text-xs text-[var(--text-muted)]">Public label<input maxLength={60} value={fields.displayName} onChange={(event) => set("displayName", event.target.value)} placeholder={category.name} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></label><div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={fields.isActive} onChange={(event) => set("isActive", event.target.checked)} />Available for new submissions</label><label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={fields.useColor} onChange={(event) => set("useColor", event.target.checked)} />Custom color</label>{fields.useColor && <input aria-label={`Color for ${category.name}`} type="color" value={fields.color} onChange={(event) => set("color", event.target.value)} className="h-9 w-12 rounded border border-[var(--border)] bg-transparent" />}</div>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}<div className="flex items-center gap-3"><button type="submit" disabled={saving} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-60">{saving ? "Saving…" : "Save category"}</button></div></form>;
}

function TagPresentationCard({ tag, fields, error, saving, dirty, onDraftChange, onSave }: {
  tag: AdminTag;
  fields: TagDraftFields;
  error: string;
  saving: boolean;
  dirty: boolean;
  onDraftChange: (fields: TagDraftFields) => void;
  onSave: () => void;
}) {
  function set<K extends keyof TagDraftFields>(key: K, value: TagDraftFields[K]) {
    onDraftChange({ ...fields, [key]: value });
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <div><p className="font-semibold">{tag.name}{dirty && <span className="ml-2 text-xs text-amber-300">Unsaved</span>}{!tag.is_active && <span className="ml-2 text-xs text-[var(--text-muted)]">Inactive</span>}</p><p className="text-xs text-[var(--text-muted)]">Canonical slug: {tag.slug}</p><span className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs" style={fields.useColor ? getTintedChipStyle(fields.color) : getTintedChipStyle(tag.color)}>#{fields.displayName.trim() || tag.display_name || tag.name}</span></div>
      <label className="block text-xs text-[var(--text-muted)]">Discover label<input maxLength={60} value={fields.displayName} onChange={(event) => set("displayName", event.target.value)} placeholder={tag.name} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]" /></label>
      <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={fields.useColor} onChange={(event) => set("useColor", event.target.checked)} />Custom color</label>{fields.useColor && <input aria-label={`Color for ${tag.name}`} type="color" value={fields.color} onChange={(event) => set("color", event.target.value)} className="h-9 w-12 rounded border border-[var(--border)] bg-transparent" />}</div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <div className="flex items-center gap-3"><button type="submit" disabled={saving} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-60">{saving ? "Saving…" : "Save appearance"}</button></div>
    </form>
  );
}

function ProjectReview({ project, categories, fields, error, saving, onDraftChange, onSave }: {
  project: AdminProject;
  categories: AdminCategory[];
  fields: ProjectDraftFields;
  error: string;
  saving: boolean;
  onDraftChange: (fields: ProjectDraftFields) => void;
  onSave: (status: AdminProject["moderation_status"]) => void;
}) {
  const githubUrl = safeExternalUrl(project.github_url);
  const categoryOptions: Array<{ name: string; display_name: string | null; is_active: boolean; color: string | null }> = categories.length > 0
    ? categories.map(({ name, display_name, is_active, color }) => ({ name, display_name, is_active, color }))
    : [...PROJECT_CATEGORIES, ...HISTORICAL_PROJECT_CATEGORIES].map((name) => ({ name, display_name: null, is_active: true, color: null }));
  if (!categoryOptions.some((category) => category.name === project.category)) {
    categoryOptions.unshift({ name: project.category, display_name: null, is_active: false, color: null });
  }
  const categoryColor = categoryOptions.find((category) => category.name === fields.category)?.color;

  function set<K extends keyof ProjectDraftFields>(key: K, value: ProjectDraftFields[K]) { onDraftChange({ ...fields, [key]: value }); }
  const inputClass = "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]";
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(project.moderation_status); }} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{STATE_LABELS[project.moderation_status]}</p><h2 className="mt-1 text-2xl font-bold">Review project</h2></div><div className="flex gap-2">{githubUrl && <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Open GitHub ↗</a>}<Link href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Public detail ↗</Link></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[var(--text-muted)]">Project name<input disabled={saving} className={inputClass} value={fields.name} onChange={(event) => set("name", event.target.value)} /></label><label className="text-xs text-[var(--text-muted)]">Author<input disabled={saving} className={inputClass} value={fields.authorName} onChange={(event) => set("authorName", event.target.value)} /></label></div>
      <label className="block text-xs text-[var(--text-muted)]">Description<textarea disabled={saving} rows={5} className={inputClass} value={fields.description} onChange={(event) => set("description", event.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[var(--text-muted)]">Category<select disabled={saving} className={inputClass} value={fields.category} onChange={(event) => set("category", event.target.value as ProjectCategory)}>{categoryOptions.map((category) => <option key={category.name} value={category.name}>{category.display_name || category.name}{!category.is_active ? " · historical" : ""}</option>)}</select><span className="mt-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide" style={getTintedChipStyle(categoryColor)}>{categoryOptions.find((category) => category.name === fields.category)?.display_name || fields.category}</span></label><label className="text-xs text-[var(--text-muted)]">Project lifecycle<select disabled={saving} className={inputClass} value={fields.status} onChange={(event) => set("status", event.target.value as ProjectStatus)}>{PROJECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div>
      <label className="block text-xs text-[var(--text-muted)]">Goal<input disabled={saving} className={inputClass} value={fields.goal} onChange={(event) => set("goal", event.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[var(--text-muted)]">GitHub repository<input disabled={saving} className={inputClass} value={fields.githubUrl} onChange={(event) => set("githubUrl", event.target.value)} /></label><label className="text-xs text-[var(--text-muted)]">Website<input disabled={saving} className={inputClass} value={fields.websiteUrl} onChange={(event) => set("websiteUrl", event.target.value)} /></label></div>
      <label className="block text-xs text-[var(--text-muted)]">Discussion link<input disabled={saving} className={inputClass} value={fields.discussionUrl} onChange={(event) => set("discussionUrl", event.target.value)} /></label>
      <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs font-semibold text-[var(--text-soft)]">Tags (read only in this panel)</p><p className="mt-1 text-sm text-[var(--text-muted)]">{project.tags?.length ? project.tags.map((tag) => `#${tag}`).join(" ") : "No tags"}</p></div>
      <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs font-semibold text-[var(--text-soft)]">Replacing (read only)</p><p className="mt-1 text-sm text-[var(--text-muted)]">{project.replacing?.length ? project.replacing.map((item) => `${item.name} · ${item.level}`).join("; ") : "No replacement applications recorded"}</p></div>
      {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4"><button type="submit" disabled={saving} className="rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-60">Save changes</button><button type="button" disabled={saving} onClick={() => onSave("approved")} className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 disabled:opacity-60">Save & publish</button><button type="button" disabled={saving} onClick={() => onSave("rejected")} className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-300 disabled:opacity-60">Save & reject</button><button type="button" disabled={saving} onClick={() => onSave("pending")} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60">Save as pending</button></div>
    </form>
  );
}

function ContributionCard({ request }: { request: AdminContribution }) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function updateStatus(nextStatus: string) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/contributions/${request.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The status could not be saved.");
      setStatus(nextStatus);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The status could not be saved."); }
    finally { setSaving(false); }
  }
  return (
    <article className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{request.display_name} · {request.projectName}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{request.contribution_type} · {dateLabel(request.created_at)}</p></div><label className="text-xs text-[var(--text-muted)]">Status<select value={status} disabled={saving} onChange={(event) => void updateStatus(event.target.value)} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1">{Object.entries(CONTRIBUTION_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <p className="mt-3 text-sm"><strong>Contact ({request.contact_type}):</strong> <span className="break-all">{request.contact}</span></p><p className="mt-2 text-sm"><strong>Skills:</strong> {request.skills}</p>{request.message && <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-soft)]">{request.message}</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </article>
  );
}

function ReportCard({ report }: { report: AdminReport }) {
  const router = useRouter();
  const [status, setStatus] = useState<AdminReport["status"]>(report.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function updateStatus(nextStatus: AdminReport["status"]) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The report status could not be saved.");
      setStatus(nextStatus);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The report status could not be saved."); }
    finally { setSaving(false); }
  }
  return (
    <article className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{report.projectName}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{report.reason.replaceAll("_", " ")} · {dateLabel(report.created_at)}{report.reporter_name ? ` · ${report.reporter_name}` : ""}</p></div><label className="text-xs text-[var(--text-muted)]">Status<select value={status} disabled={saving} onChange={(event) => void updateStatus(event.target.value as AdminReport["status"])} className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1">{Object.entries(REPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {report.details && <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-soft)]">{report.details}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </article>
  );
}
