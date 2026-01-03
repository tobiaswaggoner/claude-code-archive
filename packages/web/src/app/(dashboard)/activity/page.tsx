import { PageHeader } from "@/shared/layout";
import { ActivityHeatmap } from "@/features/activity";

export default function ActivityPage() {
  return (
    <>
      <PageHeader
        title="Activity"
        description="Session activity over time"
      />

      <main className="flex-1 overflow-auto p-4 space-y-4">
        <ActivityHeatmap />
      </main>
    </>
  );
}
