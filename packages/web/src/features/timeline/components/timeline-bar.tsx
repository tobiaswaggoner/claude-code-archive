"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { TimelineSession } from "../types/timeline";

interface TimelineBarProps {
  session: TimelineSession;
  viewStart: Date;
  viewEnd: Date;
  containerWidth: number;
  minBarWidth: number;
}

export function TimelineBar({
  session,
  viewStart,
  viewEnd,
  containerWidth,
  minBarWidth,
}: TimelineBarProps) {
  const { left, width, isVisible, isPartial } = useMemo(() => {
    const viewDuration = viewEnd.getTime() - viewStart.getTime();
    const pxPerMs = containerWidth / viewDuration;

    // Calculate bar position relative to view
    const sessionStart = session.firstEntryAt.getTime();
    const sessionEnd = session.lastEntryAt.getTime();

    // Check if session is visible in current view
    if (sessionEnd < viewStart.getTime() || sessionStart > viewEnd.getTime()) {
      return { left: 0, width: 0, isVisible: false, isPartial: false };
    }

    // Clamp to view bounds
    const clampedStart = Math.max(sessionStart, viewStart.getTime());
    const clampedEnd = Math.min(sessionEnd, viewEnd.getTime());

    const leftPx = (clampedStart - viewStart.getTime()) * pxPerMs;
    let widthPx = (clampedEnd - clampedStart) * pxPerMs;

    // Enforce minimum width
    if (widthPx < minBarWidth) {
      widthPx = minBarWidth;
    }

    const isPartialView = clampedStart > sessionStart || clampedEnd < sessionEnd;

    return {
      left: leftPx,
      width: widthPx,
      isVisible: true,
      isPartial: isPartialView,
    };
  }, [session, viewStart, viewEnd, containerWidth, minBarWidth]);

  if (!isVisible) {
    return null;
  }

  const durationMinutes = Math.round(
    (session.lastEntryAt.getTime() - session.firstEntryAt.getTime()) / 60000
  );
  const durationText =
    durationMinutes < 60
      ? `${durationMinutes}m`
      : `${Math.round(durationMinutes / 60)}h ${durationMinutes % 60}m`;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Link
          href={`/sessions/${session.id}`}
          className="absolute top-1 h-6 rounded-sm bg-primary/80 hover:bg-primary transition-colors cursor-pointer border border-primary/30"
          style={{
            left: `${left}px`,
            width: `${width}px`,
          }}
          aria-label={`Session: ${session.summary || "No description"}`}
        >
          {width > 40 && (
            <span className="text-xs text-primary-foreground px-1 truncate block leading-6">
              {session.entryCount}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium">
            {format(session.firstEntryAt, "PPp")}
            {isPartial && " (partial view)"}
          </div>
          <div className="text-xs text-muted-foreground">
            Duration: {durationText} | Entries: {session.entryCount} | Tokens:{" "}
            {Math.round(session.totalTokens / 1000)}k
          </div>
          <div className="text-sm line-clamp-2">
            {session.summary || "No description"}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
