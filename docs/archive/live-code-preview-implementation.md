# 浏览器内「改源码即预览」实现逻辑

本文说明**不依赖具体编辑器或语法高亮**时的核心链路：源码状态如何在浏览器中变为可渲染的 React 树。与产品/路线选型（Sandpack、WebContainer 等）对照见 [realtime-browser-code-execution-research.md](./realtime-browser-code-execution-research.md)。

**文档日期：** 2026-04-07

---

## 1. 核心结论（一句话）

**改代码能「编译预览」**，在文档站场景里通常**不是**另起一个 `vite dev` 进程，而是：

> **内存中的源码字符串变更 →（可选）转译 → 在受控环境中执行 → 得到 React 组件 → 更新预览根节点并重渲染。**

「编译」多为 **TS/TSX → 可在浏览器执行的 JS** 的转译；执行环境往往是 **CommonJS 形制的 `eval`/`new Function`** 或 **iframe 内同源消息驱动**，而不是完整 Node 工程编译。

---

## 2. 最小数据流

```
源码状态（string 或 Record<path, string>）
    → 节流（可选；键盘输入常用，批量/工具写入可缩短或跳过）
    → 转译 compile（可选；无 TS/JSX 时可弱化）
    → 执行：在受限环境中跑入口模块，得到 exports.default（或等价）
    → React.createElement + 错误边界 → setState 更新预览
```

**单一真相**：预览只应依赖**当前源码状态**。人手编辑、粘贴、或日后 AI 工具改写，最终都应归约为 **`setState(新源码)`**，再走同一条管线。

---

## 3. dumi：`useLiveDemo`（Ant Design 文档站所用底层）

Ant Design 官网的 Demo 预览依赖 **dumi** 提供的 **`useLiveDemo(id, options)`**（见 [umijs/dumi 源码 `useLiveDemo.ts`](https://github.com/umijs/dumi/blob/master/src/client/theme-api/useLiveDemo.ts)）。要点如下。

### 3.1 构建期注入

- 每个 Demo 对应 **`asset`**：虚拟多文件 `dependencies`（含入口文件等）。
- **`context`**：`require('react')`、`require('antd')` 等解析到**构建期已打包注入的模块映射**，不是运行时去 npm 安装。

### 3.2 运行时 `setSource`

- 对 **`setSource`** 通常有 **约 500ms 节流**，避免每次按键全量重跑。
- **非 iframe**：找到入口文件字符串 → 若配置了 **`renderOpts.compile`** 则先异步转译 → 用 **`evalCommonJS`**（`new Function('module','exports','require', js)`）执行 → **`require` 仅查 `context`** → 取 **`exports.default`** → 包一层 **`DemoErrorBoundary`** 等 → 更新节点；可选用 **`renderToStaticMarkup`** 做预检。
- **iframe**：通过 **`postMessage`**（如 `dumi.liveDemo.setSource`）把源码交给 iframe 内编译/执行，再用 **`dumi.liveDemo.compileDone`** 回传错误，与主页面隔离更好。

### 3.3 与「真实项目编译」的区别

| 维度     | 本地 Vite/Webpack         | dumi Live Demo                    |
| -------- | ------------------------- | --------------------------------- |
| 输入     | 磁盘文件 + `node_modules` | **内存中的 asset + 固定 context** |
| 依赖解析 | Node 解析算法             | **预置 map + 假 `require`**       |
| 目的     | 全量可发布构建            | **文档内即时预览**                |

---

## 4. Ant Design 文档：组件分工（便于对照源码）

以下路径以 **`ant-design/ant-design`** 仓库 **`master`** 为准（若上游重构，以仓库为准）。

| 层级       | 路径（约）                                                                                                                                                  | 职责                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 预览编排   | [`.dumi/theme/builtins/Previewer/CodePreviewer.tsx`](https://github.com/ant-design/ant-design/blob/master/.dumi/theme/builtins/Previewer/CodePreviewer.tsx) | 调用 **`useLiveDemo`**，渲染 **`liveDemoNode`**，处理 iframe/主题等   |
| 代码编辑区 | [`.dumi/theme/common/CodePreview.tsx`](https://github.com/ant-design/ant-design/blob/master/.dumi/theme/common/CodePreview.tsx)                             | Tabs、复制；**TSX 编辑**走 **`LiveCode`**                             |
| 编辑器壳   | [`.dumi/theme/common/LiveCode.tsx`](https://github.com/ant-design/ant-design/blob/master/.dumi/theme/common/LiveCode.tsx)                                   | 使用 dumi 默认 **`SourceCodeEditor`** + **`LiveError`**               |
| 外链 IDE   | [`.dumi/theme/builtins/Previewer/Actions.tsx`](https://github.com/ant-design/ant-design/blob/master/.dumi/theme/builtins/Previewer/Actions.tsx)             | **CodeSandbox / StackBlitz / CodePen** 等，与**页内** Live 是另一条线 |

**说明**：`package.json` 中的 **`@codesandbox/sandpack-react`** 等为文档站其他能力可能使用；**页内 `CodePreview` 链路**以 **dumi `useLiveDemo` + `SourceCodeEditor`** 为主，并非在 `CodePreview` 内直接嵌入 Sandpack。

---

## 5. react-live：另一条常见实现

[FormidableLabs/react-live](https://github.com/FormidableLabs/react-live) 与 dumi **同属「页内转译 + 受限求值 + React 渲染」**，差异在工程形态。

| 维度 | dumi `useLiveDemo`                          | react-live                                    |
| ---- | ------------------------------------------- | --------------------------------------------- |
| 绑定 | 文档构建、多文件 **asset**、可选 iframe     | **独立 npm 包**，单段/简单场景为主            |
| 依赖 | **`context` + 假 `require`**                | **`scope` 对象**显式注入 `React`、组件等      |
| 转译 | **`renderOpts.compile`**（由主题/工程配置） | 库内常见 **Sucrase** 等路径（以官方文档为准） |
| 适用 | 组件库整站文档（如 Ant Design）             | 任意页面嵌一块 Live Demo                      |

逻辑上都可概括为：**源码字符串变 → 转译 → 在受限环境执行 → 更新预览**。

---

## 6. 与 AI「只改源码」的衔接

在不讨论具体 AI SDK 与工具协议的前提下，若**最终结果仅是修改源码**，则：

- 预览模块**不应依赖**「是否来自 AI」；
- 只需在源码状态更新后**走同一套** `compile → execute → render`；
- 工具侧适合提供 **`apply_patch` / `set_file`** 等，合并进 **`Record<path, string>`** 或单文件 string 后再触发预览。

---

## 7. 参考与延伸阅读

- 路线与产品对比（Sandpack、WebContainer、bolt.new 等）：[realtime-browser-code-execution-research.md](./realtime-browser-code-execution-research.md)
- dumi：`useLiveDemo` — [GitHub `umijs/dumi`](https://github.com/umijs/dumi)
- react-live：[GitHub `FormidableLabs/react-live`](https://github.com/FormidableLabs/react-live)
- Ant Design 文档主题：[`ant-design/ant-design` `.dumi/theme`](https://github.com/ant-design/ant-design/tree/master/.dumi/theme)
