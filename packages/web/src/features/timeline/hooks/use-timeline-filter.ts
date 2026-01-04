"use client";

import { useState, useCallback } from "react";
import type { TimelineFilter } from "../types/timeline";
import { DEFAULT_TIMELINE_FILTER } from "../types/timeline";

const STORAGE_KEY = "timeline-filter";

function loadFilterFromStorage(): TimelineFilter {
  if (typeof window === "undefined") {
    return DEFAULT_TIMELINE_FILTER;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TimelineFilter;
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_TIMELINE_FILTER;
}

function saveFilterToStorage(filter: TimelineFilter): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch {
    // Ignore storage errors
  }
}

export function useTimelineFilter() {
  // Lazy initialization from localStorage (runs only on client)
  const [filter, setFilterState] = useState<TimelineFilter>(() => loadFilterFromStorage());

  const hideProject = useCallback((projectId: string) => {
    setFilterState((prev) => {
      const newFilter = {
        ...prev,
        hiddenProjectIds: [...prev.hiddenProjectIds, projectId],
      };
      saveFilterToStorage(newFilter);
      return newFilter;
    });
  }, []);

  const showProject = useCallback((projectId: string) => {
    setFilterState((prev) => {
      const newFilter = {
        ...prev,
        hiddenProjectIds: prev.hiddenProjectIds.filter((id) => id !== projectId),
      };
      saveFilterToStorage(newFilter);
      return newFilter;
    });
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setFilterState((prev) => {
      const isHidden = prev.hiddenProjectIds.includes(projectId);
      const newFilter = {
        ...prev,
        hiddenProjectIds: isHidden
          ? prev.hiddenProjectIds.filter((id) => id !== projectId)
          : [...prev.hiddenProjectIds, projectId],
      };
      saveFilterToStorage(newFilter);
      return newFilter;
    });
  }, []);

  const clearFilter = useCallback(() => {
    setFilterState(DEFAULT_TIMELINE_FILTER);
    saveFilterToStorage(DEFAULT_TIMELINE_FILTER);
  }, []);

  const isProjectHidden = useCallback(
    (projectId: string) => filter.hiddenProjectIds.includes(projectId),
    [filter.hiddenProjectIds]
  );

  return {
    filter,
    isLoaded: true,
    hideProject,
    showProject,
    toggleProject,
    clearFilter,
    isProjectHidden,
    hiddenCount: filter.hiddenProjectIds.length,
  };
}
