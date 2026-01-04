"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { addMilliseconds, subMilliseconds } from "date-fns";
import { useTimelineData } from "../hooks/use-timeline-data";
import { useTimelineFilter } from "../hooks/use-timeline-filter";
import { TimelineHeader } from "./timeline-header";
import { TimelineRow } from "./timeline-row";
import { TimelineFilterDialog } from "./timeline-filter-dialog";
import { ZOOM_CONFIGS, type ZoomLevel } from "../types/timeline";

const CONTAINER_WIDTH = 1200; // Fixed width for timeline content
const PAN_STEP = 0.25; // Pan by 25% of view

export function Timeline() {
  const { projects, timeRange, isLoading, error, totalSessions } = useTimelineData();
  const {
    filter,
    isLoaded: filterLoaded,
    hideProject,
    toggleProject,
    clearFilter,
    isProjectHidden,
    hiddenCount,
  } = useTimelineFilter();

  const [zoom, setZoom] = useState<ZoomLevel>("1m");
  const [viewStart, setViewStart] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomConfig = ZOOM_CONFIGS[zoom];

  // Calculate view window
  const { currentViewStart, currentViewEnd } = useMemo(() => {
    // Default to showing most recent data
    const defaultEnd = timeRange.end;
    const defaultStart = subMilliseconds(defaultEnd, zoomConfig.durationMs);

    if (viewStart) {
      return {
        currentViewStart: viewStart,
        currentViewEnd: addMilliseconds(viewStart, zoomConfig.durationMs),
      };
    }

    return {
      currentViewStart: defaultStart,
      currentViewEnd: defaultEnd,
    };
  }, [viewStart, zoomConfig.durationMs, timeRange.end]);

  // Filter visible projects
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => !isProjectHidden(p.id));
  }, [projects, isProjectHidden]);

  // Pan handlers
  const panLeft = useCallback(() => {
    const panAmount = zoomConfig.durationMs * PAN_STEP;
    const newStart = subMilliseconds(currentViewStart, panAmount);
    setViewStart(newStart);
  }, [currentViewStart, zoomConfig.durationMs]);

  const panRight = useCallback(() => {
    const panAmount = zoomConfig.durationMs * PAN_STEP;
    const newStart = addMilliseconds(currentViewStart, panAmount);
    setViewStart(newStart);
  }, [currentViewStart, zoomConfig.durationMs]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const newStart = subMilliseconds(now, zoomConfig.durationMs * 0.8);
    setViewStart(newStart);
  }, [zoomConfig.durationMs]);

  // Handle zoom change
  const handleZoomChange = (newZoom: ZoomLevel) => {
    setZoom(newZoom);
    // Reset view to end to show recent data
    setViewStart(null);
  };

  // Loading state
  if (isLoading || !filterLoaded) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Failed to load timeline</span>
          </div>
          <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No session data available for timeline view.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Session Timeline</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {visibleProjects.length} projects | {totalSessions} sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom selector */}
          <Select value={zoom} onValueChange={(v) => handleZoomChange(v as ZoomLevel)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ZOOM_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pan controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={panLeft} title="Pan left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={panRight} title="Pan right">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter dialog */}
          <TimelineFilterDialog
            projects={projects}
            hiddenProjectIds={filter.hiddenProjectIds}
            onToggle={toggleProject}
            onClear={clearFilter}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: `${CONTAINER_WIDTH + 192}px` }}>
            {/* Timeline header with time axis */}
            <TimelineHeader
              viewStart={currentViewStart}
              viewEnd={currentViewEnd}
              containerWidth={CONTAINER_WIDTH}
              zoomConfig={zoomConfig}
            />

            {/* Project rows */}
            <div className="max-h-[60vh] overflow-y-auto">
              {visibleProjects.map((project) => (
                <TimelineRow
                  key={project.id}
                  project={project}
                  viewStart={currentViewStart}
                  viewEnd={currentViewEnd}
                  containerWidth={CONTAINER_WIDTH}
                  zoomConfig={zoomConfig}
                  onHide={hideProject}
                />
              ))}

              {visibleProjects.length === 0 && hiddenCount > 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  All projects are hidden.{" "}
                  <button
                    onClick={clearFilter}
                    className="text-primary hover:underline"
                  >
                    Show all
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
