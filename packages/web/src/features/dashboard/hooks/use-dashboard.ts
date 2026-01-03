"use client";

import { useQuery } from "@tanstack/react-query";
import { useInject, TOKENS } from "@/core/di";
import type { ProjectsService } from "@/features/projects";
import type { SessionsService } from "@/features/sessions";

interface DashboardStats {
  projectCount: number;
  sessionCount: number;
  totalEntries: number;
  totalTokens: number;
  recentSessions: Array<{
    id: string;
    summary: string | null;
    projectName: string;
    entryCount: number;
    lastEntryAt: string;
  }>;
  topProjects: Array<{
    id: string;
    name: string;
    sessionCount: number;
    workspaceCount: number;
  }>;
}

export function useDashboardStats() {
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch projects and sessions in parallel
      const [projectsRes, sessionsRes] = await Promise.all([
        projectsService.list({ limit: 100 }),
        sessionsService.list({ mainOnly: true, limit: 100 }),
      ]);

      // Calculate totals from sessions
      const totalEntries = sessionsRes.items.reduce(
        (sum, s) => sum + s.entryCount,
        0
      );
      const totalTokens = sessionsRes.items.reduce(
        (sum, s) => sum + (s.totalInputTokens || 0) + (s.totalOutputTokens || 0),
        0
      );

      // Sort projects by session count
      const topProjects = [...projectsRes.items]
        .sort((a, b) => (b.sessionCount || 0) - (a.sessionCount || 0))
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sessionCount: p.sessionCount || 0,
          workspaceCount: p.workspaceCount || 0,
        }));

      // Recent sessions
      const recentSessions = sessionsRes.items.slice(0, 5).map((s) => ({
        id: s.id,
        summary: s.summary,
        projectName: s.projectName || "Unknown",
        entryCount: s.entryCount,
        lastEntryAt: s.lastEntryAt || s.firstEntryAt || "",
      }));

      return {
        projectCount: projectsRes.total,
        sessionCount: sessionsRes.total,
        totalEntries,
        totalTokens,
        recentSessions,
        topProjects,
      };
    },
    staleTime: 60_000, // 1 minute
  });
}
