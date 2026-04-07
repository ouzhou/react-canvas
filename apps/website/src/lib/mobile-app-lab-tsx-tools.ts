import { tool } from "ai";
import { z } from "zod";

/** 解码后 TSX 最大字符数（与原先 code 上限一致） */
const MAX_CODE_CHARS = 1_000_000;
/** Base64 膨胀上界（含少量余量） */
const MAX_CODE_B64_CHARS = 1_400_000;

const labTsxToolInputSchema = z
  .object({
    /** 优先：UTF-8 再 Base64，避免大段 TSX 在 JSON 里出现未转义引号 */
    code_b64: z.string().max(MAX_CODE_B64_CHARS).optional(),
    /** 兼容：明文 TSX（仅当 JSON 转义正确时才能解析；大文件请用 code_b64） */
    code: z.string().max(MAX_CODE_CHARS).optional(),
  })
  .refine(
    (d) => {
      const hasB64 = Boolean(d.code_b64?.trim());
      const hasCode = Boolean(d.code?.trim());
      return hasB64 !== hasCode;
    },
    { message: "必须且只能提供 code_b64 与 code 二者之一（大源码请用 code_b64）" },
  );

/**
 * 将工具参数中的 Base64（UTF-8）解码为源码。模型在 JSON 里传明文 TSX 时易因未转义 `"` 导致整段 JSON 无法解析；Base64 仅含安全字符。
 */
export function decodeLabTsxFromBase64(b64: string): string {
  const normalized = b64.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export function createLabTsxTools(opts: {
  setDraft: (code: string) => void;
  setAppliedCode: (code: string) => void;
}) {
  return {
    set_lab_tsx: tool({
      description:
        "Replace the entire Mobile App Lab TSX source. Prefer code_b64: UTF-8 full file encoded as standard Base64 (no line breaks). Alternative: code (plain TSX string) only if small; large files MUST use code_b64 to avoid JSON parse errors. Must be valid TSX (no import; use React, View, Text, ScrollView, Image from scope).",
      inputSchema: labTsxToolInputSchema,
      execute: async (input) => {
        let next: string;
        const useB64 = Boolean(input.code_b64?.trim());
        if (useB64) {
          try {
            next = decodeLabTsxFromBase64(input.code_b64!).trim();
          } catch {
            throw new Error("code_b64 不是合法的 Base64，或 UTF-8 解码失败。");
          }
        } else {
          next = input.code!.trim();
        }
        if (next.length > MAX_CODE_CHARS) {
          next = next.slice(0, MAX_CODE_CHARS);
        }
        opts.setDraft(next);
        opts.setAppliedCode(next);
        return { ok: true as const, length: next.length };
      },
    }),
  };
}

export type LabTsxToolSet = ReturnType<typeof createLabTsxTools>;
