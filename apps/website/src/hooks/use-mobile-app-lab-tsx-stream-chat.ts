"use client";

import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  type ChatStatus,
  type UIMessage,
} from "ai";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildAssistantUIMessageFromGenerateText } from "@/lib/mobile-app-lab-assistant-ui-message";
import { buildLabSystemPrompt } from "@/lib/mobile-app-lab-tsx-system-prompt";
import { createLabTsxTools } from "@/lib/mobile-app-lab-tsx-tools";

const WELCOME_LAB_TOOLS: UIMessage = {
  id: "welcome-lab-tools",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: `你好，我是按 **React 前端开发**角色协助你的助手。

本页在 **React Canvas**（\`@react-canvas/react\`：\`View\` / \`Text\` / \`ScrollView\` / \`Image\` + \`React\`）里预览「手机窗口」界面；布局类似 **Yoga Flexbox**。仓库里还有 \`@react-canvas/ui\`（Button、Icon、主题等），但 **Lab 默认未注入到预览环境**，请不要在源码里 \`import\`——需要按钮/图标时用 \`View\` + \`Text\` 组合即可。

配置 DeepSeek 后，直接用自然语言说想改什么；我会通过工具 **set_lab_tsx**（参数为完整源码的 **UTF-8 Base64：code_b64**）写入侧栏并**自动应用到下方画布**，避免大段 TSX 在 JSON 里转义出错。`,
    },
  ],
};

const MAX_STEPS = 5;

function mergeStepIntoMessages(prev: UIMessage[], step: UIMessage): UIMessage[] {
  const idx = prev.findIndex((m) => m.id === step.id);
  if (idx === -1) {
    return [...prev, step];
  }
  const next = [...prev];
  next[idx] = step;
  return next;
}

export function useMobileAppLabTsxStreamChat(options: {
  apiKey: string;
  getDraftSnapshot: () => string;
  setDraft: (code: string) => void;
  setAppliedCode: (code: string) => void;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([WELCOME_LAB_TOOLS]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UIMessage[]>([WELCOME_LAB_TOOLS]);
  const busyRef = useRef(false);
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendText = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || busyRef.current) {
      return;
    }
    busyRef.current = true;
    setError(undefined);
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("submitted");

    const userMsg: UIMessage = {
      id: nanoid(),
      role: "user",
      parts: [{ type: "text", text: userText }],
    };
    const prev = messagesRef.current;
    const next = [...prev, userMsg];
    messagesRef.current = next;
    setMessages(next);

    const { apiKey, getDraftSnapshot, setDraft, setAppliedCode } = optsRef.current;

    try {
      setStatus("streaming");
      const modelMessages = await convertToModelMessages(next);

      const tools = createLabTsxTools({ setDraft, setAppliedCode });
      const genResult = await generateText({
        model: createDeepSeek({ apiKey }).chat("deepseek-coder"),
        system: buildLabSystemPrompt(getDraftSnapshot()),
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        abortSignal: ac.signal,
        // DeepSeek API：max_tokens 合法区间为 [1, 8192]
        maxOutputTokens: 8192,
      });

      const assistantMsg = buildAssistantUIMessageFromGenerateText(genResult);
      setMessages((p) => {
        const merged = mergeStepIntoMessages(p, assistantMsg);
        messagesRef.current = merged;
        return merged;
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setError(undefined);
      } else {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      busyRef.current = false;
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
      setStatus("ready");
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  return { messages, sendText, status, stop, error, clearError };
}
