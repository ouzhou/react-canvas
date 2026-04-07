import { tool } from "ai";
import { z } from "zod";

/** 解码后 TSX 最大字符数 */
const MAX_CODE_CHARS = 1_000_000;
/** replace 工具：明文片段上限（单段） */
const MAX_REPLACE_SNIPPET_CHARS = 200_000;
/** read_lab_tsx_slice：单次最多行数 */
export const MAX_READ_LINES_PER_SLICE = 400;

const labTsxToolInputSchema = z.object({
  /** 完整 TSX 源码（JSON 字符串；模型侧须正确转义引号与换行） */
  code: z.string().max(MAX_CODE_CHARS),
});

/**
 * 在源码中唯一匹配一段文本并替换为首处；用于 AI 增量改码，避免整文件 set_lab_tsx。
 */
export function applyUniqueReplace(
  code: string,
  oldStr: string,
  newStr: string,
): { ok: true; next: string } | { ok: false; reason: string } {
  if (oldStr.length === 0) {
    return { ok: false, reason: "old_string 不能为空。" };
  }
  let count = 0;
  let pos = 0;
  while (true) {
    const i = code.indexOf(oldStr, pos);
    if (i === -1) {
      break;
    }
    count++;
    pos = i + oldStr.length;
  }
  if (count === 0) {
    return {
      ok: false,
      reason:
        "未找到与 old_string 完全一致的片段。请用 read_lab_tsx_slice 核对行号与空白，或略增大 old_string 使其唯一。",
    };
  }
  if (count > 1) {
    return {
      ok: false,
      reason: `old_string 在源码中出现 ${count} 次，必须唯一匹配；请扩大上下文后再试。`,
    };
  }
  return { ok: true, next: code.replace(oldStr, newStr) };
}

const replaceLabTsxInputSchema = z.object({
  old_string: z.string().min(1).max(MAX_REPLACE_SNIPPET_CHARS),
  new_string: z.string().max(MAX_REPLACE_SNIPPET_CHARS),
});

const readLabTsxSliceInputSchema = z.object({
  start_line: z.number().int().min(1),
  end_line: z.number().int().min(1),
});

export function formatLabTsxLineSlice(
  code: string,
  startLine: number,
  endLine: number,
): {
  text: string;
  totalLines: number;
  returnedLines: number;
} {
  const lines = code.split(/\r?\n/);
  const totalLines = lines.length;
  const s = Math.min(Math.max(1, startLine), totalLines);
  const e = Math.min(Math.max(s, endLine), totalLines);
  const slice = lines.slice(s - 1, e);
  const text = slice.map((line, i) => `${s + i}|${line}`).join("\n");
  return { text, totalLines, returnedLines: slice.length };
}

export function createLabTsxTools(opts: {
  getDraft: () => string;
  setDraft: (code: string) => void;
  setAppliedCode: (code: string) => void;
}) {
  return {
    set_lab_tsx: tool({
      description:
        "Replace the entire Mobile App Lab TSX source. Parameter: code (full TSX string). Must be valid TSX (no import; use React, View, Text, ScrollView, Image from scope).",
      inputSchema: labTsxToolInputSchema,
      execute: async (input) => {
        let next = input.code.trim();
        if (next.length > MAX_CODE_CHARS) {
          next = next.slice(0, MAX_CODE_CHARS);
        }
        opts.setDraft(next);
        opts.setAppliedCode(next);
        return { ok: true as const, length: next.length };
      },
    }),

    read_lab_tsx_slice: tool({
      description:
        "Read a 1-based inclusive line range of the current Lab TSX draft (for verifying exact text before replace_lab_tsx). Max 400 lines per call. Use when system prompt draft is truncated or you need precise whitespace.",
      inputSchema: readLabTsxSliceInputSchema,
      execute: async ({ start_line, end_line }) => {
        if (end_line < start_line) {
          return { ok: false as const, error: "end_line 必须 >= start_line" };
        }
        if (end_line - start_line + 1 > MAX_READ_LINES_PER_SLICE) {
          return {
            ok: false as const,
            error: `单次最多读取 ${MAX_READ_LINES_PER_SLICE} 行，请缩小范围。`,
          };
        }
        const code = opts.getDraft();
        const { text, totalLines, returnedLines } = formatLabTsxLineSlice(
          code,
          start_line,
          end_line,
        );
        return {
          ok: true as const,
          total_lines: totalLines,
          returned_lines: returnedLines,
          start_line,
          end_line,
          text,
        };
      },
    }),

    replace_lab_tsx: tool({
      description:
        "Replace exactly ONE occurrence of old_string with new_string in the current draft (applied to canvas like set_lab_tsx). Prefer over set_lab_tsx for small edits. old_string must be unique. new_string may be empty to delete the matched segment.",
      inputSchema: replaceLabTsxInputSchema,
      execute: async (input) => {
        const oldStr = input.old_string;
        const newStr = input.new_string;
        const code = opts.getDraft();
        const applied = applyUniqueReplace(code, oldStr, newStr);
        if (!applied.ok) {
          return { ok: false as const, error: applied.reason };
        }
        let next = applied.next;
        if (next.length > MAX_CODE_CHARS) {
          next = next.slice(0, MAX_CODE_CHARS);
        }
        opts.setDraft(next);
        opts.setAppliedCode(next);
        return {
          ok: true as const,
          length: next.length,
          old_len: oldStr.length,
          new_len: newStr.length,
        };
      },
    }),
  };
}

export type LabTsxToolSet = ReturnType<typeof createLabTsxTools>;

/** 与 {@link createLabTsxTools} 的键一致，供对话 UI 聚合 tool 步骤。 */
export const MOBILE_APP_LAB_TOOL_NAMES = [
  "set_lab_tsx",
  "replace_lab_tsx",
  "read_lab_tsx_slice",
] as const;
