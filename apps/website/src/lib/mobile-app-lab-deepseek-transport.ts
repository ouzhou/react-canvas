import { createDeepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText } from "ai";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

/**
 * 浏览器端直连 DeepSeek（API Key 来自 localStorage，由调用方注入）。
 * 若遇网络或 CORS 限制，请改用服务端代理或 `PUBLIC_AI_CHAT_URL`。
 *
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/deepseek
 */
export class MobileAppLabDeepseekTransport implements ChatTransport<UIMessage> {
  constructor(private readonly getApiKey: () => string | null) {}

  async sendMessages(options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const { messages, abortSignal } = options;
    const apiKey = this.getApiKey()?.trim() ?? "";
    if (!apiKey) {
      throw new Error("请先在「设置」中填写 DeepSeek API Key");
    }

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: createDeepSeek({ apiKey }).chat("deepseek-chat"),
      messages: modelMessages,
      abortSignal,
    });

    return result.toUIMessageStream() as ReadableStream<UIMessageChunk>;
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}
