# 文档站：`/mobile-app-lab` 使用 react-live 做 TSX 实时预览 — 设计规格

**日期：** 2026-04-07  
**状态：** 已实现（首版：`react-live` + 右上 textarea/应用；`LiveContext.element` 在 `Canvas` > `View` 内渲染；默认完整 TSX 见 `mobile-app-lab-default-source.ts`）  
**关联：** `apps/website/src/pages/mobile-app-lab.astro`、`apps/website/src/components/MobileAppLab.tsx`、`@react-canvas/react`（`Canvas`、`View`、`Text` 等）、[live-code-preview-implementation.md](../../live-code-preview-implementation.md)

---

## 1. 背景与问题陈述

- 希望在 **`/mobile-app-lab`** 用 **轻量** 方式支持 **TSX 转译** 与 **浏览器内执行**，使用户（或后续 AI）修改源码后能 **立即** 在画布上看到结果。
- 交互上首版要求 **简单**：右上角 **浮动层** 内 **多行编辑 + 按钮**，**点击按钮后** 更新预览（不要求逐键刷新）。
- 已拍板：**全画布主区域** 仅展示用户代码的预览；**不**提供「切回原版多手机示例」开关（原版示例从主渲染路径移除，可另存于未引用模块或注释块以便日后参考）。

---

## 2. 目标与非目标

### 2.1 目标

1. 在 `apps/website` 引入 **`react-live`**，用其 **转译 + 在 `scope` 内求值** 的能力驱动预览。
2. **浮动层**（固定定位，右上）：**`<textarea>`**（多行 TSX）+ **「应用」类按钮**；可选展示 **`LiveError`** 以呈现编译/运行错误（不强制引入完整代码编辑器或语法高亮方案）。
3. **主画布**：在 `CanvasProvider` 就绪后，**全屏 `Canvas` 内仅渲染** 用户 TSX 求值得到的 **React Canvas 子树**（与 `@react-canvas/react` 宿主一致）。
4. 提供 **默认 TSX 片段**（首屏即可见内容，验证链路）。
5. 依赖安装与版本与 monorepo **catalog** / **Vite+** 流程一致（`vp add` 等）。

### 2.2 非目标（首版）

- **不**包含 AI 对话、工具调用、多文件工程、持久化存储。
- **不**要求完整 **TypeScript 类型检查**（仅转译 + 运行期错误即可）。
- **不**在首版恢复 **原版多手机陈列** UI；若保留源码作备份，**不得**参与默认渲染路径。

---

## 3. 方案结论

| 方案                                                            | 结论                                         |
| --------------------------------------------------------------- | -------------------------------------------- |
| 受控 `code` + `LiveProvider` / `LivePreview`，不用 `LiveEditor` | **采用**：与「点按钮再更新」一致，依赖面小。 |
| 使用 `LiveEditor` 替代 textarea                                 | **不采用**（首版）。                         |
| 自研 Sucrase + eval                                             | **不采用**（首版）。                         |

---

## 4. 用户体验与布局

### 4.1 页面结构

- 根布局可延续 **`fixed inset-0`** 与现有 **`CanvasProvider`** 加载/错误 UI（Yoga、CanvasKit 未就绪时的提示不变）。
- **主内容区**：仅 **一块** 画布逻辑——`LabCanvas` 的变体：**只包含** `Canvas` + 用户预览，**不再**渲染多个 `PhoneShell` / 子页面组件。

### 4.2 浮动层

- **位置**：`position: fixed`，**右上**（需 **z-index** 高于画布与左上等提示文案，避免被遮挡）。
- **内容**：
  - **`<textarea>`**：受控字符串，用于编辑 TSX 草稿。
  - **按钮**：点击后将草稿同步为 **已应用代码**（可实现为 `trim` 等简单规范化，具体实现计划定稿）。
  - **可选**：**`LiveError`** 或等价错误展示，便于用户修正语法错误。

### 4.3 更新时机

- **仅在点击按钮后** 将 `draft` 提交为驱动 `LiveProvider` 的 **`code`**（不要求输入过程中持续重编译）。

---

## 5. 数据流

1. **状态**：`draft`（textarea）与 **`appliedCode`**（或单一 `code` 由按钮提交更新）分离或合并，以实现「点按钮才更新预览」为准。
2. **首屏**：`draft` 与 **`appliedCode`** 均初始化为 **同一段默认 TSX**。
3. **按钮**：`appliedCode` 更新 → **`LiveProvider`** 的 **`code`** 更新 → **`LivePreview`**（或等价 API）展示求值结果。

---

## 6. `scope` 与 TSX

- **`scope`** 至少注入：**`React`**，以及 **`@react-canvas/react`** 中本页允许的导出（**至少 `View`、`Text`**；默认片段若使用 **`ScrollView`** 等则一并注入）。
- **TSX**：按 **react-live 当前主版本** 文档开启（如 `language` / `enableTypeScript` 等，以官方 API 为准）。

---

## 7. 与 `Canvas` 集成的风险与验收

### 7.1 风险

- `@react-canvas/react` 的 **`Canvas`** 对子节点有 **宿主约束**；若 **`LivePreview`** 在预览根外包裹 **DOM 节点（如 `div`）**，可能导致 **画布子树非法** 或无法挂载。

### 7.2 缓解（实现阶段必选其一或组合）

- 查阅 **react-live** 是否提供 **无多余包裹** 的渲染方式，或 **hook / context** 仅取出 **React 元素** 再在 **`Canvas` 内**渲染。
- 若默认 **`LivePreview`** 不可用，改用 **`noInline`**、自定义渲染路径等（以官方文档与实验为准）。

### 7.3 验收标准

- 用户 TSX 求值结果必须作为 **`Canvas` 下合法子树** 呈现；默认片段与简单修改后 **可见绘制**；错误时 **可见错误信息**（`LiveError` 或等价），**不**静默失败。

---

## 8. 代码与文件组织

- **`MobileAppLab.tsx`**：主路径改为「加载壳 + 浮动层 + 单一路径画布 + react-live」；原多手机示例组件 **不再被 import/使用**。
- **可选**：大段默认 TSX 可置于独立模块（如 **`mobile-app-lab-default-source.ts`**）导出字符串，**降低 `MobileAppLab.tsx` 体积**。

---

## 9. 依赖

- **`apps/website`** 增加 **`react-live`** 及该版本要求的 peer（如 **`react` / `react-dom`** 已由 catalog 提供；若需 **`prism-react-renderer`** 等以包声明为准）。
- 使用 **`vp add`**（或项目规定的包管理封装）安装，**不**直接调用裸 `pnpm`/`npm`（见 `AGENTS.md`）。

---

## 10. 测试与手动验收

- **功能**：修改 TSX → 点击应用 → 画布内容变化；故意语法错误 → 可见错误提示。
- **交互**：修饰键视口、inspector 若仍绑定同一 `canvas` 元素，行为与现网 **一致或在本规格中明确取舍**（实现计划细化）。

---

## 11. 后续（非本规格范围）

- 「切回原版 Lab」开关、AI 工具写文件、Sandpack 多文件等，另立规格。

---

_规格自检：无 TBD 占位；范围限定为 mobile-app-lab 首版 react-live 集成；`Canvas` 兼容性为实现阶段必验项。_
