// Components
export { ProjectList } from "./components/project-list";

// Hooks
export { useProjects, useProject, useProjectWorkspaces } from "./hooks/use-projects";

// Types
export type { Project, ProjectListParams, Workspace } from "./types/project";

// Services (internal - for DI registration)
export { ProjectsService } from "./services/projects.service";
