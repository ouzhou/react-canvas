# 方案 A：流式参数解析 + 增量 Eval

**日期：** 2026-04-09
**状态：** 备选方案
**问题背景：** [problem.md](./problem.md)

---

## 1. 概述

监听 AI tool call 参数的 token 流，在参数到达过程中截取可安全渲染的 JSX 片段，补全闭合标签后 eval 并显示。**AI 不需要任何特殊配合**——正常写代码，客户端负责截断和增量渲染。

---

## 2. 架构

```
AI streamText 逐 token 输出 add_page 的 code 参数
  │
  ├── tool-call-streaming-start → 初始化该 tool call 的增量缓冲区
  │
  ├── tool-call-delta (×N)     → 累积 code 片段
  │   │
  │   ├── extractPartialCodeValue() → 从半截 JSON 中提取 code 值
  │   ├── findSafeCutPoint()        → 找到最后一个安全截断点
  │   ├── generateClosingTags()     → 补全未闭合标签
  │   ├── wrapAsComponent()         → 包装为函数组件
  │   └── evalTsx() → 更新 slot preview  → 画布渲染
  │       (失败则保持上一次成功渲染)
  │
  └── tool-call → 参数完整 → execute → 最终 eval（一致性保证）

┌─────────────────────────────────────────┐
│          渲染时间线（~2 秒内）           │
│                                         │
│  0.3s  导航栏出现（第一个安全截断点）    │
│  0.8s  列表出现                         │
│  1.2s  更多列表项                       │
│  2.0s  底部按钮出现（execute 最终渲染）  │
└─────────────────────────────────────────┘
```

---

## 3. 数据结构

### 3.1 Page Slots（两方案共享）

```ts
type PageSlot = {
  name: string;
  code: string;
  compiledComponent?: React.ComponentType | null;
  error?: string | null;
};

type PageSlots = Record<string, PageSlot>;

type LabState = {
  scaffold: string; // 全局骨架（页面容器、导航、常量）
  pages: PageSlots; // 各页面 slot
  activePages: string[]; // 当前激活的页面列表
};
```

### 3.2 流式预览态

```ts
type StreamingPreview = {
  toolCallId: string;
  targetPage: string;
  /** 当前已收到的部分 code */
  partialCode: string;
  /** 上一次成功 eval 的截断位置 */
  lastRenderedCutPoint: number;
  /** 上一次成功 eval 的组件（eval 失败时保持） */
  lastValidComponent: React.ComponentType | null;
};

// Stage 维护所有活跃的 streaming preview
const activeStreams = new Map<string, StreamingPreview>();
```

---

## 4. 工具设计

AI 侧工具与 Page Slots 基础版一致——tool call 粒度是整个页面：

```ts
const tools = {
  list_pages: tool({
    inputSchema: z.object({}),
    execute: async () => {
      return { ok: true, pages: getPagesSummary() };
    },
  }),

  read_page: tool({
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      const slot = getPageSlot(name);
      if (!slot) return { ok: false, error: `页面 "${name}" 不存在` };
      return { ok: true, code: slot.code, lines: slot.code.split("\n").length };
    },
  }),

  add_page: tool({
    inputSchema: z.object({
      name: z.string().describe("页面唯一标识"),
      title: z.string().describe("页面显示名称"),
      code: z.string().describe("完整页面组件 TSX 代码"),
    }),
    execute: async ({ name, title, code }) => {
      clearStreamingPreview(name);
      createPageSlot(name, { name, title, code });
      addToActivePages(name);
      return { ok: true, page: name };
    },
  }),

  update_page: tool({
    inputSchema: z.object({
      name: z.string(),
      code: z.string(),
    }),
    execute: async ({ name, code }) => {
      clearStreamingPreview(name);
      updatePageSlotCode(name, code);
      return { ok: true, page: name };
    },
  }),

  replace_in_page: tool({
    inputSchema: z.object({
      name: z.string(),
      old_string: z.string().min(1),
      new_string: z.string(),
    }),
    execute: async ({ name, old_string, new_string }) => {
      const slot = getPageSlot(name);
      if (!slot) return { ok: false, error: `页面 "${name}" 不存在` };
      const result = applyUniqueReplace(slot.code, old_string, new_string);
      if (!result.ok) return result;
      updatePageSlotCode(name, result.next);
      return { ok: true, page: name };
    },
  }),

  remove_page: tool({
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      removePageSlot(name);
      return { ok: true };
    },
  }),

  update_scaffold: tool({
    inputSchema: z.object({ code: z.string() }),
    execute: async ({ code }) => {
      setScaffold(code);
      return { ok: true };
    },
  }),
};
```

