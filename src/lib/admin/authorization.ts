import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";
import { NextResponse } from "next/server";

export async function authorizeAdminApi() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, response: NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 503 }) };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false as const, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_communitycraft_admin");
  if (adminError) {
    console.error("[admin] Admin authorization check failed:", adminError.code ?? "unknown");
    return { ok: false as const, response: NextResponse.json({ error: "Admin access is not configured. Apply the admin migration first." }, { status: 503 }) };
  }
  if (!isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "This account is not on the CommunityCraft admin allowlist." }, { status: 403 }) };
  }

  return { ok: true as const, supabase, userId: userData.user.id };
}
