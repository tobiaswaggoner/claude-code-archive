"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  summary: string | null;
  projectName: string;
  entryCount: number;
  lastEntryAt: string;
}

interface RecentSessionsProps {
  sessions: Session[];
}

function getSummaryTitle(summary: string | null): string | null {
  if (!summary) return null;
  const firstLine = summary.split("\n")[0].trim();
  return firstLine || null;
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Sessions</CardTitle>
        <Link
          href="/sessions"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getSummaryTitle(session.summary) || `Session ${session.id.slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{session.projectName}</span>
                  <span>·</span>
                  <span>{session.entryCount} entries</span>
                  <span>·</span>
                  <span>
                    {session.lastEntryAt
                      ? formatDistanceToNow(new Date(session.lastEntryAt), {
                          addSuffix: true,
                        })
                      : "-"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
