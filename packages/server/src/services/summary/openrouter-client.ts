import type {
  ILLMClient,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
} from "./types.js";

interface OpenRouterConfig {
  apiUrl: string;
  apiKey: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * OpenRouter API client implementing ILLMClient interface.
 */
export class OpenRouterClient implements ILLMClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: OpenRouterConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions
  ): Promise<CompletionResponse> {
    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://claude-archive.local",
        "X-Title": "Claude Archive",
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    return {
      content: data.choices[0]?.message?.content ?? "",
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    };
  }
}
