import {
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * GitCommit - Complete Git history of all projects.
 */
export const gitCommit = claudeArchiveSchema.table(
  "git_commit",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // FK to Project
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id),

    // Commit SHA
    sha: text("sha").notNull(),

    // Commit message
    message: text("message").notNull(),

    // Author name
    authorName: text("author_name").notNull(),

    // Author email
    authorEmail: text("author_email").notNull(),

    // Author date
    authorDate: timestamp("author_date", { withTimezone: true }).notNull(),

    // Committer name
    committerName: text("committer_name"),

    // Committer date
    committerDate: timestamp("committer_date", { withTimezone: true }),

    // Parent commit SHAs (as TEXT array)
    parentShas: text("parent_shas").array(),
  },
  (table) => [
    // Unique constraint: one commit per project + SHA combination
    unique("git_commit_project_sha_unique").on(table.projectId, table.sha),
  ]
);

export const gitCommitRelations = relations(gitCommit, ({ one }) => ({
  project: one(project, {
    fields: [gitCommit.projectId],
    references: [project.id],
  }),
}));

// Import after defining gitCommit to avoid circular dependency
import { project } from "./project";

export type GitCommit = typeof gitCommit.$inferSelect;
export type NewGitCommit = typeof gitCommit.$inferInsert;
