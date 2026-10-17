import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[auth] Sign-out failed:", error.code ?? "unknown");
      return NextResponse.json({ error: "Sign-out could not be completed. Please retry." }, { status: 500 });
    }
  }
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
