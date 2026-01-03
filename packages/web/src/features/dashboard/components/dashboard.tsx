"use client";

import { useDashboardStats } from "../hooks/use-dashboard";
import { StatsCards } from "./stats-cards";
import { RecentSessions } from "./recent-sessions";
import { TopProjects } from "./top-projects";
import { ActivityHeatmap } from "@/features/activity";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { data, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load dashboard data
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <Skeleton className="h-[200px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards
        projectCount={data.projectCount}
        sessionCount={data.sessionCount}
        totalEntries={data.totalEntries}
        totalTokens={data.totalTokens}
      />

      {/* Activity Heatmap */}
      <ActivityHeatmap />

      {/* Recent Sessions and Top Projects */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentSessions sessions={data.recentSessions} />
        <TopProjects projects={data.topProjects} />
      </div>
    </div>
  );
}
