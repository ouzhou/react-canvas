# core-v2：`Image` 与 `SvgPath` 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/core-v2` 中实现规格 [2026-04-12-core-v2-image-svgpath-design.md](../specs/2026-04-12-core-v2-image-svgpath-design.md)：`SceneRuntime` 增加 `insertImage` / `insertSvgPath`，扩展 `SceneNode` / `LayoutSnapshot`，`attachSceneSkiaPresenter` 绘制位图与矢量路径；单元测试覆盖几何纯函数、viewBox 解析、runtime 快照与异步解码；**不含** `packages/react-v2`。

**Architecture:** 纯几何与 viewBox 解析放在 **`src/media/`** 独立模块便于 TDD；**URI→`SkImage`** 全局缓存在 **`src/media/image-uri-cache.ts`**（与 runtime 闭包协作）；**`createSceneRuntime`** 内 **`insertImage`** 使用浏览器 **`fetch` + `initCanvasKit()` 单例** 解码，成功后 **`emitLayoutCommit()`** 触发 presenter 重绘（与 `setScrollY` 不重跑 Yoga 的模式一致）；**`insertSvgPath`** 同步写节点并在快照中写入已解析 viewBox 四元组，presenter 内按节点缓存 **`SkPath`** 与变换矩阵。**URI 缓存键**：去掉 **`#` 及其后片段** 再作为 `Map` 键（与 `fetch` 忽略 fragment 一致）。

**Tech Stack:** TypeScript、`yoga-layout`、`canvaskit-wasm`、`vite-plus/test`、`vp test` / `vp check`。

---

## 文件结构（创建 / 修改）

| 路径                                                    | 职责                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/scene/scene-node.ts`              | 扩展 `SceneNodeKind`、`SceneNode` 专有字段                                                                                         |
| `packages/core-v2/src/runtime/scene-runtime.ts`         | `LayoutSnapshot` 类型、`buildLayoutSnapshotWithoutRun`、`insertImage`、`insertSvgPath`、`removeView` 取消请求、`SceneRuntime` 类型 |
| `packages/core-v2/src/media/image-object-fit.ts`        | `objectFit` 源/目标矩形纯函数                                                                                                      |
| `packages/core-v2/src/media/view-box.ts`                | 解析 `viewBox` 字符串；viewBox→布局矩形的 **scale + translate**（返回 `sx, sy, tx, ty` 或 `DOMMatrix` 等价 6 数）                  |
| `packages/core-v2/src/media/svg-path-raster.ts`         | （可选拆分）从 `d` + CanvasKit 构造 `SkPath` 的薄封装，供 presenter 调用                                                           |
| `packages/core-v2/src/media/image-uri-cache.ts`         | `Map<string, SkImage>`、**in-flight** `Map<string, Promise<SkImage>>`、**normalizeUriKey**                                         |
| `packages/core-v2/src/render/scene-skia-presenter.ts`   | `paintNodeContent` 分支：`image` / `svgPath`                                                                                       |
| `packages/core-v2/src/index.ts`                         | 导出新增公共类型（如 `ImageObjectFit`）                                                                                            |
| `packages/core-v2/tests/image-object-fit.test.ts`       | 矩形计算                                                                                                                           |
| `packages/core-v2/tests/view-box.test.ts`               | viewBox 解析与变换                                                                                                                 |
| `packages/core-v2/tests/scene-runtime-image.test.ts`    | `insertImage`、mock `fetch`、`data:` 解码、`emitLayoutCommit`                                                                      |
| `packages/core-v2/tests/scene-runtime-svg-path.test.ts` | `insertSvgPath`、快照字段                                                                                                          |
| `packages/core-v2/tests/hit-test.test.ts`               | 增补 `svgPath` / `image` 叶命中盒（若现有用例未覆盖）                                                                              |

**不修改：** `packages/core-v2/src/hit/hit-test.ts`（`image` / `svgPath` 与 `view` 相同盒逻辑，无需 `kind` 分支）；除非实测 `scrollView` 内坐标异常再改。

---

### Task 1: `image-object-fit` 纯函数与测试

**Files:**

- Create: `packages/core-v2/src/media/image-object-fit.ts`
- Create: `packages/core-v2/tests/image-object-fit.test.ts`

- [ ] **Step 1: 写失败测试**

在 `packages/core-v2/tests/image-object-fit.test.ts`：

```typescript
import { expect, test } from "vite-plus/test";
import { computeImageDestSrcRects } from "../src/media/image-object-fit.ts";

