# Mobile App Lab：AI Tool Calling 修改 TSX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/mobile-app-lab` 用 DeepSeek + `streamText` 注册工具 `set_lab_tsx`，工具执行后只更新侧栏 `draft`；`draft`/`appliedCode` 持久化到 localStorage；提供重置为 `DEFAULT_LAB_TSX` 并清存储；不上传服务器。

**Architecture:** `MobileAppLab` 通过 **React Context** 提供 `draft`、`setDraft`、`appliedCode`、`setAppliedCode`、`resetLabTsx` 与当前 `draft` 文本（供 system prompt 注入）。DeepSeek 分支不再使用 `useChat` + `MobileAppLabDeepseekTransport`，改为 **`useMobileAppLabTsxStreamChat` hook**：内部 `streamText` + `tool(set_lab_tsx)` + `maxSteps`，用 `readUIMessageStream` 消费 `result.toUIMessageStream()` 更新 `UIMessage[]` 供现有 `MobileAppLabChatPanel` 渲染。`PUBLIC_AI_CHAT_URL` 与 Mock 分支行为保持与设计 spec 一致；仅 **有 DeepSeek Key** 时走工具流。

**Tech Stack:** Astro + React 19、`ai` v6、`@ai-sdk/deepseek`、`zod`（`ai` 已依赖）、现有 AI Elements 面板、Vite+（`vp check` / `vp test`）。

**Spec:** [`docs/superpowers/specs/2026-04-07-mobile-app-lab-ai-tsx-tools-design.md`](../specs/2026-04-07-mobile-app-lab-ai-tsx-tools-design.md)

---

## File map

| 文件                                                           | 职责                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/website/src/lib/mobile-app-lab-tsx-storage.ts`           | localStorage 读写、`draft`+`appliedCode` JSON、配额失败时抛错或返回结果类型                                                     |
| `apps/website/src/lib/mobile-app-lab-tsx-storage.test.ts`      | 序列化/反序列化、无效 JSON、边界长度（不测真实 LS）                                                                             |
| `apps/website/src/contexts/mobile-app-lab-tsx-context.tsx`     | `createContext` + `Provider`，默认值 `null`                                                                                     |
| `apps/website/src/lib/mobile-app-lab-tsx-tools.ts`             | `set_lab_tsx` 的 `tool({ ... })` 工厂：接收 `setDraft`、持久化回调                                                              |
| `apps/website/src/lib/mobile-app-lab-tsx-system-prompt.ts`     | `buildLabSystemPrompt(draft: string): string`：约束无 import、IIFE、`set_lab_tsx` 必填等                                        |
| `apps/website/src/hooks/use-mobile-app-lab-tsx-stream-chat.ts` | 状态：`messages: UIMessage[]`、`status`、`error`、`stop`、`submit`；内部 `streamText` + tools + `readUIMessageStream`           |
| `apps/website/src/components/MobileAppLab.tsx`                 | `useState` 初始化从 storage 读取；`useEffect` 持久化；`resetLabTsx`；`Provider` 包裹；Sheet 内「重置」按钮 + `confirm`          |
| `apps/website/src/components/MobileAppLabChatOverlay.tsx`      | `useContext`：无 context 则行为与今一致（防御）；有 context 且 DeepSeek 时用新 hook 替换 `MobileAppLabChatOverlayDeepseekInner` |

---

### Task 1: `mobile-app-lab-tsx-storage` + 单元测试

**Files:**

- Create: `apps/website/src/lib/mobile-app-lab-tsx-storage.ts`
- Create: `apps/website/src/lib/mobile-app-lab-tsx-storage.test.ts`

- [ ] **Step 1: 编写失败测试（解析与序列化）**

```typescript
import { describe, expect, it } from "vitest";
import {
  MOBILE_APP_LAB_TSX_STORAGE_KEY,
  parsePersistedLabTsx,
  serializeLabTsx,
  type LabTsxPersisted,
} from "./mobile-app-lab-tsx-storage.ts";

describe("parsePersistedLabTsx", () => {
  it("returns null for null input", () => {
    expect(parsePersistedLabTsx(null)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parsePersistedLabTsx("{")).toBeNull();
  });

  it("returns null when fields missing", () => {
    expect(parsePersistedLabTsx(JSON.stringify({ draft: "a" }))).toBeNull();
  });

  it("parses valid payload", () => {
    const p: LabTsxPersisted = { draft: "d", appliedCode: "a" };
    expect(parsePersistedLabTsx(JSON.stringify(p))).toEqual(p);
  });
});

