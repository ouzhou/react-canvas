# 方案 B：小粒度 Tool 调用（推荐）

**日期：** 2026-04-09
**状态：** 推荐方案
**问题背景：** [problem.md](./problem.md)

---

## 1. 概述

将 `add_page` 拆解为多个小粒度 tool 调用（`create_page` → 多次 `add_component`），让 AI 每次只输出一小块 UI，每次 tool execute 都触发一次完整 eval + 渲染。

**核心思路**：不在技术层面做"半截代码解析"，而是让 AI 自己拆步骤——每步都是完整的、可直接 eval 的代码片段。

---

## 2. 架构

```
用户 "新增一个收藏页面"
  │
  ├─ AI Step 1: create_page("favorites")
  │    → execute → 创建空 PageSlot + eval → 画布显示空容器  ← 0.5s
  │
  ├─ AI Step 2: add_component("favorites", 导航栏 JSX)
  │    → execute → 将 JSX 插入 slot.code + eval → 导航栏出现  ← 1.0s
  │
  ├─ AI Step 3: add_component("favorites", 列表 JSX)
  │    → execute → 追加到 slot.code + eval → 列表出现  ← 2.0s
  │
  ├─ AI Step 4: add_component("favorites", 底部按钮 JSX)
  │    → execute → 追加到 slot.code + eval → 按钮出现  ← 2.5s
  │
  └─ AI 回复文字总结

每次 tool-result → 对应 slot re-eval → React 渲染 → Canvas 更新
其余页面 slot 完全不受影响
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

### 3.2 Slot 生命周期

```
create_page → slot 创建（空容器）→ compiledComponent = 空 View
     │
add_component × N → slot.code 被追加 → 每次 re-eval → compiledComponent 更新
     │
replace_in_page → slot.code 局部替换 → re-eval
     │
remove_page → slot 销毁 → 从 activePages 移除
```

---

## 4. 工具设计

### 4.1 完整工具定义

```ts
const tools = {
  /**
   * 列出所有页面（名称 + 行数摘要）。
   * AI 用来了解现有结构后再决定操作。
   */
  list_pages: tool({
    inputSchema: z.object({}),
    execute: async () => {
      const summary = Object.entries(getPages()).map(([name, slot]) => ({
        name,
        lines: slot.code.split("\n").length,
        componentCount: countTopLevelComponents(slot),
      }));
      return { ok: true, pages: summary };
    },
  }),

  /**
   * 读取单个页面完整代码。
   */
  read_page: tool({
    inputSchema: z.object({
      name: z.string().describe("页面标识"),
    }),
    execute: async ({ name }) => {
      const slot = getPageSlot(name);
      if (!slot) return { ok: false, error: `页面 "${name}" 不存在` };
      return { ok: true, code: slot.code, lines: slot.code.split("\n").length };
    },
  }),

  /**
   * 创建空页面骨架。
   * 画布立即显示一个带基础样式的空容器。
   */
  create_page: tool({
    inputSchema: z.object({
      name: z.string().describe("页面唯一标识，如 'favorites'"),
      title: z.string().describe("页面显示名称，如 '收藏'"),
      background_color: z.string().optional().describe("背景色，默认 '#FFFFFF'"),
    }),
    execute: async ({ name, title, background_color }) => {
      const bgColor = background_color ?? "#FFFFFF";
      const code = [
        `function ${toPascalCase(name)}() {`,
        `  return (`,
        `    <View style={{ flex: 1, backgroundColor: '${bgColor}' }}>`,
        `    </View>`,
        `  );`,
        `}`,
      ].join("\n");
      createPageSlot(name, { name, title, code });
      addToActivePages(name);
      return { ok: true, page: name };
    },
  }),

  /**
   * 往页面中添加一个组件块。
   * 每次只添加一个顶层 UI 区块（如导航栏、列表、按钮栏等）。
   *
   * component_code 必须是**完整可闭合的 JSX 片段**（一个顶层 <View>/<ScrollView>/...）。
   */
  add_component: tool({
    inputSchema: z.object({
      page: z.string().describe("目标页面标识"),
      position: z
        .enum(["append", "prepend"])
        .default("append")
        .describe("插入位置：append=追加到末尾，prepend=插入到开头"),
      component_code: z.string().describe("完整的 JSX 片段，单个顶层元素"),
    }),
    execute: async ({ page, position, component_code }) => {
      const slot = getPageSlot(page);
      if (!slot) return { ok: false, error: `页面 "${page}" 不存在` };

      const newCode = insertComponentIntoPage(slot.code, component_code, position);
      updatePageSlotCode(page, newCode);
      return { ok: true, page };
    },
  }),

  /**
   * 对页面内做局部文本替换（修改已有组件的样式、文字等）。
   * 优先使用此工具做小改动，避免重写整页。
   */
  replace_in_page: tool({
    inputSchema: z.object({
      page: z.string().describe("页面标识"),
      old_string: z.string().min(1).describe("要替换的原始文本，必须唯一匹配"),
      new_string: z.string().describe("替换后的文本"),
    }),
    execute: async ({ page, old_string, new_string }) => {
      const slot = getPageSlot(page);
      if (!slot) return { ok: false, error: `页面 "${page}" 不存在` };
      const result = applyUniqueReplace(slot.code, old_string, new_string);
      if (!result.ok) return result;
      updatePageSlotCode(page, result.next);
      return { ok: true, page };
    },
  }),

  /**
   * 替换某页面的完整代码（大改动时使用）。
   */
  update_page: tool({
    inputSchema: z.object({
      name: z.string().describe("页面标识"),
      code: z.string().describe("完整的新页面代码"),
    }),
    execute: async ({ name, code }) => {
      const slot = getPageSlot(name);
      if (!slot) return { ok: false, error: `页面 "${name}" 不存在` };
      updatePageSlotCode(name, code);
      return { ok: true, page: name };
    },
  }),

  /**
   * 删除一个页面。
   */
  remove_page: tool({
    inputSchema: z.object({
      name: z.string(),
    }),
    execute: async ({ name }) => {
      removePageSlot(name);
      removeFromActivePages(name);
      return { ok: true };
    },
  }),

  /**
   * 修改全局骨架代码（页面容器、导航栏、共享常量）。
   */
  update_scaffold: tool({
    inputSchema: z.object({
      code: z.string(),
    }),
    execute: async ({ code }) => {
      setScaffold(code);
      return { ok: true };
    },
  }),
};
```

### 4.2 核心函数：insertComponentIntoPage

```ts
/**
 * 将 component_code 插入到页面的根容器内部。
 *
 * 页面代码结构约定：
 *   function XxxPage() {
 *     return (
 *       <View style={{ flex: 1, ... }}>   ← 根容器
 *         {已有组件}
 *       </View>                            ← 根容器闭合
 *     );
 *   }
 *
 * append：在根容器闭合标签之前插入
 * prepend：在根容器开标签之后插入
 */
