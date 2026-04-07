"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ChatStatus, DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import type { ReactNode } from "react";

const MAX_TOOL_CODE_PREVIEW_CHARS = 6000;

function isToolPart(part: UIMessage["parts"][number]): part is ToolUIPart | DynamicToolUIPart {
  if (typeof part !== "object" || part === null || !("type" in part)) {
    return false;
  }
  const t = (part as { type: string }).type;
  return t === "dynamic-tool" || t.startsWith("tool-");
}

/** 避免 set_lab_tsx 的完整 code_b64 塞满对话区，仅影响展示。 */
function toolInputForDisplay(part: ToolUIPart | DynamicToolUIPart): ToolUIPart["input"] {
  if (part.type !== "tool-set_lab_tsx" || part.input === undefined || part.input === null) {
    return part.input;
  }
  const input = part.input as { code_b64?: string; code?: string };
  const raw = input.code_b64 ?? input.code;
  if (typeof raw !== "string" || raw.length <= MAX_TOOL_CODE_PREVIEW_CHARS) {
    return part.input;
  }
  const omitted = raw.length - MAX_TOOL_CODE_PREVIEW_CHARS;
  const key = input.code_b64 !== undefined ? "code_b64" : "code";
  return {
    ...input,
    [key]: `${raw.slice(0, MAX_TOOL_CODE_PREVIEW_CHARS)}\n\n/* …已省略 ${omitted} 字符（完整内容已写入侧栏并应用）*/`,
  };
}

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
  /**
   * Lab TSX 流：在请求进行中（submitted / streaming）显示「正在返回新代码」提示条。
   */
  codeStreamLoadingBanner?: boolean;
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
  codeStreamLoadingBanner,
}: MobileAppLabChatPanelProps) {
  const submitDisabled = (status === "ready" && !input.trim()) || status === "submitted";
  const submitStatus =
    status === "streaming" ? "streaming" : status === "submitted" ? "submitted" : undefined;
  const showCodeLoading =
    Boolean(codeStreamLoadingBanner) && (status === "submitted" || status === "streaming");

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
        {showCodeLoading ? (
          <div
            aria-live="polite"
            className="shrink-0 border-b border-border bg-muted/50 px-3 py-2"
            role="status"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3.5 shrink-0" />
              <span>正在返回新代码…</span>
            </div>
            <div className="mobile-app-lab-code-loading-track h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="mobile-app-lab-code-loading-sweep h-full" />
            </div>
          </div>
        ) : null}
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-4 py-3">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;
                    if (part.type === "text") {
                      return message.role === "assistant" ? (
                        <MessageResponse key={key}>{part.text}</MessageResponse>
                      ) : (
                        <span key={key}>{part.text}</span>
                      );
                    }
                    if (isToolPart(part)) {
                      const header =
                        part.type === "dynamic-tool" ? (
                          <ToolHeader
                            state={part.state}
                            toolName={part.toolName}
                            type={part.type}
                          />
                        ) : (
                          <ToolHeader
                            state={part.state}
                            title={part.type === "tool-set_lab_tsx" ? "set_lab_tsx" : undefined}
                            type={part.type}
                          />
                        );
                      return (
                        <Tool className="mb-2 max-w-full" defaultOpen key={key}>
                          {header}
                          <ToolContent>
                            <ToolInput input={toolInputForDisplay(part)} />
                            <ToolOutput errorText={part.errorText} output={part.output} />
                          </ToolContent>
                        </Tool>
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
