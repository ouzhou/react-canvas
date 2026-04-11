# Modal v1：单根双槽 + 场景挂载（不引入 Layer）

日期：2026-04-11  
范围：`@react-canvas/core-v2`（`SceneRuntime`、场景树初始化）；`@react-canvas/react-v2`（`Canvas` / `ParentSceneIdContext`、`Modal`）。  
参考：[React Native `Modal`](https://reactnative.dev/docs/modal)（**命名与语义以此为准**，实现为画布场景槽而非原生窗口）；`docs/core-design.md` §4（**本期不实现**通用 `Layer` / `modalLayer` / `captureEvents`；另文演进）。

---

## 1. 目标

1. 提供 **参考 RN `Modal` 的基础 `<Modal>`** API（`visible` / `transparent` / `onRequestClose` 等，见 §6.2），使弹窗内容挂在 **专用场景父节点** 上，与主界面 **兄弟并列**，并利用现有 **命中「后兄弟优先」** 叠在主界面之上。
2. **不引入** `Layer` 类型与 **`captureEvents` 引擎语义**；「点空白不穿透」依赖 **弹窗子树内全屏可命中背板**（见 §5）。
3. 挂载方式仍为 **`insertView` / `removeView`** + **`ParentSceneIdContext`**（**不使用** `react-dom` 的 `createPortal`）。

---

## 2. 非目标（本期明确不做）

- `Layer` / `overlayLayer` / `modalLayer` 与 **`captureEvents`（未命中也阻断下层）**。
- RN 文档中的 `animationType`、`presentationStyle`、`supportedOrientations`、`statusBarTranslucent` 等（与 RN 一致，**本期不实现**；可由后续 transition / 业务层 rAF 承接）。
- 无障碍焦点陷阱、DOM `aria-modal`（若将来与 HTML 叠层，另 spec）。

---

## 3. 背景：为何不能仅靠「最后插入的兄弟」

若主界面与 `modalRoot` **均**为 `root` 的子节点，**插入顺序**决定兄弟次序；后插入者在命中顺序上更「靠上」。若 Modal 早于主内容挂载，会出现 **主界面盖住弹窗** 的错误。

因此 v1 在 **runtime 初始化**时一次性创建 **固定顺序** 的两个子槽，避免依赖 React 挂载顺序。

---

## 4. 场景树形状（core）

在 `createSceneRuntime` 完成 **根节点**（现有 `rootId`）后，**同步**向该根追加两个子节点（若尚未存在）：

| 稳定 id（建议） | 相对 `root` 的次序 | 用途                         |
| --------------- | ------------------ | ---------------------------- |
| `scene-content` | **第一个**子节点   | 主界面 reconciler 默认挂载点 |
| `scene-modal`   | **第二个**子节点   | 弹窗/遮罩内容挂载点          |

**布局约定（v1）**

- `root`：与现有一致，占满视口（宽、高由 runtime 选项决定）。
- `scene-content`：**flex: 1**，承载原「直接挂在 root 下」的主树。
- `scene-modal`：**铺满舞台**（`position: 'absolute'`, `left/top: 0`, `width`/`height` 与视口一致，或等价 Yoga 表达），默认 **`pointerEvents`: `'auto'`**，以便未实现子节点时仍可作为占位（可选：无 Modal 子树 / `visible === false` 时由 React 不挂载子树或整节点 `pointerEvents: 'none'` —— 实现二选一，见 §6）。

**对外 API（core）**

- `getRootId(): string` — 仍为场景根（调试用、全图快照）。
- **`getContentRootId(): string`** — 返回 `scene-content` 的 id。
- **`getModalRootId(): string`** — 返回 `scene-modal` 的 id。

现有 **`insertView` / `removeView` / `hasSceneNode`** 不变。

---

## 5. 命中与「穿透」

现有 `hitTestAt`：**兄弟自最后一个子节点向前 DFS**，与绘制「后者在上」一致（见 `hit-test.ts` 文档注释）。

- **`scene-modal` 为第二个子节点** → 同一坐标下 **优先**在 `scene-modal` 子树内找最深命中。
- 若 **`scene-modal` 子树在该点无命中**（例如仅有小卡片、**无**全屏背板），则继续命中 **`scene-content`** → 表现为 **穿透**。

**本期产品约定**：`<Modal>`（或上层 UI 包）**默认渲染一层全舞台可命中背板**（`transparent={true}` 时仍可 `backgroundColor: 'transparent'` 或极低不透明度），保证常见「点空白」仍落在 modal 子树内。**不**依赖引擎级 `captureEvents`。

### 5.1 透明背景为何仍能「挡住」指针（不穿透）

本引擎的 **`hitTestAt`** 只关心：**节点是否有轴对齐包围盒、点是否落在盒内、该节点是否 `pointerEvents: 'none'`**。**不参与**「像素是否肉眼可见」或 **`backgroundColor` 是否透明** 的判断。

因此：**全屏背板 `View` 只要铺满舞台且为 `pointerEvents: 'auto'`（默认）**，即使用 **`backgroundColor: 'transparent'`**，在数学上仍覆盖整块区域，**该点会命中该节点**，事件不会落到 `scene-content`。

若误把「透明」理解成「不绘制 = 不参与命中」，才会以为会穿透——在本模型里应写成 **「透明可见，但仍占位命中」**。只有 **`pointerEvents: 'none'`** 或 **该处无任何节点覆盖** 才会穿透到下层。

---

## 6. React（`@react-canvas/react-v2`）

### 6.1 `Canvas`

- **`ParentSceneIdContext` 默认值**由 `getRootId()` 改为 **`getContentRootId()`**，使现有 **`View` 子节点**挂到 **`scene-content`**，无需业务改父级 id。
- 将 **`getModalRootId()`** 暴露给子树（例如 **`ModalRootIdContext`** 或 `useSceneRoots()`），供 `<Modal>` 使用。

### 6.2 `<Modal>`（对齐 [React Native Modal](https://reactnative.dev/docs/modal)，v1 子集）

与 RN 一致：**无 DOM `portal`**，内容挂在 **`scene-modal`**；**默认全屏背板**仍由本组件提供（RN 在 `transparent` 下常配合自建遮罩，此处合并进默认结构，见下）。

**与 RN 同名、本期纳入**

| Prop             | 类型         | RN 默认 | 说明                                                                                                                                                                            |
| ---------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visible`        | `boolean`    | —       | `false` 时不挂载弹窗子树；**关闭即不保留场景节点**（对应 RN 的显示开关）。                                                                                                      |
| `children`       | `ReactNode`  | —       | 弹窗内容。                                                                                                                                                                      |
| `transparent`    | `boolean`    | `false` | 为 `true` 时背板 **`backgroundColor: 'transparent'`**，**仍全屏占位命中**（§5.1）。                                                                                             |
| `onRequestClose` | `() => void` | —       | **语义与 RN 相同**：宿主/系统**请求关闭**时调用（RN：如 Android 返回键等；画布 v1 可映射为 **点全屏背板** 等）。**不负责**把 `visible` 改为 `false`，由父组件在回调里更新状态。 |

**RN 有、本期不实现（见 §2）**

`animationType`、`presentationStyle`、`onShow`、`onDismiss`、`supportedOrientations`、`statusBarTranslucent` 等——后续可对齐 RN 行为或文档说明「画布无此项」。

**行为**

- `visible === true`：用 **`ParentSceneIdContext.Provider`** 将 **`value={getModalRootId()}`** 包裹内部结构；**内部默认顺序**：先 **全屏背板 `View`**（样式由 `transparent` 决定），再 **`children`**。
- `visible === false`：不渲染上述结构，**不**保留弹窗相关场景节点。

**v1 验收**：以 **`visible` / `children`**、默认背板与 **`transparent`** 为准；**`onRequestClose`** 若实现背板关闭路径则一并测。

---

## 7. 清理与指针

- 卸载：`View` 现有 `useLayoutEffect` cleanup 调用 **`removeView`**；`node-store.removeNode` **递归删除子树**。
- **hover**：依赖现有 **`dropHoverIfTargetMissing`** 等路径；若删除命中目标，下一指针事件应不指向悬空 id（与现有 cursor / hover spec 一致）。

---

## 8. 与 `docs/core-design.md` §4 的关系

- §4 中的 **`Layer` + `modalLayer` + `captureEvents`** 为 **后续增强**；当需要「未命中也挡下层」、多 overlay 栈或插件争顶层时，再单独立项迁移。
- 本期 **`scene-modal` 槽位** 可视为 **逻辑上的「modal 层」占位**，将来可映射到真实 `modalLayer.root`，尽量减少 React API 变动。

---

## 9. 测试建议

| 项            | 断言                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| 双槽次序      | `root` 子节点顺序为 `[scene-content, scene-modal]`。                                         |
| 默认主内容    | `Canvas` 下 `View` 父 id 为 `getContentRootId()`。                                           |
| 叠放          | 在重叠区域，`scene-modal` 下有节点时命中 id 属于 modal 子树。                                |
| 穿透（负例）  | 故意去掉全屏背板、仅小卡片时，空白处命中 **scene-content**（演示穿透，可作单测或文档示例）。 |
| `transparent` | 背板仍参与命中；视觉上可区分不透明 / 透明。                                                  |

---

## 10. 验收

- **`apps/v2`**（或 demo）：打开 Modal 后，主界面上的按钮 **不可**被点击（在 **默认全屏背板** 前提下）；关闭 Modal 后主界面恢复。
- **`vp test`**：覆盖 runtime 双槽 id 与（可选）`Modal` + `View` 挂载 smoke。

---

## 11. 迁移说明

- 若现有代码或测试 **显式使用 `getRootId()`** 作为 **`View` 父级**，需改为 **`getContentRootId()`**（除非意图覆盖全根 —— 一般不应）。
