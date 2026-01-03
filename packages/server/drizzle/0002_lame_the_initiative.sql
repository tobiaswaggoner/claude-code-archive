DROP INDEX "claude_archive"."entry_session_line_number_idx";--> statement-breakpoint
ALTER TABLE "claude_archive"."entry" ADD CONSTRAINT "entry_session_line_unique" UNIQUE("session_id","line_number");--> statement-breakpoint
ALTER TABLE "claude_archive"."session" ADD CONSTRAINT "session_workspace_original_id_unique" UNIQUE("workspace_id","original_session_id");