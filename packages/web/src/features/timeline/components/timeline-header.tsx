"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { ZoomConfig } from "../types/timeline";

interface TimelineHeaderProps {
  viewStart: Date;
  viewEnd: Date;
  containerWidth: number;
  zoomConfig: ZoomConfig;
}

export function TimelineHeader({
  viewStart,
  viewEnd,
  containerWidth,
  zoomConfig,
}: TimelineHeaderProps) {
  // Generate tick marks
  const ticks = useMemo(() => {
    const result: { position: number; label: string }[] = [];
    const viewDuration = viewEnd.getTime() - viewStart.getTime();
    const pxPerMs = containerWidth / viewDuration;

    // Find first tick position (aligned to interval)
    const firstTickTime =
      Math.ceil(viewStart.getTime() / zoomConfig.tickIntervalMs) *
      zoomConfig.tickIntervalMs;

    let currentTime = firstTickTime;
    while (currentTime <= viewEnd.getTime()) {
      const position = (currentTime - viewStart.getTime()) * pxPerMs;
      const date = new Date(currentTime);
      const label = format(date, zoomConfig.tickFormat);

      result.push({ position, label });
      currentTime += zoomConfig.tickIntervalMs;
    }

    return result;
  }, [viewStart, viewEnd, containerWidth, zoomConfig]);

  return (
    <div className="flex items-stretch border-b border-border">
      {/* Project name column header */}
      <div className="w-48 shrink-0 flex items-center px-3 py-2 bg-muted border-r border-border">
        <span className="text-xs font-medium text-muted-foreground">Project</span>
      </div>

      {/* Timeline axis */}
      <div
        className="relative flex-1 h-8 bg-muted/50"
        style={{ width: `${containerWidth}px` }}
      >
        {ticks.map((tick, index) => (
          <div
            key={index}
            className="absolute top-0 h-full border-l border-border/50"
            style={{ left: `${tick.position}px` }}
          >
            <span className="absolute top-1 left-1 text-xs text-muted-foreground whitespace-nowrap">
              {tick.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
