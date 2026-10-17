import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <Suspense fallback={<LoginShell><p className="text-sm text-[var(--text-muted)]">Loading sign-in…</p></LoginShell>}><AdminLoginContent searchParams={searchParams} /></Suspense>;
}

function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12 text-[var(--text)]">
      <Link href="/" className="mb-8 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← CommunityCraft</Link>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Restricted area</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Admin sign in</h1>
        <p className="mb-6 mt-3 text-sm leading-6 text-[var(--text-soft)]">Use Discord to authenticate. Admin permission is checked separately on the server.</p>
        {children}
      </section>
    </main>
  );
}

async function AdminLoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <LoginShell><LoginForm errorCode={error} /></LoginShell>
  );
}
