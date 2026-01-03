import type { ApiClient } from "@/core/api";
import type { ActivityData, ActivitySession, DayActivity } from "../types/activity";

interface SessionListResponse {
  items: ActivitySession[];
  total: number;
  limit: number;
  offset: number;
}

export class ActivityService {
  constructor(private api: ApiClient) {}

  /**
   * Fetch all sessions and aggregate by day for the heatmap
   * We fetch main sessions only (no agents) for a cleaner view
   */
  async getActivityData(days: number = 365): Promise<ActivityData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch sessions (main sessions only, exclude agents)
    // The API may have limits, so we fetch in batches
    const allSessions: ActivitySession[] = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const response = await this.api.get<SessionListResponse>("/api/sessions", {
        mainOnly: true,
        limit,
        offset,
      });

      allSessions.push(...response.items);
      offset += limit;
      hasMore = response.items.length === limit && offset < response.total;
    }

    // Aggregate by day
    const dayMap = new Map<string, DayActivity>();

    for (const session of allSessions) {
      const date = session.firstEntryAt.split("T")[0];
      const sessionDate = new Date(date);

      // Skip sessions outside our date range
      if (sessionDate < startDate || sessionDate > endDate) continue;

      const existing = dayMap.get(date);
      if (existing) {
        existing.sessionCount += 1;
        existing.entryCount += session.entryCount;
        existing.tokenCount += session.totalInputTokens + session.totalOutputTokens;
      } else {
        dayMap.set(date, {
          date,
          sessionCount: 1,
          entryCount: session.entryCount,
          tokenCount: session.totalInputTokens + session.totalOutputTokens,
        });
      }
    }

    // Convert to sorted array
    const days_data = Array.from(dayMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals
    const totals = days_data.reduce(
      (acc, day) => ({
        sessions: acc.sessions + day.sessionCount,
        entries: acc.entries + day.entryCount,
        tokens: acc.tokens + day.tokenCount,
      }),
      { sessions: 0, entries: 0, tokens: 0 }
    );

    return {
      days: days_data,
      totalSessions: totals.sessions,
      totalEntries: totals.entries,
      totalTokens: totals.tokens,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  }
}
