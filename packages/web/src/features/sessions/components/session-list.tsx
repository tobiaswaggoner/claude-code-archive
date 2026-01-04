"use client";

import { useState } from "react";
import Link from "next/link";
import { useSessions } from "../hooks/use-sessions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHead, useUrlSort } from "@/shared/data";
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  Cpu,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SessionSortBy } from "../types/session";

interface SessionListProps {
  projectId?: string;
}

export function SessionList({ projectId }: SessionListProps) {
  const [mainOnly, setMainOnly] = useState(true);

  const { sortBy, sortOrder, currentSort, toggleSort } = useUrlSort<SessionSortBy>({
    defaultColumn: "lastEntryAt",
    defaultOrder: "desc",
  });

  const { data, isLoading, error } = useSessions({
    projectId,
    mainOnly,
    limit: 50,
    sortBy,
    sortOrder,
  });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load sessions: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mainOnly}
            onChange={(e) => setMainOnly(e.target.checked)}
            className="rounded border-input"
          />
          Main sessions only
        </label>
        <div className="text-sm text-muted-foreground">
          {data ? `${data.total} sessions` : "Loading..."}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Session</TableHead>
              <TableHead className="w-[150px]">Project</TableHead>
              <SortableTableHead
                column="entryCount"
                label="Entries"
                currentSort={currentSort}
                onSort={toggleSort}
                className="w-[100px] text-center"
              />
              <TableHead className="w-[100px] text-center">Agents</TableHead>
              <TableHead className="w-[120px]">Models</TableHead>
              <SortableTableHead
                column="totalTokens"
                label="Tokens"
                currentSort={currentSort}
                onSort={toggleSort}
                className="w-[100px] text-right"
              />
              <SortableTableHead
                column="lastEntryAt"
                label="Time"
                currentSort={currentSort}
                onSort={toggleSort}
                className="w-[150px]"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-8 w-8" />
                    <p>No sessions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {getSummaryTitle(session.summary) ||
                            `Session ${session.originalSessionId.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.workspaceHost}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm truncate max-w-[140px]">
                      {session.projectName || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <User className="h-3 w-3" />
                      {session.entryCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Bot className="h-3 w-3" />
                      {session.agentCount ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {session.modelsUsed?.slice(0, 2).map((model) => (
                        <span
                          key={model}
                          className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          <Cpu className="h-3 w-3 mr-1" />
                          {model.includes("claude")
                            ? model.split("-").slice(-1)[0]
                            : model.slice(0, 10)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-mono">
                      {formatTokens(
                        session.totalInputTokens + session.totalOutputTokens
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.lastEntryAt
                        ? formatDistanceToNow(new Date(session.lastEntryAt), {
                            addSuffix: true,
                          })
                        : "-"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

function getSummaryTitle(summary: string | null): string | null {
  if (!summary) return null;
  const firstLine = summary.split("\n")[0].trim();
  return firstLine || null;
}