关键区别不在工具设计，而在 **客户端如何消费 tool call 的参数流**。

---

## 5. 核心实现

### 5.1 消费流式参数

```ts
const result = streamText({
  model,
  tools,
  experimental_streamToolCalls: true, // 开启流式 tool call 参数
});

for await (const part of result.fullStream) {
  switch (part.type) {
    case "tool-call-streaming-start":
      activeStreams.set(part.toolCallId, {
        toolCallId: part.toolCallId,
        targetPage: "",
        partialCode: "",
        lastRenderedCutPoint: 0,
        lastValidComponent: null,
      });
      break;

    case "tool-call-delta": {
      const stream = activeStreams.get(part.toolCallId);
      if (!stream) break;
      stream.partialCode += part.argsTextDelta;

      // 从半截 JSON 中提取 code 字段值
      const codeValue = extractPartialCodeValue(stream.partialCode);
      if (codeValue) {
        tryIncrementalRender(stream, codeValue);
      }
      break;
    }

    case "tool-call":
      // 参数完整 → execute 回调已触发 → 清理流式预览
      activeStreams.delete(part.toolCallId);
      break;
  }
}
```

### 5.2 安全截断点检测

```ts
/**
 * 在部分 JSX 中找到最后一个安全截断位置。
 * 安全截断点 = 一个完整闭合的 JSX 标签后，且回到根容器直接子元素层级。
 */
function findSafeCutPoint(partialCode: string): number {
  let safeCut = -1;
  let depth = 0;
  let i = 0;

  while (i < partialCode.length) {
    if (partialCode[i] === "<") {
      if (partialCode[i + 1] === "/") {
        // 闭合标签 </Xxx>
        const end = partialCode.indexOf(">", i);
        if (end !== -1) {
          depth--;
          i = end + 1;
          if (depth <= 1) safeCut = i; // 回到顶层子元素
          continue;
        }
      } else if (/^<\w/.test(partialCode.substring(i))) {
        const tagEnd = findTagEnd(partialCode, i);
        if (tagEnd.selfClosing) {
          i = tagEnd.end + 1;
          if (depth <= 1) safeCut = i;
          continue;
        }
        depth++;
        i = tagEnd.end + 1;
        continue;
      }
    }
    i++;
  }

  return safeCut;
}
```

### 5.3 闭合标签补全 + Eval

```ts
function tryIncrementalRender(stream: StreamingPreview, partialCode: string) {
  const cutPoint = findSafeCutPoint(partialCode);
  if (cutPoint <= stream.lastRenderedCutPoint) return; // 无新截断点
  stream.lastRenderedCutPoint = cutPoint;

  const safeCode = partialCode.slice(0, cutPoint);
  const closingTags = generateClosingTags(safeCode);
  const completedCode = `function _Preview() {\n  return (\n${safeCode}${closingTags}\n  );\n}`;

  try {
    const component = evalTsx(completedCode, liveScope);
    stream.lastValidComponent = component;
    updateSlotPreview(stream.targetPage, component); // 画布立即更新
  } catch {
    // eval 失败 → 保持上一次成功的渲染
  }
}

function generateClosingTags(code: string): string {
  const unclosedTags = parseUnclosedTags(code);
  return unclosedTags
    .reverse()
    .map((tag) => `</${tag}>`)
    .join("\n");
}
```

