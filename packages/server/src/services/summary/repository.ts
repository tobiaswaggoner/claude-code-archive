import { eq, and, lt, isNull, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  session,
  entry,
  workspace,
  project,
  configuration,
  type Entry,
} from "../../db/schema/index.js";
import type {
  ISummaryRepository,
  SessionWithContext,
  SessionSummary,
} from "./types.js";

/**
 * Repository for database operations related to summaries.
 */
export class SummaryRepository implements ISummaryRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getSession(id: string): Promise<SessionWithContext | null> {
    const [result] = await this.db
      .select({
        session: {
          id: session.id,
          originalSessionId: session.originalSessionId,
          firstEntryAt: session.firstEntryAt,
          lastEntryAt: session.lastEntryAt,
          modelsUsed: session.modelsUsed,
          summary: session.summary,
        },
        workspace: {
          id: workspace.id,
          projectId: workspace.projectId,
          cwd: workspace.cwd,
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        },
      })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id))
      .innerJoin(project, eq(workspace.projectId, project.id))
      .where(eq(session.id, id));

    return result ?? null;
  }

  async getEntries(sessionId: string): Promise<Entry[]> {
    return this.db
      .select()
      .from(entry)
      .where(eq(entry.sessionId, sessionId))
      .orderBy(entry.lineNumber);
  }

  async getConfiguration(category: string): Promise<Map<string, string>> {
    const configs = await this.db
      .select()
      .from(configuration)
      .where(eq(configuration.category, category));

    return new Map(configs.map((c) => [c.key, c.value]));
  }

  async getSessionHistory(
    projectId: string,
    before: Date,
    limit: number
  ): Promise<SessionSummary[]> {
    if (limit <= 0) {
      return [];
    }

    // Get previous main sessions with summaries
    const results = await this.db
      .select({
        sessionId: session.id,
        firstEntryAt: session.firstEntryAt,
        summary: session.summary,
      })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id))
      .where(
        and(
          eq(workspace.projectId, projectId),
          isNull(session.parentSessionId), // Only main sessions
          lt(session.firstEntryAt, before)
        )
      )
      .orderBy(desc(session.firstEntryAt))
      .limit(limit * 2); // Fetch more since some may not have summaries

    // Filter to only those with summaries and limit
    return results
      .filter((r) => r.summary !== null)
      .slice(0, limit)
      .map((r) => ({
        sessionId: r.sessionId,
        firstEntryAt: r.firstEntryAt,
        summary: r.summary!,
      }));
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    await this.db
      .update(session)
      .set({ summary })
      .where(eq(session.id, sessionId));
  }
}