describe("serializeLabTsx", () => {
  it("round-trips", () => {
    const p: LabTsxPersisted = { draft: "x", appliedCode: "y" };
    expect(parsePersistedLabTsx(serializeLabTsx(p))).toEqual(p);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test -- apps/website/src/lib/mobile-app-lab-tsx-storage.test.ts`  
Expected: FAIL（模块不存在或导出未定义）

- [ ] **Step 3: 实现模块（含常量与类型）**

```typescript
export const MOBILE_APP_LAB_TSX_STORAGE_KEY = "mobile-app-lab:tsx-state";

export type LabTsxPersisted = {
  draft: string;
  appliedCode: string;
};

export function parsePersistedLabTsx(raw: string | null): LabTsxPersisted | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (
      typeof v !== "object" ||
      v === null ||
      !("draft" in v) ||
      !("appliedCode" in v) ||
      typeof (v as { draft: unknown }).draft !== "string" ||
      typeof (v as { appliedCode: unknown }).appliedCode !== "string"
    ) {
      return null;
    }
    return { draft: (v as LabTsxPersisted).draft, appliedCode: (v as LabTsxPersisted).appliedCode };
  } catch {
    return null;
  }
}

export function serializeLabTsx(p: LabTsxPersisted): string {
  return JSON.stringify(p);
}

/** 从 localStorage 读取；失败返回 null */
export function loadLabTsxFromStorage(): LabTsxPersisted | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return parsePersistedLabTsx(window.localStorage.getItem(MOBILE_APP_LAB_TSX_STORAGE_KEY));
  } catch {
    return null;
  }
}

export type SaveLabTsxResult = { ok: true } | { ok: false; reason: "quota" | "unknown" };

export function saveLabTsxToStorage(p: LabTsxPersisted): SaveLabTsxResult {
  try {
    window.localStorage.setItem(MOBILE_APP_LAB_TSX_STORAGE_KEY, serializeLabTsx(p));
    return { ok: true };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unknown" };
  }
}

