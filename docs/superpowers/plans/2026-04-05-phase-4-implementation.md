# 阶段四（M4）：Image 与 SvgPath Implementation Plan

> **For agentic workers:** 推荐按 **Task 顺序**执行；步骤使用 `- [ ]` 勾选。每完成一个 **Task** 建议 `git commit` 一次。验证统一用 **`vp`**（见根目录 `AGENTS.md`）。测试断言从 **`vite-plus/test`** 导入。

**Goal:** 交付 **`Image`**（`uri` 异步解码、`SkImage` 缓存、`resizeMode`、`onLoad`/`onError`）与 **`SvgPath`**（`d` + `viewBox` → 等比居中绘制、stroke/fill），满足 [2026-04-05-phase-4-image-svgpath-design.md](../specs/2026-04-05-phase-4-image-svgpath-design.md) 与 [development-roadmap.md](../../development-roadmap.md) 阶段四 Step 8。

**Architecture:** **`@react-canvas/core`** 新增 **`ImageNode`**、**`SvgPathNode`**（均 **`extends ViewNode`**，与 `TextNode` 同模式）；纯函数 **`computeImageSrcDestRects`**（resizeMode）、**`parseViewBox`** / **`viewBoxToLayoutMatrix`**（viewBox→布局盒）；**`getOrDecodeImage(uri, canvasKit)`** 使用 **URL→`SkImage` Map 缓存**；**`paint.ts`** 在背景/边框之后绘制位图或 path；**异步解码完成**通过 **`registerPaintFrameRequester`**（core 单例）触发 **`queueLayoutPaintFrame`**（由 **`Canvas`/`createCanvasHostConfig`** 在 surface 就绪时注册）。**`@react-canvas/react`** 增加 **`Image`**、**`SvgPath`** 宿主字符串、**`commitMount`** 启动首帧解码、**`commitUpdate`** 同步 props。

**Tech Stack:** `canvaskit-wasm`（`MakeImageFromEncoded`、`Path` 的 SVG 字符串构造 API 以 typings 为准，常见为 **`Path.MakeFromSVGString`**）、`fetch`、`AbortController`。

**前置阅读:** [2026-04-05-phase-4-image-svgpath-design.md](../specs/2026-04-05-phase-4-image-svgpath-design.md)、`packages/core/src/paint.ts`、`packages/core/src/view-node.ts`、`packages/react/src/reconciler-config.ts`。

---

## 文件结构（计划新增 / 大改）

