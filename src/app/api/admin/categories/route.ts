import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";
import { validateCreateCategoryInput } from "@/lib/category-catalog";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  try { return Boolean(origin && host && new URL(origin).host === host); }
  catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const authorization = await authorizeAdminApi();
  if (!authorization.ok) return authorization.response;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  const validation = validateCreateCategoryInput(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data, error } = await authorization.supabase.rpc("admin_create_project_category", {
    p_name: validation.name,
    p_slug: validation.slug,
    p_display_name: validation.displayName,
    p_color: validation.color,
  });
  if (error) {
    console.error("[admin] Category creation failed:", error.code ?? "unknown");
    return NextResponse.json({ error: error.code === "23505" ? "A category with that name already exists." : "The category could not be created. Apply the category migration and verify admin access." }, { status: 400 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
