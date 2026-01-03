import { z } from "zod";

// ============================================================
// CONTENT SCHEMAS
// ============================================================

/** Text content block */
export const TextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});
export type TextContent = z.infer<typeof TextContentSchema>;

/** Extended thinking content block (Claude Opus 4.5) */
export const ThinkingContentSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
  signature: z.string().optional(),
});
export type ThinkingContent = z.infer<typeof ThinkingContentSchema>;

/** Image source (base64 encoded) */
export const ImageSourceSchema = z.object({
  type: z.literal("base64"),
  data: z.string(),
  media_type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
});
export type ImageSource = z.infer<typeof ImageSourceSchema>;

/** Image content block */
export const ImageContentSchema = z.object({
  type: z.literal("image"),
  source: ImageSourceSchema,
});
export type ImageContent = z.infer<typeof ImageContentSchema>;

/** Document source (text or base64) */
export const DocumentSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    data: z.string(),
    media_type: z.literal("text/plain"),
  }),
  z.object({
    type: z.literal("base64"),
    data: z.string(),
    media_type: z.enum(["application/pdf"]),
  }),
]);
export type DocumentSource = z.infer<typeof DocumentSourceSchema>;

/** Document content block */
export const DocumentContentSchema = z.object({
  type: z.literal("document"),
  source: DocumentSourceSchema,
});
export type DocumentContent = z.infer<typeof DocumentContentSchema>;

/** Tool use content block (assistant requesting tool execution) */
export const ToolUseContentSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});
export type ToolUseContent = z.infer<typeof ToolUseContentSchema>;

/** Tool result content block (user providing tool output) */
export const ToolResultContentSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.union([
    z.string(),
    z.array(z.union([TextContentSchema, ImageContentSchema])),
  ]),
  is_error: z.boolean().optional(),
  agentId: z.string().optional(),
});
export type ToolResultContent = z.infer<typeof ToolResultContentSchema>;

/** Union of all content types */
export const ContentItemSchema = z.discriminatedUnion("type", [
  TextContentSchema,
  ThinkingContentSchema,
  ImageContentSchema,
  DocumentContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema,
]);
export type ContentItem = z.infer<typeof ContentItemSchema>;

/** User message content (can be string or array) */
export const UserContentSchema = z.union([
  z.string(),
  z.array(
    z.union([
      z.string(),
      TextContentSchema,
      ToolResultContentSchema,
      ImageContentSchema,
      DocumentContentSchema,
    ])
  ),
]);
export type UserContent = z.infer<typeof UserContentSchema>;

/** Assistant message content (always array) */
export const AssistantContentSchema = z.array(
  z.union([
    TextContentSchema,
    ThinkingContentSchema,
    ToolUseContentSchema,
  ])
);
export type AssistantContent = z.infer<typeof AssistantContentSchema>;