| 路径                                             | 职责                                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/image-rect.ts`                | **`computeImageSrcDestRects(resizeMode, iw, ih, boxW, boxH)`** → `{ src: Rect, dst: Rect }`（逻辑像素，Skia `LTRBRect` 参数可由此换算）。                                                                                              |
| `packages/core/tests/image-rect.test.ts`         | resizeMode 纯数学单测（无 CanvasKit）。                                                                                                                                                                                                |
| `packages/core/src/viewbox-transform.ts`         | **`parseViewBox(s): { minX, minY, w, h } \| null`**；**`viewBoxToDrawTransform(vb, layoutW, layoutH)`** → `Float32Array` 仿射矩阵或 `{ scale, tx, ty }`（等比 + 居中）。                                                               |
| `packages/core/tests/viewbox-transform.test.ts`  | viewBox 解析与矩阵断言。                                                                                                                                                                                                               |
| `packages/core/src/image-cache.ts`               | **`globalImageCache: Map<string, SkImage>`**（或模块内闭包）；**`getCached(uri)` / `setCached(uri, image)`**；文档注释说明 **内存随 URL 增长**。                                                                                       |
| `packages/core/src/image-decode.ts`              | \*\*`decodeImageFromBytes(canvasKit, bytes): SkImage                                                                                                                                                                                   | null`** 封装 `MakeImageFromEncoded`；**`loadImageFromUri(canvasKit, uri, signal)`** → `ArrayBuffer` + decode。 |
| `packages/core/src/paint-frame-requester.ts`     | **`let requestPaintFrame: (() => void) \| null`**；**`registerPaintFrameRequester(fn)`** / **`requestRedraw()`**（解码完成时调用）。                                                                                                   |
| `packages/core/src/image-node.ts`                | **`class ImageNode extends ViewNode`**：`type === "Image"`；`source`、`resizeMode`、`image: SkImage \| null`、`loadState`、`abort`；**`scheduleLoad(canvasKit, getFrameRef)`**；**`destroy()`** 里 `abort`、`image?.delete()`。        |
| `packages/core/src/svg-path-node.ts`             | **`class SvgPathNode extends ViewNode`**：`d`、`viewBox`、`size` 糖合并进 Yoga（**`setStyle` 时若 `size` 存在则 `width/height = size`**）；**`cachedPath`**、`pathKey`；**`getOrRebuildPath(canvasKit)`**；**`destroy()`** 删除 path。 |
| `packages/core/src/paint.ts`                     | `node.type === "Image"` → `drawImageRect`；`"SvgPath"` → `concat` 矩阵 + `drawPath`。                                                                                                                                                  |
| `packages/core/src/index.ts`                     | 导出测试所需符号（按需）。                                                                                                                                                                                                             |
| `packages/react/src/image.ts`                    | `export const Image = "Image" as const`；**`ImageProps`**。                                                                                                                                                                            |
| `packages/react/src/svg-path.ts`                 | `export const SvgPath = "SvgPath" as const`；**`SvgPathProps`**。                                                                                                                                                                      |
| `packages/react/src/reconciler-config.ts`        | **`createInstance`** / **`commitUpdate`** / **`commitMount`** 分支；**`registerPaintFrameRequester`** 在 **`createCanvasHostConfig`** 内于 **`resetAfterCommit` 或首次 `frameRef` 赋值处** 注册（见 Task 6）。                         |
| `packages/react/src/index.ts`                    | `export { Image, SvgPath, ... }`。                                                                                                                                                                                                     |
| `packages/react/src/jsx-augment.d.ts`            | **`<Image />`、`<SvgPath />`** 类型。                                                                                                                                                                                                  |
| `packages/core/tests/image-node.test.ts`（可选） | mock `CanvasKit` 时用 stub。                                                                                                                                                                                                           |
| `docs/development-roadmap.md`                    | Step 8 旁注 **SvgPath** 已纳入（可选小改）。                                                                                                                                                                                           |

---

### Task 1: Core — `resizeMode` 源/目标矩形（纯函数 + 测试）

**Files:**

- Create: `packages/core/src/image-rect.ts`
- Create: `packages/core/tests/image-rect.test.ts`
- Modify: `packages/core/src/index.ts`（导出 `computeImageSrcDestRects` 供测试与 paint 使用）

- [ ] **Step 1:** 实现 **`computeImageSrcDestRects`**，签名示例：

```ts
export type ResizeMode = "cover" | "contain" | "stretch" | "center";

export type ImageRect = { left: number; top: number; width: number; height: number };

