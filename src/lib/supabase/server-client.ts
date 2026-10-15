import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

/**
 * Creates a Supabase client with the service_role key.
 * This client bypasses Row Level Security and must ONLY be used
 * in server-side code (Route Handlers, Server Actions).
 * NEVER import this in client components or expose it to the browser.
 */
export function getSupabaseServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return null;
  }

  if (
    url.includes("your-project-id") ||
    serviceKey.includes("your-service-role-key")
  ) {
    return null;
  }

  // A new client per call is acceptable here; service clients are server-only.
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isServiceClientConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return (
    !!url &&
    !!serviceKey &&
    !url.includes("your-project-id") &&
    !serviceKey.includes("your-service-role-key")
  );
}