function insertComponentIntoPage(
  pageCode: string,
  componentCode: string,
  position: "append" | "prepend",
): string {
  if (position === "append") {
    // 找到根容器最后一个 </View> 之前的位置
    const rootCloseIndex = findRootContainerCloseTag(pageCode);
    return (
      pageCode.slice(0, rootCloseIndex) +
      "\n      " +
      indentCode(componentCode, 6) +
      "\n" +
      pageCode.slice(rootCloseIndex)
    );
  } else {
    // 找到根容器开标签 > 之后的位置
    const rootOpenEnd = findRootContainerOpenTagEnd(pageCode);
    return (
      pageCode.slice(0, rootOpenEnd) +
      "\n      " +
      indentCode(componentCode, 6) +
      pageCode.slice(rootOpenEnd)
    );
  }
}
```

---

## 5. System Prompt

```markdown
你是一个 React Canvas 前端开发助手。项目使用 @react-canvas/react 的 View、Text、ScrollView、Image 组件，布局为 Yoga Flexbox。

## 项目结构

项目由 **全局骨架（scaffold）** 和 **独立页面（pages）** 组成：

- scaffold：页面大容器、导航切换、共享常量和样式
- pages：每个页面是一个独立的函数组件，有唯一 name

## 可用工具

| 工具            | 用途                     |
| --------------- | ------------------------ |
| list_pages      | 列出所有页面名称和行数   |
| read_page       | 读取某个页面完整代码     |
| create_page     | 创建空页面骨架           |
| add_component   | 往页面里追加一个 UI 区块 |
| replace_in_page | 页面内局部文本替换       |
| update_page     | 替换页面完整代码         |
| remove_page     | 删除页面                 |
| update_scaffold | 修改全局骨架             |

## 构建新页面的规则（必须遵守）

**拆成多次 add_component 调用，不要一次输出整个页面。** 步骤：

1. `create_page` 创建空页面
2. 按从上到下的视觉顺序，逐块 `add_component`：
   - 第 1 次：导航栏 / 标题栏
   - 第 2 次：主体内容区（列表/卡片/表单等）
   - 第 3 次：底部操作栏（按钮/标签栏等）
   - 可按需再细分
3. 每个 `component_code` 是一个完整的顶层 JSX 元素（<View> 或 <ScrollView>）
4. 目标：3-8 次 add_component 完成一个页面

**修改已有页面时：**

- 小改动：`replace_in_page`（改颜色、文字、间距等）
- 改某区块：用 `replace_in_page` 替换该区块的代码
- 大改动：`update_page` 整页替换