### 5.4 渲染层

```tsx
function LabCanvas({ scaffold, pages, activePages }) {
  const ScaffoldComponent = useCompiledComponent(scaffold);

  return (
    <Canvas width={800} height={600}>
      <ScaffoldComponent>
        {activePages.map((name) => {
          // 优先使用流式预览组件
          const preview = getStreamingPreview(name);
          if (preview?.lastValidComponent) {
            const Preview = preview.lastValidComponent;
            return <Preview key={name} />;
          }

          const slot = pages[name];
          if (!slot) return null;
          if (slot.error) return <PageErrorOverlay key={name} error={slot.error} />;
          const Page = slot.compiledComponent;
          return Page ? <Page key={name} /> : null;
        })}
      </ScaffoldComponent>
    </Canvas>
  );
}
```

---

## 6. 优势

| 优势             | 说明                                              |
| ---------------- | ------------------------------------------------- |
| **AI 无需配合**  | AI 正常写 JSX，截断逻辑完全在客户端               |
| **粒度最细**     | 以"一个闭合 JSX 标签"为单位，几乎实时             |
| **首屏极快**     | 第一个顶层子元素闭合（~50 行）就开始渲染，约 0.3s |
| **工具设计简单** | 和非流式版本一样，就是 `add_page(name, code)`     |

---

## 7. 劣势与风险

| 问题                   | 严重度 | 说明                                                               |
| ---------------------- | ------ | ------------------------------------------------------------------ |
| **依赖实验性 API**     | 高     | `experimental_streamToolCalls` 尚未稳定                            |
| **JSX 截断检测复杂**   | 高     | `{条件 && <Xxx>}`、模板字符串、注释等边界情况多                    |
| **闭合标签补全不精确** | 中     | 嵌套条件渲染、Fragment 等场景下可能失误                            |
| **partial JSON 解析**  | 中     | tool call 参数是 JSON 字符串，需要从不完整 JSON 中提取 `code` 字段 |
| **eval 频率开销**      | 低     | 需节流（~50ms 间隔），否则每个截断点都 eval                        |
| **预览与最终态不一致** | 低     | 缺少后续兄弟元素可能影响 flex 布局分布                             |

---

## 8. System Prompt

```markdown
你是一个 React Canvas 前端开发助手。

## 项目结构

- scaffold：全局骨架（页面容器、导航栏、共享常量）
- pages：各页面独立的函数组件

## 可用工具

- list_pages → 列出所有页面
- read_page → 读取某页面代码
- add_page → 新增页面（传完整页面代码）
- update_page → 替换页面完整代码
- replace_in_page → 页面内局部文本替换（优先使用）
- remove_page → 删除页面
- update_scaffold → 修改全局骨架

## 工作原则

1. 只操作需要变更的页面，绝不输出全部页面代码
2. 小改动用 replace_in_page
3. 新增/大改用 add_page / update_page
4. 操作前用 list_pages / read_page 了解现状
```

---

## 9. 实施步骤

| 阶段    | 内容                                                                           |
| ------- | ------------------------------------------------------------------------------ |
| Phase 1 | 数据结构从 `string` 拆为 `LabState`（scaffold + PageSlots），每 slot 独立 eval |
| Phase 2 | 接入 `streamText` + `experimental_streamToolCalls`                             |
| Phase 3 | 实现 `findSafeCutPoint` + `generateClosingTags` + 增量 eval 管线               |
| Phase 4 | 节流控制（50ms）、预览态与最终态切换、错误处理                                 |

不适合：

- 追求实现简单、维护成本低的场景（方案 B 更合适）
- AI 模型已经能很好地拆分成多步 tool call 的场景
