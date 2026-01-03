"use client";

import { useQuery } from "@tanstack/react-query";
import { useInject, TOKENS } from "@/core/di";
import type { ActivityService } from "../services/activity.service";

export function useActivityData(days: number = 365) {
  const activityService = useInject<ActivityService>(TOKENS.ActivityService);

  return useQuery({
    queryKey: ["activity", days],
    queryFn: () => activityService.getActivityData(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
