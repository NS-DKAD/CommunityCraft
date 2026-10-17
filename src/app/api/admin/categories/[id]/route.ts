import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";
import { validateCategoryPresentationInput } from "@/lib/category-catalog";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin && host && new URL(origin).host === host); }
  catch { sameOrigin = false; }
  if (!sameOrigin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const authorization = await authorizeAdminApi();
  if (!authorization.ok) return authorization.response;
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  const validation = validateCategoryPresentationInput(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { error } = await authorization.supabase.rpc("admin_update_project_category_presentation", {
    p_category_id: id,
    p_display_name: validation.displayName,
    p_color: validation.color,
    p_is_active: validation.isActive,
  });
  if (error) {
    console.error("[admin] Category update failed:", error.code ?? "unknown");
    return NextResponse.json({ error: "The category could not be saved. Verify the category migration and admin access." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