export function computeImageSrcDestRects(
  mode: ResizeMode,
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
): { src: ImageRect; dst: ImageRect };
```

语义（与 RN 常见行为一致，**`src` 为图片像素子矩形，裁剪用；`dst` 为布局盒内目标矩形**）：

- **`stretch`**：`src = 整图`；`dst = (0,0,boxW,boxH)`（填满盒子，可变形）。
- **`contain`**：均匀缩放使 **整图可见**，`dst` 在盒内 **居中**，缩放因子 `s = min(boxW/iw, boxH/ih)`；`src = 整图`。
- **`cover`**：均匀缩放使 **盒子被填满**，`s = max(boxW/iw, boxH/ih)`；`src` 为从原图 **中心裁剪** 的窗口（与 `iw,ih,boxW,boxH` 算出的可覆盖区域）；`dst = (0,0,boxW,boxH)`。
- **`center`**：`s = 1`（或 **min(1, min(boxW/iw, boxH/ih))** 若需「缩小以适配」——在实现计划内 **二选一成文**，推荐 **不放大仅裁剪**：若图大于盒则从中心裁 `src`，`dst` 为盒；若图小于盒则 `dst` 居中且小于盒）。

- [ ] **Step 2:** 编写测试：固定 `iw,ih,boxW,boxH`，对四种 mode 断言 **`src/dst` 宽高非负**、**contain 时 dst 不超出 box**、**cover 时 dst 等于 box**。

Run: `vp test packages/core/tests/image-rect.test.ts`  
Expected: PASS

- [ ] **Step 3:** `vp check`

- [ ] **Step 4:** Commit：`test(core): image resizeMode rect math`

---

### Task 2: Core — viewBox 解析与等比居中变换（纯函数 + 测试）

**Files:**

- Create: `packages/core/src/viewbox-transform.ts`
- Create: `packages/core/tests/viewbox-transform.test.ts`

- [ ] **Step 1:** 实现 **`parseViewBox(s: string): { minX: number; minY: number; width: number; height: number } | null`**，解析 **`"minX minY w h"`**（四数字，逗号或空格分隔均可容错）；`w,h <= 0` 返回 `null`。

- [ ] **Step 2:** 实现 **`viewBoxToContentTransform(vb, layoutW, layoutH)`**，返回 **`[sx, 0, tx, 0, sy, ty, 0, 0, 1]`** 形式的 **3×3** 或 CanvasKit 所需 **`[a,b,c,d,e,f]`**（与 `canvas.concat` 一致）：**均匀缩放** `s = min(layoutW/vb.width, layoutH/vb.height)`，将 **`[minX,minY]–[minX+vbw,minY+vbh]`** 映射到布局矩形 **内居中**（letterbox）。

- [ ] **Step 3:** 测试：`"0 0 24 24"` + `layout 48x48` → 缩放 2，偏移使 path 居中；**无效字符串** → `null` 分支。

Run: `vp test packages/core/tests/viewbox-transform.test.ts`  
Expected: PASS

- [ ] **Step 4:** `vp check` + Commit：`feat(core): viewBox transform helpers`

---

### Task 3: Core — 全局图片缓存与解码

**Files:**

- Create: `packages/core/src/image-cache.ts`
- Create: `packages/core/src/image-decode.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** **`image-cache.ts`**：`Map<string, SkImage>`，**`peek(uri)`**、**`put(uri, img)`**（若已存在则 **`old.delete()`** 再替换，避免泄漏）。

- [ ] **Step 2:** **`image-decode.ts`**：`decodeImageFromEncoded(canvasKit: CanvasKit, bytes: Uint8Array): SkImage | null`；失败返回 `null`。

- [ ] **Step 3:** `loadImageFromUri(canvasKit, uri, signal?: AbortSignal)`：`fetch(uri, { signal })` → `arrayBuffer` → decode；**不**在函数内写缓存（由 **ImageNode** 调缓存策略）。

- [ ] **Step 4:** Commit：`feat(core): image decode helpers and uri cache`

---

### Task 4: Core — `registerPaintFrameRequester` 与 `queueLayoutPaintFrame` 衔接

**Files:**

- Create: `packages/core/src/paint-frame-requester.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** 实现：

```ts
let paintFrameRequester: (() => void) | null = null;

export function registerPaintFrameRequester(fn: (() => void) | null): void {
  paintFrameRequester = fn;
}

export function requestRedrawFromImage(): void {
  paintFrameRequester?.();
}
```

- [ ] **Step 2:** 在 **`packages/react/src/reconciler-config.ts`** 内，**仅当 `frameRef.surface` 与 `frameRef.canvasKit` 已就绪时注册一次**（模块级 **`let paintRequesterRegistered = false`** 或 **`registerPaintFrameRequester` 内去重**）：**`registerPaintFrameRequester(() => queueLayoutPaintFrame(frameRef.surface!, frameRef.canvasKit!, ...))`**。**禁止**在每次 **`resetAfterCommit`** 无条件重复注册。**Canvas 卸载 / `clearContainer`** 时 **`registerPaintFrameRequester(null)`** 并重置标志。

- [ ] **Step 3:** `vp check` + Commit：`feat(core): paint frame requester for async image`

---

### Task 5: Core — `ImageNode` 与异步加载

**Files:**

- Create: `packages/core/src/image-node.ts`
- Modify: `packages/core/src/view-node.ts`（仅当需要共享逻辑；否则不改）
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** **`class ImageNode extends ViewNode`**：`constructor(yoga, ...)` → `super(yoga, "Image")`。

- [ ] **Step 2:** 字段：`sourceUri: string`；`resizeMode: ResizeMode`（默认 **`cover`**）；`skImage: SkImage | null`；`abortController: AbortController | null`。

- [ ] **Step 3:** **`setImageProps(props)`** 或 **`setStyle` + 专用更新**：从 props 读 **`source.uri`**、**`resizeMode`**；**`style`** 仍走 **`ViewNode.setStyle`**。

- [ ] **Step 4:** **`beginLoad(canvasKit: CanvasKit)`**：`abort` 上一次；若 **缓存命中**则 `skImage = peek(uri)`，**`requestRedrawFromImage()`**，**`onLoad?.()`**；否则 `fetch` + decode + **put 缓存** + 同上。

- [ ] **Step 5:** **`destroy()`** override：**`abortController?.abort()`**，若 **本节点** 对缓存中的 image **无独占权**则 **不 delete**（共享缓存）；若采用「仅增加引用计数」可后续做——**v1 缓存持有 `SkImage`，节点不 delete 缓存内对象**，**destroy 只 abort 进行中的 fetch**。

- [ ] **Step 6:** Commit：`feat(core): ImageNode host`

---

### Task 6: Core — `SvgPathNode` 与 path 缓存

**Files:**

- Create: `packages/core/src/svg-path-node.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** **`class SvgPathNode extends ViewNode`**，`type === "SvgPath"`。

