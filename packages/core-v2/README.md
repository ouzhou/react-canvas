# `@react-canvas/react-v2`

React 绑定：`CanvasProvider` / `Canvas` / `View`，场景与像素管线在 **`@react-canvas/core-v2`**（本包不重复实现布局与 Skia）。

---

## `core-v2` 模块概览（精简）

| 模块         | 作用                                                                                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **runtime**  | `SceneRuntime`：Yoga 场景树、`insertView` / `removeView`、视口、布局提交 `subscribeAfterLayout`；`node-store` 管节点与父子关系；**`initRuntime`**（`docs/core-design.md` §2.2）单例加载 `{ yoga, canvasKit }`，**`subscribeRuntimeInit` / `getRuntimeSnapshot`** 供 React `useSyncExternalStore` |
| **layout**   | `ViewStyle` → Yoga（`style-map`）；`calculateAndSyncLayout` + `absoluteBoundsFor` 算相对/绝对盒                                                                                                                                                                                                  |
| **events**   | 指针类型与 `dispatchPointerLike`；`event-registry` 做节点监听（捕获/冒泡语义在 dispatch 侧）                                                                                                                                                                                                     |
| **hit**      | `hitTestAt`：按布局快照做命中                                                                                                                                                                                                                                                                    |
| **input**    | `attachCanvasStagePointer`：画布坐标 → `dispatchPointerLike`；`clientXYToStageLocal` 坐标换算                                                                                                                                                                                                    |
| **render**   | `initCanvasKit` + WASM 定位 `locate`；`attachSceneSkiaPresenter`：订阅布局提交 → Skia 画矩形                                                                                                                                                                                                     |
| **geometry** | 画布 backing store 与 DPR 对齐                                                                                                                                                                                                                                                                   |

**做法要点**：`initRuntime()`（或内部等价的 `loadYoga` + `initCanvasKit`）→ `createSceneRuntime` 建根 → 业务插入子视图并改样式 → Yoga `calculateLayout` → 产出 `LayoutCommitPayload`（场景图 + 每节点 `abs` 盒 + 可选 `backgroundColor`）→ Skia 按下面规则画。

---

## Skia 绘制顺序（当前）

1. **整屏 clear** 为浅灰背景。
2. 遍历本帧 `layout` 快照，**仅绘制带可解析 `backgroundColor`（`#rgb` / `#rrggbb`）的节点**；无背景色则不画该节点。
3. 多节点时按 **布局框面积从大到小** 排序后绘制（大块先、小块后），避免半透明大块盖住子区域；**不是**场景树前序/后序，也**不是** zIndex（后续可演进）。
