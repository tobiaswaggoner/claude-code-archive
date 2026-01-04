"use client";

import { useSession, useSessionEntriesInfinite } from "../hooks/use-sessions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { CollapsibleContent } from "@/shared/ui";
import {
  MessageSquare,
  Bot,
  User,
  Wrench,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Cpu,
  Pin,
  Info,
  Settings,
  Archive,
  Check,
  Filter,
  Brain,
  Terminal,
  XCircle,
  CheckCircle,
  Slash,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type { Entry } from "../types/session";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Entry categorization for proper display
type EntryCategory =
  | "real-user"      // Blue, expanded - actual user input
  | "tool-result"    // Primary, collapsed - tool execution results
  | "tool-use"       // Primary, collapsed - assistant tool calls
  | "thinking"       // Purple, collapsed - Claude's thinking blocks
  | "meta"           // Gray, collapsed - meta/context messages
  | "agent"          // Gray, collapsed - agent/warmup messages
  | "assistant"      // Orange, expanded - assistant text responses
  | "system"         // Gray, collapsed - system messages
  | "internal";      // Gray, collapsed - file-snapshot, queue-op

const categoryConfig: Record<EntryCategory, {
  bg: string;
  iconBg: string;
  label: string;
  collapsed: boolean;
}> = {
  "real-user": {
    bg: "bg-blue-500/10 border-blue-500/20",
    iconBg: "bg-blue-500/20 text-blue-500",
    label: "User",
    collapsed: false,
  },
  "assistant": {
    bg: "bg-orange-500/10 border-orange-500/20",
    iconBg: "bg-orange-500/20 text-orange-500",
    label: "Assistant",
    collapsed: false,
  },
  "tool-result": {
    bg: "bg-card border-border",
    iconBg: "bg-primary/20 text-primary",
    label: "Tool Result",
    collapsed: true,
  },
  "tool-use": {
    bg: "bg-card border-border",
    iconBg: "bg-primary/20 text-primary",
    label: "Tool",
    collapsed: true,
  },
  "thinking": {
    bg: "bg-purple-500/10 border-purple-500/20",
    iconBg: "bg-purple-500/20 text-purple-500",
    label: "Thinking",
    collapsed: true,
  },
  "meta": {
    bg: "bg-muted/30 border-muted",
    iconBg: "bg-muted text-muted-foreground",
    label: "Context",
    collapsed: true,
  },
  "agent": {
    bg: "bg-muted/30 border-muted",
    iconBg: "bg-muted text-muted-foreground",
    label: "Agent",
    collapsed: true,
  },
  "system": {
    bg: "bg-muted/30 border-muted",
    iconBg: "bg-muted text-muted-foreground",
    label: "System",
    collapsed: true,
  },
  "internal": {
    bg: "bg-muted/30 border-muted",
    iconBg: "bg-muted text-muted-foreground",
    label: "Internal",
    collapsed: true,
  },
};

function hasToolResult(data: Record<string, unknown>): boolean {
  // Check message.content array for tool_result blocks
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;
  return message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_result";
    }
    return false;
  });
}

function hasOnlyToolUse(data: Record<string, unknown>): boolean {
  // Check if assistant message has only tool_use blocks (no text, no thinking)
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;
  const hasToolUse = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_use";
    }
    return false;
  });
  const hasText = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const i = item as { type?: string; text?: string };
      return i.type === "text" && i.text && i.text.trim().length > 0;
    }
    return false;
  });
  return hasToolUse && !hasText;
}

function hasOnlyThinking(data: Record<string, unknown>): boolean {
  // Check if assistant message has only thinking blocks
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (!Array.isArray(message.content)) return false;
  const hasThinking = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "thinking";
    }
    return false;
  });
  const hasText = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const i = item as { type?: string; text?: string };
      return i.type === "text" && i.text && i.text.trim().length > 0;
    }
    return false;
  });
  const hasToolUse = message.content.some((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      return (item as { type?: string }).type === "tool_use";
    }
    return false;
  });
  return hasThinking && !hasText && !hasToolUse;
}

