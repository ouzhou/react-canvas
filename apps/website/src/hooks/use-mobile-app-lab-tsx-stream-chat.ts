"use client";

import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  readUIMessageStream,
  stepCountIs,
  streamText,
  type ChatStatus,
  type UIMessage,
} from "ai";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildLabSystemPrompt } from "@/lib/mobile-app-lab-tsx-system-prompt";
import { createLabTsxTools } from "@/lib/mobile-app-lab-tsx-tools";

const WELCOME_LAB_TOOLS: UIMessage = {
  id: "welcome-lab-tools",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "你好。配置 DeepSeek 后，可用自然语言描述修改；我会通过工具 **set_lab_tsx** 更新侧栏源码（不会自动应用画布）。",
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

    const { apiKey, getDraftSnapshot, setDraft } = optsRef.current;

    try {
      setStatus("streaming");
      const modelMessages = await convertToModelMessages(next);
      const result = streamText({
        model: createDeepSeek({ apiKey }).chat("deepseek-chat"),
        system: buildLabSystemPrompt(getDraftSnapshot()),
        messages: modelMessages,
        tools: createLabTsxTools({ setDraft }),
        stopWhen: stepCountIs(MAX_STEPS),
        abortSignal: ac.signal,
      });

      const uiStream = result.toUIMessageStream();
      for await (const ui of readUIMessageStream({ stream: uiStream })) {
        setMessages((p) => {
          const merged = mergeStepIntoMessages(p, ui);
          messagesRef.current = merged;
          return merged;
        });
      }
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
