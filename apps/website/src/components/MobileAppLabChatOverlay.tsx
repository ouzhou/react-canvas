"use client";

import { MobileAppLabDeepseekSettingsDialog } from "@/components/MobileAppLabDeepseekSettingsDialog";
import { MobileAppLabChatPanel } from "@/components/mobile-app-lab-chat-panel";
import { Button } from "@/components/ui/button";
import { useMobileAppLabChatMock } from "@/hooks/use-mobile-app-lab-chat-mock";
import { useMobileAppLabDeepseekKey } from "@/hooks/use-mobile-app-lab-deepseek-key";
import { MobileAppLabDeepseekTransport } from "@/lib/mobile-app-lab-deepseek-transport";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useCallback, useMemo, useState } from "react";

const WELCOME_REMOTE =
  "已通过环境变量 **PUBLIC_AI_CHAT_URL** 使用 `useChat` + `DefaultChatTransport` 连接远程接口。请确保该地址返回与 AI SDK 兼容的 UI 消息流。";

const WELCOME_DEEPSEEK =
  "已通过 **设置** 中的 DeepSeek API Key 使用 `deepseek-chat` 模型（`@ai-sdk/deepseek`）。Key 仅保存在本机 localStorage。";

function getPublicAiChatUrl(): string | undefined {
  const raw = import.meta.env.PUBLIC_AI_CHAT_URL;
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t === "" ? undefined : t;
}

function settingsButton(onOpen: () => void) {
  return (
    <Button
      className="h-7 px-2 text-xs"
      type="button"
      variant="ghost"
      onClick={() => {
        onOpen();
      }}
    >
      设置
    </Button>
  );
}

function MobileAppLabChatOverlaySdk({ apiUrl }: { apiUrl: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    messages: [
      {
        id: "welcome-remote",
        parts: [{ text: WELCOME_REMOTE, type: "text" }],
        role: "assistant",
      },
    ],
    transport: new DefaultChatTransport({
      api: apiUrl,
      credentials: "omit",
    }),
  });

  const onSubmit = useCallback(
    (message: PromptInputMessage) => {
      const t = message.text.trim();
      if (!t) {
        return;
      }
      void sendMessage({ text: t });
      setInput("");
    },
    [sendMessage],
  );

  return (
    <MobileAppLabChatPanel
      error={error}
      headerRight={<span className="text-[10px] text-muted-foreground">远程</span>}
      input={input}
      inputPlaceholder="输入消息…"
      messages={messages}
      onClearError={clearError}
      onInputChange={setInput}
      onStop={() => {
        void stop();
      }}
      onSubmit={onSubmit}
      status={status}
    />
  );
}

function MobileAppLabChatOverlayDeepseekInner({
  apiKey,
  onOpenSettings,
}: {
  apiKey: string;
  onOpenSettings: () => void;
}) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new MobileAppLabDeepseekTransport(() => apiKey), [apiKey]);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id: "mobile-app-lab-deepseek",
    messages: [
      {
        id: "welcome-deepseek",
        parts: [{ text: WELCOME_DEEPSEEK, type: "text" }],
        role: "assistant",
      },
    ],
    transport,
  });

  const onSubmit = useCallback(
    (message: PromptInputMessage) => {
      const t = message.text.trim();
      if (!t) {
        return;
      }
      void sendMessage({ text: t });
      setInput("");
    },
    [sendMessage],
  );

  return (
    <MobileAppLabChatPanel
      error={error}
      headerRight={settingsButton(onOpenSettings)}
      input={input}
      inputPlaceholder="输入消息…"
      messages={messages}
      onClearError={clearError}
      onInputChange={setInput}
      onStop={() => {
        void stop();
      }}
      onSubmit={onSubmit}
      status={status}
    />
  );
}

function MobileAppLabChatOverlayDeepseek({
  apiKey,
  onOpenSettings,
}: {
  apiKey: string;
  onOpenSettings: () => void;
}) {
  return (
    <MobileAppLabChatOverlayDeepseekInner
      key={apiKey}
      apiKey={apiKey}
      onOpenSettings={onOpenSettings}
    />
  );
}

function MobileAppLabChatOverlayMock({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [input, setInput] = useState("");
  const { messages, sendText, status, stop } = useMobileAppLabChatMock();

  const onSubmit = useCallback(
    (message: PromptInputMessage) => {
      const t = message.text.trim();
      if (!t) {
        return;
      }
      void sendText(t);
      setInput("");
    },
    [sendText],
  );

  return (
    <MobileAppLabChatPanel
      headerRight={settingsButton(onOpenSettings)}
      input={input}
      inputPlaceholder="输入消息…（Mock，可在设置中填写 DeepSeek Key）"
      messages={messages}
      onInputChange={setInput}
      onStop={stop}
      onSubmit={onSubmit}
      status={status}
    />
  );
}

/**
 * AI Elements 对话浮层（右下角）。
 * - `PUBLIC_AI_CHAT_URL`：远程 `DefaultChatTransport`。
 * - 否则若 localStorage 有 DeepSeek Key：`@ai-sdk/deepseek` + 自定义 `ChatTransport`。
 * - 否则 Mock；可通过「设置」写入 Key。
 */
export function MobileAppLabChatOverlay() {
  const apiUrl = getPublicAiChatUrl();
  const { apiKey, save, clear } = useMobileAppLabDeepseekKey();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const chat = apiUrl ? (
    <MobileAppLabChatOverlaySdk apiUrl={apiUrl} />
  ) : apiKey ? (
    <MobileAppLabChatOverlayDeepseek
      apiKey={apiKey}
      onOpenSettings={() => {
        setSettingsOpen(true);
      }}
    />
  ) : (
    <MobileAppLabChatOverlayMock
      onOpenSettings={() => {
        setSettingsOpen(true);
      }}
    />
  );

  return (
    <>
      {!apiUrl ? (
        <MobileAppLabDeepseekSettingsDialog
          hasSavedKey={Boolean(apiKey)}
          open={settingsOpen}
          onClear={clear}
          onOpenChange={setSettingsOpen}
          onSave={save}
        />
      ) : null}
      {chat}
    </>
  );
}