test("contain letterboxes wide image in tall box", () => {
  const r = computeImageDestSrcRects({
    objectFit: "contain",
    destW: 100,
    destH: 200,
    imageW: 200,
    imageH: 100,
  });
  expect(r.dest).toEqual({ x: 0, y: 75, width: 100, height: 50 });
  expect(r.src).toEqual({ x: 0, y: 0, width: 200, height: 100 });
});

test("cover crops to fill tall box", () => {
  const r = computeImageDestSrcRects({
    objectFit: "cover",
    destW: 100,
    destH: 200,
    imageW: 200,
    imageH: 100,
  });
  expect(r.src.x).toBeGreaterThan(0);
  expect(r.src.width).toBeLessThan(200);
  expect(r.dest).toEqual({ x: 0, y: 0, width: 100, height: 200 });
});

test("fill stretches to full dest", () => {
  const r = computeImageDestSrcRects({
    objectFit: "fill",
    destW: 100,
    destH: 200,
    imageW: 50,
    imageH: 50,
  });
  expect(r.dest).toEqual({ x: 0, y: 0, width: 100, height: 200 });
  expect(r.src).toEqual({ x: 0, y: 0, width: 50, height: 50 });
});

test("zero dest returns safe rects", () => {
  const r = computeImageDestSrcRects({
    objectFit: "contain",
    destW: 0,
    destH: 100,
    imageW: 10,
    imageH: 10,
  });
  expect(r.dest.width).toBe(0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/core-v2 && vp test tests/image-object-fit.test.ts`  
Expected: **FAIL**（模块或函数不存在）。

- [ ] **Step 3: 最小实现**

创建 `packages/core-v2/src/media/image-object-fit.ts`：

```typescript
export type ImageObjectFit = "contain" | "cover" | "fill";

export type Rect = { x: number; y: number; width: number; height: number };

export type ComputeImageDestSrcRectsArgs = {
  objectFit: ImageObjectFit;
  destW: number;
  destH: number;
  imageW: number;
  imageH: number;
};

export type DestSrcRects = { dest: Rect; src: Rect };

/**
 * 在「目标像素矩形 (0,0)-(destW,destH)」内放置图像。
 * 返回的 `dest` 为局部坐标下的绘制矩形；`src` 为图像像素空间中的采样矩形。
 */
export function computeImageDestSrcRects(args: ComputeImageDestSrcRectsArgs): DestSrcRects {
  const { objectFit, destW, destH, imageW, imageH } = args;
  if (
    !Number.isFinite(destW) ||
    !Number.isFinite(destH) ||
    !Number.isFinite(imageW) ||
    !Number.isFinite(imageH) ||
    destW <= 0 ||
    destH <= 0 ||
    imageW <= 0 ||
    imageH <= 0
  ) {
    return {
      dest: { x: 0, y: 0, width: Math.max(0, destW), height: Math.max(0, destH) },
      src: { x: 0, y: 0, width: Math.max(0, imageW), height: Math.max(0, imageH) },
    };
  }

  const fullDest: Rect = { x: 0, y: 0, width: destW, height: destH };
  const fullSrc: Rect = { x: 0, y: 0, width: imageW, height: imageH };

  if (objectFit === "fill") {
    return { dest: fullDest, src: fullSrc };
  }

  const scaleContain = Math.min(destW / imageW, destH / imageH);
  const scaleCover = Math.max(destW / imageW, destH / imageH);
  const scale = objectFit === "contain" ? scaleContain : scaleCover;

  const scaledW = imageW * scale;
  const scaledH = imageH * scale;
  const dx = (destW - scaledW) / 2;
  const dy = (destH - scaledH) / 2;

  if (objectFit === "contain") {
    return {
      dest: { x: dx, y: dy, width: scaledW, height: scaledH },
      src: fullSrc,
    };
  }

  // cover: dest = full box; crop src centered
  const cropW = destW / scale;
  const cropH = destH / scale;
  const sx = (imageW - cropW) / 2;
  const sy = (imageH - cropH) / 2;
  return {
    dest: fullDest,
    src: { x: sx, y: sy, width: cropW, height: cropH },
  };
}
```

若 Step 1 中断言与几何约定不一致，以 **RN / M4「contain=cover 对称语义」** 为准调整测试数值，但须保持 **contain = 整图可见 letterbox**、**cover = 铺满裁切**、**fill = 拉伸**。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/core-v2 && vp test tests/image-object-fit.test.ts`  
Expected: **PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core-v2/src/media/image-object-fit.ts packages/core-v2/tests/image-object-fit.test.ts
git commit -m "feat(core-v2): add image object-fit rect math"
```

---

### Task 2: `view-box` 解析与 viewBox→布局盒变换

**Files:**

- Create: `packages/core-v2/src/media/view-box.ts`
- Create: `packages/core-v2/tests/view-box.test.ts`

- [ ] **Step 1: 写失败测试**

`packages/core-v2/tests/view-box.test.ts`：

```typescript
import { expect, test } from "vite-plus/test";
import {
  parseSvgViewBox,
  viewBoxToDestTransform,
  DEFAULT_SVG_VIEW_BOX,
} from "../src/media/view-box.ts";

test("parse default lucide viewBox", () => {
  expect(parseSvgViewBox(undefined)).toEqual({ ok: true, minX: 0, minY: 0, width: 24, height: 24 });
  expect(parseSvgViewBox("  0 0 24 24 ")).toEqual({
    ok: true,
    minX: 0,
    minY: 0,
    width: 24,
    height: 24,
  });
});

test("parse rejects non-finite", () => {
  expect(parseSvgViewBox("0 0 NaN 24").ok).toBe(false);
});

test("uniform scale and center into dest", () => {
  const vb = { minX: 0, minY: 0, width: 24, height: 24 };
  const m = viewBoxToDestTransform(vb, { x: 0, y: 0, width: 48, height: 48 });
  expect(m.scale).toBe(2);
  expect(m.translateX).toBe(0);
  expect(m.translateY).toBe(0);
});

test("letterbox vertically", () => {
  const vb = { minX: 0, minY: 0, width: 24, height: 24 };
  const m = viewBoxToDestTransform(vb, { x: 0, y: 0, width: 48, height: 24 });
  expect(m.scale).toBe(1);
  expect(m.translateX).toBe(12);
  expect(m.translateY).toBe(0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/core-v2 && vp test tests/view-box.test.ts`  
Expected: **FAIL**

- [ ] **Step 3: 实现 `view-box.ts`**

```typescript
export const DEFAULT_SVG_VIEW_BOX = "0 0 24 24";

export type ViewBoxRect = { minX: number; minY: number; width: number; height: number };

export type ParseViewBoxResult =
  | { ok: true; minX: number; minY: number; width: number; height: number }
  | { ok: false };

export function parseSvgViewBox(input: string | undefined): ParseViewBoxResult {
  const raw = (input ?? DEFAULT_SVG_VIEW_BOX).trim();
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 4) return { ok: false };
  const nums = parts.map((p) => Number.parseFloat(p));
  if (nums.some((n) => !Number.isFinite(n))) return { ok: false };
  const [minX, minY, width, height] = nums;
  if (width <= 0 || height <= 0) return { ok: false };
  return { ok: true, minX, minY, width, height };
}

export type ViewBoxTransform = { scale: number; translateX: number; translateY: number };

/**
 * 将 viewBox 用户空间 **等比** 映射到 `dest` 矩形内并 **居中**（letterbox）。
 * 画布 drawPath 前：`translate(dest.x, dest.y)` 再 `translate(translateX, translateY)` 再 `scale(scale, scale)` 再 `translate(-minX, -minY)`，
 * 等价实现可在 presenter 用 `SkMatrix` 组合；此处返回分解量便于单测。
 */
export function viewBoxToDestTransform(
  vb: ViewBoxRect,
  dest: { x: number; y: number; width: number; height: number },
): ViewBoxTransform {
  if (dest.width <= 0 || dest.height <= 0 || vb.width <= 0 || vb.height <= 0) {
    return { scale: 0, translateX: dest.x, translateY: dest.y };
  }
  const scale = Math.min(dest.width / vb.width, dest.height / vb.height);
  const contentW = vb.width * scale;
  const contentH = vb.height * scale;
  const tx = dest.x + (dest.width - contentW) / 2;
  const ty = dest.y + (dest.height - contentH) / 2;
  return { scale, translateX: tx, translateY: ty };
}
```

Presenter 中最终矩阵须等价于：先平移到 `dest` 原点，再施加 **以 viewBox 左上角为基准** 的缩放；实现时用 `ck.Matrix` 或 `skCanvas.concat` 按上述数学验证。

- [ ] **Step 4: 运行测试通过**

Run: `cd packages/core-v2 && vp test tests/view-box.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/core-v2/src/media/view-box.ts packages/core-v2/tests/view-box.test.ts
git commit -m "feat(core-v2): add SVG viewBox parse and letterbox transform"
```

---

### Task 3: `SceneNode` / `SceneNodeKind` 扩展

**Files:**

- Modify: `packages/core-v2/src/scene/scene-node.ts`

- [ ] **Step 1: 修改类型**

将 `SceneNodeKind` 改为包含 **`"image" | "svgPath"`**。在 `SceneNode` 上增加（命名与规格 §3.1 一致）：

```typescript
  imageUri?: string;
  imageObjectFit?: import("../media/image-object-fit.ts").ImageObjectFit;
  svgPathD?: string;
  svgViewBox?: string;
  svgStroke?: string;
  svgFill?: string;
  svgStrokeWidth?: number;
```

（若更偏好 **无前缀** `stroke` / `fill`，须在 **Task 3–4 之间** 与 `LayoutSnapshot` 字段统一重命名，禁止 Task 7 再改。）

- [ ] **Step 2: 运行类型检查**

Run: `cd packages/core-v2 && vp check`  
Expected: **PASS**（可能仅有未使用字段告警，按项目规则处理）。

- [ ] **Step 3: Commit**

```bash
git add packages/core-v2/src/scene/scene-node.ts
git commit -m "feat(core-v2): extend SceneNode for image and svgPath"
```

---

### Task 4: `LayoutSnapshot` 与 `buildLayoutSnapshotWithoutRun`

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`（约 **131–160** 行 `LayoutSnapshot` 类型定义；**336–409** 行 `buildLayoutSnapshotWithoutRun`）

- [ ] **Step 1: 扩展 `LayoutSnapshot` 条目类型**

为每个 layout entry 增加可选字段（示例名，须与 presenter 读取一致）：

```typescript
    imageUri?: string;
    imageObjectFit?: import("../media/image-object-fit.ts").ImageObjectFit;
    svgPathD?: string;
    svgPathViewBoxMinX?: number;
    svgPathViewBoxMinY?: number;
    svgPathViewBoxWidth?: number;
    svgPathViewBoxHeight?: number;
    svgStroke?: string;
    svgFill?: string;
    svgStrokeWidth?: number;
```

- [ ] **Step 2: 在 `buildLayoutSnapshotWithoutRun` 中写入分支**

在 `entry.nodeKind = nk` 之后：

- 若 `nk === "image"`：写入 `imageUri`、`imageObjectFit`（自 `SceneNode` 拷贝）。
- 若 `nk === "svgPath"`：调用 `parseSvgViewBox(n.svgViewBox)`；若 `ok`，写入四元组 + `svgPathD` + 画笔字段；若失败，**仅** `nodeKind` 与布局几何仍写入（**不**写四元组与 `svgPathD`），绘制侧视为不可绘（规格：不绘制 path）。

- [ ] **Step 3: 写 runtime 快照测试（失败优先）**

新建 `packages/core-v2/tests/scene-runtime-svg-path.test.ts`：

```typescript
import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertSvgPath puts viewBox fields in layout snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertSvgPath(root, "p1", {
    d: "M0 0 L10 0 L10 10 Z",
    viewBox: "0 0 24 24",
    style: { width: 48, height: 48 },
    stroke: "#000",
    fill: "none",
    strokeWidth: 2,
  });
  const L = rt.getLayoutSnapshot().p1!;
  expect(L.nodeKind).toBe("svgPath");
  expect(L.svgPathD).toBe("M0 0 L10 0 L10 10 Z");
  expect(L.svgPathViewBoxWidth).toBe(24);
  expect(L.svgStrokeWidth).toBe(2);
});
```

并实现 **`insertSvgPath` 最小桩**（下一步可充实），使测试编译。

- [ ] **Step 4: `vp test` 与 `vp check`**

Run: `cd packages/core-v2 && vp test tests/scene-runtime-svg-path.test.ts && vp check`

- [ ] **Step 5: Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/tests/scene-runtime-svg-path.test.ts
git commit -m "feat(core-v2): layout snapshot fields for svgPath"
```

---

### Task 5: 完成 `insertSvgPath` / `insertImage` API 与 `removeView` 取消解码

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`（`SceneRuntime` 接口约 **171–224**；`apiRef` 实现约 **563–711**）

- [ ] **Step 1: 定义 options 类型（同文件顶部或 `media/types.ts`）**

```typescript
export type InsertImageOptions = {
  uri: string;
  objectFit?: import("../media/image-object-fit.ts").ImageObjectFit;
  style: ViewStyle;
  onLoad?: () => void;
  onError?: (err: unknown) => void;
};

export type InsertSvgPathOptions = {
  d: string;
  viewBox?: string;
  style: ViewStyle;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  onError?: (err: unknown) => void;
};
```

- [ ] **Step 2: `insertSvgPath` 行为**

- 与 `insertText` 对称：已存在节点则 **校验 `kind === "svgPath"`**，否则 `throw`。
- 新节点：`kind = "svgPath"`，`svgPathD`、`svgViewBox`、`svgStroke` 等赋值，`viewStyle` 应用，`rebuildYogaStyle`（**不**绑定 text measure）。
- **`parseSvgViewBox` 失败**：同步调用 **`options.onError?.(...)`**，仍插入节点（便于调试布局），快照无 drawable 字段（见 Task 4）。

- [ ] **Step 3: `insertImage` 与解码流水线**

- `objectFit` 默认 **`"contain"`**。
- 节点：`kind = "image"`，`imageUri`、`imageObjectFit`。
- 维护 **`Map<string, { abort: AbortController; gen: number }>`** 键为 **节点 id**。每次 `insertImage` 更新 uri 时：**abort** 上一 `AbortController`，`gen++`。
- 异步：`void (async () => { const ck = await initCanvasKit(); ... })()`
  - `normalizeUriKey(uri)` 后 **查 `image-uri-cache`**：若已有 `SkImage`，直接 `onLoad` + `emitLayoutCommit`。
  - 否则 **in-flight** 去重：多个节点同 URI 共享同一 `Promise<SkImage>`。
  - `fetch(uri, { signal })` → `arrayBuffer()` → **`ck.MakeImageFromEncoded(bytes)`**（若 API 名不同，以 typings 为准）。
  - 成功：写入全局 **`uriKey → SkImage`**，`onLoad?.()`，`emitLayoutCommit()`。
  - 失败：`onError?.(e)`，**不** `emitLayoutCommit`（除非需强制刷新光标；默认不必）。

- [ ] **Step 4: `removeView`**

在 `store.removeNode(id)` 之前：**abort** 该 id 对应 `AbortController`（若存在）。

- [ ] **Step 5: 测试 `insertImage`**

`packages/core-v2/tests/scene-runtime-image.test.ts`：使用 **`vi.stubGlobal("fetch", ...)`** 返回 **1×1 PNG 的 `data:`** 或最小合法 PNG `ArrayBuffer`；断言 **`onLoad` 调用** 且 **`getLayoutSnapshot()`** 中 `img` 节点 `imageUri` 正确。失败路径：`fetch` reject → **`onError`** 被调用。

Run: `cd packages/core-v2 && vp test tests/scene-runtime-image.test.ts tests/scene-runtime-svg-path.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/src/media/image-uri-cache.ts packages/core-v2/tests/scene-runtime-image.test.ts
git commit -m "feat(core-v2): insertImage and insertSvgPath on SceneRuntime"
```

（若 `image-uri-cache.ts` 在 Task 5 才创建，一并加入 commit。）

---

### Task 6: `image-uri-cache.ts`（若未在 Task 5 提交）

**Files:**

- Create: `packages/core-v2/src/media/image-uri-cache.ts`

- [ ] **Step 1: 实现 `normalizeUriKey` + `getOrDecodeSkImage`**

导出函数示例：

```typescript
import type { CanvasKit } from "canvaskit-wasm";

export function normalizeUriKey(uri: string): string {
  const i = uri.indexOf("#");
  return i === -1 ? uri : uri.slice(0, i);
}

type DecodeFn = (bytes: ArrayBuffer) => ReturnType<CanvasKit["MakeImageFromEncoded"]> | null;

export function createImageUriCache(ck: CanvasKit) {
  const images = new Map<string, ReturnType<CanvasKit["MakeImageFromEncoded"]>>();
  const inflight = new Map<string, Promise<ReturnType<CanvasKit["MakeImageFromEncoded"]> | null>>();

  function get(key: string) {
    return images.get(key) ?? null;
  }

  function decodeWith(bytes: ArrayBuffer, decode: DecodeFn) {
    return decode(bytes);
  }

  // 暴露 get / set / getOrDecode —— 由 runtime 封装具体 fetch；本模块只负责 uri 键与 in-flight Map。
  return { images, inflight, get, decodeWith };
}
```

实际代码以 **单一模块内聚** 为准；上表仅为键空间与职责说明，**避免** 在 runtime 外散落三个 `Map`。

- [ ] **Step 2: `vp check`**

- [ ] **Step 3: Commit**（若与 Task 5 合并则跳过本 Task 独立 commit）

---

### Task 7: `attachSceneSkiaPresenter` 绘制 `image` 与 `svgPath`

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`（`paintNodeContent` **195–303** 行区域）

- [ ] **Step 1: `svgPath` 分支**

- 若 `box.nodeKind === "svgPath"` 且 `svgPathViewBoxWidth` 等齐全、`box.svgPathD` 存在：
  - 从 **`initCanvasKit()`** 取 `ck`。
  - **`ck.Path.MakeFromSVGString(box.svgPathD)`**（若 typings 为 **`CanvasKit.Path.MakeFromSVGString`** 则按实际调整）；若返回空，**跳过绘制**。
  - 用 **`viewBoxToDestTransform`** 与布局矩形 **`{ x: box.absLeft, y: box.absTop, width: box.width, height: box.height }`** 组合 **`SkMatrix`**，**`skCanvas.save; concat(matrix); drawPath(...); restore`**。
  - **圆角**：与背景相同，在 draw 前 **`clipRRect`**（若 `brx/bry > 0`）。
  - **Paint**：`stroke` / `fill` / `strokeWidth` 从 snapshot 读；`fill === "none"` 时跳过 fill；仅 stroke 时 `setStyle` stroke。

- [ ] **Step 2: `image` 分支**

- 若 `box.nodeKind === "image"` 且 `box.imageUri`：
  - `const key = normalizeUriKey(box.imageUri)`，从 **与 runtime 共享** 的模块 `getImageFromGlobalCache(key)` 取图——实现方式：**同一模块 `image-uri-cache.ts` 导出模块级 `let globalCache` 或由 runtime `setImageCacheForTests`**；presenter **只读** 缓存。
  - 若 `img` 为 null，**return**（透明）。
  - 否则 `computeImageDestSrcRects({ objectFit: box.imageObjectFit ?? "contain", destW: box.width, destH: box.height, imageW: img.width(), imageH: img.height() })`，把 **`dest` 平移到 `absLeft/absTop`**，调用 **`skCanvas.drawImageRect(img, srcRect, destRect, paint)`**（参数顺序以 CanvasKit 文档为准）。
  - **圆角 clip** 同 `svgPath`。

- [ ] **Step 3: 手动 / 后续 smoke**

本 Task **不要求** headless WebGL 单元测试；完成後运行：

```bash
cd packages/core-v2 && vp test && vp check
```

Expected: **全部 PASS**。

- [ ] **Step 4: Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts packages/core-v2/src/media/image-uri-cache.ts
git commit -m "feat(core-v2): paint Image and SvgPath in Skia presenter"
```

---

### Task 8: 导出与 README 一句

**Files:**

- Modify: `packages/core-v2/src/index.ts`
- Modify: `packages/core-v2/README.md`（可选：一句说明 `insertImage` / `insertSvgPath`）

- [ ] **Step 1:** 导出 `ImageObjectFit`、`computeImageDestSrcRects`（若希望给宿主用）；至少导出更新后的 **`SceneNodeKind`**（已通过 `SceneNode` 导出覆盖）。

- [ ] **Step 2:** `vp check`

- [ ] **Step 3: Commit**

```bash
git add packages/core-v2/src/index.ts packages/core-v2/README.md
git commit -m "docs(core-v2): export media helpers for Image/SvgPath"
```

---

## Self-review（对照规格）

| 规格章节                                 | 对应 Task                   |
| ---------------------------------------- | --------------------------- |
| §1 Image URL / objectFit / 无固有测量    | Task 1、5、7                |
| §1 SvgPath `d` + 默认 viewBox + 等比居中 | Task 2、4、5、7             |
| §1 命中 AABB                             | 无需改 hit-test（implicit） |
| §3 数据模型                              | Task 3、4                   |
| §3.3 `removeView` 取消请求               | Task 5                      |
| §4 解码与 clip / opacity                 | Task 5、7                   |
| §4.2 URI 缓存与 in-flight                | Task 5、6                   |
| §5 错误语义                              | Task 4、5、7                |
| §6 测试                                  | Task 1、2、4、5             |
| §7 react-v2                              | **本计划不覆盖**            |

**Placeholder 扫描：** 本计划无 “TBD” / 空实现步骤；CanvasKit 具体符号名在 **Task 7 Step 1** 以 `canvaskit-wasm` typings 为准微调。

**类型一致性：** `ImageObjectFit`、`imageObjectFit`、`objectFit` 选项与 **`LayoutSnapshot.imageObjectFit`** 必须使用 **同一联合类型源**（`image-object-fit.ts`）。

---

## Execution handoff

**计划已保存至** `docs/superpowers/plans/2026-04-12-core-v2-image-svgpath.md`。

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理，任务间人工快速 review，迭代快。
2. **Inline Execution** — 本会话用 executing-plans 按检查点批量执行。

**你要用哪一种？**
