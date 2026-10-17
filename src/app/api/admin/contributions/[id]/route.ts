import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/authorization";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const auth = await authorizeAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid request id." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const status = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).status : null;
  if (status !== "new" && status !== "reviewed" && status !== "replied" && status !== "dismissed") {
    return NextResponse.json({ error: "Choose a valid request status." }, { status: 400 });
  }

  const { error } = await auth.supabase.rpc("admin_update_contribution_request", { p_request_id: id, p_status: status });
  if (error) {
    console.error("[admin] Contribution status update failed:", error.code ?? "unknown");
    return NextResponse.json({ error: "The request status was not saved. Check that the admin migration is applied and try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
