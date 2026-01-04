"use client";

import { useMemo } from "react";
import { useProjects } from "@/features/projects";
import { useSessions } from "@/features/sessions";
import type { TimelineProject, TimelineSession } from "../types/timeline";

export function useTimelineData() {
  // Fetch all projects
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects({
    limit: 200,
    archived: false,
    sortBy: "lastWorkedAt",
    sortOrder: "desc",
  });

  // Fetch all main sessions (max 1000 per API limit)
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useSessions({
    mainOnly: true,
    limit: 1000,
    sortBy: "lastEntryAt",
    sortOrder: "desc",
  });

  // Extract items for stable dependencies
  const projectItems = projectsData?.items;
  const sessionItems = sessionsData?.items;

  // Build timeline projects with their sessions
  const timelineProjects = useMemo(() => {
    if (!projectItems || !sessionItems) {
      return [];
    }

    const projects: TimelineProject[] = [];

    for (const project of projectItems) {
      // Filter sessions for this project
      const projectSessions = sessionItems
        .filter((s) => s.projectName === project.name)
        .filter((s) => s.firstEntryAt && s.lastEntryAt) // Must have valid dates
        .map((s) => ({
          id: s.id,
          projectId: project.id,
          projectName: project.name,
          firstEntryAt: new Date(s.firstEntryAt!),
          lastEntryAt: new Date(s.lastEntryAt!),
          entryCount: s.entryCount,
          summary: s.summary,
          totalTokens: s.totalInputTokens + s.totalOutputTokens,
        })) as TimelineSession[];

      // Only include projects with sessions
      if (projectSessions.length === 0) {
        continue;
      }

      // Sort sessions by start time
      projectSessions.sort((a, b) => a.firstEntryAt.getTime() - b.firstEntryAt.getTime());

      // Calculate project time range
      const firstSessionAt = projectSessions[0].firstEntryAt;
      const lastSessionAt = projectSessions[projectSessions.length - 1].lastEntryAt;

      projects.push({
        id: project.id,
        name: project.name,
        sessions: projectSessions,
        sessionCount: projectSessions.length,
        firstSessionAt,
        lastSessionAt,
      });
    }

    // Sort projects by most recent activity
    projects.sort((a, b) => {
      if (!a.lastSessionAt && !b.lastSessionAt) return 0;
      if (!a.lastSessionAt) return 1;
      if (!b.lastSessionAt) return -1;
      return b.lastSessionAt.getTime() - a.lastSessionAt.getTime();
    });

    return projects;
  }, [projectItems, sessionItems]);

  // Calculate overall time range
  const timeRange = useMemo(() => {
    if (timelineProjects.length === 0) {
      const now = new Date();
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    }

    let minDate = new Date();
    let maxDate = new Date(0);

    for (const project of timelineProjects) {
      if (project.firstSessionAt && project.firstSessionAt < minDate) {
        minDate = project.firstSessionAt;
      }
      if (project.lastSessionAt && project.lastSessionAt > maxDate) {
        maxDate = project.lastSessionAt;
      }
    }

    return { start: minDate, end: maxDate };
  }, [timelineProjects]);

  return {
    projects: timelineProjects,
    timeRange,
    isLoading: projectsLoading || sessionsLoading,
    error: projectsError || sessionsError,
    totalSessions: sessionsData?.items?.length ?? 0,
  };
}
