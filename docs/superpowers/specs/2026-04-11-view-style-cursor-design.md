# `ViewStyle.cursor` 与画布 `canvas.style.cursor`（仅节点层）

日期：2026-04-11  
范围：`@react-canvas/core-v2`（`ViewStyle`、指针管线、`SceneRuntime`、画布输入层）；`@react-canvas/react-v2`（随 `View` 的 `style` 透传，**无新 React API**）。

---

## 1. 目标

1. 在 **`ViewStyle`** 上增加可选字段 **`cursor`**，语义对齐 CSS **`cursor`**（字符串，如 `"pointer"`、`"default"`、`"grab"` 等）。
2. 在 **`SceneRuntime`** 的指针调度路径中，根据 **当前命中叶子** 与 **场景树父链**，解析出 **最终应用于画布的** 光标字符串，并写入 **`HTMLCanvasElement.style.cursor`**。
3. **不**引入 **插件 / 系统** 优先级栈，**不**在 spec 或对外 API 中描述 `CursorManager.set(..., "plugin" | "system")`；若将来需要，**另起 spec**。

---

## 2. 非目标（本期明确不做）

- **优先级栈**（node &lt; plugin &lt; system）、插件视口拖拽覆盖、框选 / 全局 `wait` 等命令式 API。
- **Skia 绘制**与光标无关；光标仅 **DOM `canvas` 样式**。
- **对外暴露**「当前 hover 节点 id」或独立 `useCursor`（无需求则不增加）。

---

## 3. 语义

### 3.1 `ViewStyle.cursor`

- 类型：**`string | undefined`**。
- **undefined**：本节点对「沿链选取光标」**无贡献**（不是 `"default"` 的显式设置；见 3.2）。
- 与 **Yoga**：**不**传入 Yoga；与 **`pointerEvents`** 相同，仅元数据。

### 3.2 解析规则（命中链）

- 输入：**当前命中叶子节点 id** `leafId`（可为 `null`，表示指针不在任何可命中节点上）。
- 若 `leafId === null`：画布光标使用 **`"default"`**（或等价空串行为在实现中二选一并文档化；推荐 **`"default"`** 与浏览器常态一致）。
- 若 `leafId !== null`：从 **`leafId` 沿 `parentId` 走到根**，顺序为 **叶 → 根**；取 **第一个** 满足 `node.viewStyle?.cursor !== undefined` 的节点的 **`cursor` 字符串**作为结果。
- 若整条链上 **没有任何节点** 设置 `cursor`：结果为 **`"default"`**。

**`pointerEvents: "none"` 与 `cursor` 的交互**：`pointerEvents: "none"` 的节点不参与命中测试，因此不会出现在命中链中；即使该节点设置了 `cursor`，也**永远不会生效**（这是符合预期的隐式语义）。用户如需在某区域显示特定光标，需确保该区域或其祖先的 `pointerEvents` 不为 `"none"`。

**与 CSS 的差异说明（文档向）**：CSS 中 `cursor` 可继承；本引擎用 **显式父链查找** 近似「子优先、再祖先」的常见效果，不在此期实现完整 CSS 继承表。

### 3.3 何时写入 `canvas.style.cursor`

至少在以下时机 **重新解析并写入**（值变化时才写 DOM 可避免多余赋值，属实现细节）：

1. **`dispatchPointerPipeline`** 在处理 **`pointermove`** 且已完成 **命中叶 diff / enter / leave** 之后（此时 `lastHitTargetId` 与当前帧一致）。
2. **`notifyPointerLeftStage`**：在清空内部 hover 目标并对旧叶派发 `pointerleave` 之后，应解析为 **无命中** → **`"default"`**。

**不在此期强制**：其它指针类型（`pointerdown` 等）是否同步刷新光标；若实现为「仅在 move / leave 画布时更新」即可满足 hover 体验，可接受。

---

## 4. 架构与依赖

### 4.1 `SceneRuntime`