export function clearLabTsxStorage(): void {
  try {
    window.localStorage.removeItem(MOBILE_APP_LAB_TSX_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `vp test -- apps/website/src/lib/mobile-app-lab-tsx-storage.test.ts`  
Expected: PASS

若 `vp test` 未包含 `apps/website`，在仓库根 `vite.config.ts` 或 Vite+ 测试配置中把 `apps/website/**/*.test.ts` 纳入 `test.include`，再重跑。

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/mobile-app-lab-tsx-storage.ts apps/website/src/lib/mobile-app-lab-tsx-storage.test.ts
git commit -m "feat(website): add Mobile App Lab TSX localStorage helpers"
```

---

### Task 2: Context + `MobileAppLab` 状态与持久化

**Files:**

- Create: `apps/website/src/contexts/mobile-app-lab-tsx-context.tsx`
- Modify: `apps/website/src/components/MobileAppLab.tsx`

- [ ] **Step 1: 新增 Context**

```typescript
import { clearLabTsxStorage, type LabTsxPersisted } from "@/lib/mobile-app-lab-tsx-storage";
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export type MobileAppLabTsxContextValue = {
  draft: string;
  setDraft: (v: string | ((prev: string) => string)) => void;
  appliedCode: string;
  setAppliedCode: (v: string | ((prev: string) => string)) => void;
  /** 当前 draft，供 system prompt 使用 */
  draftForPrompt: string;
  resetLabTsx: () => void;
};

export const MobileAppLabTsxContext = createContext<MobileAppLabTsxContextValue | null>(null);

export function MobileAppLabTsxProvider({
  children,
  defaultSource,
  initialFromStorage,
}: {
  children: ReactNode;
  defaultSource: string;
  initialFromStorage: LabTsxPersisted | null;
}) {
  const initialDraft = initialFromStorage?.draft ?? defaultSource;
  const initialApplied = initialFromStorage?.appliedCode ?? defaultSource;
  const [draft, setDraft] = useState(initialDraft);
  const [appliedCode, setAppliedCode] = useState(initialApplied);

  const resetLabTsx = useCallback(() => {
    setDraft(defaultSource);
    setAppliedCode(defaultSource);
    clearLabTsxStorage();
  }, [defaultSource]);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      appliedCode,
      setAppliedCode,
      draftForPrompt: draft,
      resetLabTsx,
    }),
    [draft, appliedCode, resetLabTsx],
  );

  return <MobileAppLabTsxContext.Provider value={value}>{children}</MobileAppLabTsxContext.Provider>;
}
```

- [ ] **Step 2: 在 `MobileAppLab` 中读取初始 storage、包 Provider、持久化 effect**

在 `MobileAppLab` 组件顶层：

1. `const initialStorage = typeof window !== "undefined" ? loadLabTsxFromStorage() : null;`（仅客户端；SSR 首帧可用 `defaultSource`）。
2. 用 `MobileAppLabTsxProvider` 包裹现有 `CanvasProvider` 子树（或仅包裹含 `LiveProvider` 与 `MobileAppLabChatOverlay` 的部分），传入 `defaultSource={DEFAULT_LAB_TSX}`、`initialFromStorage={initialStorage}`。
3. 将 `useState(DEFAULT_LAB_TSX)` 的 `draft` / `appliedCode` **迁入 Provider 内部**（上一步已做），`MobileAppLab` 子组件通过 context 消费；`textarea` 的 `value`/`onChange` 绑定 `draft`/`setDraft`；「应用」按钮 `setAppliedCode(draft.trim())` 并 `saveLabTsxToStorage`。
4. `useEffect`：依赖 `[draft, appliedCode]`，调用 `saveLabTsxToStorage({ draft, appliedCode })`；若返回 `ok: false`，用 `useState` 保存一行错误文案在 Sheet 底部或 `aria-live` 区域展示（仅 human-readable，不抛未捕获异常）。

- [ ] **Step 3: Sheet 内「重置」**

在 `SheetFooter` 或 `SheetHeader` 区域增加按钮「重置为默认源码」：`window.confirm("确定…")` 为真则调用 **从 context 取** `resetLabTsx()`。

- [ ] **Step 4: `vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/contexts/mobile-app-lab-tsx-context.tsx apps/website/src/components/MobileAppLab.tsx
git commit -m "feat(website): Mobile App Lab TSX context, persist, reset"
```

---

### Task 3: System prompt 与 `set_lab_tsx` 工具工厂

**Files:**

- Create: `apps/website/src/lib/mobile-app-lab-tsx-system-prompt.ts`
- Create: `apps/website/src/lib/mobile-app-lab-tsx-tools.ts`

- [ ] **Step 1: `buildLabSystemPrompt(draft: string)`**

实现要点（字符串模板，单文件常量）：

- 要求必须通过工具 **`set_lab_tsx`** 提交**完整** TSX，参数 `code`。
- 禁止 `import`；仅使用 `React`、`View`、`Text`、`ScrollView`、`Image` 等（与 `mobile-app-lab-default-source` / `liveScope` 一致）。
- 保留与默认示例一致的 **IIFE** 包裹约定（说明一句即可）。
- 注入当前 `draft` 全文（若超过例如 120k 字符则截断并注明「已截断」，避免爆 token；阈值用常量）。

- [ ] **Step 2: `createLabTsxTools({ setDraft, getStateForSave })`**

使用 `ai` 包的 `tool` + `zod`：

```typescript
import { tool } from "ai";
import { z } from "zod";

const MAX_CODE_CHARS = 1_000_000;

