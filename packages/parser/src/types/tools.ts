import { z } from "zod";

// ============================================================
// TOOL INPUT SCHEMAS
// ============================================================

/** Bash tool input */
export const BashInputSchema = z.object({
  command: z.string(),
  description: z.string().optional(),
  timeout: z.number().optional(),
  run_in_background: z.boolean().optional(),
  dangerouslyDisableSandbox: z.boolean().optional(),
});
export type BashInput = z.infer<typeof BashInputSchema>;

/** Read tool input */
export const ReadInputSchema = z.object({
  file_path: z.string(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});
export type ReadInput = z.infer<typeof ReadInputSchema>;

/** Write tool input */
export const WriteInputSchema = z.object({
  file_path: z.string(),
  content: z.string(),
});
export type WriteInput = z.infer<typeof WriteInputSchema>;

/** Edit tool input */
export const EditInputSchema = z.object({
  file_path: z.string(),
  old_string: z.string(),
  new_string: z.string(),
  replace_all: z.boolean().optional(),
});
export type EditInput = z.infer<typeof EditInputSchema>;

/** MultiEdit tool input */
export const MultiEditInputSchema = z.object({
  file_path: z.string(),
  edits: z.array(
    z.object({
      old_string: z.string(),
      new_string: z.string(),
      replace_all: z.boolean().optional(),
    })
  ),
});
export type MultiEditInput = z.infer<typeof MultiEditInputSchema>;

/** Glob tool input */
export const GlobInputSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
});
export type GlobInput = z.infer<typeof GlobInputSchema>;

/** Grep tool input */
export const GrepInputSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  glob: z.string().optional(),
  type: z.string().optional(),
  output_mode: z.enum(["content", "files_with_matches", "count"]).optional(),
  multiline: z.boolean().optional(),
  head_limit: z.number().optional(),
  offset: z.number().optional(),
  "-i": z.boolean().optional(),
  "-n": z.boolean().optional(),
  "-A": z.number().optional(),
  "-B": z.number().optional(),
  "-C": z.number().optional(),
});
export type GrepInput = z.infer<typeof GrepInputSchema>;

/** Task tool input (subagent) */
export const TaskInputSchema = z.object({
  prompt: z.string(),
  subagent_type: z.string(),
  description: z.string(),
  model: z.enum(["sonnet", "opus", "haiku"]).optional(),
  run_in_background: z.boolean().optional(),
  resume: z.string().optional(),
});
export type TaskInput = z.infer<typeof TaskInputSchema>;

/** Todo item */
export const TodoItemSchema = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  activeForm: z.string(),
});
export type TodoItem = z.infer<typeof TodoItemSchema>;

/** TodoWrite tool input */
export const TodoWriteInputSchema = z.object({
  todos: z.array(TodoItemSchema),
});
export type TodoWriteInput = z.infer<typeof TodoWriteInputSchema>;

/** WebSearch tool input */
export const WebSearchInputSchema = z.object({
  query: z.string(),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/** WebFetch tool input */
export const WebFetchInputSchema = z.object({
  url: z.string(),
  prompt: z.string(),
});
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

/** NotebookEdit tool input */
export const NotebookEditInputSchema = z.object({
  notebook_path: z.string(),
  new_source: z.string(),
  cell_id: z.string().optional(),
  cell_type: z.enum(["code", "markdown"]).optional(),
  edit_mode: z.enum(["replace", "insert", "delete"]).optional(),
});
export type NotebookEditInput = z.infer<typeof NotebookEditInputSchema>;

/** AskUserQuestion option */
export const AskUserQuestionOptionSchema = z.object({
  label: z.string(),
  description: z.string(),
});

/** AskUserQuestion item */
export const AskUserQuestionItemSchema = z.object({
  question: z.string(),
  header: z.string(),
  options: z.array(AskUserQuestionOptionSchema),
  multiSelect: z.boolean(),
});

/** AskUserQuestion tool input */
export const AskUserQuestionInputSchema = z.object({
  questions: z.array(AskUserQuestionItemSchema),
});
export type AskUserQuestionInput = z.infer<typeof AskUserQuestionInputSchema>;

// ============================================================
// TOOL NAME ENUM
// ============================================================

/** Known tool names */
export const ToolNameSchema = z.enum([
  // File Operations
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "Glob",
  "Grep",
  // Shell
  "Bash",
  // Web
  "WebSearch",
  "WebFetch",
  // Task Management
  "Task",
  "TodoWrite",
  "TaskOutput",
  // User Interaction
  "AskUserQuestion",
  "ExitPlanMode",
  "EnterPlanMode",
  // Notebook
  "NotebookEdit",
  // Skill
  "Skill",
  // Shell Management
  "KillShell",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

/** Tool input registry for typed parsing */
export const TOOL_INPUT_SCHEMAS = {
  Bash: BashInputSchema,
  Read: ReadInputSchema,
  Write: WriteInputSchema,
  Edit: EditInputSchema,
  MultiEdit: MultiEditInputSchema,
  Glob: GlobInputSchema,
  Grep: GrepInputSchema,
  Task: TaskInputSchema,
  TodoWrite: TodoWriteInputSchema,
  WebSearch: WebSearchInputSchema,
  WebFetch: WebFetchInputSchema,
  NotebookEdit: NotebookEditInputSchema,
  AskUserQuestion: AskUserQuestionInputSchema,
} as const;
