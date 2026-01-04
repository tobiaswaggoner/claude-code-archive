import type { PromptContext, IPromptBuilder } from "./types.js";

/**
 * Replaces placeholders in the prompt template.
 *
 * Supported placeholders:
 * - {{conversation}}
 * - {{project.name}}, {{project.description}}
 * - {{session.startedAt}}, {{session.branch}}, {{session.models}}
 * - {{history}}
 * - {{userInstructions}}
 * - {{#if userInstructions}}...{{/if}} - Conditional block
 */
export class PromptBuilder implements IPromptBuilder {
  buildPrompt(template: string, context: PromptContext): string {
    let result = template;

    // Simple placeholders
    result = result.replace(/\{\{conversation\}\}/g, context.conversation);
    result = result.replace(/\{\{project\.name\}\}/g, context.project.name);
    result = result.replace(
      /\{\{project\.description\}\}/g,
      context.project.description ?? "No description"
    );
    result = result.replace(/\{\{session\.startedAt\}\}/g, context.session.startedAt);
    result = result.replace(
      /\{\{session\.branch\}\}/g,
      context.session.branch ?? "unknown"
    );
    result = result.replace(
      /\{\{session\.models\}\}/g,
      context.session.models.join(", ") || "unknown"
    );
    result = result.replace(
      /\{\{history\}\}/g,
      context.history || "No previous sessions"
    );
    result = result.replace(
      /\{\{userInstructions\}\}/g,
      context.userInstructions ?? ""
    );

    // Conditional block for userInstructions
    if (context.userInstructions) {
      result = result.replace(
        /\{\{#if userInstructions\}\}([\s\S]*?)\{\{\/if\}\}/g,
        "$1"
      );
    } else {
      result = result.replace(
        /\{\{#if userInstructions\}\}[\s\S]*?\{\{\/if\}\}/g,
        ""
      );
    }

    return result.trim();
  }
}