function isWarmupMessage(data: Record<string, unknown>): boolean {
  const message = data.message as { content?: unknown } | undefined;
  if (!message?.content) return false;
  if (typeof message.content === "string") {
    return message.content.includes("[Warmup message]");
  }
  return false;
}

function categorizeEntry(entry: Entry): EntryCategory {
  const { type, subtype, data } = entry;

  // System/internal types
  if (type === "system") return "system";
  if (type === "file-history-snapshot" || type === "queue-operation") return "internal";
  if (subtype === "file-history-snapshot" || subtype === "queue-operation") return "internal";

  // User entries
  if (type === "user" || type === "human") {
    // Check for tool result first
    if (hasToolResult(data)) return "tool-result";
    // Check for meta
    if (data.isMeta) return "meta";
    // Check for agent/warmup
    if (data.agentId || isWarmupMessage(data)) return "agent";
    // Real user input
    return "real-user";
  }

  // Assistant entries
  if (type === "assistant") {
    if (hasOnlyToolUse(data)) return "tool-use";
    if (hasOnlyThinking(data)) return "thinking";
    return "assistant";
  }

  return "internal";
}

// Tool grouping for paired display
interface ToolGroup {
  type: "tool-group";
  id: string;  // tool_use_id
  toolUse: Entry;
  toolResult?: Entry;
  toolName: string;
}

type DisplayEntry = Entry | ToolGroup;

function isToolGroup(item: DisplayEntry): item is ToolGroup {
  return "type" in item && item.type === "tool-group";
}

// Extract tool_use_id from a tool_use entry
function getToolUseId(entry: Entry): string | null {
  const message = entry.data.message as { content?: unknown } | undefined;
  if (!message?.content || !Array.isArray(message.content)) return null;

  for (const item of message.content) {
    if (typeof item === "object" && item !== null) {
      const block = item as { type?: string; id?: string };
      if (block.type === "tool_use" && block.id) {
        return block.id;
      }
    }
  }
  return null;
}

// Extract tool_use_id from a tool_result entry
function getToolResultId(entry: Entry): string | null {
  const message = entry.data.message as { content?: unknown } | undefined;
  if (!message?.content || !Array.isArray(message.content)) return null;

  for (const item of message.content) {
    if (typeof item === "object" && item !== null) {
      const block = item as { type?: string; tool_use_id?: string };
      if (block.type === "tool_result" && block.tool_use_id) {
        return block.tool_use_id;
      }
    }
  }
  return null;
}

