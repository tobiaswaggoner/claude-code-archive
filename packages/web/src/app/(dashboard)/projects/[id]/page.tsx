"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/shared/layout";
import { ProjectDetail } from "@/features/projects";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Project Details"
        description="View and edit project information"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </PageHeader>

      <main className="flex-1 overflow-auto p-4">
        <ProjectDetail projectId={id} />
      </main>
    </div>
  );
}
