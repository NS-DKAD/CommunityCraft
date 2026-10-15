import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Checks whether Supabase environment variables are properly configured
 * and not set to placeholder values.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return false;
  }

  // Check against common default placeholders
  if (
    url.includes("your-project-id") ||
    url.includes("your-project-ref") ||
    anonKey.includes("your-anon-public-key")
  ) {
    return false;
  }

  return true;
}

/**
 * Returns a singleton instance of the Supabase client using public credentials.
 * Returns null if Supabase environment variables are not yet configured.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    supabaseInstance = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseInstance;
}