- [ ] **Step 2:** 字段：`d: string`；`viewBoxStr: string`（默认 **`"0 0 24 24"`**）；`size?: number`；stroke/fill/`strokeWidth` 等。

- [ ] **Step 3:** **`applyLayoutStyle(style, size)`**：若 **`size != null`**，合并 **`{ width: size, height: size }`** 到传入 Yoga 的 style（**spec #5：size 优先**）。

- [ ] **Step 4:** **`getPath(canvasKit)`**：若 **`d` / viewBox** 未变且已缓存 **`SkPath`** 则复用；否则 **`Path.MakeFromSVGString(d)`**（若返回 null → **`onError`** 或 dev warn，见 spec §10）。

- [ ] **Step 5:** **`destroy()`**：**`cachedPath?.delete()`**。

- [ ] **Step 6:** Commit：`feat(core): SvgPathNode host`

---

### Task 7: Core — `paint.ts` 绘制 Image 与 SvgPath

**Files:**

- Modify: `packages/core/src/paint.ts`

- [ ] **Step 1:** 在 **背景与 border** 之后、**`node.type === "Text"`** 分支之前或并列：若 **`ImageNode`**（`instanceof` 或 `type === "Image"`），**`skImage`** 非空时：用 **`computeImageSrcDestRects`** 得 **src/dst**，换算为 **CanvasKit Rect**，**`skCanvas.drawImageRect(skImage, srcRect, dstRect, paint)`**（paint 用 **`FilterQuality` 按需**）。

- [ ] **Step 2:** **`SvgPath`**：**`getPath`** → **`parseViewBox` + viewBox 变换** → **`skCanvas.save()`** → **`concat` 矩阵**（相对当前 **x,y** 布局原点）→ 配置 **Stroke/Fill Paint**（**`color` 默认作用于 stroke**，**`fill="none"`** 则 **不 fill**）→ **`drawPath`** → **`restore()`**。

- [ ] **Step 3:** **子节点递归**：**Image / SvgPath** 默认可 **有子节点则仍递归**（与 View 一致）；若 spec 要求 **叶子**，可在 reconciler **抛错**（runtime 约束文档）——**本 Task 按 View 同样递归**。

- [ ] **Step 4:** `vp check` + Commit：`feat(core): paint Image and SvgPath`

---

### Task 8: React — 宿主类型、HostConfig、`commitMount`

**Files:**

