import { PageHeader } from "@/shared/layout";
import { ProjectList } from "@/features/projects";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="Browse and search your Claude Code projects"
      />

      <main className="flex-1 overflow-auto p-4">
        <ProjectList />
      </main>
    </>
  );
}