// Group tool_use entries with their corresponding tool_result entries
function groupToolEntries(entries: Entry[]): DisplayEntry[] {
  const result: DisplayEntry[] = [];
  const toolUseMap = new Map<string, ToolGroup>();

  for (const entry of entries) {
    const category = categorizeEntry(entry);

    if (category === "tool-use") {
      const toolUseId = getToolUseId(entry);
      const toolName = getToolName(entry.data);

      if (toolUseId) {
        const group: ToolGroup = {
          type: "tool-group",
          id: toolUseId,
          toolUse: entry,
          toolName,
        };
        toolUseMap.set(toolUseId, group);
        result.push(group);
      } else {
        result.push(entry);
      }
    } else if (category === "tool-result") {
      const toolUseId = getToolResultId(entry);

      if (toolUseId && toolUseMap.has(toolUseId)) {
        // Add result to existing group
        const group = toolUseMap.get(toolUseId)!;
        group.toolResult = entry;
        // Don't add to result - already in via the group
      } else {
        // Orphan result - show separately
        result.push(entry);
      }
    } else {
      result.push(entry);
    }
  }

  return result;
}

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
  } = useSessionEntriesInfinite(sessionId, { limit: 100, order: "desc" });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Load all pages function
  const loadAllPages = useCallback(async () => {
    if (!hasNextPage || isLoadingAll) return;
    setIsLoadingAll(true);
    try {
      let hasMore = true;
      while (hasMore) {
        const result = await fetchNextPage();
        // Check if there are more pages by examining the result
        hasMore = !!result.hasNextPage;
      }
    } finally {
      setIsLoadingAll(false);
    }
  }, [fetchNextPage, hasNextPage, isLoadingAll]);

  // Filter state
  const [showTools, setShowTools] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [showInternal, setShowInternal] = useState(false);

  // Entries come in desc order (newest first), we reverse for chronological display
  const entries = useMemo(() => {
    if (!entriesData) return [];
    const allEntries = entriesData.pages.flatMap((page) => page.items);
    // Reverse to get chronological order (oldest first)
    return [...allEntries].reverse();
  }, [entriesData]);

  // Find the first real user message for pinning
  const firstUserMessage = useMemo(() => {
    return entries.find((e) => {
      const category = categorizeEntry(e);
      return category === "real-user";
    });
  }, [entries]);

  // Filter and optionally group entries based on filter settings
  const displayEntries = useMemo((): DisplayEntry[] => {
    // First, filter entries based on settings
    const filtered = entries.filter((entry) => {
      const category = categorizeEntry(entry);

      // Always show real user and assistant (text) messages
      if (category === "real-user" || category === "assistant") {
        return true;
      }

      // Show tool entries only if showTools is enabled
      if (category === "tool-use" || category === "tool-result") {
        return showTools;
      }

      // Show thinking entries only if showThinking is enabled
      if (category === "thinking") {
        return showThinking;
      }

      // Show internal entries only if showInternal is enabled
      // This includes: meta, agent, system, internal
      return showInternal;
    });

    // If showTools is enabled, group tool_use with tool_result
    if (showTools) {
      return groupToolEntries(filtered);
    }

    return filtered;
  }, [entries, showTools, showThinking, showInternal]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!hasScrolledToBottom && entries.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setHasScrolledToBottom(true);
    }
  }, [entries.length, hasScrolledToBottom]);

  // Handle scroll for loading more (when scrolling up)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    // If near the top, load more (older entries)
    if (container.scrollTop < 200) {
      // Save scroll position to restore after loading
      const scrollHeight = container.scrollHeight;
      fetchNextPage().then(() => {
        // Restore scroll position after new content is added at top
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            scrollContainerRef.current.scrollTop = newScrollHeight - scrollHeight;
          }
        });
      });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
    <div className="flex flex-col h-full">
      {/* Session Header */}
      <div className="rounded-lg border bg-card p-4 mb-4 shrink-0">
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

        {/* Filter Controls */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Show:
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-tools"
              checked={showTools}
              onCheckedChange={(checked) => setShowTools(checked === true)}
            />
            <Label htmlFor="show-tools" className="text-sm cursor-pointer">
              Tools
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-thinking"
              checked={showThinking}
              onCheckedChange={(checked) => setShowThinking(checked === true)}
            />
            <Label htmlFor="show-thinking" className="text-sm cursor-pointer">
              Thinking
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-internal"
              checked={showInternal}
              onCheckedChange={(checked) => setShowInternal(checked === true)}
            />
            <Label htmlFor="show-internal" className="text-sm cursor-pointer">
              Internal
            </Label>
          </div>
          <div className="text-xs text-muted-foreground ml-auto">
            {displayEntries.length} of {entries.length} entries
          </div>
        </div>
      </div>

      {/* Pinned First User Message */}
      {firstUserMessage && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b mb-2 shrink-0">
          <div className="px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
            <div className="flex gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/20 shrink-0 mt-0.5">
                <Pin className="h-3 w-3 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <CollapsibleContent maxHeight={60}>
                  <div className="text-sm">
                    {hasXmlContent(getEntryContent(firstUserMessage)) ? (
                      <FormattedXmlContent content={getEntryContent(firstUserMessage)} />
                    ) : (
                      <Markdown>{getEntryContent(firstUserMessage)}</Markdown>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Entries (Tail View) */}
      <TooltipProvider delayDuration={300}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1.5 min-h-0"
      >
        {/* Load more indicator at top */}
        {hasNextPage && (
          <div className="flex justify-center gap-2 py-2">
            {isFetchingNextPage || isLoadingAll ? (
              <div className="text-sm text-muted-foreground">
                {isLoadingAll ? "Loading complete conversation..." : "Loading older messages..."}
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  className="text-muted-foreground"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Load older
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadAllPages}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Load all
                </Button>
              </>
            )}
          </div>
        )}

        {entriesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : displayEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No entries in this session
          </div>
        ) : (
          displayEntries.map((item) =>
            isToolGroup(item) ? (
              <ToolGroupCard key={item.id} group={item} />
            ) : (
              <EntryCard key={item.id} entry={item} />
            )
          )
        )}
      </div>
      </TooltipProvider>
    </div>
  );
}

