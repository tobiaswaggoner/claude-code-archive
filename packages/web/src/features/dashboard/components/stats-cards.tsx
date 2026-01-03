"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, MessageSquare, FileText, Cpu } from "lucide-react";

interface StatsCardsProps {
  projectCount: number;
  sessionCount: number;
  totalEntries: number;
  totalTokens: number;
}

export function StatsCards({
  projectCount,
  sessionCount,
  totalEntries,
  totalTokens,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Projects",
      value: projectCount.toLocaleString(),
      icon: FolderOpen,
      description: "Total projects tracked",
    },
    {
      title: "Sessions",
      value: sessionCount.toLocaleString(),
      icon: MessageSquare,
      description: "Claude Code sessions",
    },
    {
      title: "Entries",
      value: totalEntries.toLocaleString(),
      icon: FileText,
      description: "Messages and tool calls",
    },
    {
      title: "Tokens",
      value: formatTokens(totalTokens),
      icon: Cpu,
      description: "Total tokens processed",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}
