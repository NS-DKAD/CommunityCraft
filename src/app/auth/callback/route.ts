import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/ssr-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = "/admin";
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/admin/login?error=auth", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] Supabase OAuth code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/admin/login?error=auth", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
