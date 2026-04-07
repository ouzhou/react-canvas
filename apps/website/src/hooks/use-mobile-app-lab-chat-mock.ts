import type { ChatStatus, UIMessage } from "ai";
import { nanoid } from "nanoid";
import { useCallback, useRef, useState } from "react";

const WELCOME =
  "你好，这是 **Mobile App Lab** 的占位对话。点击右上角 **设置** 可填写 DeepSeek API Key（存于 localStorage）以使用真实模型；否则下方输入会模拟流式回复。";

const MOCK_REPLY_PREFIX = "【Mock】\n\n";

/**
 * 与 AI Elements + AI SDK 文档中的 `useChat` 用法对齐的消息形态（`message.parts` + `text`），
 * 便于稍后替换为 `@ai-sdk/react` 的 `useChat({ transport: new DefaultChatTransport({ api: '...' }) })`。
 *
 * @see https://github.com/vercel/ai-elements/blob/main/apps/docs/content/components/(chatbot)/conversation.mdx
 */
export function useMobileAppLabChatMock() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "welcome",
      parts: [{ text: WELCOME, type: "text" }],
      role: "assistant",
    },
  ]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("ready");
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status !== "ready") {
        return;
      }

      const userMessage: UIMessage = {
        id: nanoid(),
        parts: [{ text: trimmed, type: "text" }],
        role: "user",
      };

      setMessages((m) => [...m, userMessage]);
      setStatus("submitted");

      await new Promise<void>((r) => {
        setTimeout(r, 150);
      });

      const assistantId = nanoid();
      const fullReply = `${MOCK_REPLY_PREFIX}你说了：「${trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed}」\n\n接入后端路由后，将使用 \`streamText\` / \`toUIMessageStreamResponse\` 返回真实流式内容。`;

      setMessages((m) => [
        ...m,
        {
          id: assistantId,
          parts: [{ text: "", type: "text" }],
          role: "assistant",
        },
      ]);
      setStatus("streaming");

      const ac = new AbortController();
      abortRef.current = ac;

      const chunks = fullReply.split(/(\s+)/);
      let acc = "";
      for (const chunk of chunks) {
        if (ac.signal.aborted) {
          break;
        }
        acc += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  parts: [{ text: acc, type: "text" }],
                }
              : msg,
          ),
        );
        await new Promise<void>((r) => {
          setTimeout(r, 16 + Math.random() * 24);
        });
      }

      if (!ac.signal.aborted) {
        setStatus("ready");
      }
      abortRef.current = null;
    },
    [status],
  );

  return { messages, sendText, status, stop };
}
