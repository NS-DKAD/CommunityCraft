import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/session-proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/auth/callback"],
};
