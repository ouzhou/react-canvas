# ViewStyle `opacity`（组透明）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans，按任务勾选 `- [ ]` 逐步实施。

**Goal:** 按 `docs/superpowers/specs/2026-04-12-viewstyle-opacity-design.md` 实现 **`ViewStyle.opacity`**：快照透传 + Skia **`saveLayer` + `Paint.setAlphaf`** 嵌套，语义对齐 CSS 组透明（**B**）。

**Architecture:** 在 `style-map.ts` 增加字段与 **`clampOpacityForSnapshot`**（单一真源规范化）；`scene-runtime.ts` 的 `LayoutSnapshot` 增加可选 **`opacity`**，在 `buildLayoutSnapshotWithoutRun` 写入（`1` 可省略）；`scene-skia-presenter.ts` 的 `paintSubtree` 在 **`opacity < 1`** 时用 **`skCanvas.saveLayer(layerPaint, bounds, null)`** 包裹「本节点绘制 + 子递归」，**`restore`** 收尾并 **`layerPaint.delete()`**；**不**改 Yoga / `hit-test.ts`。

**Tech Stack:** TypeScript、`canvaskit-wasm@0.41.0`（`Canvas.saveLayer`、`Paint.setAlphaf`）、`packages/core-v2`、Vite+（`vp test` / `vp check`）。

**规格对照：** §2 API ↔ Task 1；§3 快照 ↔ Task 2；§4 Skia ↔ Task 3；§5 测试 ↔ Task 2–4；§6 包边界 ↔ Task 1–2。

---

## 文件结构

| 路径                                                           | 职责                                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/layout/style-map.ts`                     | `ViewStyle.opacity`；导出 **`clampOpacityForSnapshot`**（或等价命名）：`unknown` → `undefined`（省略）或 `[0,1]` |
| `packages/core-v2/src/runtime/scene-runtime.ts`                | `LayoutSnapshot` 类型 + `buildLayoutSnapshotWithoutRun` 写入 `opacity`                                           |
| `packages/core-v2/src/render/scene-skia-presenter.ts`          | `paintSubtree` 嵌套 `saveLayer`                                                                                  |
| `packages/core-v2/tests/scene-runtime-opacity.test.ts`（新建） | 快照含 `opacity`                                                                                                 |
| `apps/v2/src/core-smoke.tsx` / `react-smoke.tsx`（可选）       | style demo 嵌套半透明块                                                                                          |

CanvasKit API（已在本仓库 `node_modules/.../types/index.d.ts` 核对）：

```ts
saveLayer(paint?: Paint, bounds?: InputRect | null, backdrop?: ImageFilter | null,
          flags?: SaveLayerFlag, backdropFilterTileMode?: TileMode): number;
// Paint:
setAlphaf(alpha: number): void;
```

---

### Task 1：`ViewStyle` + 规范化函数

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`
- Modify: `packages/core-v2/src/index.ts`（若导出 clamp 函数供测试或其它包复用则加一行；可不导出仅测 runtime）

- [ ] **Step 1：在 `ViewStyle` 增加 `opacity` 文档注释**

在 `backgroundColor` 附近增加：

```ts
  /**
   * 不透明度 `0`–`1`（与 RN/CSS 一致）。不传 Yoga；由布局快照带给 Skia 做组透明。
   * 缺省视为 `1`。非法值在写入快照时按 {@link clampOpacityForSnapshot} 处理。
   */
  opacity?: number;
```

- [ ] **Step 2：实现并导出 `clampOpacityForSnapshot(value: unknown): number | undefined`**

语义（与 spec §2 一致）：

- `undefined` / `null` → `undefined`（快照**省略**字段，读取方当 `1`）。
- `typeof value === "number"` 且 `Number.isFinite(value)`：若 `value >= 1` 返回 `undefined`（省略）；若 `value <= 0` 返回 `0`；否则返回 **clamp 到 `(0,1)`**（边界：`0 < v < 1` 原样保留）。
- 其余（`NaN`、非 number）→ `undefined`。

```ts
export function clampOpacityForSnapshot(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value >= 1) return undefined;
  if (value <= 0) return 0;
  return value;
}
```

- [ ] **Step 3：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

- [ ] **Step 4：Commit**

```bash
git add packages/core-v2/src/layout/style-map.ts packages/core-v2/src/index.ts
git commit -m "feat(core-v2): ViewStyle.opacity and clampOpacityForSnapshot"
```

---

### Task 2：`LayoutSnapshot` + 构建逻辑 + 单测

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`
- Create: `packages/core-v2/tests/scene-runtime-opacity.test.ts`

- [ ] **Step 1：扩展 `LayoutSnapshot` 条目类型**

在 `backgroundColor` 同级增加：

```ts
opacity?: number;
```

- [ ] **Step 2：在 `buildLayoutSnapshotWithoutRun` 写入 `opacity`**

在设置 `backgroundColor` 的同一循环内：

```ts
import { clampOpacityForSnapshot } from "../layout/style-map.ts";