export function createLabTsxTools(opts: {
  setDraft: (code: string) => void;
  getStateForSave: () => { appliedCode: string };
}) {
  return {
    set_lab_tsx: tool({
      description:
        "Replace the entire Mobile App Lab TSX source with the given code. Must be complete compilable TSX per system rules.",
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
```

持久化：`execute` 内**不**写 localStorage；由 `setDraft` 触发 React 状态更新后，Task 2 的 `useEffect` 统一保存。若需在工具后立刻存，可让 `setDraft` 同布调用 `saveLabTsxToStorage`，但会与 effect 重复——**推荐仅 effect**，避免双写。

- [ ] **Step 3: `vp check`**

Expected: pass

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/lib/mobile-app-lab-tsx-system-prompt.ts apps/website/src/lib/mobile-app-lab-tsx-tools.ts
git commit -m "feat(website): Lab TSX system prompt and set_lab_tsx tool"
```

---

### Task 4: `useMobileAppLabTsxStreamChat` hook

**Files:**

- Create: `apps/website/src/hooks/use-mobile-app-lab-tsx-stream-chat.ts`

- [ ] **Step 1: Hook 签名与行为**

实现要点（完整代码在实现时写入单文件；以下为必满足的逻辑顺序）：

1. 状态：`messages: UIMessage[]`（含首条欢迎 assistant）、`status: ChatStatus`、`error`、`abortRef`。
2. `submit(text)`：
   - `trim` 后若空或 `status !== "ready"` 则 return。
   - `setStatus("submitted")`，`setError(undefined)`，新建 `AbortController` 赋给 `abortRef`。
   - 构造本轮 `UIMessage[]`：`prevMessages` + 新 `user` 消息（`generateId` 或 `nanoid` 作 id）。
   - `const modelMessages = await convertToModelMessages(messagesForModel)`（仅含 user/assistant 可转换部分；**system 用 `streamText({ system: buildLabSystemPrompt(draftForPrompt), ... })`**，不要把 system 塞进 `UIMessage` 除非团队选择统一用一条 system UIMessage——推荐 **只用 `streamText` 的 `system` 参数**）。
   - `const result = streamText({ model: createDeepSeek({ apiKey }).chat("deepseek-chat"), system: buildLabSystemPrompt(options.draftForPrompt), messages: modelMessages, tools: createLabTsxTools({ setDraft: options.setDraft }), maxSteps: 5, abortSignal: abortRef.current.signal })`。
   - `const stream = result.toUIMessageStream()`；`for await (const step of readUIMessageStream({ stream })) { setMessages((prev) => { /* 将 step 合并进列表：通常用 step 作为本轮 assistant 消息的最终快照，或按 AI SDK 示例把 step 追加为新的 assistant 条目 */ return merged; }); }`。
   - `try/catch`：`setError(e instanceof Error ? e : new Error(String(e)))`；`finally`：`setStatus("ready")`，`abortRef.current = null`。
3. `stop()`：`abortRef.current?.abort()`，并把 `status` 置为 `ready`（与现有 mock 行为对齐）。
4. Hook 的 `draftForPrompt` / `apiKey` 应用 `useRef` 保存最新值，或在 `submit` 闭包中从 **ref** 读取，避免 `useCallback` 依赖链过长导致发消息时仍用旧 draft。

以下为精简骨架（实现时补全 `mergeStepIntoMessages` 的具体合并规则，须对照 `readUIMessageStream` 迭代语义编写单元测试或手动录屏验证）：

```typescript
import { createDeepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, readUIMessageStream, streamText, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { nanoid } from "nanoid";
import { useCallback, useRef, useState } from "react";
import { buildLabSystemPrompt } from "@/lib/mobile-app-lab-tsx-system-prompt";
import { createLabTsxTools } from "@/lib/mobile-app-lab-tsx-tools";

const WELCOME_ASSISTANT: UIMessage = {
  id: "welcome-lab-tools",
  role: "assistant",
  parts: [{ type: "text", text: "…欢迎语文案…" }],
};

const MAX_STEPS = 5;

export function useMobileAppLabTsxStreamChat(options: {
  apiKey: string;
  getDraftForPrompt: () => string;
  setDraft: (code: string) => void;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([WELCOME_ASSISTANT]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || status !== "ready") return;
      setError(undefined);
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus("submitted");
      const userMsg: UIMessage = {
        id: nanoid(),
        role: "user",
        parts: [{ type: "text", text: userText }],
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      try {
        const modelMessages = await convertToModelMessages(nextMessages);
        const result = streamText({
          model: createDeepSeek({ apiKey: options.apiKey }).chat("deepseek-chat"),
          system: buildLabSystemPrompt(options.getDraftForPrompt()),
          messages: modelMessages,
          tools: createLabTsxTools({ setDraft: options.setDraft }),
          maxSteps: MAX_STEPS,
          abortSignal: ac.signal,
        });
        const uiStream = result.toUIMessageStream();
        for await (const ui of readUIMessageStream({ stream: uiStream })) {
          setMessages((prev) => mergeStepIntoMessages(prev, ui));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setStatus("ready");
      }
    },
    [messages, options, status],
  );

  /** `readUIMessageStream` 每次给出同一 assistant 消息的更新快照时 id 不变：按 id 替换，否则追加。 */
  function mergeStepIntoMessages(prev: UIMessage[], step: UIMessage): UIMessage[] {
    const idx = prev.findIndex((m) => m.id === step.id);
    if (idx === -1) {
      return [...prev, step];
    }
    const next = [...prev];
    next[idx] = step;
    return next;
  }

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  return { messages, sendText: submit, status, stop, error, clearError };
}
```

若流式阶段发现 id 与上述假设不一致，以 AI SDK 源码或示例为准调整合并逻辑。

实现时注意：

- **`maxSteps`**：`MAX_STEPS = 5`。
- **工具**：仅 `createLabTsxTools({ setDraft })`；持久化依赖父级 `useEffect`，不在工具内写 LS。

- [ ] **Step 2: 手动验证**

启动 `vp dev`（或 `pnpm dev` in website），配置 DeepSeek Key，发送「把标题改成 XXX」类指令，确认只更新侧栏 `draft`，点「应用」后画布变；刷新页面 `draft`/`appliedCode` 从 LS 恢复。

- [ ] **Step 3: `vp check`**

Expected: pass

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/hooks/use-mobile-app-lab-tsx-stream-chat.ts
git commit -m "feat(website): streamText + set_lab_tsx hook for Mobile App Lab"
```

---

### Task 5: 接入 `MobileAppLabChatOverlay`

**Files:**

- Modify: `apps/website/src/components/MobileAppLabChatOverlay.tsx`

- [ ] **Step 1: `useContext(MobileAppLabTsxContext)`**

在 `MobileAppLabChatOverlay` 顶层：`const labTsx = useContext(MobileAppLabTsxContext)`。

- [ ] **Step 2: 当 `labTsx !== null` 且 `apiKey` 存在且 **无** `PUBLIC_AI_CHAT_URL` 时**，渲染新组件 `MobileAppLabChatOverlayLabTools`（可同文件内函数组件）\*\*：
  - 调用 `useMobileAppLabTsxStreamChat({ apiKey, draftForPrompt: labTsx.draftForPrompt, setDraft: (c) => labTsx.setDraft(c), getAppliedCode: () => labTsx.appliedCode })`。
  - `MobileAppLabChatPanel` 的 `messages`/`status`/`onStop`/`error`/`onClearError`/`onSubmit` 绑定到 hook（`onSubmit` 内调用 `sendText`，清空 input）。
  - 保留「设置」按钮与 `MobileAppLabDeepseekSettingsDialog` 现有逻辑。

- [ ] **Step 3: 删除或绕过** 原 `MobileAppLabChatOverlayDeepseekInner` 中对 **`useChat` + `MobileAppLabDeepseekTransport`** 的使用（该文件仅用于无工具的普通对话；Lab 页改为工具流）。确保 **`labTsx === null`**（页面未包 Provider）时 overlay 仍按原逻辑工作——若 `MobileAppLab` 始终包 Provider，则 `labTsx` 永非 null；可选在 Provider 外不渲染 chat 的页面——当前仅 `MobileAppLab` 使用，故 **始终有 context**。

- [ ] **Step 4: Mock 文案**

Mock 分支欢迎语中提示：配置 DeepSeek 后可使用 **`set_lab_tsx`** 修改源码（一句即可）。

- [ ] **Step 5: `vp check` + 手动回归**

Run: `vp check`  
验证：远程 URL 优先、其次 Lab 工具流、其次 Mock。

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/components/MobileAppLabChatOverlay.tsx
git commit -m "feat(website): wire Lab TSX stream+tools into chat overlay"
```

---

### Task 6: 文档与收尾

- [ ] **Step 1:** 在 `MobileAppLab` 页面说明文字（`MobileAppLab.tsx` 顶部 `<p>`）增加一句：可通过右下角对话在配置 DeepSeek 后使用 AI 修改 TSX（只改侧栏，需点应用）。

- [ ] **Step 2:** `vp test` 全量、`vp check` 全量。

- [ ] **Step 3:** Commit

```bash
git add apps/website/src/components/MobileAppLab.tsx
git commit -m "docs(website): hint AI TSX edit in Mobile App Lab"
```

---

## Spec coverage（自检）

| Spec 章节                          | 任务                                         |
| ---------------------------------- | -------------------------------------------- |
| Tool `set_lab_tsx`、只更新 draft   | Task 3–4–5                                   |
| localStorage `draft`+`appliedCode` | Task 1–2                                     |
| 重置 A                             | Task 2                                       |
| 系统提示词                         | Task 3                                       |
| DeepSeek 浏览器、Mock 说明         | Task 4–5                                     |
| 错误与配额                         | Task 1–2（save 结果）、Task 4（stream 错误） |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-mobile-app-lab-ai-tsx-tools-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you prefer?
