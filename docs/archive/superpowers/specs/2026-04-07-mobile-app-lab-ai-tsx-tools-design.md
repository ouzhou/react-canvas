# Mobile App Lab：AI 对话 + Tool Calling 修改 TSX 设计

**日期**：2026-04-07  
**状态**：已定稿（经需求澄清）  
**范围**：`apps/website` 路由 `/mobile-app-lab`，仅浏览器端；**不上传**源码到自有服务器。

## 1. 背景与目标

在现有「右下角 AI 对话 + 右上 Sheet 编辑 TSX + `react-live` 预览」基础上，使用户能通过自然语言让模型修改 **当前 Lab 窗口组件** 对应的 TSX 源码。

**成功标准**：

- 模型通过 **AI SDK Tool Calling** 提交结构化修改；前端执行工具后**只更新侧栏 `draft`**，画布需用户点「应用」才更新（与手动编辑一致）。
- 源码可持久化在 **localStorage**；提供**重置**为内置默认源码并清除本地持久化。
- 不依赖本站后端存储或传输用户源码。

## 2. 需求结论（澄清记录）

| 议题          | 选择                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| 模型交付方式  | **A**：注册工具（Tool Calling）                                                                          |
| 工具执行后 UI | **A**：只更新 **`draft`**，不自动更新 **`appliedCode`** / 画布                                           |
| 持久化介质    | **A**：仅 **localStorage**（不引入 IndexedDB / 额外存储包）                                              |
| 重置行为      | **A**：`draft` 与 `appliedCode` 均恢复为 **`DEFAULT_LAB_TSX`**，并 **清除** lab 源码的 localStorage 条目 |

## 3. 架构方案（选定）

在「自定义 ChatTransport 内嵌 tool loop」与「独立 hook + `streamText` + tools」等选项中，采用 **独立流式对话 hook（`streamText` + `tool()` + zod）**：

- **优点**：与现有 `useChat` + `DefaultChatTransport` / DeepSeek HTTP 路径解耦，工具循环边界清晰，便于测试与排错。
- **代价**：右下角对话 UI 需与该 hook 的 **文本流 / 状态 / 停止** 对齐（可复用现有 AI Elements 容器，消息结构可与 `UIMessage` 对齐或做薄映射）。

不推荐把完整 tool loop 硬塞进单一 `ChatTransport` 的实现（复杂度高、与 SDK 内部假设耦合大）。

## 4. 工具设计

### 4.1 首轮必备工具

| 工具标识（示例） | 说明                                                                             | 参数                                                     |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `set_lab_tsx`    | 用模型给出的字符串**整体替换**当前 Lab 侧栏 TSX（即写入 **`draft` 的单一来源**） | `code: string`（zod：`min(1)`，可选 `max` 防止极端大包） |

执行成功时：

1. 调用父级传入的 setter，**仅** `setDraft(code)`（或等价）。
2. 将 **`draft` 与 `appliedCode`** 一并写入 localStorage（见 §5）。若工具只改 draft，则持久化时 `appliedCode` 取当前 React state 中的值。

**不**在工具回调内调用 `setAppliedCode`。

### 4.2 可选后续工具（首轮不做）

- `get_lab_tsx`：只读当前 draft，便于多轮「先读后改」。**替代方案**：在每次请求的 **system 提示**中注入当前 `draft` 全文或截断说明，多数场景可省去单独工具。

## 5. 持久化（localStorage）

- **内容**：至少保存 **`draft`** 与 **`appliedCode`**，保证刷新后侧栏与画布与上次一致。序列化格式为 JSON 对象（字段名固定，便于迁移）。
- **键名**：单一命名空间前缀，例如 `mobile-app-lab:tsx-state`（具体键名实现时统一常量）。
- **写入时机**：draft 或 appliedCode 自用户操作或工具执行变更后防抖或同步写入；需避免无限循环。
- **配额**：浏览器单键约 **5MB** 量级上限。写入失败时须向用户可见提示（非静默失败），不假定一定成功。

## 6. 重置

- **入口**：放在 **编辑 TSX 的 Sheet** 内或顶栏明确区域（避免与对话内按钮混淆）；需二次确认（对话框或 `confirm`）以防误触。
- **行为**：`draft` ← `DEFAULT_LAB_TSX`，`appliedCode` ← `DEFAULT_LAB_TSX`，并 **删除** lab TSX 对应的 localStorage 键。

## 7. 系统提示词约束（摘要）

向模型明确：

- 输出必须通过 **`set_lab_tsx`** 提交完整可运行 TSX，而不是仅在自然语言里贴代码。
- 与现有 **`DEFAULT_LAB_TSX` / `liveScope`** 一致：**无 import**；仅使用 `LiveProvider` 注入的标识符（如 `React`、`View`、`Text` 等）。
- 保持 IIFE 或当前工程约定的包裹形式，避免破坏 `react-live` 执行方式。

（全文由实现时单处常量维护，本设计不粘贴长模板。）

## 8. 模型与运行环境

- **DeepSeek**：沿用 `@ai-sdk/deepseek` + 用户配置的 API Key（现有设置流）；`streamText` 在**浏览器**发起请求。
- **风险**：若目标 API 对浏览器 **CORS** 限制导致失败，用户需改用可访问的代理并通过环境变量配置的远程聊天 URL（与本功能正交，已在 DeepSeek 设置文案中提示）。
- **Mock 模式**：若仅 DeepSeek 路径支持 tools，Mock 流可提示「请配置 Key」或对工具调用做显式降级说明（实现计划阶段二选一，避免静默失败）。

## 9. 错误与边界

- 工具参数校验失败：不更新 draft，在对话或 toast 中提示。
- localStorage 写入失败：提示容量或权限问题。
- `react-live` 编译/运行错误：继续由现有 **`LiveError`** 展示；不在本设计新增服务端校验管道。

## 10. 测试建议（实现阶段）

- 纯函数：JSON 序列化/反序列化、重置后状态与存储一致。
- 可选：对 zod schema 与工具 handler 做单元测试（不强制对接真实网络）。

## 11. 非目标

- 不实现服务端保存、协作、版本历史分支。
- 首轮不引入 IndexedDB、不新增仅用于 KV 的第三方存储库。
- 不强制实现 `get_lab_tsx`（除非实现时发现 prompt 注入不足以稳定多轮编辑）。

## 12. 自检（定稿前）

- [x] 无 TBD / 占位句段。
- [x] 与澄清表一致，无矛盾。
- [x] 范围可在一个实现计划内完成；若超支则先交付 `set_lab_tsx` + 持久化 + 重置。
