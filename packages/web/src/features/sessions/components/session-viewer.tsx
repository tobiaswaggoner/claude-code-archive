"use client";

import { useSession, useSessionEntriesInfinite } from "../hooks/use-sessions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Bot,
  User,
  Wrench,
  ChevronDown,
  AlertCircle,
  Clock,
  Cpu,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Entry } from "../types/session";
import { useMemo } from "react";

interface SessionViewerProps {
  sessionId: string;
}

export function SessionViewer({ sessionId }: SessionViewerProps) {
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const {
    data: entriesData,
    isLoading: entriesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionEntriesInfinite(sessionId, { limit: 50 });

  const entries = useMemo(() => {
    if (!entriesData) return [];
    return entriesData.pages.flatMap((page) => page.items);
  }, [entriesData]);

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Session not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {session.summary || `Session ${session.originalSessionId.slice(0, 8)}`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {session.workspaceHost} - {session.workspaceCwd}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.lastEntryAt
                ? formatDistanceToNow(new Date(session.lastEntryAt), {
                    addSuffix: true,
                  })
                : "-"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {session.entryCount} entries
          </div>
          {session.agents && session.agents.length > 0 && (
            <div className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              {session.agents.length} agent sessions
            </div>
          )}
          {session.modelsUsed && session.modelsUsed.length > 0 && (
            <div className="flex items-center gap-1">
              <Cpu className="h-4 w-4" />
              {session.modelsUsed.join(", ")}
            </div>
          )}
          <div className="flex items-center gap-1 font-mono">
            {formatTokens(session.totalInputTokens)} in /{" "}
            {formatTokens(session.totalOutputTokens)} out
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {entriesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No entries in this session
          </div>
        ) : (
          <>
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}

            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    "Loading..."
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Load more
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface EntryCardProps {
  entry: Entry;
}

function EntryCard({ entry }: EntryCardProps) {
  const { type, subtype, data, timestamp } = entry;

  // Determine the role and styling based on entry type
  const isUser = type === "human" || type === "user";
  const isAssistant = type === "assistant";
  const isToolUse = type === "tool_use" || subtype === "tool_use";
  const isToolResult = type === "tool_result" || subtype === "tool_result";
  const isSystem = type === "system";

  const getIcon = () => {
    if (isUser) return <User className="h-4 w-4" />;
    if (isAssistant) return <Bot className="h-4 w-4" />;
    if (isToolUse || isToolResult) return <Wrench className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (isUser) return "User";
    if (isAssistant) return "Assistant";
    if (isToolUse) return `Tool: ${getToolName(data)}`;
    if (isToolResult) return `Result: ${getToolName(data)}`;
    if (isSystem) return "System";
    return type;
  };

  const getContent = () => {
    // Handle different content structures
    if (data.message && typeof data.message === "object") {
      const message = data.message as { content?: unknown };
      if (typeof message.content === "string") {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        return message.content
          .map((block: unknown) => {
            if (typeof block === "string") return block;
            if (typeof block === "object" && block !== null) {
              const b = block as { type?: string; text?: string; content?: string };
              if (b.type === "text" && b.text) return b.text;
              if (b.content) return b.content;
            }
            return "";
          })
          .join("\n");
      }
    }

    // Direct content
    if (typeof data.content === "string") {
      return data.content;
    }

    // Tool use specific
    if (isToolUse && data.input) {
      return JSON.stringify(data.input, null, 2);
    }

    // Tool result
    if (isToolResult && data.result) {
      if (typeof data.result === "string") return data.result;
      return JSON.stringify(data.result, null, 2);
    }

    // Fallback to raw data
    return JSON.stringify(data, null, 2);
  };

  const bgColor = isUser
    ? "bg-blue-500/10 border-blue-500/20"
    : isAssistant
    ? "bg-card border-border"
    : isToolUse || isToolResult
    ? "bg-orange-500/10 border-orange-500/20"
    : "bg-muted/50 border-border";

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded ${
            isUser
              ? "bg-blue-500/20 text-blue-500"
              : isAssistant
              ? "bg-primary/20 text-primary"
              : isToolUse || isToolResult
              ? "bg-orange-500/20 text-orange-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {getIcon()}
        </div>
        <span className="text-sm font-medium">{getLabel()}</span>
        {timestamp && (
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="text-sm whitespace-pre-wrap break-words">
        {isToolUse || isToolResult ? (
          <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-xs font-mono">
            {getContent()}
          </pre>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {getContent()}
          </div>
        )}
      </div>
    </div>
  );
}

function getToolName(data: Record<string, unknown>): string {
  if (typeof data.name === "string") return data.name;
  if (typeof data.tool === "string") return data.tool;
  if (data.message && typeof data.message === "object") {
    const message = data.message as { name?: string; tool?: string };
    if (message.name) return message.name;
    if (message.tool) return message.tool;
  }
  return "unknown";
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