const o = clampOpacityForSnapshot(n.viewStyle?.opacity);
if (o !== undefined) entry.opacity = o;
```

- [ ] **Step 3：新建 `scene-runtime-opacity.test.ts`**

```ts
import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("layout snapshot includes clamped opacity", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "semi", { width: 40, height: 40, opacity: 0.5 });
  const snap = rt.getLayoutSnapshot();
  expect(snap.semi?.opacity).toBe(0.5);
});

test("opacity >= 1 is omitted from snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "opaque", { width: 40, height: 40, opacity: 1 });
  const snap = rt.getLayoutSnapshot();
  expect(snap.opaque?.opacity).toBeUndefined();
});
```

- [ ] **Step 4：`vp test packages/core-v2`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: PASS

- [ ] **Step 5：Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/tests/scene-runtime-opacity.test.ts
git commit -m "feat(core-v2): expose opacity on LayoutSnapshot"
```

---

### Task 3：`scene-skia-presenter` 组透明

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

- [ ] **Step 1：在 `paint()` 内抽取读取 opacity 的局部函数**

```ts
function readOpacity(box: LayoutSnapshot[string] | undefined): number {
  const o = box?.opacity;
  if (typeof o === "number" && Number.isFinite(o) && o < 1 && o > 0) return o;
  if (typeof o === "number" && Number.isFinite(o) && o <= 0) return 0;
  return 1;
}
```

（或复用 `clampOpacityForSnapshot`：若 `undefined` 则 `1`。）

- [ ] **Step 2：重构 `paintSubtree` 使「画自身 + 子」可被包进 layer**

在 `function paint(): void` 内，将现有「画背景」「画 text」「for children」包进内层函数 `paintNodeContent(id: string): void`，**不改变绘制顺序**。

伪代码：

```ts
function paintSubtree(id: string): void {
  const box = commit.layout[id];
  const a = readOpacity(box);
  const bounds =
    box && ck.LTRBRect(box.absLeft, box.absTop, box.absLeft + box.width, box.absTop + box.height);
  let layerPaint: EmbindObject<"Paint"> | null = null;
  if (a < 1 && bounds) {
    layerPaint = new ck.Paint();
    layerPaint.setAlphaf(a);
    skCanvas.saveLayer(layerPaint, bounds, null);
  }
  try {
    paintNodeContent(id);
  } finally {
    if (layerPaint) {
      skCanvas.restore();
      layerPaint.delete();
    }
  }
}
```

注意：**根节点** `commit.rootId` 若 `opacity` 缺省，`a === 1`，不调用 `saveLayer`，与今一致。

- [ ] **Step 3：本地跑 `apps/v2` 的 `demo=style`（可选）或最小 HTML**

肉眼：父 `opacity:0.5` 包两色子块，子再 `0.5` 应呈嵌套淡化（与浏览器对比）。

- [ ] **Step 4：`vp check` && `vp test`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check && vp test`  
Expected: PASS

- [ ] **Step 5：Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts
git commit -m "feat(core-v2): Skia saveLayer for ViewStyle opacity group"
```

---

### Task 4（可选）：v2 smoke 嵌套半透明

**Files:**

- Modify: `apps/v2/src/core-smoke.tsx` 与/或 `apps/v2/src/react-smoke.tsx` 中 `StyleDemoScene` 的某一 tab（例如 `aspect-overflow` 旁加一条，或新建 `opacity-nested`）

- [ ] **Step 1：加一块父 `opacity:0.6`、子各 `0.8` 与纯色背景**，便于回归。

- [ ] **Step 2：`vp check` && `vp test`**

- [ ] **Step 3：Commit**（若未做本 Task，可跳过）

---

## Plan self-review

| Spec §            | 任务                 |
| ----------------- | -------------------- |
| §2 API / clamp    | Task 1               |
| §3 快照           | Task 2               |
| §4 saveLayer 嵌套 | Task 3               |
| §5 测试           | Task 2 + Task 3 手动 |
| §6 可选 v2        | Task 4               |

**Placeholder 扫描：** 无 TBD。

**与后续 clip 顺序：** Task 3 实现时若已存在 `clipRect`，须在代码注释写：**opacity 的 `saveLayer` 与 clip 的先后**；当前无 clip，无冲突。

---

## 执行方式

计划路径：`docs/superpowers/plans/2026-04-12-viewstyle-opacity.md`。

1. **Subagent-Driven（推荐）** — 每 Task 独立子代理 + 任务间 review。
2. **Inline Execution** — 本会话按 Task 1→3 连续改并跑 `vp test`。

你更倾向哪一种？
