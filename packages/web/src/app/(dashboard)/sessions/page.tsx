import { PageHeader } from "@/shared/layout";
import { SessionList } from "@/features/sessions";

export default function SessionsPage() {
  return (
    <>
      <PageHeader
        title="Sessions"
        description="Browse Claude Code conversation sessions"
      />

      <main className="flex-1 overflow-auto p-4">
        <SessionList />
      </main>
    </>
  );
}
