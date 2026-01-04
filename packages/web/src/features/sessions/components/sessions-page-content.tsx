"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { SessionList } from "./session-list";
import { ProjectFilter } from "./project-filter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function SessionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const projectId = searchParams.get("projectId") ?? undefined;

  const setProjectId = useCallback(
    (id: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("projectId", id);
      } else {
        params.delete("projectId");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProjectFilter value={projectId} onChange={setProjectId} />
        {projectId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProjectId(undefined)}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        )}
      </div>
      <SessionList projectId={projectId} />
    </div>
  );
}
