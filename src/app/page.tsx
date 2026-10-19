import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { ProjectCatalogServer } from "@/components/ProjectCatalogServer";

interface HomeProps {
  searchParams: Promise<{ q?: string }>;
}

async function CatalogForSearch({ searchParams }: HomeProps) {
  const { q = "" } = await searchParams;
  return <ProjectCatalogServer initialQuery={q} />;
}

export default function Home({ searchParams }: HomeProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />

      <main id="discover" className="flex-1 overflow-x-hidden">
        <section className="relative isolate overflow-hidden border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_24%),radial-gradient(circle_at_85%_20%,_rgba(17,24,39,0.08),_transparent_18%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,0.18),_transparent_28%)]" />
          <div className="absolute -left-20 top-16 -z-10 h-72 w-72 rounded-full bg-[var(--surface-soft)] blur-3xl" />
          <div className="absolute right-10 top-10 -z-10 h-80 w-80 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] blur-3xl" />

          <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-[var(--text-soft)] backdrop-blur-sm shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                </span>
                <span className="font-semibold uppercase tracking-[0.2em] text-[var(--text)]">Open Community Directory</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-emerald-400 font-medium">Live Connected</span>
              </div>

              <h1 className="text-4xl font-black tracking-[-0.06em] text-[var(--text)] sm:text-5xl md:text-6xl lg:text-7xl">
                Discover ArtCraft projects
                <span className="block text-[var(--text-soft)]">built by a collaborative community.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--text-soft)] sm:text-lg">
                CommunityCraft helps you find tools, mods, shaders, libraries and collaborators
                across the ArtCraft ecosystem — while keeping project ownership and coordination
                grounded in the people who build them.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/#catalog"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--text)] px-6 py-3 text-sm font-semibold text-[var(--bg)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--text)]/30"
                >
                  Discover Projects
                </Link>
                <Link
                  href="/submit"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)] backdrop-blur-md transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--text)]/20"
                >
                  Submit a project
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">Software</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">Website</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">Plugin</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">Games</span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">Mods</span>
              </div>
            </div>
          </div>
        </section>

        <div className="relative z-10 -mt-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">
            <Suspense fallback={<CatalogSkeleton />}>
              <CatalogForSearch searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
