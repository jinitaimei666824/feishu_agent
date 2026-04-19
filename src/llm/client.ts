import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

export type LlmInvokeOptions = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  timeoutMs?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
      reasoning_content?: string;
      tool_calls?: Array<{
        function?: {
          arguments?: string;
        };
      }>;
    };
  }>;
};

type ChatMessage = NonNullable<ChatCompletionResponse["choices"]>[number]["message"];
type ChatToolCall = NonNullable<NonNullable<ChatMessage>["tool_calls"]>[number];

function normalizeContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const maybeText = (item as { text?: unknown }).text;
          if (typeof maybeText === "string") return maybeText;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    return text;
  }

  if (content && typeof content === "object") {
    return JSON.stringify(content);
  }

  return "";
}

function pickMessageText(message: ChatMessage): string {
  if (!message) return "";

  const contentText = normalizeContent(message.content);
  if (contentText) return contentText;

  const reasoningText = message.reasoning_content?.trim();
  if (reasoningText) {
    logger.warn("LLM content 为空，回退使用 reasoning_content");
    return reasoningText;
  }

  const toolArgs = message.tool_calls
    ?.map((call: ChatToolCall) => call.function?.arguments?.trim() ?? "")
    .find(Boolean);
  if (toolArgs) {
    logger.warn("LLM content 为空，回退使用 tool_calls.arguments");
    return toolArgs;
  }

  return "";
}

export async function invokeBailianModel(
  options: LlmInvokeOptions,
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? env.LLM_TIMEOUT_MS;
  const shouldUseTimeout = timeoutMs > 0;
  const timeout = shouldUseTimeout
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const payload: Record<string, unknown> = {
      model: options.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      temperature: 0.2,
    };

    if (options.jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(`${env.BAILIAN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.BAILIAN_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: shouldUseTimeout ? controller.signal : undefined,
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("百炼接口调用失败", { status: response.status, body });
      throw new Error(`LLM 调用失败: ${response.status}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const message = data.choices?.[0]?.message;
    const content = pickMessageText(message);
    if (!content) {
      throw new Error("LLM 返回内容为空");
    }
    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("LLM 调用超时");
    }
    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
