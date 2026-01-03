import {
  boolean,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const claudeArchiveSchema = pgSchema("claude_archive");

/**
 * Project - Central entity.
 * Represents a logical project - regardless of whether it has Claude sessions or only exists as a Git repo.
 */
export const project = claudeArchiveSchema.table("project", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Display name (from repo name or directory)
  name: text("name").notNull(),

  // GitHub/GitLab URL (if pushed) - unique, normalized
  upstreamUrl: text("upstream_url").unique(),

  // Optional: README excerpt or manual description
  description: text("description"),

  // First discovery (Git or Claude)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),

  // Last discovery/sync
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),

  // Manually archived
  archived: boolean("archived").default(false),
});

export const projectRelations = relations(project, ({ many }) => ({
  gitRepos: many(gitRepo),
  gitCommits: many(gitCommit),
  workspaces: many(workspace),
}));

// Import after defining project to avoid circular dependency
import { gitRepo } from "./git-repo";
import { gitCommit } from "./git-commit";
import { workspace } from "./workspace";

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
