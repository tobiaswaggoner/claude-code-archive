"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
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

// For SSR, we need to track hydration status
function getServerSnapshot(): TimelineFilter {
  return DEFAULT_TIMELINE_FILTER;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useTimelineFilter() {
  // Use useSyncExternalStore for hydration-safe localStorage access
  const storedFilter = useSyncExternalStore(
    subscribe,
    loadFilterFromStorage,
    getServerSnapshot
  );

  const [filter, setFilterState] = useState<TimelineFilter>(storedFilter);
  const isLoaded = true; // Always loaded with useSyncExternalStore

  const setFilter = useCallback((newFilter: TimelineFilter) => {
    setFilterState(newFilter);
    saveFilterToStorage(newFilter);
  }, []);

  const hideProject = useCallback((projectId: string) => {
    setFilter({
      ...filter,
      hiddenProjectIds: [...filter.hiddenProjectIds, projectId],
    });
  }, [filter, setFilter]);

  const showProject = useCallback((projectId: string) => {
    setFilter({
      ...filter,
      hiddenProjectIds: filter.hiddenProjectIds.filter((id) => id !== projectId),
    });
  }, [filter, setFilter]);

  const toggleProject = useCallback((projectId: string) => {
    if (filter.hiddenProjectIds.includes(projectId)) {
      showProject(projectId);
    } else {
      hideProject(projectId);
    }
  }, [filter.hiddenProjectIds, hideProject, showProject]);

  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_TIMELINE_FILTER);
  }, [setFilter]);

  const isProjectHidden = useCallback(
    (projectId: string) => filter.hiddenProjectIds.includes(projectId),
    [filter.hiddenProjectIds]
  );

  return {
    filter,
    isLoaded,
    hideProject,
    showProject,
    toggleProject,
    clearFilter,
    isProjectHidden,
    hiddenCount: filter.hiddenProjectIds.length,
  };
}
