import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const auth = await authorizeAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload.action;

  if (action === "approve_tag") {
    const tagName = typeof payload.tagName === "string" ? payload.tagName.trim() : "";
    const tagSlug = typeof payload.tagSlug === "string" ? payload.tagSlug.trim() : "";

    if (!tagName || !tagSlug) {
      return NextResponse.json({ error: "Tag name and slug are required." }, { status: 400 });
    }

    const { error } = await (auth.supabase as any).rpc('admin_approve_proposed_tag', {
      p_project_id: id,
      p_tag_name: tagName,
      p_tag_slug: tagSlug,
    });

    if (error) {
      console.error("[admin] Tag approval failed:", error.message);
      return NextResponse.json({ error: "Could not approve tag. Verify migration 20261021." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "approve_application") {
    const appName = typeof payload.appName === "string" ? payload.appName.trim() : "";
    const appSlug = typeof payload.appSlug === "string" ? payload.appSlug.trim() : "";
    const level = typeof payload.level === "string" ? payload.level : "Partial";

    if (!appName || !appSlug) {
      return NextResponse.json({ error: "Application name and slug are required." }, { status: 400 });
    }

    const { error } = await (auth.supabase as any).rpc('admin_approve_proposed_application', {
      p_project_id: id,
      p_app_name: appName,
      p_app_slug: appSlug,
      p_level: level,
    });

    if (error) {
      console.error("[admin] Application approval failed:", error.message);
      return NextResponse.json({ error: "Could not approve application. Verify migration 20261021." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "dismiss_tag") {
    const tagName = typeof payload.tagName === "string" ? payload.tagName.trim() : "";
    if (!tagName) {
      return NextResponse.json({ error: "Tag name is required." }, { status: 400 });
    }

    // Retrieve current proposed_tags and remove the dismissed tag
    const { data: projectRow, error: fetchError } = await (auth.supabase as any).from("projects").select("proposed_tags").eq("id", id).maybeSingle();

    if (fetchError || !projectRow) {
      return NextResponse.json({ error: "Could not locate project." }, { status: 404 });
    }

    const currentTags = Array.isArray(projectRow.proposed_tags) ? (projectRow.proposed_tags as string[]) : [];
    const updatedTags = currentTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase());

    const { error: updateError } = await (auth.supabase as any)
      .from("projects")
      .update({ proposed_tags: updatedTags } as any)
      .eq("id", id);

    if (updateError) {
      console.error("[admin] Tag dismissal failed:", updateError.message);
      return NextResponse.json({ error: "Could not dismiss tag." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "dismiss_application") {
    const appName = typeof payload.appName === "string" ? payload.appName.trim() : "";
    if (!appName) {
      return NextResponse.json({ error: "Application name is required." }, { status: 400 });
    }

    // Retrieve current proposed_replacements and remove the dismissed application
    const { data: projectRow, error: fetchError } = await (auth.supabase as any).from("projects").select("proposed_replacements").eq("id", id).maybeSingle();

    if (fetchError || !projectRow) {
      return NextResponse.json({ error: "Could not locate project." }, { status: 404 });
    }

    const currentApps = Array.isArray(projectRow.proposed_replacements)
      ? (projectRow.proposed_replacements as Array<{ name?: string; level?: string }>)
      : [];
    const updatedApps = currentApps.filter((item) => String(item.name ?? "").toLowerCase() !== appName.toLowerCase());

    const { error: updateError } = await (auth.supabase as any)
      .from("projects")
      .update({ proposed_replacements: updatedApps } as any)
      .eq("id", id);

    if (updateError) {
      console.error("[admin] Application dismissal failed:", updateError.message);
      return NextResponse.json({ error: "Could not dismiss application." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
