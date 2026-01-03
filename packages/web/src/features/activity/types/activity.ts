/** Activity data for a single day */
export interface DayActivity {
  date: string; // YYYY-MM-DD format
  sessionCount: number;
  entryCount: number;
  tokenCount: number;
}

/** Activity heatmap data for a date range */
export interface ActivityData {
  days: DayActivity[];
  totalSessions: number;
  totalEntries: number;
  totalTokens: number;
  startDate: string;
  endDate: string;
}

/** Session data needed for activity aggregation */
export interface ActivitySession {
  id: string;
  firstEntryAt: string;
  lastEntryAt: string;
  entryCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  projectName: string;
}
