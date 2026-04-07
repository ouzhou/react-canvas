import type { GenerateTextResult, UIMessage } from "ai";
import { nanoid } from "nanoid";
import type { LabTsxToolSet } from "@/lib/mobile-app-lab-tsx-tools";

/**
 * 将 `generateText` 的多步结果整理为一条 assistant `UIMessage`（供对话区展示）。
 */
export function buildAssistantUIMessageFromGenerateText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK 要求第二泛参为 Output 规格，此处用 any 绑定默认文本输出即可
  result: GenerateTextResult<LabTsxToolSet, any>,
): UIMessage {
  const parts: UIMessage["parts"] = [];
  const seenToolCallIds = new Set<string>();

  for (const step of result.steps) {
    if (step.text?.trim()) {
      parts.push({ type: "text", text: step.text });
    }
    for (const part of step.content) {
      if (part.type !== "tool-error" || part.toolName !== "set_lab_tsx") {
        continue;
      }
      if (seenToolCallIds.has(part.toolCallId)) {
        continue;
      }
      seenToolCallIds.add(part.toolCallId);
      const err = part.error;
      const errorText =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : JSON.stringify(err).slice(0, 2000);
      parts.push({
        type: "tool-set_lab_tsx",
        toolCallId: part.toolCallId,
        state: "output-error",
        input: part.input,
        errorText,
      });
    }
    for (const tr of step.toolResults) {
      if (tr.type !== "tool-result" || tr.toolName !== "set_lab_tsx") {
        continue;
      }
      if (seenToolCallIds.has(tr.toolCallId)) {
        continue;
      }
      seenToolCallIds.add(tr.toolCallId);
      parts.push({
        type: "tool-set_lab_tsx",
        toolCallId: tr.toolCallId,
        state: "output-available",
        input: tr.input,
        output: tr.output,
      });
    }
  }

  return {
    id: nanoid(),
    role: "assistant",
    parts: parts.length > 0 ? parts : [{ type: "text", text: "" }],
  };
}