- **canvas 注入方式**：`createSceneRuntime` 返回对象上新增内部方法 **`setCursorTarget(el: HTMLCanvasElement | null): void`**，由 `attachCanvasStagePointer` 在挂载时以 `canvas` 调用、在卸载清理函数中以 `null` 调用。该方法**不**暴露在对外 `SceneRuntime` 类型中，仅作为实现细节（或通过返回扩展对象提供给 `attachCanvasStagePointer`）。
- **`applyResolvedCursor()` 调用时序**：必须在 `lastHitTargetId` 与 enter/leave 派发全部完成之后、主事件 `propagateScenePointerEvent` **之前**调用，确保两处 early return（`nextLeaf === null` 分支）都能走到光标更新逻辑。伪代码位置：
  ```
  // dispatchPointerPipeline
  // 1. enter/leave 派发（已更新 lastHitTargetId）
  // 2. → applyResolvedCursor()  ← 此处
  // 3. early return（move + null）或 main 事件
  ```
- 新增 **内部** 步骤：**`applyResolvedCursor()`**：根据当前 `lastHitTargetId` 与 **§3.2** 解析，设置 **`canvas.style.cursor`**（`HTMLCanvasElement` 为 null 时跳过）。
- **禁止**在 React 组件或业务代码中 **直接** 设置该 `canvas` 的 `cursor`（约定；测试可断言 runtime 为唯一写入方）。

### 4.2 辅助逻辑

- 建议 **纯函数**：`resolveCursorFromHitLeaf(leafId: string | null, store: NodeStore): string`，便于单测、与 `SceneRuntime` 解耦。

### 4.3 `react-v2`

- **`View`**：无需 API 变更；`style` / `style({ hovered })` 合并结果中出现 **`cursor`** 时，随现有 **`updateStyle`** 进入 **`viewStyle`** 即可。

---

## 5. 性能

- **不得**因光标解析引入 **额外 Yoga**；仅遍历 **根→叶路径**（长度 ≈ 树深），与 **`hitTestAt`** 同阶。
- 与现有 **`layoutDirty`** 规则一致：指针移动在 **布局干净** 时 **不** 触发 `calculateAndSyncLayout`。

---

## 6. 测试建议

| 项                                      | 断言                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| 链上最近祖先有 `cursor`                 | 叶无、`父` 有 `"pointer"` → 解析为 `"pointer"`                                         |
| 叶覆盖父                                | 叶 `"grab"`、父 `"pointer"` → **`"grab"`**（叶先被命中）                               |
| 无 `cursor`                             | 链上皆无 → `"default"`                                                                 |
| 离开画布                                | `notifyPointerLeftStage` 后 → `"default"`（或画布元素上恢复为默认的约定值）            |
| 无额外 Yoga                             | 仅 move、树不变 → `calculateLayout` 调用次数与现有 hover spec 一致                     |
| `pointerEvents: "none"` + `cursor` 字段 | 节点不在命中链中 → 解析为 `"default"`，cursor 字段不生效                               |
| hover 中 `removeView` 目标节点          | `dropHoverIfTargetMissing` 触发，下次 `pointermove` 以无命中路径更新光标为 `"default"` |

---

## 7. 验收

- 在 **`apps/v2`** 或现有 demo 中，某 **`View`** 设置 **`cursor: "pointer"`**，指针移入对应区域时 **浏览器光标** 变为手型，移出画布或移到无 `cursor` 区域时 **恢复默认**。
- **`vp test`** 下新增或扩展用例覆盖 **`resolveCursorFromHitLeaf`** 与 **runtime / 画布** 集成（可按项目惯例放在 `core-v2` 测试包）。

---

## 8. 与 `docs/core-design.md` §15 的关系

- §15 描述 **含插件 / 系统栈** 的 `CursorManager`：**本期不实现**该完整模型。
- 本期交付可视为 **仅实现其中「node 层」语义**（命中链解析 + 单一写入点）；未来若引入栈式管理，**命中链解析**可继续复用为 **`setFromNode` 的输入**，**另 spec** 描述优先级与 API。
