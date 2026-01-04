"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/shared/layout";
import { SessionViewer } from "@/features/sessions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = use(params);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Session Details"
        description="View conversation entries"
      >
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sessions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Link>
        </Button>
      </PageHeader>

      <main className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
        <SessionViewer sessionId={id} />
      </main>
    </div>
  );
}
