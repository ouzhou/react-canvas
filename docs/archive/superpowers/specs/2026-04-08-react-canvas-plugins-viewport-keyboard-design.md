# React Canvas 插件：`plugin-keyboard` 与 `plugin-viewport` — 设计规格

**日期：** 2026-04-08  
**状态：** 已实现（首版：`plugin-keyboard`、`plugin-viewport`、`react` 修饰键滚轮早退；文档站 `mobile-app-lab` 可试用）  
**关联：** `@react-canvas/react`（`attachCanvasPointerHandlers`、`Canvas`）、`@react-canvas/core`（命中检测、场景树）

---

## 1. 背景与问题陈述

- 应用需要在 **无限画布 / 大工作区** 场景下提供 **平移（pan）** 与 **缩放（zoom）**，且希望以 **可选插件包** 形式提供，便于与 `@react-canvas/ui`（组件）及未来更多插件并存。
- 当前 `packages/react` 内 **`attachCanvasPointerHandlers`** 将 **滚轮** 用于 **`ScrollView` 纵向滚动**；若直接全局「滚轮即缩放」，会与列表内滚动 **语义冲突**。
- **键盘快捷键**（如工具切换、修饰键状态）同样适合以 **独立插件** 交付，且实现面小于视口变换，适合作为 **第一个插件** 验证包结构、`peerDependencies` 与集成方式。

---

## 2. 目标与非目标

### 2.1 目标

1. **包与命名**：在 monorepo 中新增 **`@react-canvas/plugin-keyboard`**（工作名，见 §5.1）与 **`@react-canvas/plugin-viewport`**，与 `core` / `react` / `ui` 边界清晰。
2. **键盘插件（首版可交付）**：在挂载点（通常为 `window` 或 `document`）监听 **keydown / keyup**，向消费方暴露 **当前按键集合** 或 **回调**（如 `onKeyDown`），**不**修改场景树；用于后续 viewport 读取「空格是否按下」等，也可单独用于应用快捷键。
3. **视口插件（核心诉求）**：在使用该插件的页面中，用户可进行：
   - **拖拽平移** 画布（相机平移）；
   - **滚轮缩放**：且与现有行为兼容（见 §3.2）。
4. **与现有滚轮行为兼容（已拍板）**：采用 **方案 1** —— **仅当按住 Cmd（macOS，`metaKey`）或 Ctrl（Windows / Linux，`ctrlKey`）时**，滚轮用于 **视口缩放**；**未按住上述修饰键时**，滚轮处理 **保持与当前实现一致**（例如命中 `ScrollView` 时滚动内容）。
5. **可文档化**：交互语义、与 `ScrollView` 的优先级、卸载时移除监听器，均可写进 README 与本文。

### 2.2 非目标（首版）

- **不**在插件内实现完整 **Figma 级** 多指触控、惯性、动画曲线；首版以 **可用、可测、边界清晰** 为准。
- **不**强制修改 `@react-canvas/core` 的 **公开命中 API**；若视口变换导致命中偏移，优先在 **react 层** 通过 **与绘制一致的变换** 解决（见 §6）；若必须扩展 core，另在实现阶段评估并最小化面。
- **不**将插件能力并入 `@react-canvas/ui`（`ui` 仍以画布内组件为主）。

---

## 3. 交互语义（对外契约）

### 3.1 缩放（滚轮）

- **触发条件**：`wheel` 事件发生且 **`event.metaKey === true` 或 `event.ctrlKey === true`**（与常见桌面设计工具一致；Windows 上用户常用 Ctrl）。
- **行为**：在 **满足条件** 时，对 **视口缩放** 进行更新（缩放中心建议为 **指针下的画布逻辑坐标**，见 §6）；并 **`preventDefault`**，避免浏览器缩放页面（需在非 passive 监听下注册，与现有 `wheel` 监听方式对齐）。
- **未按住 Cmd/Ctrl**：**不得**由 viewport 插件拦截为缩放；滚轮继续走 **`attachCanvasPointerHandlers` 现有逻辑**（例如 `ScrollView`）。

### 3.2 平移（拖拽）

- **当前实现**：**Cmd/Ctrl 按住 + 左键（button 0）拖拽** 平移视口；**松开修饰键** 则结束平移（`pointermove` 上检测修饰键 + `keyup` 对 Meta/Control 兜底）。
- **已移除首版草案**：中键平移、Space+左键平移（避免与 §3.1 的「仅修饰键时操作视口」不一致）。

### 3.3 与 `ScrollView` 的指针关系

- **Cmd/Ctrl + 左键拖拽**：在 capture 阶段由 viewport 消费，不进入画布内 `pointerdown` 冒泡（与点击命中分离，按需再收敛）。
- **Cmd/Ctrl + 滚轮**：由 viewport 消费（见 §3.1），不进入 `ScrollView` 滚动分支。

---

## 4. 包结构与技术边界

### 4.1 建议包名与位置

| 包                              | 职责                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `@react-canvas/plugin-keyboard` | DOM 键盘监听，对外暴露 React hook 或小型 Provider（见 §5.2）                                                          |
| `@react-canvas/plugin-viewport` | 视口状态（`translateX/Y`、`scale` 等）、DOM 指针/滚轮与 **根 `View` 的 `transform`** 或等价矩阵衔接；**依赖** `react` |

目录建议：`packages/plugin-keyboard/`、`packages/plugin-viewport/`（与现有 `packages/ui` 平级）。

### 4.2 `peerDependencies`（建议）

