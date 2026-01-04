"use client";

import { useState, useMemo } from "react";
import { useProject, useUpdateProject, useProjectCommits } from "../hooks/use-projects";
import { useSessions } from "@/features/sessions/hooks/use-sessions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InlineEditField } from "@/shared/ui";
import {
  AlertCircle,
  GitCommit as GitCommitIcon,
  MessageSquare,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import Link from "next/link";
import type { Session } from "@/features/sessions/types/session";
import type { GitCommit } from "../types/project";

interface ProjectDetailProps {
  projectId: string;
}

type TimelineItem =
  | { type: "session"; data: Session; date: Date }
  | { type: "commit"; data: GitCommit; date: Date };

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { data: project, isLoading, error } = useProject(projectId);
  const updateMutation = useUpdateProject();
  const [showGitHistory, setShowGitHistory] = useState(false);

  // Fetch sessions for this project
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions({
    projectId,
    mainOnly: true,
    sortBy: "lastEntryAt",
    sortOrder: "desc",
    limit: 100,
  });

  // Fetch commits only when toggled
  const { data: commitsData, isLoading: commitsLoading } = useProjectCommits(
    projectId,
    showGitHistory ? { limit: 100, sortOrder: "desc" } : undefined
  );

  // Merge sessions and commits into timeline
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add sessions
    if (sessionsData?.items) {
      for (const session of sessionsData.items) {
        if (session.firstEntryAt) {
          items.push({
            type: "session",
            data: session,
            date: parseISO(session.firstEntryAt),
          });
        }
      }
    }

    // Add commits if toggled
    if (showGitHistory && commitsData?.items) {
      for (const commit of commitsData.items) {
        items.push({
          type: "commit",
          data: commit,
          date: parseISO(commit.authorDate),
        });
      }
    }

    // Sort by date descending
    items.sort((a, b) => b.date.getTime() - a.date.getTime());

    return items;
  }, [sessionsData, commitsData, showGitHistory]);

  const handleUpdateField = async (field: string, value: string | boolean) => {
    if (!project) return;

    const data: Record<string, string | boolean | null> = {};

    if (field === "name" && typeof value === "string") {
      if (!value.trim()) throw new Error("Name is required");
      data.name = value.trim();
    } else if (field === "description" && typeof value === "string") {
      data.description = value.trim() || null;
    } else if (field === "upstreamUrl" && typeof value === "string") {
      if (value && !isValidUrl(value)) {
        throw new Error("Invalid URL");
      }
      data.upstreamUrl = value.trim() || null;
    } else if (field === "archived" && typeof value === "boolean") {
      data.archived = value;
    }

    await updateMutation.mutateAsync({ id: projectId, data });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load project</span>
        </div>
        <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header - Inline Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InlineEditField
              label="Name"
              value={project.name}
              onSave={(value) => handleUpdateField("name", value)}
              placeholder="Project name"
              disabled={updateMutation.isPending}
            />

            <InlineEditField
              label="Upstream URL"
              type="url"
              value={project.upstreamUrl ?? ""}
              onSave={(value) => handleUpdateField("upstreamUrl", value)}
              placeholder="https://github.com/..."
              emptyText="No URL set"
              disabled={updateMutation.isPending}
            />
          </div>

          <InlineEditField
            label="Description"
            value={project.description ?? ""}
            onSave={(value) => handleUpdateField("description", value)}
            placeholder="Project description..."
            emptyText="No description"
            disabled={updateMutation.isPending}
          />

          <div className="flex items-center justify-between border-t pt-4">
            <InlineEditField
              type="checkbox"
              label="Archived"
              value={project.archived}
              onSave={(value) => handleUpdateField("archived", value)}
              checkedLabel="Archived"
              uncheckedLabel="Active"
              disabled={updateMutation.isPending}
            />

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Sessions: {project.sessionCount}</span>
              <span>Repos: {project.gitRepoCount}</span>
              {project.lastWorkedAt && (
                <span>
                  Last active:{" "}
                  {formatDistanceToNow(parseISO(project.lastWorkedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">History</CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-git"
              checked={showGitHistory}
              onCheckedChange={(checked) => setShowGitHistory(checked === true)}
            />
            <Label htmlFor="show-git" className="text-sm cursor-pointer">
              Show Git History
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading || (showGitHistory && commitsLoading) ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sessions or commits found
            </p>
          ) : (
            <div className="space-y-2">
              {timeline.map((item) => (
                <TimelineItemRow key={`${item.type}-${item.type === "session" ? item.data.id : item.data.sha}`} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineItemRow({ item }: { item: TimelineItem }) {
  if (item.type === "session") {
    return <SessionRow session={item.data} />;
  }
  return <CommitRow commit={item.data} />;
}

function SessionRow({ session }: { session: Session }) {
  const description = session.summary || "No description";
  const entryCount = session.entryCount || 0;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
    >
      <div className="mt-0.5 p-1.5 rounded bg-primary/10 text-primary">
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Clock className="h-3 w-3" />
          <span>
            {session.firstEntryAt
              ? format(parseISO(session.firstEntryAt), "PPp")
              : "Unknown date"}
          </span>
          <span className="text-muted-foreground/60">|</span>
          <span>{entryCount} entries</span>
          {session.agentCount && session.agentCount > 0 && (
            <>
              <span className="text-muted-foreground/60">|</span>
              <span>{session.agentCount} agents</span>
            </>
          )}
        </div>
        <p className="text-sm line-clamp-2">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
    </Link>
  );
}

function CommitRow({ commit }: { commit: GitCommit }) {
  const shortSha = commit.sha.slice(0, 7);
  const firstLine = commit.message.split("\n")[0];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 p-1.5 rounded bg-orange-500/10 text-orange-500">
        <GitCommitIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Clock className="h-3 w-3" />
          <span>{format(parseISO(commit.authorDate), "PPp")}</span>
          <span className="text-muted-foreground/60">|</span>
          <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
            {shortSha}
          </code>
          <span className="text-muted-foreground/60">|</span>
          <span>{commit.authorName}</span>
        </div>
        <p className="text-sm line-clamp-1">{firstLine}</p>
      </div>
    </div>
  );
}
