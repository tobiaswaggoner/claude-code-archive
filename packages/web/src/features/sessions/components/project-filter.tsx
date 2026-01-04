"use client";

import { useProjects } from "@/features/projects/hooks/use-projects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen } from "lucide-react";

interface ProjectFilterProps {
  value: string | undefined;
  onChange: (projectId: string | undefined) => void;
}

export function ProjectFilter({ value, onChange }: ProjectFilterProps) {
  const { data: projects, isLoading } = useProjects({ limit: 100 });

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : v)}
    >
      <SelectTrigger className="w-[250px]">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All projects" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All projects</SelectItem>
        {isLoading ? (
          <SelectItem value="_loading" disabled>
            Loading...
          </SelectItem>
        ) : (
          projects?.items.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
