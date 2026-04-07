"use client";

import { MobileAppLabDeepseekSettingsDialog } from "@/components/MobileAppLabDeepseekSettingsDialog";
import { MobileAppLabChatPanel } from "@/components/mobile-app-lab-chat-panel";
import { Button } from "@/components/ui/button";
import type { MobileAppLabTsxContextValue } from "@/contexts/mobile-app-lab-tsx-context.tsx";
import { MobileAppLabTsxContext } from "@/contexts/mobile-app-lab-tsx-context.tsx";
import { useMobileAppLabChatMock } from "@/hooks/use-mobile-app-lab-chat-mock";
import { useMobileAppLabDeepseekKey } from "@/hooks/use-mobile-app-lab-deepseek-key";
import { useMobileAppLabTsxStreamChat } from "@/hooks/use-mobile-app-lab-tsx-stream-chat";
import { MobileAppLabDeepseekTransport } from "@/lib/mobile-app-lab-deepseek-transport";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { MessageCircleIcon } from "lucide-react";
import { useCallback, useContext, useMemo, useState } from "react";

const WELCOME_REMOTE =
  "已通过环境变量 **PUBLIC_AI_CHAT_URL** 使用 `useChat` + `DefaultChatTransport` 连接远程接口。请确保该地址返回与 AI SDK 兼容的 UI 消息流。";

const WELCOME_DEEPSEEK =
  "已通过 **设置** 中的 DeepSeek API Key 使用 `@ai-sdk/deepseek`（普通对话为 `deepseek-chat`）。Key 仅保存在本机 localStorage。";

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

function MobileAppLabChatOverlaySdk({ apiUrl, onClose }: { apiUrl: string; onClose: () => void }) {
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
      onClose={onClose}
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

/** 无 Lab TSX Context 时：普通 DeepSeek 对话（非 tool）。 */
function MobileAppLabChatOverlayDeepseekPlainInner({
  apiKey,
  onClose,
  onOpenSettings,
}: {
  apiKey: string;
  onClose: () => void;
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
      onClose={onClose}
      onInputChange={setInput}
      onStop={() => {
        void stop();
      }}
      onSubmit={onSubmit}
      status={status}
    />
  );
}

/** Mobile App Lab：`streamText` + `set_lab_tsx` 工具。 */
function MobileAppLabChatOverlayDeepseekLabTools({
  apiKey,
  onClose,
  onOpenSettings,
  labTsx,
}: {
  apiKey: string;
  onClose: () => void;
  onOpenSettings: () => void;
  labTsx: MobileAppLabTsxContextValue;
}) {
  const [input, setInput] = useState("");
  const { messages, sendText, status, stop, error, clearError } = useMobileAppLabTsxStreamChat({
    apiKey,
    getDraftSnapshot: () => labTsx.draftForPrompt,
    setDraft: (code) => {
      labTsx.setDraft(code);
    },
    setAppliedCode: (code) => {
      labTsx.setAppliedCode(code);
    },
  });

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
      codeStreamLoadingBanner
      error={error}
      headerRight={settingsButton(onOpenSettings)}
      input={input}
      inputPlaceholder="描述如何修改侧栏 TSX…"
      messages={messages}
      onClearError={clearError}
      onClose={onClose}
      onInputChange={setInput}
      onStop={stop}
      onSubmit={onSubmit}
      status={status}
    />
  );
}

function MobileAppLabChatOverlayDeepseek({
  apiKey,
  onClose,
  onOpenSettings,
}: {
  apiKey: string;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const labTsx = useContext(MobileAppLabTsxContext);
  if (labTsx) {
    return (
      <MobileAppLabChatOverlayDeepseekLabTools
        key={apiKey}
        apiKey={apiKey}
        labTsx={labTsx}
        onClose={onClose}
        onOpenSettings={onOpenSettings}
      />
    );
  }
  return (
    <MobileAppLabChatOverlayDeepseekPlainInner
      key={apiKey}
      apiKey={apiKey}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
    />
  );
}

function MobileAppLabChatOverlayMock({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenSettings: () => void;
}) {
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
      onClose={onClose}
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
 * - 否则若 localStorage 有 DeepSeek Key：`streamText` + 工具 `set_lab_tsx`（有 Lab Context 时同步应用画布）或普通 `ChatTransport`。
 * - 否则 Mock；可通过「设置」写入 Key。
 */
export function MobileAppLabChatOverlay() {
  const apiUrl = getPublicAiChatUrl();
  const { apiKey, save, clear } = useMobileAppLabDeepseekKey();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const chat = apiUrl ? (
    <MobileAppLabChatOverlaySdk apiUrl={apiUrl} onClose={() => setChatOpen(false)} />
  ) : apiKey ? (
    <MobileAppLabChatOverlayDeepseek
      apiKey={apiKey}
      onClose={() => setChatOpen(false)}
      onOpenSettings={openSettings}
    />
  ) : (
    <MobileAppLabChatOverlayMock onClose={() => setChatOpen(false)} onOpenSettings={openSettings} />
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
      <div className={chatOpen ? undefined : "hidden"}>{chat}</div>
      {chatOpen ? null : (
        <Button
          aria-label="打开 AI 对话"
          className="fixed right-3 bottom-4 z-[90] gap-1.5 border border-[var(--sl-color-hairline)] bg-card text-card-foreground shadow-lg hover:bg-muted/80"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => {
            setChatOpen(true);
          }}
        >
          <MessageCircleIcon aria-hidden className="size-4" />
          AI 对话
        </Button>
      )}
    </>
  );
}
