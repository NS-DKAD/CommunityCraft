import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";
import { validateAdminProjectUpdate } from "@/lib/admin/validation";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const auth = await authorizeAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid project id." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const validated = validateAdminProjectUpdate(body);
  if (!validated.valid) return NextResponse.json({ error: validated.error }, { status: 400 });

  const { fields } = validated;
  const { error } = await auth.supabase.rpc("admin_save_project", {
    p_project_id: id,
    p_fields: {
      name: fields.name,
      author_name: fields.authorName,
      description: fields.description,
      category: fields.category,
      goal: fields.goal,
      status: fields.status,
      github_url: fields.githubUrl,
      website_url: fields.websiteUrl,
      discussion_url: fields.discussionUrl,
    },
    p_moderation_status: validated.moderationStatus,
  });
  if (error) {
    console.error("[admin] Project review save failed:", error.code ?? "unknown");
    return NextResponse.json({ error: "The project was not saved. Check that the admin migration is applied and try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