**禁止：**

- 不要在一个 add_component 里塞超过 80 行代码
- 不要用 import 语句
- 不要引用 scope 之外的变量
```

---

## 6. AI 调用流程示例

### 6.1 新增页面

用户："帮我新增一个收藏页面，有标题栏、收藏列表和底部按钮"

```
Step 1: list_pages()
        → 返回 { pages: [{name:"product", lines:120}, {name:"cart", lines:95}, ...] }

Step 2: create_page({ name: "favorites", title: "收藏" })
        → 画布出现空白页面框                               ← 0.3s 可见
        → execute 内部创建：
          function Favorites() {
            return (
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              </View>
            );
          }

Step 3: add_component({ page: "favorites", position: "append", component_code: `
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center',
                         backgroundColor: '#4A90D9', paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>
              我的收藏
            </Text>
          </View>` })
        → 导航栏出现                                       ← 1.0s 可见

Step 4: add_component({ page: "favorites", position: "append", component_code: `
          <ScrollView style={{ flex: 1, padding: 12 }}>
            <View style={{ flexDirection: 'row', padding: 12, marginBottom: 8,
                           backgroundColor: '#F8F8F8', borderRadius: 8 }}>
              <Image source={{ uri: '...' }} style={{ width: 60, height: 60, borderRadius: 8 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600' }}>经典拿铁</Text>
                <Text style={{ fontSize: 13, color: '#888', marginTop: 4 }}>¥32.00</Text>
              </View>
            </View>
            {/* 更多列表项... */}
          </ScrollView>` })
        → 列表区域出现                                     ← 2.0s 可见

Step 5: add_component({ page: "favorites", position: "append", component_code: `
          <View style={{ height: 60, paddingHorizontal: 16, paddingVertical: 8,
                         borderTopWidth: 1, borderTopColor: '#EEE' }}>
            <View style={{ flex: 1, backgroundColor: '#4A90D9', borderRadius: 8,
                           alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
                全部加入购物车
              </Text>
            </View>
          </View>` })
        → 底部按钮出现                                     ← 2.5s 完成
```

### 6.2 修改已有页面

用户："把收藏页面改成深色主题"

```
Step 1: read_page({ name: "favorites" })
        → 返回完整代码

Step 2: replace_in_page({ page: "favorites",
          old_string: "backgroundColor: '#FFFFFF'",
          new_string: "backgroundColor: '#1A1A2E'" })
        → 背景变暗                                        ← 0.5s 可见

Step 3: replace_in_page({ page: "favorites",
          old_string: "backgroundColor: '#4A90D9'",
          new_string: "backgroundColor: '#16213E'" })
        → 导航栏变暗                                      ← 1.0s 可见

Step 4: replace_in_page({ page: "favorites",
          old_string: "color: '#888'",
          new_string: "color: '#AAA'" })
        → 副标题颜色调整                                   ← 1.3s 可见
```

---

## 7. 搭配 streamText

```ts
const result = streamText({
  model: createDeepSeek({ apiKey }).chat("deepseek-coder"),
  system: SYSTEM_PROMPT,
  messages: modelMessages,
  tools,
  maxSteps: 15,
  abortSignal: ac.signal,
  maxOutputTokens: 8192,
});

