"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useId, useState } from "react";

const DOCS_DEEPSEEK_PROVIDER = "https://ai-sdk.dev/providers/ai-sdk-providers/deepseek";
const DEEPSEEK_KEYS_URL = "https://platform.deepseek.com/api_keys";

export type MobileAppLabDeepseekSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 是否已有已保存的 Key（不明文展示） */
  hasSavedKey: boolean;
  onSave: (key: string) => void;
  onClear: () => void;
};

/**
 * 配置 DeepSeek API Key，写入 localStorage。
 */
export function MobileAppLabDeepseekSettingsDialog({
  open,
  onOpenChange,
  hasSavedKey,
  onSave,
  onClear,
}: MobileAppLabDeepseekSettingsDialogProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setDraft("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>DeepSeek 设置</DialogTitle>
          <DialogDescription>
            API Key 仅保存在本机浏览器的 localStorage，不会上传到本站服务器。获取 Key：{" "}
            <a href={DEEPSEEK_KEYS_URL} rel="noreferrer" target="_blank">
              DeepSeek 控制台
            </a>
            。接入说明见{" "}
            <a href={DOCS_DEEPSEEK_PROVIDER} rel="noreferrer" target="_blank">
              AI SDK DeepSeek Provider
            </a>
            。若浏览器因 CORS 等原因无法直连 DeepSeek，请改用可访问的代理地址并设置环境变量{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">PUBLIC_AI_CHAT_URL</code>。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
            API Key
          </label>
          <Input
            autoComplete="off"
            className="font-mono text-xs"
            id={id}
            placeholder={hasSavedKey ? "输入新 Key 以覆盖，或留空仅保存状态不变" : "sk-…"}
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
          />
          {hasSavedKey ? (
            <p className="text-xs text-muted-foreground">
              当前已保存 Key，对话将使用 deepseek-chat 模型。
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          >
            清除已保存
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              disabled={!draft.trim() && !hasSavedKey}
              type="button"
              onClick={() => {
                const t = draft.trim();
                if (t) {
                  onSave(t);
                }
                onOpenChange(false);
              }}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