- `@react-canvas/react`：`workspace:*`（开发）/ 语义版本范围（发布时与 `react` 主版本对齐策略一致）。
- `react` / `react-dom`：与仓库 catalog 一致。
- **不**将 `@react-canvas/core` 作为 **直接** peer，除非插件文件直接引用 core 类型；若仅通过 `react` 传入 `sceneRoot`/`canvas`，可保持 **仅 peer `react` + `@react-canvas/react`**。

### 4.3 与 `@react-canvas/react` 的协作方式（两档，实现阶段二选一或分步）

- **档 A（侵入较小）**：`plugin-viewport` 提供 **`attachViewportHandlers(canvas, getState, setState, options)`** 与文档说明：**在** `attachCanvasPointerHandlers` **之外** 额外注册监听；通过 **修饰键判断** 与 **事件顺序**（先注册 viewport 的 `wheel`，命中 Cmd/Ctrl 则 `preventDefault` 并 return）保证 §3.1。风险：两处监听需 **约定顺序**，避免双份 `preventDefault` 行为不一致。
- **档 B（中长期）**：在 `@react-canvas/react` 增加 **可选的 input 组合器**（如 `createCanvasInputController({ viewport, scroll })`），**统一** `wheel` / `pointer` 分发。首版 **不强制** 档 B；若档 A 在实际集成中脆弱，在实现 PR 中升级为档 B 并缩小变更面。

**规格结论**：首版文档以 **档 A** 为默认路径；若评审要求一次到位，可在实现计划中直接选 **档 B**。

---

## 5. 键盘插件（`plugin-keyboard`）行为

### 5.1 对外 API 形态（择一实现）

- **Hook**：`useKeyboardMonitor(target?: EventTarget | null)` → 返回 `pressedKeys: ReadonlySet<string>` 或 `isKeyDown(code: string)`，内部 `useEffect` 注册 `keydown`/`keyup`，卸载时移除。
- **或** **`<KeyboardMonitor onChange={...}>`** 子树型组件（较少见）。

**首版约束**：仅 **冒泡阶段**、**可配置 `target`（默认 `window`）**；**不**实现全局快捷键注册表（避免与浏览器快捷键冲突的复杂策略），由应用自行判断 `event.defaultPrevented` 等。

### 5.2 与 viewport 的衔接

- `plugin-viewport` 若实现 **Space + 主键拖拽**，应 **优先** 通过 **keyboard 插件** 查询 Space 是否按下，避免重复监听键盘。

---

## 6. 视口状态与绘制 / 命中一致性

### 6.1 状态

- 建议最小状态：**`translateX`/`translateY`（逻辑 px）**、**`scale`（>0，建议 clamp 如 `[0.1, 8]`）**。
- 应用将状态绑定到 **`<Canvas>` 内根 `View` 的 `style.transform`**（或文档约定的一层 **唯一** 子 `View`），使 **Skia 绘制**与 **Yoga 布局**在同一棵树下；**首版**可约定 **仅缩放 + 平移**，矩阵顺序与现有 `transform` 数组语义一致（见 `@react-canvas/core` `buildLocalTransformMatrix`）。

### 6.2 命中检测

- **问题**：若仅对 **绘制** 施加相机矩阵而 **命中仍用未变换坐标**，会出现 **点击偏移**。
- **首版要求**：规格要求 **实现侧必须** 在集成文档中写明下列之一：
  - **推荐**：在 **`hitTest` 使用的指针坐标** 上施加 **与根变换互逆** 的映射（实现位置可在 `attachCanvasPointerHandlers` 的包装层或 core 扩展点，由实现 PR 选定）；
  - **或**：限制首版 demo 为 **仅展示绘制、不要求精确命中**（**不推荐**作为最终语义，仅允许短期内部试验）。

**评审注意**：若逆变换仅放在插件内而不传入 core，需 **明确** `clientToCanvasLogical` 之后到 `hitTest` 之前的 **单一点** 注入逆变换，避免重复与遗漏。

---

## 7. 测试与验收

- **plugin-keyboard**：单元测试或 Vitest：`keydown`/`keyup` 后状态更新；卸载后不再响应。
- **plugin-viewport**：在 **无头或 WASM 已有策略** 下，至少覆盖：**Cmd/Ctrl+wheel** 时 `scale` 变化；**未按修饰键** 时不调用 viewport 更新（可与 mock 的 `ScrollView` 行为分离开测试则更佳）。

---

## 8. 实现顺序建议

1. **`@react-canvas/plugin-keyboard`**：包壳 + API + 测试 + README。
2. **`@react-canvas/plugin-viewport`**：状态 + 变换应用到示例根 `View` + **滚轮缩放（§3.1）** + **中键平移**；再集成 **Space+拖拽**（依赖 keyboard）。
3. **文档站或 `MobileAppLab`**：可选接入作为 dogfood（**非**本规格强制）。

---

## 9. 规格自检（草案）

| 项     | 结论                                                         |
| ------ | ------------------------------------------------------------ |
| 占位符 | 无 TBD；档 A/B 已写明取舍。                                  |
| 一致性 | 滚轮方案与 §3.1、§4.3 一致。                                 |
| 范围   | 含两插件 + 与 react 协作；不含 core 大改承诺。               |
| 歧义   | 「档 B」为可选升级；命中逆变换须在实现 PR 中落地为明确单点。 |

---

## 10. 待评审问题（可选）

- 是否在首版 **强制** 引入 **档 B** 统一 input，以减少双监听风险？
- **缩放中心** 固定为指针下 vs 视口中心 —— 默认 **指针下**（已写入 §6.1 建议）。
