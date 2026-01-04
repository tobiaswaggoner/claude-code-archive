import { PageHeader } from "@/shared/layout";
import { Timeline } from "@/features/timeline";

export default function TimelinePage() {
  return (
    <>
      <PageHeader
        title="Timeline"
        description="Visual overview of sessions across all projects"
      />

      <main className="flex-1 overflow-auto p-4">
        <Timeline />
      </main>
    </>
  );
}
