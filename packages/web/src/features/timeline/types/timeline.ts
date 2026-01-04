/**
 * Timeline types for Gantt-chart style visualization
 */

export interface TimelineSession {
  id: string;
  projectId: string;
  projectName: string;
  firstEntryAt: Date;
  lastEntryAt: Date;
  entryCount: number;
  summary: string | null;
  totalTokens: number;
}

export interface TimelineProject {
  id: string;
  name: string;
  sessions: TimelineSession[];
  sessionCount: number;
  firstSessionAt: Date | null;
  lastSessionAt: Date | null;
}

export type ZoomLevel = "1d" | "1w" | "1m" | "3m" | "1y";

export interface ZoomConfig {
  label: string;
  durationMs: number;
  tickIntervalMs: number;
  tickFormat: string;
  minBarWidth: number;
}

export const ZOOM_CONFIGS: Record<ZoomLevel, ZoomConfig> = {
  "1d": {
    label: "1 Day",
    durationMs: 24 * 60 * 60 * 1000,
    tickIntervalMs: 60 * 60 * 1000, // hourly
    tickFormat: "HH:mm",
    minBarWidth: 4,
  },
  "1w": {
    label: "1 Week",
    durationMs: 7 * 24 * 60 * 60 * 1000,
    tickIntervalMs: 24 * 60 * 60 * 1000, // daily
    tickFormat: "EEE d",
    minBarWidth: 6,
  },
  "1m": {
    label: "1 Month",
    durationMs: 30 * 24 * 60 * 60 * 1000,
    tickIntervalMs: 2 * 24 * 60 * 60 * 1000, // every 2 days
    tickFormat: "MMM d",
    minBarWidth: 4,
  },
  "3m": {
    label: "3 Months",
    durationMs: 90 * 24 * 60 * 60 * 1000,
    tickIntervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
    tickFormat: "MMM d",
    minBarWidth: 3,
  },
  "1y": {
    label: "1 Year",
    durationMs: 365 * 24 * 60 * 60 * 1000,
    tickIntervalMs: 30 * 24 * 60 * 60 * 1000, // monthly
    tickFormat: "MMM",
    minBarWidth: 2,
  },
};

export interface TimelineFilter {
  hiddenProjectIds: string[];
}

export const DEFAULT_TIMELINE_FILTER: TimelineFilter = {
  hiddenProjectIds: [],
};
