import {
  integer,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * GitBranch - Branches per GitRepo (not project-wide).
 * Enables tracking of local, unpushed branches.
 */
export const gitBranch = claudeArchiveSchema.table(
  "git_branch",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to GitRepo
    gitRepoId: uuid("git_repo_id")
      .notNull()
      .references(() => gitRepo.id),

    // Branch name (e.g., `main`, `feature/x`)
    name: text("name").notNull(),

    // Current HEAD SHA of the branch
    headSha: text("head_sha").notNull(),

    // Remote-tracking branch (e.g., `origin/main`)
    upstreamName: text("upstream_name"),

    // SHA of the upstream branch
    upstreamSha: text("upstream_sha"),

    // Commits ahead of upstream
    aheadCount: integer("ahead_count").default(0),

    // Commits behind upstream
    behindCount: integer("behind_count").default(0),

    // Timestamp of the HEAD commit
    lastCommitAt: timestamp("last_commit_at", { withTimezone: true }),

    // First discovery
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),

    // Last scan where branch existed
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),

    // Number of detected force pushes
    forcePushCount: integer("force_push_count").default(0),

    // Last force push timestamp
    lastForcePushAt: timestamp("last_force_push_at", { withTimezone: true }),
  },
  (table) => [
    // Unique constraint: one branch per repo + name combination
    unique("git_branch_repo_name_unique").on(table.gitRepoId, table.name),
  ]
);

export const gitBranchRelations = relations(gitBranch, ({ one }) => ({
  gitRepo: one(gitRepo, {
    fields: [gitBranch.gitRepoId],
    references: [gitRepo.id],
  }),
}));

// Import after defining gitBranch to avoid circular dependency
import { gitRepo } from "./git-repo";

export type GitBranch = typeof gitBranch.$inferSelect;
export type NewGitBranch = typeof gitBranch.$inferInsert;
