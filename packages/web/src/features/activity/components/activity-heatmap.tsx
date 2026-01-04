"use client";

import { useMemo } from "react";
import { useActivityData } from "../hooks/use-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import type { DayActivity } from "../types/activity";

const WEEKS_TO_SHOW = 52;
const DAYS_IN_WEEK = 7;

// Intensity levels based on session count
function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// Intensity colors (GitHub-style green gradient)
const INTENSITY_COLORS = [
  "bg-muted", // 0: no activity
  "bg-emerald-200 dark:bg-emerald-900", // 1: low
  "bg-emerald-400 dark:bg-emerald-700", // 2: medium-low
  "bg-emerald-500 dark:bg-emerald-600", // 3: medium-high
  "bg-emerald-600 dark:bg-emerald-500", // 4: high
];

interface CalendarDay {
  date: Date;
  activity: DayActivity | null;
}

export function ActivityHeatmap() {
  const { data, isLoading, error } = useActivityData(365);

  // Generate calendar grid
  const calendar = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW - 1) * DAYS_IN_WEEK);

    const weeks: CalendarDay[][] = [];
    let currentDate = new Date(startDate);

    for (let week = 0; week < WEEKS_TO_SHOW; week++) {
      const days: CalendarDay[] = [];
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const activity = data?.days.find((d) => d.date === dateStr) ?? null;
        days.push({
          date: new Date(currentDate),
          activity,
        });
        currentDate = addDays(currentDate, 1);
      }
      weeks.push(days);
    }

    return weeks;
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; week: number }[] = [];
    let lastMonth = -1;

    calendar.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: format(firstDayOfWeek, "MMM"),
          week: weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [calendar]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load activity data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Session Activity</CardTitle>
          {data && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{data.totalSessions.toLocaleString()} sessions</span>
              <span>{data.totalEntries.toLocaleString()} entries</span>
              <span>{Math.round(data.totalTokens / 1000).toLocaleString()}k tokens</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-[100px] w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Heatmap grid */}
            <div className="flex gap-[2px]">
              {/* Day labels */}
              <div className="flex flex-col gap-[2px] text-xs text-muted-foreground w-8 shrink-0">
                <span className="h-3"></span>{/* Month label row spacer */}
                <span className="h-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Mon</span>
                <span className="h-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Wed</span>
                <span className="h-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Fri</span>
                <span className="h-[10px]"></span>
              </div>

              {/* Calendar grid with month labels */}
              <div className="flex flex-col gap-[2px]">
                {/* Month labels row */}
                <div className="flex gap-[2px] h-3 mb-1">
                  {calendar.map((week, weekIndex) => {
                    const monthLabel = monthLabels.find((m) => m.week === weekIndex);
                    return (
                      <div key={weekIndex} className="w-[10px] text-xs text-muted-foreground overflow-visible whitespace-nowrap">
                        {monthLabel ? monthLabel.label : ""}
                      </div>
                    );
                  })}
                </div>
                {/* Week columns */}
                <div className="flex gap-[2px]">
                {calendar.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => {
                      const intensity = getIntensityLevel(day.activity?.sessionCount ?? 0);
                      const isToday = isSameDay(day.date, new Date());
                      const isFuture = day.date > new Date();

                      return (
                        <Tooltip key={dayIndex} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div
                              className={`
                                w-[10px] h-[10px] rounded-sm
                                ${isFuture ? "bg-transparent" : INTENSITY_COLORS[intensity]}
                                ${isToday ? "ring-1 ring-primary" : ""}
                                transition-colors
                              `}
                            />
                          </TooltipTrigger>
                          {!isFuture && (
                            <TooltipContent side="top" className="text-xs">
                              <div className="font-medium">
                                {format(day.date, "EEEE, MMMM d, yyyy")}
                              </div>
                              {day.activity ? (
                                <div className="text-muted-foreground">
                                  {day.activity.sessionCount} session{day.activity.sessionCount !== 1 ? "s" : ""}
                                  {" - "}
                                  {day.activity.entryCount.toLocaleString()} entries
                                </div>
                              ) : (
                                <div className="text-muted-foreground">No sessions</div>
                              )}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Less</span>
              {INTENSITY_COLORS.map((color, i) => (
                <div
                  key={i}
                  className={`w-[10px] h-[10px] rounded-sm ${color}`}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
