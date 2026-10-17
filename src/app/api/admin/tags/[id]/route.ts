import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";
import { validateTagPresentationInput } from "@/lib/discover-tags";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin && host && new URL(origin).host === host); }
  catch { sameOrigin = false; }
  if (!sameOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const authorization = await authorizeAdminApi();
  if (!authorization.ok) return authorization.response;
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid canonical tag ID." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  const validation = validateTagPresentationInput(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { error } = await authorization.supabase.rpc("admin_update_tag_presentation", {
    p_tag_id: id,
    p_display_name: validation.displayName,
    p_color: validation.color,
  });
  if (error) {
    console.error("[admin] Tag presentation update failed:", error.code ?? "unknown");
    return NextResponse.json({ error: "The tag presentation could not be saved. Apply the Discover tag migration and verify admin access." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
