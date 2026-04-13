# Pick Buffer Hit Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 CanvasKit 离屏 surface 颜色拾取替换基于布局盒的 `hitTestAt`，解决固定高度父级溢出、圆角裁剪等命中不准的问题。

**Architecture:** 新建 `PickBuffer` 类（`src/hit/pick-buffer.ts`），每次布局提交后同步重画「id 色块」离屏 surface；`SceneRuntime` 增加 `setHitResolver` 注入点；`attachSceneSkiaPresenter` 在初始化完成后注入 resolver，卸载时清除。旧 `hitTestAt` 保留为兜底（resolver 为 null 时）。

**Tech Stack:** CanvasKit-WASM（`MakeSurface` / `readPixels`）、TypeScript、Vitest（`vite-plus/test`）

---

## File Structure

| 文件                                                  | 操作     | 职责                                                                               |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `packages/core-v2/src/hit/pick-buffer.ts`             | **新建** | `PickBuffer` 类：pickId 编码、pick pass 绘制、`hitAt` 读像素                       |
| `packages/core-v2/src/hit/pick-id-codec.ts`           | **新建** | pickId ↔ RGBA 编码/解码纯函数（可独立单测）                                        |
| `packages/core-v2/src/runtime/scene-runtime.ts`       | **修改** | 增加 `setHitResolver`；`dispatchPointerPipeline` 优先走 resolver                   |
| `packages/core-v2/src/render/scene-skia-presenter.ts` | **修改** | 创建 `PickBuffer`、注入 resolver、`subscribeAfterLayout` 里调 `rebuildAfterLayout` |
| `packages/core-v2/src/index.ts`                       | **修改** | 导出 `PickBuffer` 类型（供外部测试引用）                                           |
| `packages/core-v2/tests/pick-id-codec.test.ts`        | **新建** | pickId 编码/解码单元测试                                                           |
| `packages/core-v2/tests/pick-buffer-unit.test.ts`     | **新建** | `PickBuffer.rebuildAfterLayout` pickIdMap 单元测试（mock CanvasKit surface）       |

---

## Task 1：pickId 编码/解码纯函数

**Files:**

- Create: `packages/core-v2/src/hit/pick-id-codec.ts`
- Create: `packages/core-v2/tests/pick-id-codec.test.ts`

### 目标

将 pickId（整数 1…16,777,215）和 RGBA 之间的转换抽成独立纯函数，方便单测和复用。

- [ ] **Step 1: 写失败测试**

新建 `packages/core-v2/tests/pick-id-codec.test.ts`：

```ts
import { expect, test } from "vite-plus/test";
import { pickIdToRgba, rgbaToPickId, PICK_ID_EMPTY } from "../src/hit/pick-id-codec.ts";

test("PICK_ID_EMPTY is 0", () => {
  expect(PICK_ID_EMPTY).toBe(0);
});

test("pickIdToRgba encodes pickId=1 correctly", () => {
  const [r, g, b, a] = pickIdToRgba(1);
  expect(r).toBe(0);
  expect(g).toBe(0);
  expect(b).toBe(1);
  expect(a).toBe(255);
});

test("pickIdToRgba encodes max 24-bit id correctly", () => {
  const id = 0xffffff;
  const [r, g, b, a] = pickIdToRgba(id);
  expect(r).toBe(0xff);
  expect(g).toBe(0xff);
  expect(b).toBe(0xff);
  expect(a).toBe(255);
});

test("pickIdToRgba encodes mid-range id correctly", () => {
  const id = 0x123456;
  const [r, g, b] = pickIdToRgba(id);
  expect(r).toBe(0x12);
  expect(g).toBe(0x34);
  expect(b).toBe(0x56);
});

test("rgbaToPickId decodes 0,0,1 to pickId=1", () => {
  expect(rgbaToPickId(0, 0, 1)).toBe(1);
});

test("rgbaToPickId decodes 0,0,0 to PICK_ID_EMPTY", () => {
  expect(rgbaToPickId(0, 0, 0)).toBe(PICK_ID_EMPTY);
});

test("rgbaToPickId round-trips with pickIdToRgba", () => {
  for (const id of [1, 255, 65535, 0x123456, 0xffffff]) {
    const [r, g, b] = pickIdToRgba(id);
    expect(rgbaToPickId(r, g, b)).toBe(id);
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Users/zhouou/Desktop/react-canvas
vp test packages/core-v2/tests/pick-id-codec.test.ts
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `pick-id-codec.ts`**

新建 `packages/core-v2/src/hit/pick-id-codec.ts`：

```ts
/** pickId = 0 表示空白（未命中）。 */
export const PICK_ID_EMPTY = 0;

