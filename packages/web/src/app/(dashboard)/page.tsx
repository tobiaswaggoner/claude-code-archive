import { PageHeader } from "@/shared/layout";
import { Dashboard } from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your Claude Code Archive"
      />

      <main className="flex-1 overflow-auto p-4">
        <Dashboard />
      </main>
    </>
  );
}
