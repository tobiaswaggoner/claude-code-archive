CREATE SCHEMA IF NOT EXISTS "claude_archive";
--> statement-breakpoint
CREATE TABLE "claude_archive"."collector" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hostname" text NOT NULL,
	"os_info" text,
	"version" text,
	"config" jsonb,
	"registered_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"last_sync_run_id" uuid,
	"last_sync_status" text,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "collector_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"original_uuid" uuid,
	"line_number" integer NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"timestamp" timestamp with time zone,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."git_branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"git_repo_id" uuid NOT NULL,
	"name" text NOT NULL,
	"head_sha" text NOT NULL,
	"upstream_name" text,
	"upstream_sha" text,
	"ahead_count" integer DEFAULT 0,
	"behind_count" integer DEFAULT 0,
	"last_commit_at" timestamp with time zone,
	"discovered_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"force_push_count" integer DEFAULT 0,
	"last_force_push_at" timestamp with time zone,
	CONSTRAINT "git_branch_repo_name_unique" UNIQUE("git_repo_id","name")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."git_commit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"author_date" timestamp with time zone NOT NULL,
	"committer_name" text,
	"committer_date" timestamp with time zone,
	"parent_shas" text[],
	CONSTRAINT "git_commit_project_sha_unique" UNIQUE("project_id","sha")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."git_repo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"host" text NOT NULL,
	"path" text NOT NULL,
	"default_branch" text,
	"current_branch" text,
	"head_sha" text,
	"is_dirty" boolean DEFAULT false,
	"dirty_files_count" integer,
	"dirty_snapshot" jsonb,
	"last_file_change_at" timestamp with time zone,
	"last_scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "git_repo_host_path_unique" UNIQUE("host","path")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"upstream_url" text,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"archived" boolean DEFAULT false,
	CONSTRAINT "project_upstream_url_unique" UNIQUE("upstream_url")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."run_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collector_id" uuid NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"original_session_id" text NOT NULL,
	"parent_session_id" uuid,
	"agent_id" text,
	"filename" text NOT NULL,
	"first_entry_at" timestamp with time zone,
	"last_entry_at" timestamp with time zone,
	"entry_count" integer DEFAULT 0,
	"summary" text,
	"models_used" text[],
	"total_input_tokens" integer DEFAULT 0,
	"total_output_tokens" integer DEFAULT 0,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."tool_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"tool_use_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"content_type" text NOT NULL,
	"content_text" text,
	"content_binary" "bytea",
	"size_bytes" integer NOT NULL,
	"is_error" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tool_result_entry_tool_use_id_unique" UNIQUE("entry_id","tool_use_id")
);
--> statement-breakpoint
CREATE TABLE "claude_archive"."workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"host" text NOT NULL,
	"cwd" text NOT NULL,
	"claude_project_path" text NOT NULL,
	"git_repo_id" uuid,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_host_cwd_unique" UNIQUE("host","cwd")
);
--> statement-breakpoint
ALTER TABLE "claude_archive"."entry" ADD CONSTRAINT "entry_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "claude_archive"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."git_branch" ADD CONSTRAINT "git_branch_git_repo_id_git_repo_id_fk" FOREIGN KEY ("git_repo_id") REFERENCES "claude_archive"."git_repo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."git_commit" ADD CONSTRAINT "git_commit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "claude_archive"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."git_repo" ADD CONSTRAINT "git_repo_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "claude_archive"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."run_log" ADD CONSTRAINT "run_log_collector_id_collector_id_fk" FOREIGN KEY ("collector_id") REFERENCES "claude_archive"."collector"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."session" ADD CONSTRAINT "session_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "claude_archive"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."tool_result" ADD CONSTRAINT "tool_result_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "claude_archive"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."workspace" ADD CONSTRAINT "workspace_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "claude_archive"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_archive"."workspace" ADD CONSTRAINT "workspace_git_repo_id_git_repo_id_fk" FOREIGN KEY ("git_repo_id") REFERENCES "claude_archive"."git_repo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_session_line_number_idx" ON "claude_archive"."entry" USING btree ("session_id","line_number");--> statement-breakpoint
CREATE INDEX "entry_session_type_idx" ON "claude_archive"."entry" USING btree ("session_id","type");--> statement-breakpoint
CREATE INDEX "entry_timestamp_idx" ON "claude_archive"."entry" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "entry_data_gin_idx" ON "claude_archive"."entry" USING gin ("data");--> statement-breakpoint
CREATE INDEX "run_log_collector_sync_run_idx" ON "claude_archive"."run_log" USING btree ("collector_id","sync_run_id");--> statement-breakpoint
CREATE INDEX "run_log_collector_timestamp_idx" ON "claude_archive"."run_log" USING btree ("collector_id","timestamp");--> statement-breakpoint
CREATE INDEX "run_log_level_idx" ON "claude_archive"."run_log" USING btree ("level");