interface EntryCardProps {
  entry: Entry;
}

function EntryCard({ entry }: EntryCardProps) {
  const { subtype, data } = entry;

  const category = categorizeEntry(entry);
  const config = categoryConfig[category];
  const [isCollapsed, setIsCollapsed] = useState(config.collapsed);

  const getIcon = () => {
    switch (category) {
      case "real-user":
        return <User className="h-3.5 w-3.5" />;
      case "assistant":
        return <Bot className="h-3.5 w-3.5" />;
      case "tool-result":
      case "tool-use":
        return <Wrench className="h-3.5 w-3.5" />;
      case "thinking":
        return <Brain className="h-3.5 w-3.5" />;
      case "meta":
        return <Info className="h-3.5 w-3.5" />;
      case "agent":
        return <Bot className="h-3.5 w-3.5" />;
      case "system":
        return <Settings className="h-3.5 w-3.5" />;
      case "internal":
        return <Archive className="h-3.5 w-3.5" />;
      default:
        return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  const getLabel = () => {
    if (category === "tool-use") return `Tool: ${getToolName(data)}`;
    if (category === "tool-result") return `Result: ${getToolName(data)}`;
    if (category === "system" && subtype) return `System: ${subtype}`;
    return config.label;
  };

  const content = category === "thinking" ? getThinkingContent(entry) : getEntryContent(entry);
  const contentSize = content.length;
  const shouldCollapse = config.collapsed;
  const isToolEntry = category === "tool-use" || category === "tool-result";
  const isThinkingEntry = category === "thinking";

  // Collapsed view for collapsible entries
  if (shouldCollapse && isCollapsed) {
    return (
      <div
        className={cn(
          "rounded-md border px-2 py-1.5 cursor-pointer hover:bg-muted/20 transition-colors",
          config.bg
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex h-5 w-5 items-center justify-center rounded shrink-0", config.iconBg)}>
                {getIcon()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {getLabel()}
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground truncate">{getLabel()}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {formatBytes(contentSize)}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>
      </div>
    );
  }

  // Expanded inline view
  return (
    <div className={cn("rounded-md border px-2 py-1.5", config.bg)}>
      <div className="flex gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex h-5 w-5 items-center justify-center rounded shrink-0 mt-0.5", config.iconBg)}>
              {getIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {getLabel()}
          </TooltipContent>
        </Tooltip>
        <div className="flex-1 min-w-0 text-sm">
          {isToolEntry || category === "internal" || category === "system" ? (
            <CollapsibleContent maxHeight={150}>
              <pre className="bg-muted/50 rounded p-1.5 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                {content}
              </pre>
            </CollapsibleContent>
          ) : isThinkingEntry ? (
            <CollapsibleContent maxHeight={150}>
              <div className="italic text-muted-foreground">
                <Markdown>{content}</Markdown>
              </div>
            </CollapsibleContent>
          ) : hasXmlContent(content) ? (
            <CollapsibleContent maxHeight={200}>
              <FormattedXmlContent content={content} />
            </CollapsibleContent>
          ) : (
            <CollapsibleContent maxHeight={150}>
              <Markdown>{content}</Markdown>
            </CollapsibleContent>
          )}
        </div>
        {shouldCollapse && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-muted-foreground hover:text-primary shrink-0 mt-0.5"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Grouped tool card component
interface ToolGroupCardProps {
  group: ToolGroup;
}

function ToolGroupCard({ group }: ToolGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = !!group.toolResult;
  const toolInput = getToolInput(group.toolUse);
  const toolOutput = group.toolResult ? getEntryContent(group.toolResult) : null;
  const label = `Tool: ${group.toolName}`;

  return (
    <div className="rounded-md border bg-card border-border px-2 py-1.5">
      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 shrink-0">
              <Wrench className="h-3.5 w-3.5 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
        <span className="text-xs truncate">{label}</span>
        {hasResult ? (
          <Check className="h-3 w-3 text-green-500 shrink-0" />
        ) : (
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {formatBytes(toolInput.length + (toolOutput?.length || 0))}
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="mt-2 ml-6 space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Input:</div>
            <CollapsibleContent maxHeight={120}>
              <pre className="bg-muted/50 rounded p-1.5 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                {toolInput}
              </pre>
            </CollapsibleContent>
          </div>
          {toolOutput && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Result:</div>
              <CollapsibleContent maxHeight={120}>
                <pre className="bg-muted/50 rounded p-1.5 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                  {toolOutput}
                </pre>
              </CollapsibleContent>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Extract tool input from a tool_use entry
function getToolInput(entry: Entry): string {
  const message = entry.data.message as { content?: unknown } | undefined;
  if (!message?.content || !Array.isArray(message.content)) {
    return JSON.stringify(entry.data, null, 2);
  }

  for (const item of message.content) {
    if (typeof item === "object" && item !== null) {
      const block = item as { type?: string; input?: unknown };
      if (block.type === "tool_use" && block.input) {
        return JSON.stringify(block.input, null, 2);
      }
    }
  }

  return JSON.stringify(entry.data, null, 2);
}

function getThinkingContent(entry: Entry): string {
  const { data } = entry;
  const message = data.message as { content?: unknown } | undefined;

  if (!message?.content || !Array.isArray(message.content)) {
    return "[No thinking content]";
  }

  const thinkingParts = message.content
    .filter((item: unknown) => {
      if (typeof item === "object" && item !== null) {
        return (item as { type?: string }).type === "thinking";
      }
      return false;
    })
    .map((item: unknown) => {
      const block = item as { thinking?: string };
      return block.thinking || "";
    })
    .filter(Boolean);

  return thinkingParts.length > 0 ? thinkingParts.join("\n\n") : "[No thinking content]";
}

function getEntryContent(entry: Entry): string {
  const { type, subtype, data } = entry;
  const isToolUse = type === "tool_use" || subtype === "tool_use";
  const isToolResult = type === "tool_result" || subtype === "tool_result";

  // Handle different content structures
  if (data.message && typeof data.message === "object") {
    const message = data.message as { content?: unknown; name?: string };
    if (typeof message.content === "string") {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      const parts = message.content
        .map((block: unknown) => {
          if (typeof block === "string") return block;
          if (typeof block === "object" && block !== null) {
            const b = block as { type?: string; text?: string; content?: string; name?: string; input?: unknown };
            if (b.type === "text" && b.text) return b.text;
            if (b.type === "tool_use") {
              return `[Tool: ${b.name || "unknown"}]`;
            }
            if (b.type === "tool_result") {
              if (typeof b.content === "string") return b.content;
              return `[Tool Result]`;
            }
            if (b.content) return b.content;
          }
          return "";
        })
        .filter(Boolean);
      return parts.length > 0 ? parts.join("\n") : "[No text content]";
    }
  }

  // Direct content - handle both string and array
  if (typeof data.content === "string") {
    return data.content;
  }
  if (Array.isArray(data.content)) {
    const parts = data.content
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null) {
          const obj = item as { type?: string; text?: string; content?: string; name?: string };
          if (obj.type === "text" && obj.text) return obj.text;
          if (obj.type === "tool_use") return `[Tool: ${obj.name || "unknown"}]`;
          if (obj.type === "tool_result" && typeof obj.content === "string") return obj.content;
        }
        return "";
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : "[No text content]";
  }

  // Handle output field (common in tool results)
  if (typeof data.output === "string") {
    return data.output;
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

  // Handle special entry types
  if (data.type === "file-history-snapshot" || data.snapshot) {
    return JSON.stringify(data, null, 2);
  }

  // Fallback to raw data - ensure proper serialization
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "[Unable to display content]";
  }
}

function getToolName(data: Record<string, unknown>): string {
  // Direct name/tool fields
  if (typeof data.name === "string") return data.name;
  if (typeof data.tool === "string") return data.tool;

  if (data.message && typeof data.message === "object") {
    const message = data.message as { name?: string; tool?: string; content?: unknown };
    if (message.name) return message.name;
    if (message.tool) return message.tool;

    // Look inside message.content array for tool_use or tool_result blocks
    if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if (typeof item === "object" && item !== null) {
          const block = item as { type?: string; name?: string; tool_use_id?: string };
          // Tool use block - has the tool name directly
          if (block.type === "tool_use" && block.name) {
            return block.name;
          }
          // Tool result block - try to get name from context
          if (block.type === "tool_result") {
            // Tool results don't have the name directly, return generic label
            return "Tool";
          }
        }
      }
    }
  }

  // Look in direct content array as well
  if (Array.isArray(data.content)) {
    for (const item of data.content) {
      if (typeof item === "object" && item !== null) {
        const block = item as { type?: string; name?: string };
        if (block.type === "tool_use" && block.name) {
          return block.name;
        }
      }
    }
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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

// XML content detection and parsing
function hasXmlContent(content: string): boolean {
  return /<(command-name|local-command-stdout|bash-notification|user-prompt-submit-hook)>/.test(content);
}

interface ParsedCommand {
  type: "slash-command";
  name: string;
  message: string;
  args: string;
}

interface ParsedCommandOutput {
  type: "command-output";
  stdout: string;
}

interface ParsedBashNotification {
  type: "bash-notification";
  shellId: string;
  status: string;
  summary: string;
  outputFile?: string;
}

interface ParsedHookOutput {
  type: "hook-output";
  content: string;
}

type ParsedXmlBlock = ParsedCommand | ParsedCommandOutput | ParsedBashNotification | ParsedHookOutput;

function extractXmlTag(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function parseXmlContent(content: string): { blocks: ParsedXmlBlock[]; remainingText: string } {
  const blocks: ParsedXmlBlock[] = [];
  let remaining = content;

  // Parse slash commands
  const commandNameMatch = remaining.match(/<command-name>([\s\S]*?)<\/command-name>/g);
  if (commandNameMatch) {
    for (const match of commandNameMatch) {
      const name = extractXmlTag(match, "command-name") || "";
      // Find associated message and args nearby
      const messageMatch = remaining.match(/<command-message>([\s\S]*?)<\/command-message>/);
      const argsMatch = remaining.match(/<command-args>([\s\S]*?)<\/command-args>/);

      blocks.push({
        type: "slash-command",
        name,
        message: messageMatch ? extractXmlTag(messageMatch[0], "command-message") || "" : "",
        args: argsMatch ? extractXmlTag(argsMatch[0], "command-args") || "" : "",
      });
    }
    // Remove parsed command XML from remaining
    remaining = remaining
      .replace(/<command-name>[\s\S]*?<\/command-name>/g, "")
      .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
      .replace(/<command-args>[\s\S]*?<\/command-args>/g, "");
  }

  // Parse command output
  const stdoutMatches = remaining.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/g);
  if (stdoutMatches) {
    for (const match of stdoutMatches) {
      const stdout = extractXmlTag(match, "local-command-stdout") || "";
      if (stdout) {
        blocks.push({ type: "command-output", stdout });
      }
    }
    remaining = remaining.replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "");
  }

  // Parse bash notifications
  const bashNotifMatches = remaining.match(/<bash-notification>[\s\S]*?<\/bash-notification>/g);
  if (bashNotifMatches) {
    for (const match of bashNotifMatches) {
      blocks.push({
        type: "bash-notification",
        shellId: extractXmlTag(match, "shell-id") || "",
        status: extractXmlTag(match, "status") || "",
        summary: extractXmlTag(match, "summary") || "",
        outputFile: extractXmlTag(match, "output-file") || undefined,
      });
    }
    remaining = remaining.replace(/<bash-notification>[\s\S]*?<\/bash-notification>/g, "");
  }

  // Parse hook output
  const hookMatches = remaining.match(/<user-prompt-submit-hook>([\s\S]*?)<\/user-prompt-submit-hook>/g);
  if (hookMatches) {
    for (const match of hookMatches) {
      const hookContent = extractXmlTag(match, "user-prompt-submit-hook") || "";
      if (hookContent) {
        blocks.push({ type: "hook-output", content: hookContent });
      }
    }
    remaining = remaining.replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, "");
  }

  return { blocks, remainingText: remaining.trim() };
}

// Component to render formatted XML content
function FormattedXmlContent({ content }: { content: string }) {
  const { blocks, remainingText } = parseXmlContent(content);

  if (blocks.length === 0) {
    return <Markdown>{content}</Markdown>;
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "slash-command") {
          return (
            <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-violet-500/10 border border-violet-500/20">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/20 shrink-0">
                <Slash className="h-3 w-3 text-violet-500" />
              </div>
              <code className="text-sm font-semibold text-violet-400">{block.name}</code>
              {block.args && (
                <span className="text-xs text-muted-foreground">{block.args}</span>
              )}
            </div>
          );
        }

        if (block.type === "command-output") {
          return (
            <div key={index} className="rounded bg-muted/50 border p-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Terminal className="h-3 w-3" />
                Output
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {block.stdout}
              </pre>
            </div>
          );
        }

        if (block.type === "bash-notification") {
          const isSuccess = block.status === "success" || block.status === "completed";
          const isFailed = block.status === "failed" || block.status === "error";

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 p-1.5 rounded border text-xs",
                isSuccess && "bg-green-500/10 border-green-500/20",
                isFailed && "bg-red-500/10 border-red-500/20",
                !isSuccess && !isFailed && "bg-muted/50 border-border"
              )}
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded shrink-0 mt-0.5",
                isSuccess && "bg-green-500/20",
                isFailed && "bg-red-500/20",
                !isSuccess && !isFailed && "bg-muted"
              )}>
                {isSuccess ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : isFailed ? (
                  <XCircle className="h-3 w-3 text-red-500" />
                ) : (
                  <Terminal className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{block.summary}</div>
                <div className="text-muted-foreground">
                  Shell: {block.shellId}
                  {block.status && ` • ${block.status}`}
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "hook-output") {
          return (
            <div key={index} className="rounded bg-amber-500/10 border border-amber-500/20 p-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1">
                <Settings className="h-3 w-3" />
                Hook Output
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {block.content}
              </pre>
            </div>
          );
        }

        return null;
      })}

      {remainingText && (
        <div className="mt-2">
          <Markdown>{remainingText}</Markdown>
        </div>
      )}
    </div>
  );
}
