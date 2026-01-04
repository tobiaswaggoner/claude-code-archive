// Components
export { ProjectList } from "./components/project-list";
export { ProjectDetail } from "./components/project-detail";

// Hooks
export {
  useProjects,
  useProject,
  useProjectWorkspaces,
  useUpdateProject,
} from "./hooks/use-projects";

// Types
export type { Project, ProjectListParams, Workspace } from "./types/project";
export type { ProjectUpdateInput } from "./types/project-update";

// Services (internal - for DI registration)
export { ProjectsService } from "./services/projects.service";
