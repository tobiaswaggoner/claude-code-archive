"use client";

import { TimelineBar } from "./timeline-bar";
import { Button } from "@/components/ui/button";
import { EyeOff } from "lucide-react";
import type { TimelineProject, ZoomConfig } from "../types/timeline";

interface TimelineRowProps {
  project: TimelineProject;
  viewStart: Date;
  viewEnd: Date;
  containerWidth: number;
  zoomConfig: ZoomConfig;
  onHide: (projectId: string) => void;
}

export function TimelineRow({
  project,
  viewStart,
  viewEnd,
  containerWidth,
  zoomConfig,
  onHide,
}: TimelineRowProps) {
  return (
    <div className="flex items-stretch border-b border-border/50 group">
      {/* Project name column */}
      <div className="w-48 shrink-0 flex items-center gap-2 px-3 py-2 bg-muted/30 border-r border-border/50">
        <span className="text-sm truncate flex-1" title={project.name}>
          {project.name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onHide(project.id)}
          title="Hide this project"
        >
          <EyeOff className="h-3 w-3" />
        </Button>
      </div>

      {/* Timeline bars column */}
      <div
        className="relative flex-1 min-h-8 bg-muted/10"
        style={{ width: `${containerWidth}px` }}
      >
        {project.sessions.map((session) => (
          <TimelineBar
            key={session.id}
            session={session}
            viewStart={viewStart}
            viewEnd={viewEnd}
            containerWidth={containerWidth}
            minBarWidth={zoomConfig.minBarWidth}
          />
        ))}
      </div>
    </div>
  );
}
