import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { AdminWorkspace, type AdminContribution, type AdminProject, type AdminReport, type AdminEvent, type AdminTag, type AdminCategory } from "./workspace";

function SetupMessage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-[var(--text)]">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h1 className="text-2xl font-bold">Admin panel setup</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{children}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm"><form action="/auth/signout" method="post"><button className="text-[var(--text-soft)] underline">Sign out</button></form><Link href="/" className="text-[var(--text-soft)] underline">Return to site</Link></div>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<main className="mx-auto max-w-3xl px-5 py-16 text-sm text-[var(--text-muted)]">Loading the admin panel…</main>}><AdminContent /></Suspense>;
}

async function AdminContent() {
  // Auth cookies and admin data are request-specific. Opt out of prerendering
  // before reading them so Next does not evaluate request-time values at build.
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <SetupMessage>Supabase Auth is not configured. Add the public Supabase URL and anon key before using admin sign-in.</SetupMessage>;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/admin/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_communitycraft_admin");
  if (adminError) return <SetupMessage>Admin access is not configured yet. Apply the reviewed SQL migration, then add an administrator through Supabase SQL Editor.</SetupMessage>;
  if (!isAdmin) {
    return (
      <SetupMessage>
        This signed-in account is not authorized. Discord sign-in alone does not grant access. To allowlist this account, use its Supabase Auth ID <code className="break-all">{userData.user.id}</code> in the one-time setup step documented in README.md.
      </SetupMessage>
    );
  }

  const [{ data: projectRows, error: projectsError }, { data: requestRows, error: requestsError }, { data: reportRows, error: reportsError }, { data: eventRows, error: eventsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("project_contribution_requests").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("project_reports").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("moderation_events").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("project_categories").select("id, name, slug, display_name, color, is_active, sort_order").order("sort_order").limit(500),
  ]);
  let { data: tagRows, error: tagReadError } = await supabase
    .from("tags").select("id, name, slug, display_name, color, is_active").order("name").limit(500);
  if (tagReadError) {
    const fallbackTags = await supabase.from("tags").select("id, name, slug, is_active").order("name").limit(500);
    tagRows = fallbackTags.data?.map((tag) => ({ ...tag, display_name: null, color: null })) ?? null;
    tagReadError = fallbackTags.error;
  }

  const projects = (projectRows ?? []).map((project) => ({
    ...project,
    tags: [],
    replacing: [],
    proposed_tags: Array.isArray(project.proposed_tags) ? project.proposed_tags : [],
    proposed_replacements: Array.isArray(project.proposed_replacements) ? project.proposed_replacements : [],
  })) as AdminProject[];
  let tagsError: string | null = null;
  let replacementsError: string | null = null;
  if (projects.length > 0) {
    const { data: projectTagRows, error: projectTagError } = await supabase
      .from("project_tags")
      .select("project_id, tag_id")
      .in("project_id", projects.map((project) => project.id));
    if (projectTagError) {
      tagsError = "Canonical project tags could not be loaded. The panel is not showing legacy free-form tags.";
    } else if (projectTagRows?.length) {
      const tagIds = Array.from(new Set(projectTagRows.map((row) => row.tag_id)));
      const { data: tagRows, error: canonicalTagsError } = await supabase.from("tags").select("id, name").in("id", tagIds);
      if (canonicalTagsError) {
        tagsError = "Canonical tag names could not be loaded. The panel is not showing legacy free-form tags.";
      } else {
        const tagNamesById = new Map((tagRows ?? []).map((tag) => [tag.id, tag.name]));
        for (const project of projects) {
          project.tags = projectTagRows
            .filter((row) => row.project_id === project.id)
            .map((row) => tagNamesById.get(row.tag_id))
            .filter((name): name is string => Boolean(name));
        }
      }
    }
  }
  if (projects.length > 0) {
    const { data: replacementRows, error: replacementReadError } = await supabase
      .from("project_replacements")
      .select("project_id, application_id, replacement_level")
      .in("project_id", projects.map((project) => project.id));
    if (replacementReadError) {
      replacementsError = "Replacing information could not be loaded.";
    } else if (replacementRows?.length) {
      const applicationIds = Array.from(new Set(replacementRows.map((row) => row.application_id)));
      const { data: applicationRows, error: applicationReadError } = await supabase.from("applications").select("id, name").in("id", applicationIds);
      if (applicationReadError) {
        replacementsError = "Replacing application names could not be loaded.";
      } else {
        const applicationById = new Map((applicationRows ?? []).map((application) => [application.id, application.name]));
        for (const row of replacementRows) {
          const project = projects.find((item) => item.id === row.project_id);
          const name = applicationById.get(row.application_id);
          if (project && name) project.replacing.push({ name, level: row.replacement_level });
        }
      }
    }
  }
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const contributions = (requestRows ?? []).map((request) => ({
    ...request,
    projectName: projectNameById.get(request.project_id) ?? "Unknown project",
  })) as AdminContribution[];
  const reports = (reportRows ?? []).map((report) => ({
    ...report,
    projectName: projectNameById.get(report.project_id) ?? "Unknown project",
  })) as AdminReport[];
  const missingReportProjectIds = Array.from(new Set(reports
    .map((report) => report.project_id)
    .filter((projectId) => !projectNameById.has(projectId))));
  let reportProjectNamesLoadError = false;
  if (missingReportProjectIds.length > 0) {
    const { data: reportProjects, error: reportProjectsError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", missingReportProjectIds);
    if (reportProjectsError) {
      reportProjectNamesLoadError = true;
      console.error("[admin] Report project names could not be loaded:", reportProjectsError.code ?? "unknown");
    } else {
      for (const project of reportProjects ?? []) projectNameById.set(project.id, project.name);
      for (const report of reports) report.projectName = projectNameById.get(report.project_id) ?? report.projectName;
    }
  }

  return (
    <AdminWorkspace
      projects={projects}
      contributions={contributions}
      reports={reports}
      events={(eventRows ?? []) as AdminEvent[]}
      tags={(tagRows ?? []) as AdminTag[]}
      categories={(categoryRows ?? []) as AdminCategory[]}
      loadErrors={[
        projectsError && "Project queue could not be loaded. Apply the admin migration and verify its RLS permissions.",
        requestsError && "Collaboration requests could not be loaded. Verify the requests table and admin policies.",
        reportsError && "Project reports could not be loaded. Apply the reviewed project-report admin migration and verify its RLS policy.",
        reportProjectNamesLoadError && "Some project names for reports could not be loaded.",
        eventsError && "Audit history is unavailable.",
        tagReadError && "Tag presentation fields are unavailable. Apply the documented Discover tag migration before editing labels or colors.",
        categoriesError && "The category catalog is unavailable. Review and apply the documented project category migration before managing categories.",
        tagsError,
        replacementsError,
        (projectRows?.length ?? 0) === 500 && "Only the latest 500 projects are loaded.",
        (requestRows?.length ?? 0) === 500 && "Only the latest 500 collaboration requests are loaded.",
        (reportRows?.length ?? 0) === 500 && "Only the latest 500 project reports are loaded.",
      ].filter((value): value is string => Boolean(value))}
      adminId={userData.user.id}
    />
  );
}