for await (const part of result.fullStream) {
  if (part.type === "tool-result") {
    // create_page / add_component / replace_in_page 已在 execute 中更新 slot
    // → 该 slot 自动 re-eval → 画布立即更新

    // 更新聊天面板中的 tool 结果展示
    updateChatToolResult(part);
  }

  if (part.type === "text-delta") {
    // AI 的文字回复（解释做了什么）
    appendChatText(part.textDelta);
  }
}
```

每个 `tool-result` 事件都会触发对应 slot 的 `onSlotCodeChange` → eval → React 渲染 → 画布更新。

---

## 8. 渲染层处理

### 8.1 每个 slot 独立 eval

```ts
function onSlotCodeChange(name: string) {
  const slot = getPageSlot(name);
  try {
    const compiled = evalTsx(slot.code, liveScope);
    updateSlot(name, { ...slot, compiledComponent: compiled, error: null });
  } catch (e) {
    // 错误只影响本 slot
    updateSlot(name, { ...slot, compiledComponent: null, error: String(e) });
  }
  // 其余页面的 compiledComponent 不变
}
```

### 8.2 容器组件

```tsx
function LabCanvas({ scaffold, pages, activePages }) {
  const ScaffoldComponent = useCompiledComponent(scaffold);

  return (
    <Canvas width={800} height={600}>
      <ScaffoldComponent>
        {activePages.map((name) => {
          const slot = pages[name];
          if (!slot) return null;
          if (slot.error) {
            return <PageErrorOverlay key={name} name={name} error={slot.error} />;
          }
          const Page = slot.compiledComponent;
          return Page ? <Page key={name} /> : <PageSkeleton key={name} />;
        })}
      </ScaffoldComponent>
    </Canvas>
  );
}
```

### 8.3 加载骨架态

`create_page` 刚创建时页面只有空容器，可以显示一个骨架屏提示正在生成：

```tsx
function PageSkeleton() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ height: 56, backgroundColor: "#F0F0F0", borderRadius: 8 }} />
      <View
        style={{
          height: 120,
          backgroundColor: "#F0F0F0",
          borderRadius: 8,
          marginTop: 12,
        }}
      />
      <View
        style={{
          height: 120,
          backgroundColor: "#F0F0F0",
          borderRadius: 8,
          marginTop: 12,
        }}
      />
    </View>
  );
}
```

---

## 9. 优势

| 优势                 | 说明                                                       |
| -------------------- | ---------------------------------------------------------- |
| **实现简单**         | 无需解析半截 JSON、无需 AST 分析、无需补闭合标签           |
| **零解析风险**       | 每个 tool call 的参数完整后才 execute，code 一定是合法的   |
| **天然容错**         | 某一步 eval 失败，上一步的渲染保持不变，不影响其他页面     |
| **不依赖实验性 API** | 只用标准 `streamText` + `tool-result` 事件                 |
| **AI 可预测**        | AI 看到完整的工具 schema，生成质量高于"你自己截断我的输出" |
| **可调试**           | 每一步的 tool call 和结果都清晰可追踪，出问题容易定位      |
| **代码可复用**       | `replace_in_page` 复用现有的 `applyUniqueReplace` 逻辑     |

---

## 10. 劣势与风险

| 问题                                                                    | 应对                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **AI 不听话，一个 add_component 塞 200 行**                             | `component_code` 加 `z.string().max(5000)` 限制 + prompt 强调"不超过 80 行" |
| **AI 拆太碎，20 次调用**                                                | prompt 指导"3-8 次 add_component" + `maxSteps: 15`                          |
| **粒度不如方案 A 细**（方案 A 以标签为单位，本方案以 tool call 为单位） | 实际差异不大——每个 tool call ~1-2s，用户几乎感知不到间隔                    |
| **AI 调用顺序错误（先 add_component 再 create_page）**                  | execute 中校验页面存在性，返回 error 提示 AI 修正                           |
| **组件间有依赖（共享变量/函数）**                                       | 共享代码放 scaffold，component_code 只引用 scope 里的变量                   |

---

## 11. 与方案 A 对比

|            | 方案 A（流式参数解析）                     | **方案 B（小粒度 tool 调用）**               |
| ---------- | ------------------------------------------ | -------------------------------------------- |
| 核心思路   | 监听 tool 参数 token 流，中途截断补全 eval | 让 AI 拆成多个小 tool call，每次完整 execute |
| 实现复杂度 | **高**（安全截断、闭合补全、partial JSON） | **低**（标准 tool execute）                  |
| 依赖       | `experimental_streamToolCalls`（实验性）   | 标准 `streamText`（稳定）                    |
| 渲染粒度   | 以 JSX 标签为单位（最细）                  | 以 tool call 为单位（一个 UI 区块）          |
| 首屏时间   | ~0.3s（第一个安全截断点）                  | ~1.0s（create_page + 第一个 add_component）  |
| 容错       | 需自行处理截断 eval 失败                   | 天然容错（每步代码完整）                     |
| AI 配合    | 不需要                                     | 需要 System Prompt 引导拆步                  |
| 维护成本   | 高（截断逻辑 + 边界情况多）                | 低                                           |

**推荐方案 B**。首屏时间差 0.7s 可以用 `create_page` 时显示骨架屏弥补，而方案 A 的复杂度和维护成本不值得这 0.7s 的收益。

---

## 12. 实施步骤

### Phase 1：Page Slots 基础

1. 数据结构从 `string` 拆为 `LabState`（scaffold + PageSlots）
2. 每个 slot 独立 eval + 渲染
3. localStorage 持久化格式迁移

### Phase 2：新工具集

1. 实现 `create_page` / `add_component` / `replace_in_page` / `read_page` / `list_pages`
2. 保留 `set_lab_tsx` 作为 fallback
3. `insertComponentIntoPage` 文本插入逻辑
4. 新增 System Prompt

### Phase 3：streamText 接入

1. `generateText` → `streamText`
2. `for await` 消费 `fullStream`，每个 `tool-result` 触发 slot re-eval
3. 聊天面板展示每步工具调用进度

### Phase 4：体验打磨

1. `create_page` 时显示骨架屏
2. 新组件块出现时的淡入动画
3. 侧边栏代码编辑器按 slot 分 tab
4. 单 slot 错误的友好提示
