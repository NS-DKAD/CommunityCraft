import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProjectDetailClient } from "../../../components/ProjectDetailClient";
import { getProjectBySlug, getSimilarProjects } from "@/lib/projects";

export const instant = false;

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await connection();

  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const similarProjects = await getSimilarProjects(project);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <ProjectDetailClient project={project} similarProjects={similarProjects} />
      </main>

      <Footer />
    </div>
  );
}
