"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { ProjectsService } from "../services/projects.service";
import type { ProjectListParams } from "../types/project";
import type { ProjectUpdateInput } from "../types/project-update";

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

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectUpdateInput }) =>
      projectsService.update(id, data),
    onSuccess: (updatedProject, { id }) => {
      // Update the specific project cache
      queryClient.setQueryData(["project", id], updatedProject);
      // Invalidate the list to refetch with updated data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
