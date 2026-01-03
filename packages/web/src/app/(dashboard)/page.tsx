import { PageHeader } from "@/shared/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, MessageSquare, Server, GitBranch } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your Claude Code Archive"
      />

      <main className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Projects"
            value="--"
            description="Connected projects"
            icon={FolderOpen}
          />
          <StatsCard
            title="Sessions"
            value="--"
            description="Total sessions"
            icon={MessageSquare}
          />
          <StatsCard
            title="Collectors"
            value="--"
            description="Active collectors"
            icon={Server}
          />
          <StatsCard
            title="Repositories"
            value="--"
            description="Tracked repos"
            icon={GitBranch}
          />
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Connect your first collector to start archiving Claude Code sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Run the collector on your machine to sync your Claude Code
                conversation logs to this archive. Sessions will appear
                automatically once connected.
              </p>
              <pre className="mt-4 rounded-md bg-muted p-4 font-mono text-xs">
                collector sync --source-dir=/path/to/projects
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