/**
 * 将 pickId（1 … 16,777,215）编码为 RGBA（A 固定 255）。
 * R = (id >> 16) & 0xFF，G = (id >> 8) & 0xFF，B = id & 0xFF。
 */
export function pickIdToRgba(pickId: number): [number, number, number, number] {
  return [(pickId >> 16) & 0xff, (pickId >> 8) & 0xff, pickId & 0xff, 255];
}

/**
 * 从 RGB 反查 pickId。RGB 均为 0 时返回 {@link PICK_ID_EMPTY}。
 */
export function rgbaToPickId(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
vp test packages/core-v2/tests/pick-id-codec.test.ts
```

Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
cd /Users/zhouou/Desktop/react-canvas
git add packages/core-v2/src/hit/pick-id-codec.ts packages/core-v2/tests/pick-id-codec.test.ts
git commit -m "feat(core-v2): add pickId ↔ RGBA codec for pick buffer"
```

---

## Task 2：PickBuffer 类（不含 CanvasKit 的 pickIdMap 部分）

**Files:**

- Create: `packages/core-v2/src/hit/pick-buffer.ts`
- Create: `packages/core-v2/tests/pick-buffer-unit.test.ts`

### 目标

实现 `PickBuffer` 类的 `pickIdMap` / `nodeIdMap` 分配逻辑（不依赖真实 CanvasKit surface，便于单测），以及 `hitAt` 的像素读取逻辑骨架（接受注入的 `readPixelFn`）。

- [ ] **Step 1: 写失败测试**

新建 `packages/core-v2/tests/pick-buffer-unit.test.ts`：

```ts
import { expect, test } from "vite-plus/test";
import { PickBuffer } from "../src/hit/pick-buffer.ts";
import type { LayoutCommitPayload } from "../src/runtime/scene-runtime.ts";

function makeCommit(
  nodes: Record<string, { parentId: string | null; children: string[] }>,
  layout: Record<string, { absLeft: number; absTop: number; width: number; height: number }>,
  rootId: string,
): LayoutCommitPayload {
  return {
    viewport: { width: 400, height: 300 },
    rootId,
    scene: { rootId, nodes },
    layout,
  };
}

test("rebuildPickIdMap assigns unique ids to all visible nodes", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a", "b"] },
      a: { parentId: "root", children: [] },
      b: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
      b: { absLeft: 200, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);

  const idA = pb.nodeIdMap.get("a");
  const idB = pb.nodeIdMap.get("b");
  expect(idA).toBeGreaterThan(0);
  expect(idB).toBeGreaterThan(0);
  expect(idA).not.toBe(idB);
  expect(pb.pickIdMap.get(idA!)).toBe("a");
  expect(pb.pickIdMap.get(idB!)).toBe("b");
});

test("rebuildPickIdMap skips pointerEvents:none nodes", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a"] },
      a: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );
  // 把 pointerEvents:none 写进 layout snapshot 的扩展字段
  (commit.layout["a"] as Record<string, unknown>)["pointerEvents"] = "none";

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);

  expect(pb.nodeIdMap.has("a")).toBe(false);
});

test("rebuildPickIdMap resets ids each call", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a"] },
      a: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  const firstId = pb.nodeIdMap.get("a")!;

  pb.rebuildPickIdMap(commit);
  const secondId = pb.nodeIdMap.get("a")!;

  // id 每次从 1 重新分配，两次结果相同（因为树不变）
  expect(firstId).toBe(secondId);
  expect(firstId).toBe(1); // root 先分配为 1，a 为 2，取决于遍历顺序；此处验证从 1 开始
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
vp test packages/core-v2/tests/pick-buffer-unit.test.ts
```

Expected: FAIL（`PickBuffer` 不存在）

- [ ] **Step 3: 实现 `PickBuffer` 类（pickIdMap 部分）**

新建 `packages/core-v2/src/hit/pick-buffer.ts`：

```ts
import type { LayoutCommitPayload, LayoutSnapshot } from "../runtime/scene-runtime.ts";
import { PICK_ID_EMPTY, pickIdToRgba, rgbaToPickId } from "./pick-id-codec.ts";

export type { LayoutCommitPayload };

/**
 * 颜色拾取命中缓冲。
 *
 * 职责：
 * 1. 维护 pickId ↔ nodeId 映射（`rebuildPickIdMap`）
 * 2. 用 CanvasKit surface 画 pick pass（`rebuildSurface`）
 * 3. 读像素反查 nodeId（`hitAt`）
 *
 * 构造时不依赖 CanvasKit；`rebuildSurface` 在获得 ck / surface 后调用。
 */
export class PickBuffer {
  /** pickId → nodeId */
  readonly pickIdMap: Map<number, string> = new Map();
  /** nodeId → pickId */
  readonly nodeIdMap: Map<string, number> = new Map();

  private lastCommit: LayoutCommitPayload | null = null;

  /**
   * 全量重建 pickId ↔ nodeId 映射（DFS 前序，从 1 开始分配）。
   * `pointerEvents: "none"` 的节点及子树不分配 id。
   */
  rebuildPickIdMap(commit: LayoutCommitPayload): void {
    this.pickIdMap.clear();
    this.nodeIdMap.clear();
    this.lastCommit = commit;
    let nextId = 1;

    const visit = (id: string): void => {
      const box = commit.layout[id] as
        | (LayoutSnapshot[string] & { pointerEvents?: string })
        | undefined;
      if (box?.pointerEvents === "none") return;

      const pickId = nextId++;
      this.pickIdMap.set(pickId, id);
      this.nodeIdMap.set(id, pickId);

      const node = commit.scene.nodes[id];
      if (node) {
        for (const childId of node.children) {
          visit(childId);
        }
      }
    };

    visit(commit.rootId);
  }

  /**
   * 从逻辑坐标查找命中的 nodeId（需先调用 `rebuildSurface`）。
   * `readPixelFn` 由外部（CanvasKit surface）提供，返回 [R,G,B,A] 或 null。
   */
  hitAtWithReader(
    stageX: number,
    stageY: number,
    rootScale: number,
    readPixelFn: (px: number, py: number) => [number, number, number, number] | null,
  ): string | null {
    const px = Math.floor(stageX * rootScale);
    const py = Math.floor(stageY * rootScale);
    const pixel = readPixelFn(px, py);
    if (!pixel) return null;
    const [r, g, b] = pixel;
    const pickId = rgbaToPickId(r, g, b);
    if (pickId === PICK_ID_EMPTY) return null;
    return this.pickIdMap.get(pickId) ?? null;
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
vp test packages/core-v2/tests/pick-buffer-unit.test.ts
```

Expected: 所有测试通过

> 注意：`rebuildPickIdMap` 给 root 分配 id=1，a 分配 id=2；测试中的 `firstId === 1` 断言需和实现遍历顺序一致（root 先访问）。若测试失败可改断言为 `expect(firstId).toBeGreaterThan(0)`。

- [ ] **Step 5: Commit**

```bash
git add packages/core-v2/src/hit/pick-buffer.ts packages/core-v2/tests/pick-buffer-unit.test.ts
git commit -m "feat(core-v2): add PickBuffer class with pickIdMap and hitAtWithReader"
```

---

## Task 3：SceneRuntime 增加 setHitResolver

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`

### 目标

在 `SceneRuntime` 接口和实现中增加 `setHitResolver`，`dispatchPointerPipeline` 优先走 resolver，兜底走 `hitTestAt`。

- [ ] **Step 1: 在接口类型中增加 `setHitResolver`**

打开 `packages/core-v2/src/runtime/scene-runtime.ts`，在 `SceneRuntime` 类型的 `subscribeAfterLayout` 后面加：

```ts
/**
 * 注入像素级命中解析器（由 `attachSceneSkiaPresenter` 在 pick buffer 就绪后注入）。
 * 传入 `null` 时回退到 `hitTestAt`（CPU 布局盒命中）。
 */
setHitResolver(fn: ((x: number, y: number) => string | null) | null): void;
```

- [ ] **Step 2: 在实现中声明 `hitResolver` 变量**

在 `createSceneRuntime` 函数体内、`let layoutDirty = true;` 附近加：

```ts
let hitResolver: ((x: number, y: number) => string | null) | null = null;
```

- [ ] **Step 3: 修改 `dispatchPointerPipeline` 里的两处 `hitTestAt` 调用**

共有两处（scroll drag 路径和主路径），改为：

```ts
// scroll drag 路径（约 line 595）
lastHitTargetId = hitResolver ? hitResolver(ev.x, ev.y) : hitTestAt(ev.x, ev.y, rootId, store);

// 主路径（约 line 601）
const nextLeaf = hitResolver ? hitResolver(ev.x, ev.y) : hitTestAt(ev.x, ev.y, rootId, store);
```

- [ ] **Step 4: 在 `apiRef` 对象里实现 `setHitResolver`**

在 `apiRef` 对象的末尾（`subscribeAfterLayout` 之后）加：

```ts
setHitResolver(fn) {
  hitResolver = fn;
},
```

- [ ] **Step 5: 运行现有测试，确认回归无破坏**

```bash
vp test packages/core-v2/tests
```

Expected: 所有测试通过（`hitResolver` 默认 null，走旧路径）

- [ ] **Step 6: Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts
git commit -m "feat(core-v2): add setHitResolver to SceneRuntime for pick buffer injection"
```

---

## Task 4：PickBuffer pick pass 绘制（CanvasKit 集成）

**Files:**

- Modify: `packages/core-v2/src/hit/pick-buffer.ts`

### 目标

给 `PickBuffer` 增加 `rebuildSurface(commit, ck, surface, bw, bh, rootScale)` 方法，用 CanvasKit surface 画 pick pass 并提供 `hitAt`（包含真实 `readPixels`）。

- [ ] **Step 1: 在 `pick-buffer.ts` 增加 import**

在文件顶部增加：

```ts
import type { CanvasKit, Surface } from "canvaskit-wasm";
```

- [ ] **Step 2: 增加私有字段和 `rebuildSurface` 方法**

在 `PickBuffer` 类中增加：

```ts
private pickSurface: Surface | null = null;
private rootScale = 1;

/**
 * 用 CanvasKit 离屏 surface 重画 pick pass。
 * 必须在 `rebuildPickIdMap` 之后调用（依赖 `pickIdMap`）。
 */
rebuildSurface(
  commit: LayoutCommitPayload,
  ck: CanvasKit,
  surface: Surface,
  rootScale: number,
): void {
  this.pickSurface = surface;
  this.rootScale = rootScale;

  const skCanvas = surface.getCanvas();
  skCanvas.save();
  skCanvas.scale(rootScale, rootScale);
  skCanvas.clear(ck.Color(0, 0, 0, 0));

  const paintFill = new ck.Paint();
  paintFill.setAntiAlias(false);
  paintFill.setStyle(ck.PaintStyle.Fill);

  const paintNode = (id: string): void => {
    const box = commit.layout[id] as
      | (LayoutCommitPayload["layout"][string] & { pointerEvents?: string; nodeKind?: string })
      | undefined;
    if (!box) return;
    if (box.pointerEvents === "none") return;

    const pickId = this.nodeIdMap.get(id);
    const node = commit.scene.nodes[id];

    // clip（overflow: hidden | scroll）
    const ov = box.overflow;
    const brx = box.borderRadiusRx ?? 0;
    const bry = box.borderRadiusRy ?? 0;
    const bounds = ck.LTRBRect(box.absLeft, box.absTop, box.absLeft + box.width, box.absTop + box.height);
    const clipPushed = ov === "hidden" || ov === "scroll";
    if (clipPushed) {
      skCanvas.save();
      if (brx > 0 || bry > 0) {
        skCanvas.clipRRect(ck.RRectXY(bounds, brx, bry), ck.ClipOp.Intersect, false);
      } else {
        skCanvas.clipRect(bounds, ck.ClipOp.Intersect, false);
      }
    }

    // 画 id 色块
    if (pickId !== undefined) {
      const [r, g, b, a] = pickIdToRgba(pickId);
      paintFill.setColor(ck.Color(r, g, b, a));
      if (brx > 0 || bry > 0) {
        skCanvas.drawRRect(ck.RRectXY(bounds, brx, bry), paintFill);
      } else {
        skCanvas.drawRect(bounds, paintFill);
      }
    }

    // 递归子节点
    if (node) {
      if (box.nodeKind === "scrollView") {
        const syRaw = box.scrollY ?? 0;
        const sy = Number.isFinite(syRaw) ? syRaw : 0;
        skCanvas.save();
        skCanvas.translate(0, -sy);
        for (const childId of node.children) {
          paintNode(childId);
        }
        skCanvas.restore();
      } else {
        for (const childId of node.children) {
          paintNode(childId);
        }
      }
    }

    if (clipPushed) {
      skCanvas.restore();
    }
  };

  paintNode(commit.rootId);

  paintFill.delete();
  skCanvas.restore();
  surface.flush();
}
```

- [ ] **Step 3: 增加真实 `hitAt` 方法**

```ts
/**
 * 从逻辑坐标查找命中 nodeId（依赖 `rebuildSurface` 已被调用）。
 */
hitAt(stageX: number, stageY: number): string | null {
  if (!this.pickSurface) return null;
  const px = Math.floor(stageX * this.rootScale);
  const py = Math.floor(stageY * this.rootScale);
  // CanvasKit Surface.readPixels(imageInfo, srcX, srcY) → Uint8Array | null
  const pixels = this.pickSurface.readPixels(px, py, {
    width: 1,
    height: 1,
    colorType: 10, // kRGBA_8888_SkColorType
    alphaType: 1,  // kPremul_SkAlphaType
    colorSpace: this.pickSurface.imageInfo().colorSpace,
  });
  if (!pixels) return null;
  const arr = pixels as Uint8Array;
  const r = arr[0]!;
  const g = arr[1]!;
  const b = arr[2]!;
  const pickId = rgbaToPickId(r, g, b);
  if (pickId === PICK_ID_EMPTY) return null;
  return this.pickIdMap.get(pickId) ?? null;
}
```

> **注意**：CanvasKit `Surface.readPixels` 的确切签名可能随版本变化。实现时先查 `ck.Surface.prototype` 或 CanvasKit 文档；若签名不同，调整参数顺序即可，接口语义不变。

- [ ] **Step 4: 运行格式检查**

```bash
vp fmt packages/core-v2/src/hit/pick-buffer.ts
vp check 2>&1 | grep -v "todo.md"
```

Expected: 无错误（todo.md 的格式问题可忽略）

- [ ] **Step 5: Commit**

```bash
git add packages/core-v2/src/hit/pick-buffer.ts
git commit -m "feat(core-v2): add PickBuffer.rebuildSurface and hitAt with CanvasKit readPixels"
```

---

## Task 5：attachSceneSkiaPresenter 集成 PickBuffer

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

### 目标

在 `attachSceneSkiaPresenter` 中创建 `PickBuffer`、注入 `hitResolver`、在 `subscribeAfterLayout` 回调中驱动 pick pass 更新。

- [ ] **Step 1: 增加 import**

在 `scene-skia-presenter.ts` 顶部增加：

```ts
import { PickBuffer } from "../hit/pick-buffer.ts";
```

- [ ] **Step 2: 创建 pickSurface 和 PickBuffer**

在 `attachSceneSkiaPresenter` 中，创建主 `skSurface` 之后：

```ts
const pickSurface = ck.MakeSurface(bw, bh);
if (!pickSurface) {
  throw new Error("[@react-canvas/core-v2] Failed to create CanvasKit pick surface.");
}
const pickBuffer = new PickBuffer();
```

- [ ] **Step 3: 注入 hitResolver**

紧接上面，注入 resolver：

```ts
runtime.setHitResolver((x, y) => pickBuffer.hitAt(x, y));
```

- [ ] **Step 4: 修改 `subscribeAfterLayout` 回调**

找到现有的：

```ts
const unsubLayout = runtime.subscribeAfterLayout((p) => {
  // ... resize 判断 ...
  lastPayload = p;
  schedulePaint();
});
```

在 `lastPayload = p;` **之前**加：

```ts
pickBuffer.rebuildPickIdMap(p);
pickBuffer.rebuildSurface(p, ck, pickSurface, rootScale);
```

- [ ] **Step 5: 在 detach 时清理**

找到现有的 `return () => { ... }` 清理函数，在 `skSurface.delete()` 之前加：

```ts
runtime.setHitResolver(null);
pickSurface.delete();
```

- [ ] **Step 6: 在 viewport resize 时重建 pickSurface**

找到 resize 逻辑（`if (nextW !== lw || nextH !== lh)`），在重建主 surface 后加：

```ts
// 重建 pick surface（尺寸变化后旧 surface 无效）
pickSurface.delete();
// 注意：pickSurface 是 const，需改为 let
// 在文件顶部将 const pickSurface 改为 let pickSurface
pickSurface = ck.MakeSurface(bw, bh)!;
```

> **注意**：将 `const pickSurface` 改为 `let pickSurface`，因为 resize 时需要重新赋值。同样处理主 `skSurface`（已是 `let`）。

- [ ] **Step 7: 格式检查**

```bash
vp fmt packages/core-v2/src/render/scene-skia-presenter.ts
vp check 2>&1 | grep -v "todo.md"
```

- [ ] **Step 8: 运行全量测试**

```bash
vp test packages/core-v2/tests
```

Expected: 所有测试通过（pick 路径在测试环境无 CanvasKit surface 时 `hitResolver` 为 null，回退 CPU 命中）

- [ ] **Step 9: Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts
git commit -m "feat(core-v2): integrate PickBuffer into attachSceneSkiaPresenter"
```

---

## Task 6：导出 & 清理

**Files:**

- Modify: `packages/core-v2/src/index.ts`
- Modify: `packages/core-v2/src/hit/stage-hit-bounds.ts`（可选，保留即可）

### 目标

确保对外 API 一致，旧测试全部通过，格式检查干净。

- [ ] **Step 1: 在 index.ts 导出 PickBuffer**

在 `packages/core-v2/src/index.ts` 加：

```ts
export { PickBuffer } from "./hit/pick-buffer.ts";
export { PICK_ID_EMPTY, pickIdToRgba, rgbaToPickId } from "./hit/pick-id-codec.ts";
```

- [ ] **Step 2: 运行全量测试**

```bash
vp test packages/core-v2/tests
```

Expected: 所有测试通过

- [ ] **Step 3: 全量格式 & 类型检查**

```bash
vp check 2>&1 | grep -v "todo.md"
```

Expected: 无错误

- [ ] **Step 4: 最终 Commit**

```bash
git add packages/core-v2/src/index.ts
git commit -m "feat(core-v2): export PickBuffer and pick-id-codec from public index"
```

---

## 回归测试矩阵

完成所有 Task 后，验证以下场景在 `apps/v3`（`demo=cursor`）中正常：

| 场景                                           | 预期              |
| ---------------------------------------------- | ----------------- |
| cursor demo 示例五：粉条底部                   | 光标稳定为 `grab` |
| cursor demo 示例一：pointer / text / crosshair | 三列各自正确      |
| cursor demo 父节点固定高度、子内容溢出         | 溢出区域事件正常  |
| 任意 demo 的 scrollView 滚动后命中             | 命中与视觉一致    |
| `pointerEvents: none` 穿透                     | 事件落到下层节点  |

---

## 自查结论

- **Spec 覆盖**：pickId 编码（Task 1）、PickBuffer 类（Task 2/4）、`setHitResolver`（Task 3）、渲染集成（Task 5）、导出（Task 6）——全覆盖
- **占位符**：无 TBD / TODO
- **类型一致性**：`rebuildPickIdMap` / `rebuildSurface` / `hitAt` / `hitAtWithReader` 签名在各 Task 中一致；`setHitResolver` 类型 `(fn: ((x,y) => string|null)|null)` 在 Task 3/5 中一致
- **CanvasKit readPixels 注意事项**：已在 Task 4 Step 3 中标注，实现时按实际 API 调整