- Create: `packages/react/src/image.ts`
- Create: `packages/react/src/svg-path.ts`
- Modify: `packages/react/src/reconciler-config.ts`
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/src/jsx-augment.d.ts`

- [ ] **Step 1:** 定义 **`ImageProps`**、**`SvgPathProps`**（交叉 **InteractionHandlers**）。

- [ ] **Step 2:** **`createInstance`**：若 **`type === Image`** → `new ImageNode(yoga)` + 设 props；**`type === SvgPath`** → `new SvgPathNode(yoga)` + **`size`/style**。

- [ ] **Step 3:** **`commitUpdate`**：分支 **`ImageNode`** / **`SvgPathNode`** 调用各自 **`updateProps`**（不只 **`updateStyle`**）。

- [ ] **Step 4:** **`commitMount`**（替换空实现）：**`(domElement, type, newProps, internalInstanceHandle)`** — 以 reconciler 实际签名为准；对 **`Image`**：**`internalInstance`** 转 **`ImageNode`**，调 **`beginLoad(frameRef.canvasKit!)`**（若 **canvasKit 未就绪**则跳过，**`resetAfterCommit` 后首帧**再触发——可在 **`ImageNode` 内**若 `skImage==null && loadState==idle` 于 **requestRedraw** 路径重试，或 **`useLayoutEffect`** 在 react 层补调——**推荐**：**`commitMount`** 若 **无 canvasKit** 则 **`ImageNode.needsLoad = true`**，在 **`registerPaintFrameRequester` 首次注册**或 **`resetAfterCommit`** 里对 **待加载队列** 扫一次；**更简单**：**`beginLoad` 仅在 `commitMount`**，若 **canvasKit 为空**则 **下一帧 `resetAfterCommit`** 已能 **queueLayoutPaintFrame**，可在 **`queueLayoutPaintFrame` 前** 调 **`flushPendingImageLoads(frameRef)`**。**实现计划采用最简**：**`commitMount` 时若 `frameRef.canvasKit` 存在则 `beginLoad`，否则 `ImageNode.pending = true`**，在 **`resetAfterCommit`** 末尾 **`if (node.pending) beginLoad`**。）

- [ ] **Step 5:** **`jsx-augment.d.ts`** 注册 **`Image`、`SvgPath`**。

- [ ] **Step 6:** `vp check` + `vp test` + Commit：`feat(react): Image and SvgPath host types`

---

### Task 9: 命中测试与 pointer 回调

**Files:**

- Modify: `packages/core/src/hit-test.ts`（若需）
- 验证：`packages/core/tests/hit-test.test.ts`

- [ ] **Step 1:** **Image / SvgPath** 无子节点时与 **View** 相同：**反序子节点** → **点落在 `layout` 框内** 命中。若有 **仅 Image 无子** 的特殊性：**无需改 hit-test**。

- [ ] **Step 2:** 若 **`SvgPath` 有透明边**，仍 **AABB**（spec §9）。添加 **可选** 测试：Image 节点命中。

- [ ] **Step 3:** Commit：`test(core): verify hit-test for Image leaf`

---

### Task 10: 文档与 roadmap 小更新（可选）

**Files:**

- Modify: `docs/development-roadmap.md`（Step 8 一行补充 SvgPath）
- Modify: `docs/runtime-structure-constraints.md`（**Image / SvgPath** 子节点规则）

- [ ] **Step 1:** 上述文档各 **1～2 句**。

- [ ] **Step 2:** Commit：`docs: phase 4 Image and SvgPath notes`

---

## Spec 自检（计划 vs [2026-04-05-phase-4-image-svgpath-design.md](../specs/2026-04-05-phase-4-image-svgpath-design.md)）

| Spec 章节                                    | 覆盖 Task                        |
| -------------------------------------------- | -------------------------------- |
| Image 异步、缓存、resizeMode、onLoad/onError | Task 1, 3, 5, 7, 8               |
| SvgPath d、viewBox、等比居中、Paint          | Task 2, 6, 7                     |
| 交互 InteractionHandlers                     | Task 8（props 类型）             |
| 命中 AABB                                    | Task 9                           |
| 错误语义                                     | Task 5, 6（onError / 无效 path） |
| `size` 糖                                    | Task 6                           |

**占位符扫描：** 本计划无「TBD」实现步骤；**`center` resizeMode** 在 Task 1 已要求 **显式二选一成文**。

---

## 执行方式

**计划已保存至 `docs/superpowers/plans/2026-04-05-phase-4-implementation.md`。两种执行方式：**

1. **Subagent 驱动（推荐）** — 每个 Task 派生子代理，任务间人工复核，迭代快。
2. **本会话内联执行** — 在同一对话中按 Task 顺序改代码，大块变更处设检查点。

你更倾向哪一种？
