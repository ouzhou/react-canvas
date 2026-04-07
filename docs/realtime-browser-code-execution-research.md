# 网页内「改代码即运行」技术方案调研

本文梳理在浏览器中编辑代码并实时看到运行结果的常见技术路线，并对你列出的产品与栈做对照说明。调研参考了 [Context7](https://context7.com/) 中的 Sandpack、React Live、WebContainers 官方指南摘要，以及公开产品与博客信息。

## 目标与问题定义

**目标**：用户在网页里修改源码后，尽可能快地看到 UI/逻辑结果，且安全、可维护。

**典型约束**：

- **隔离**：用户或 AI 生成的代码不能随意读写主站 Cookie、同源存储。
- **能力边界**：仅前端组件预览 vs 完整 npm 生态 vs 接近本地 Node 的全栈环境。
- **宿主要求**：部分方案需要 **跨源隔离**（COOP/COEP）、HTTPS、`SharedArrayBuffer` 等浏览器能力。

---

## 技术路线总览（按执行位置分类）

| 路线                                        | 执行发生在哪里          | 典型机制                                                    | 能力上限                                              | 宿主/运维特点                                                                                      |
| ------------------------------------------- | ----------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **A. 页内转译 + 运行时求值**                | 当前页面 JS 上下文      | 将 JSX/TS 转译后在受控 `scope` 内 `eval`/Function           | 适合 React 片段、文档示例；复杂依赖需自行注入 `scope` | 无需 iframe 也可工作；需注意 XSS/恶意代码（需 CSP、白名单依赖）                                    |
| **B. iframe + 浏览器内打包器**              | 子 frame 内             | Bundler 在浏览器中打包，预览在 iframe，消息通道同步文件变更 | 多文件、`npm` 依赖、HMR，强于单文件 playground        | 官方或自托管 bundler；隔离好于同页直接 eval                                                        |
| **C. 浏览器内完整 Node（WASM + 系统 API）** | 浏览器提供的「微型 OS」 | WebContainer 等在 Tab 内跑 Node、终端、文件系统             | 全栈脚手架、真实 `npm i`、与本地 IDE 接近             | **必须** [跨源隔离头](https://webcontainers.io/guides/configuring-headers)；以 Chromium 系体验最佳 |
| **D. 远程沙箱 / 云端 VM**                   | 远端容器                | API 创建环境、同步文件、返回预览 URL 或流                   | 资源不受用户机器限制；有网络延迟与成本                | 需后端与计费；安全模型清晰                                                                         |
| **E. AI 产品层**                            | 组合 B/C/D + 模型       | 流式生成代码、写文件、驱动构建/预览                         | 强在「自然语言 → 可运行工程」                         | 往往闭源；底层仍依赖上述某一类运行时                                                               |

下面按你列出的名称逐项对应。

---

## React Live

- **定位**：[Formidable 的 `react-live`](https://github.com/formidablelabs/react-live)——可编辑源码 + 实时预览 React 组件的模块化组件库。
- **技术要点**（Context7 / 官方 API 文档摘要）：
  - **`LiveProvider`**：负责转译（文档中提及 **Sucrase** 等路径）、在自定义 **`scope`** 中求值，再通过 Context 提供给 `LiveEditor` / `LivePreview` / `LiveError`。
  - **`scope`**：把 `React`、`useState`、你自己的组件等显式注入，用户代码只能使用 scope 内符号。
  - **`noInline` / `transformCode`**：控制是否整段求值、以及转译前的预处理。
- **适用**：组件库文档、设计系统示例、轻量交互 Demo。
- **局限**：不是完整工程构建；多文件、`npm` 包、Node API 需其他方案（如 Sandpack / WebContainer）。

---

## Sandpack（CodeSandbox）

- **定位**：[@codesandbox/sandpack](https://sandpack.codesandbox.io/)——在页面中嵌入「可运行编辑体验」的组件工具包，底层是 **Sandpack Client + Bundler**。
- **技术要点**（官方架构文档摘要）：
  - **`loadSandpackClient`**：向 **iframe** 挂载 bundler，传入 `files`、`environment`、`dependencies`；变更时 **`updateSandbox`**，由 bundler 做差异与热更新。
  - **Preview 组件**：实际跑 bundler；无 Preview 则不会打包执行（与 `autorun` 等行为相关）。
  - 可组合 **`SandpackProvider`、布局、文件树、替换编辑器等**。
- **适用**：文档站、教程、需要 **多文件 + npm 依赖 + 浏览器内打包** 的场景。
- **局限**：能力取决于 bundler 与环境模板；极端自定义可能需要自托管 bundler（社区也有 fork，如面向自托管的打包方案）。

---

## WebContainer API（StackBlitz 系）

- **定位**：[WebContainers](https://webcontainers.io/)——在浏览器标签页内提供 **Node.js 兼容运行时**、shell、文件系统等，用于 IDE、教程、AI 编程产品。
- **技术要点**（[官方 Quickstart / Headers 指南](https://webcontainers.io/guides/quickstart) 摘要）：
  - **`WebContainer.boot()`**：通常全页只应 **`boot` 一次**。
  - **硬性要求**：依赖 **`SharedArrayBuffer`** → 页面须 **跨源隔离**，需设置：
    - `Cross-Origin-Embedder-Policy: require-corp`
    - `Cross-Origin-Opener-Policy: same-origin`
  - **浏览器**：以 Chromium 系为主流支持路径；文档亦提及 Safari/Firefox 等版本要求，集成前需对照 [Browser support](https://webcontainers.io/guides/browser-support)。
- **适用**：需要 **真实终端、包管理器、全栈框架脚手架** 的「网页里的开发机」。
- **局限**：部署与嵌入时必须正确配置 COOP/COEP；与纯静态托管相比运维复杂度更高。

---

## 「utool」说明（可能指 uTools）

你写的 **utool** 在公开资料里常被对应到桌面效率工具 **[uTools](https://www.u-tools.cn/)**（Electron、插件生态），其 **[ubrowser 可编程浏览器](https://www.u-tools.cn/docs/developer/api-reference/ubrowser/ubrowser.html)** 用于插件内自动化，**并非**典型的「网页里改代码实时运行」通用方案。

若你的目标严格是 **Web 内实时运行**，uTools 更多属于 **桌面端辅助**；若是笔误，可能想对比的是 **其他在线 Playground**（如各类「在线 JS/HTML 运行」小工具），其技术一般落在 **iframe + eval** 或 **简单转译**，能力通常弱于 Sandpack/WebContainer。

---

## v0.app（Vercel）

- **定位**：[v0.app](https://v0.app/)——AI 生成 **React / Next.js / Tailwind / shadcn** 等风格的 UI 与工程，强调「对话迭代 + 可部署」。
- **与「实时运行」的关系**：
  - 产品层是 **生成式 UI + 工程模板**；预览侧常见做法是 **托管沙箱或内嵌运行时**（具体实现未完全公开，社区有讨论「沙盒预览」）。
  - 与纯开源库不同，v0 强在 **模型与工作流**，底层可能组合远程环境或浏览器内预览，属于上表 **E. AI 产品层**。
- **适用**：从自然语言快速出可维护的前端代码并与 Vercel 生态衔接。
- **局限**：商业产品与模型绑定；自托管复现不等于使用同一套 v0 后端。

---

## bolt.new

- **定位**：[bolt.new](https://bolt.new/)（StackBlitz）——AI 驱动的全栈应用构建：**提示 → 生成/改文件 → 在浏览器里运行 → 部署**。
- **与 WebContainer 的关系**：
  - 公开材料与 [GitHub 仓库说明](https://github.com/stackblitz/bolt.new) 均强调与 **WebContainers** 深度结合：在浏览器内跑 **Node、npm、开发服务器**，AI 可操作文件与终端。
- **适用**：希望「和本地接近」的 **全栈 Web** 原型，且接受 WebContainer 的浏览器与 HTTP 头要求。
- **局限**：同样依赖 WebContainer 能力与 AI 服务可用性。

---

## 选型建议（简表）

| 需求                                                 | 更倾向                                       |
| ---------------------------------------------------- | -------------------------------------------- |
| 文档里展示 **单个 React 组件**、可控依赖             | **React Live**                               |
| 文档/博客需要 **多文件、npm、接近 CodeSandbox 体验** | **Sandpack**                                 |
| 需要 **终端、真实 Node 工具链、全栈脚手架**          | **WebContainer API**                         |
| **AI 生成全栈应用 + 浏览器内跑起来**                 | **bolt.new** 一类（WebContainer + AI）       |
| **AI 生成 UI + Vercel 部署链路**                     | **v0**（产品化，底层运行时组合需以官方为准） |

---

## 参考链接

- Sandpack：<https://sandpack.codesandbox.io/> · GitHub：<https://github.com/codesandbox/sandpack>
- React Live：<https://github.com/formidablelabs/react-live>
- WebContainers：<https://webcontainers.io/> · API 文档入口：<https://developer.stackblitz.com/platform/api/webcontainer-api>
- StackBlitz 博客《Introducing WebContainers》：<https://blog.stackblitz.com/posts/introducing-webcontainers/>
- v0：<https://v0.app/>
- bolt.new：<https://bolt.new/> · GitHub：<https://github.com/stackblitz/bolt.new>

---

_文档日期：2026-04-07。产品能力随版本变化，集成前请以各官方文档为准。_
