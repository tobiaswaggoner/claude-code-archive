"use client";

import { useQuery } from "@tanstack/react-query";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { ProjectsService } from "../services/projects.service";
import type { ProjectListParams } from "../types/project";

export function useProjects(params?: ProjectListParams) {
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);

  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => projectsService.list(params),
    staleTime: 30_000, // 30 seconds
  });
}

export function useProject(id: string) {
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);

  return useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsService.get(id),
    enabled: !!id,
  });
}

export function useProjectWorkspaces(id: string) {
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);

  return useQuery({
    queryKey: ["project", id, "workspaces"],
    queryFn: () => projectsService.getWorkspaces(id),
    enabled: !!id,
  });
}
