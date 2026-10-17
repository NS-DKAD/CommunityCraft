"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/ssr-browser";

export function LoginForm({ errorCode }: { errorCode?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase Auth is not configured for this environment.");
      setPending(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Fadmin` },
    });
    if (signInError) {
      setError(signInError.message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="w-full rounded-xl bg-[var(--text)] px-4 py-3 text-sm font-semibold text-[var(--bg)] disabled:opacity-60"
      >
        {pending ? "Redirecting to Discord…" : "Sign in with Discord"}
      </button>
      {errorCode === "auth" && <p role="alert" className="text-sm text-rose-400">Discord sign-in could not be completed. Check the Supabase Auth provider setup and try again.</p>}
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      <p className="text-xs leading-5 text-[var(--text-muted)]">Signing in does not grant admin access. Only accounts explicitly added to the CommunityCraft admin allowlist can use this panel.</p>
    </div>
  );
}
