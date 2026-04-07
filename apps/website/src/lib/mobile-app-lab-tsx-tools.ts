import { tool } from "ai";
import { z } from "zod";

const MAX_CODE_CHARS = 1_000_000;

export function createLabTsxTools(opts: { setDraft: (code: string) => void }) {
  return {
    set_lab_tsx: tool({
      description:
        "Replace the entire Mobile App Lab TSX source with the given complete code string. Must be valid TSX per system rules (no import statements; use React, View, Text, ScrollView, Image from scope).",
      inputSchema: z.object({
        code: z.string().min(1).max(MAX_CODE_CHARS),
      }),
      execute: async ({ code }) => {
        opts.setDraft(code);
        return { ok: true as const, length: code.length };
      },
    }),
  };
}
