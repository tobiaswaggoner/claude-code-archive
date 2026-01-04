import { Suspense } from "react";
import { PageHeader } from "@/shared/layout";
import { SessionsPageContent } from "@/features/sessions";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsPage() {
  return (
    <>
      <PageHeader
        title="Sessions"
        description="Browse Claude Code conversation sessions"
      />

      <main className="flex-1 overflow-auto p-4">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          }
        >
          <SessionsPageContent />
        </Suspense>
      </main>
    </>
  );
}
