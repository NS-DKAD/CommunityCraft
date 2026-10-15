import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { ProjectCatalogServer } from "@/components/ProjectCatalogServer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Static Hero Section - Prerendered instantly */}
        <section className="border-b border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Open Community Directory
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl md:text-5xl">
              The Community Directory for <span className="text-emerald-600 dark:text-emerald-400">ArtCraft</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Discover, explore, and share mods, shaders, scripts, and tools built by the
              community. Project files remain hosted with their authors on GitHub.
            </p>
          </div>
        </section>

        {/* Dynamic Catalog Section with streaming Suspense boundary */}
        <Suspense fallback={<CatalogSkeleton />}>
          <ProjectCatalogServer />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
