"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ChatStatus, UIMessage } from "ai";
import type { ReactNode } from "react";

export type MobileAppLabChatPanelProps = {
  messages: UIMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
  inputPlaceholder: string;
  /** 顶栏右侧，例如「设置」按钮 */
  headerRight?: ReactNode;
  error?: Error;
  onClearError?: () => void;
};

/**
 * AI Elements 对话区（与 {@link MobileAppLabChatOverlay} 共用），按 `message.parts` + `text` 渲染。
 */
export function MobileAppLabChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  status,
  onStop,
  inputPlaceholder,
  headerRight,
  error,
  onClearError,
}: MobileAppLabChatPanelProps) {
  const submitDisabled = (status === "ready" && !input.trim()) || status === "submitted";
  const submitStatus =
    status === "streaming" ? "streaming" : status === "submitted" ? "submitted" : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        aria-label="AI 对话"
        className="pointer-events-auto fixed right-3 bottom-4 z-[90] flex h-[min(42vh,400px)] w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="text-sm font-medium">AI 对话</div>
          {headerRight ? <div className="flex shrink-0 items-center">{headerRight}</div> : null}
        </div>
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-4 py-3">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return message.role === "assistant" ? (
                        <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                      ) : (
                        <span key={`${message.id}-${i}`}>{part.text}</span>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        {error ? (
          <div className="shrink-0 border-t border-border px-2 py-1.5 text-xs text-destructive">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words">{error.message}</span>
              {onClearError ? (
                <button
                  className="shrink-0 underline"
                  type="button"
                  onClick={() => {
                    onClearError();
                  }}
                >
                  关闭
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="shrink-0 border-t border-border p-2">
          <PromptInput className="rounded-xl border-0 shadow-none" onSubmit={onSubmit}>
            <PromptInputTextarea
              className="min-h-[44px] text-sm"
              placeholder={inputPlaceholder}
              value={input}
              onChange={(e) => {
                onInputChange(e.currentTarget.value);
              }}
            />
            <PromptInputFooter className="justify-end p-1">
              <PromptInputSubmit disabled={submitDisabled} onStop={onStop} status={submitStatus} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </TooltipProvider>
  );
}
