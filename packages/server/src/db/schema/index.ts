// Schema namespace
export { claudeArchiveSchema } from "./collector";

// Table definitions
export { collector } from "./collector";
export { runLog } from "./runlog";
export { project } from "./project";
export { gitRepo } from "./git-repo";
export { gitBranch } from "./git-branch";
export { gitCommit } from "./git-commit";
export { workspace } from "./workspace";
export { session } from "./session";
export { entry } from "./entry";
export { toolResult } from "./tool-result";
export { configuration } from "./configuration";
export { authUser } from "./auth-user";
export { authSession } from "./auth-session";
export { authAccount } from "./auth-account";
export { authVerification } from "./auth-verification";

// Relations
export { collectorRelations } from "./collector";
export { runLogRelations } from "./runlog";
export { projectRelations } from "./project";
export { gitRepoRelations } from "./git-repo";
export { gitBranchRelations } from "./git-branch";
export { gitCommitRelations } from "./git-commit";
export { workspaceRelations } from "./workspace";
export { sessionRelations } from "./session";
export { entryRelations } from "./entry";
export { toolResultRelations } from "./tool-result";
export { authUserRelations } from "./auth-user";
export { authSessionRelations } from "./auth-session";
export { authAccountRelations } from "./auth-account";

// TypeScript types - Select (read from DB)
export type { Collector } from "./collector";
export type { RunLog } from "./runlog";
export type { Project } from "./project";
export type { GitRepo } from "./git-repo";
export type { GitBranch } from "./git-branch";
export type { GitCommit } from "./git-commit";
export type { Workspace } from "./workspace";
export type { Session } from "./session";
export type { Entry } from "./entry";
export type { ToolResult } from "./tool-result";
export type { Configuration } from "./configuration";
export type { AuthUser } from "./auth-user";
export type { AuthSession } from "./auth-session";
export type { AuthAccount } from "./auth-account";
export type { AuthVerification } from "./auth-verification";

// TypeScript types - Insert (write to DB)
export type { NewCollector } from "./collector";
export type { NewRunLog } from "./runlog";
export type { NewProject } from "./project";
export type { NewGitRepo } from "./git-repo";
export type { NewGitBranch } from "./git-branch";
export type { NewGitCommit } from "./git-commit";
export type { NewWorkspace } from "./workspace";
export type { NewSession } from "./session";
export type { NewEntry } from "./entry";
export type { NewToolResult } from "./tool-result";
export type { NewConfiguration } from "./configuration";
export type { NewAuthUser } from "./auth-user";
export type { NewAuthSession } from "./auth-session";
export type { NewAuthAccount } from "./auth-account";
export type { NewAuthVerification } from "./auth-verification";
