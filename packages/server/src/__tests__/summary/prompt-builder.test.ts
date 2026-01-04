import { describe, it, expect } from "vitest";
import { PromptBuilder } from "../../services/summary/prompt-builder.js";
import type { PromptContext } from "../../services/summary/types.js";

describe("PromptBuilder", () => {
  const builder = new PromptBuilder();

  const baseContext: PromptContext = {
    conversation: "### User\nHello\n\n### Assistant\nHi!",
    project: {
      name: "my-project",
      description: "A test project",
    },
    session: {
      startedAt: "2026-01-01T10:00:00Z",
      branch: "main",
      models: ["claude-opus-4-5", "claude-haiku-4-5"],
    },
    history: "### Session 1\nPrevious work done",
    userInstructions: null,
  };

  describe("buildPrompt", () => {
    it("replaces all simple placeholders", () => {
      const template = `Project: {{project.name}}
Description: {{project.description}}
Started: {{session.startedAt}}
Branch: {{session.branch}}
Models: {{session.models}}
History: {{history}}
Conversation: {{conversation}}`;

      const result = builder.buildPrompt(template, baseContext);

      expect(result).toContain("Project: my-project");
      expect(result).toContain("Description: A test project");
      expect(result).toContain("Started: 2026-01-01T10:00:00Z");
      expect(result).toContain("Branch: main");
      expect(result).toContain("Models: claude-opus-4-5, claude-haiku-4-5");
      expect(result).toContain("History: ### Session 1");
      expect(result).toContain("### User\nHello");
    });

    it("handles missing optional values with defaults", () => {
      const context: PromptContext = {
        ...baseContext,
        project: { name: "test", description: null },
        session: { startedAt: "2026-01-01", branch: null, models: [] },
        history: "",
      };

      const template = `{{project.description}} | {{session.branch}} | {{session.models}} | {{history}}`;

      const result = builder.buildPrompt(template, context);

      expect(result).toBe("No description | unknown | unknown | No previous sessions");
    });

    it("processes conditional blocks with userInstructions present", () => {
      const context: PromptContext = {
        ...baseContext,
        userInstructions: "Focus on security aspects",
      };

      const template = `Summary request.
{{#if userInstructions}}
## Additional Instructions
{{userInstructions}}
{{/if}}
End.`;

      const result = builder.buildPrompt(template, context);

      expect(result).toContain("## Additional Instructions");
      expect(result).toContain("Focus on security aspects");
      expect(result).not.toContain("{{#if");
      expect(result).not.toContain("{{/if}}");
    });

    it("removes conditional blocks without userInstructions", () => {
      const context: PromptContext = {
        ...baseContext,
        userInstructions: null,
      };

      const template = `Summary request.
{{#if userInstructions}}
## Additional Instructions
{{userInstructions}}
{{/if}}
End.`;

      const result = builder.buildPrompt(template, context);

      expect(result).not.toContain("## Additional Instructions");
      expect(result).not.toContain("{{#if");
      expect(result).not.toContain("{{/if}}");
      expect(result).toContain("Summary request.");
      expect(result).toContain("End.");
    });

    it("handles empty history", () => {
      const context: PromptContext = {
        ...baseContext,
        history: "",
      };

      const template = `Previous: {{history}}`;

      const result = builder.buildPrompt(template, context);

      expect(result).toBe("Previous: No previous sessions");
    });

    it("handles multiple occurrences of same placeholder", () => {
      const template = `{{project.name}} - Start | {{project.name}} - End`;

      const result = builder.buildPrompt(template, baseContext);

      expect(result).toBe("my-project - Start | my-project - End");
    });

    it("trims whitespace from result", () => {
      const template = `

  Content here

`;

      const result = builder.buildPrompt(template, baseContext);

      expect(result).toBe("Content here");
    });

    it("handles complex multiline templates", () => {
      const template = `You analyze Claude Code conversations.

## Project
- Name: {{project.name}}
- Description: {{project.description}}

## Session
- Start: {{session.startedAt}}
- Branch: {{session.branch}}
- Models: {{session.models}}

## Previous Sessions
{{history}}

## Current Conversation
{{conversation}}

{{#if userInstructions}}
## Additional Instructions
{{userInstructions}}
{{/if}}

Create a summary (2-3 sentences).`;

      const contextWithInstructions: PromptContext = {
        ...baseContext,
        userInstructions: "Be concise",
      };

      const result = builder.buildPrompt(template, contextWithInstructions);

      expect(result).toContain("Name: my-project");
      expect(result).toContain("### User\nHello");
      expect(result).toContain("## Additional Instructions");
      expect(result).toContain("Be concise");
      expect(result).toContain("Create a summary");
    });

    it("preserves content between placeholders", () => {
      const template = `Before {{project.name}} middle {{session.branch}} after`;

      const result = builder.buildPrompt(template, baseContext);

      expect(result).toBe("Before my-project middle main after");
    });
  });
});
