import { z } from "zod";
import { UserContentSchema, AssistantContentSchema } from "./content.js";

// ============================================================
// MESSAGE SCHEMAS
// ============================================================

/** User message structure */
export const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: UserContentSchema,
});
export type UserMessage = z.infer<typeof UserMessageSchema>;

/** Token usage information */
export const UsageInfoSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  cache_creation: z
    .object({
      ephemeral_5m_input_tokens: z.number().optional(),
      ephemeral_1h_input_tokens: z.number().optional(),
    })
    .optional(),
  service_tier: z.string().nullable().optional(),
  server_tool_use: z
    .object({
      web_search_requests: z.number().optional(),
    })
    .optional(),
});
export type UsageInfo = z.infer<typeof UsageInfoSchema>;

/** Assistant message structure (API response format) */
export const AssistantMessageSchema = z.object({
  id: z.string(),
  type: z.literal("message"),
  role: z.literal("assistant"),
  model: z.string(),
  content: AssistantContentSchema,
  stop_reason: z.enum(["end_turn", "tool_use"]).nullable(),
  stop_sequence: z.string().nullable(),
  usage: UsageInfoSchema,
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
