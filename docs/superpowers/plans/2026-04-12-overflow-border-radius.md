# Overflow 裁剪与圆角（Skia）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans，按任务勾选 `- [ ]` 逐步实施。

**Goal:** 按 `docs/superpowers/specs/2026-04-12-overflow-border-radius-design.md` 在 **Skia 呈现层** 实现 `overflow: hidden|scroll` 的子树裁剪、**圆角背景** 与 **`borderRadius`（px 数字 + `%`）**；**不修改** `hit-test`；非法半径统一按 **`rx=ry=0`**。

**Architecture:** 在 **`buildLayoutSnapshotWithoutRun`**（`scene-runtime.ts`）从 `viewStyle` 写入 **`overflow`** 与解析后的 **`borderRadiusRx` / `borderRadiusRy`**（纯函数在独立模块中实现解析 + CSS 圆角收缩）；**`attachSceneSkiaPresenter`** 用 `clipRRect` / `drawRRect`，并调整 **`save` / `clip` / `saveLayer` / `restore`** 顺序与规格 §5.4 一致。

**Tech Stack:** TypeScript、Vite+（`vp test` / `vp check`）、`canvaskit-wasm`、`packages/core-v2`、`apps/v2`。

**规格对照：** §3 `ViewStyle` → Task 1；§4 快照 → Task 2；§6 解析 → Task 3；§5 Skia → Task 4；§7 测试/演示 → Task 5–6。

---

## 文件结构（将创建 / 修改）

| 路径                                                                 | 职责                                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/layout/border-radius-resolve.ts`（新建）       | 从 `borderRadius`（`number` \| `` `${number}%` ``）+ `width`/`height` 计算 **clamp 后** `rx`/`ry`；非法输入 → `0` |
| `packages/core-v2/tests/border-radius-resolve.test.ts`（新建）       | 覆盖数字、`%`、零宽高、过大半径、非法串                                                                           |
| `packages/core-v2/src/layout/style-map.ts`                           | `ViewStyle` 增加 `borderRadius` 类型（不传 Yoga）                                                                 |
| `packages/core-v2/src/runtime/scene-runtime.ts`                      | `LayoutSnapshot` 类型 + `buildLayoutSnapshotWithoutRun` 写入 `overflow`、`borderRadiusRx`、`borderRadiusRy`       |
| `packages/core-v2/src/render/scene-skia-presenter.ts`                | `clipRRect`、`drawRRect`、与 `opacity` 的 layer 顺序                                                              |
| `packages/core-v2/README.md`（可选）                                 | 绘制与裁剪一句说明                                                                                                |
| `apps/v2/src/core-smoke.tsx` / `apps/v2/src/react-smoke.tsx`（按需） | 肉眼用例：`overflow: "hidden"` + `borderRadius: "20%"` 或等价                                                     |

**CanvasKit API 提示：** 以本仓库锁定的 `canvaskit-wasm` 类型为准；常见为 **`RRectXYWH`** 或 **`LTRBRect` + `RRect`** 工厂。若类型名不同，在 Task 4 第一步先 `grep node_modules/canvaskit-wasm` 锁定正确工厂再写绘制代码。

---

### Task 1：`ViewStyle.borderRadius` 类型

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：在 `ViewStyle` 上增加字段（不传 Yoga）**

在 `opacity` 或 `overflow` 附近增加（与规格 §3 一致）：

```ts
/**
 * 圆角半径：px 数字，或相对本节点布局盒的百分比（如 `"50%"`）。
 * 不传 Yoga；仅快照 + Skia 使用。
 */
borderRadius?: number | `${number}%`;
```

- [ ] **Step 2：确认 `applyStylesToYoga` 不读取 `borderRadius`**（无映射即可，勿调用 `node.set*`）。

- [ ] **Step 3：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: 通过。

- [ ] **Step 4：Commit**（例如 `feat(core-v2): add ViewStyle.borderRadius type`）

---

### Task 2：`LayoutSnapshot` 透传 `overflow` 与解析半径

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`

- [ ] **Step 1：扩展 `LayoutSnapshot` 条目类型**

在现有字段上增加（命名与规格 §4 对齐，可二选一保留原始 `borderRadius`，推荐 **仅 resolved** 以减小 payload）：

```ts
overflow?: "visible" | "hidden" | "scroll";
/** 已 clamp，供 Skia；未设置 borderRadius 时省略或显式 0 */
borderRadiusRx?: number;
borderRadiusRy?: number;
```

- [ ] **Step 2：在 `buildLayoutSnapshotWithoutRun` 循环内填充**

- 从 `n.viewStyle?.overflow` 写入 `overflow`（省略则绘制侧视为 `visible`）。
- 若存在 `n.viewStyle?.borderRadius`，调用 Task 3 的 `resolveBorderRadiusRxRy(n.viewStyle.borderRadius, l.width, l.height)`，写入 `borderRadiusRx` / `borderRadiusRy`；若样式未设置 `borderRadius`，两字段可省略（Presenter 当 `0`）。

- [ ] **Step 3：`vp check`**

- [ ] **Step 4：Commit**

---

### Task 3：纯函数 `resolveBorderRadiusRxRy` + 单测

**Files:**

- Create: `packages/core-v2/src/layout/border-radius-resolve.ts`
- Create: `packages/core-v2/tests/border-radius-resolve.test.ts`
- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`（import 解析函数）

- [ ] **Step 1：实现 `border-radius-resolve.ts`**

导出：

```ts
/**
 * 非法：非有限数、负数、无法解析的 % 串 → 按 0 处理。
 * 数字：各向同性，clamp 前 rx0=ry0=value。
 * 百分比：rx0 = (p/100)*width，ry0 = (p/100)*height（规格 §6.2）。
 * clamp：按 CSS Backgrounds 四角相同情形收缩，使 Skia 有效；至少保证 rx<=width/2、ry<=height/2，
 * 若需与浏览器完全一致，实现 W3C「相邻角半径之和」比例缩放（同一对 rx,ry 同时缩放）。
 */
export function resolveBorderRadiusRxRy(
  borderRadius: number | `${number}%`,
  width: number,
  height: number,
): { rx: number; ry: number };
```

实现要点：

- `width <= 0 || height <= 0` → `{ rx: 0, ry: 0 }`。
- `typeof borderRadius === "number"`：若 `!Number.isFinite(borderRadius) || borderRadius < 0` → `0`；否则 `rx0 = ry0 = borderRadius`。
- 字符串：`/^(\d+(?:\.\d+)?)%$/` 匹配则 `p = Number(...)`；否则 → `0`。
- **clamp**：实现规格 §6.3；推荐先写 **独立可测** 的 `clampUniformBorderRadius(width, height, rx: number, ry: number)`，再在 `resolveBorderRadiusRxRy` 末尾调用。最小可用实现：当 `rx*2 > width || ry*2 > height` 时按比例缩放 `rx, ry` 使 `2*rx <= width` 且 `2*ry <= height` 且保持椭圆比例（与常见 UA 行为一致）；若 `rx===0&&ry===0` 直接返回。

- [ ] **Step 2：单测 `border-radius-resolve.test.ts`**

使用 `vite-plus/test` 的 `test`/`expect`（与仓库其它 `packages/core-v2/tests` 一致），至少包含：

```ts
import { describe, expect, test } from "vite-plus/test";
import { resolveBorderRadiusRxRy } from "../src/layout/border-radius-resolve.ts";

describe("resolveBorderRadiusRxRy", () => {
  test("px: 10 on 100x40 yields rx=10 ry=10 then clamped by height", () => {
    const { rx, ry } = resolveBorderRadiusRxRy(10, 100, 40);
    expect(rx).toBeLessThanOrEqual(50);
    expect(ry).toBeLessThanOrEqual(20);
    expect(rx * 2).toBeLessThanOrEqual(100);
    expect(ry * 2).toBeLessThanOrEqual(40);
  });

  test("percent 50% on 80x60", () => {
    const { rx, ry } = resolveBorderRadiusRxRy("50%", 80, 60);
    expect(rx).toBeCloseTo(40, 5);
    expect(ry).toBeCloseTo(30, 5);
  });

  test("zero size", () => {
    expect(resolveBorderRadiusRxRy(8, 0, 10)).toEqual({ rx: 0, ry: 0 });
  });

  test("invalid string", () => {
    expect(resolveBorderRadiusRxRy("12" as `${number}%`, 10, 10).rx).toBe(0);
  });
});
```

根据你实现的 clamp 规则微调期望值（Step 1 与 Step 2 可迭代一次对齐）。

- [ ] **Step 3：`vp test packages/core-v2`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: 全绿。

- [ ] **Step 4：Commit**

---

### Task 4：`scene-skia-presenter` 裁剪、圆角背景、layer 顺序

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

- [ ] **Step 1：增加构造 `RRect` 的小辅助（文件内或同目录 `skia-rrect.ts`）**

从 `box.absLeft/absTop/width/height` 与 `rx, ry` 得到 `RRect`；`rx===0 && ry===0` 时用 **`clipRect` + `drawRect`** 保持行为与性能，否则 **`clipRRect` + `drawRRect`**。删除或替换原先仅 `drawRect` 的背景路径。

- [ ] **Step 2：调整 `paintSubtree`（或等价的子树入口）**

对每个节点：

1. `skCanvas.save()`。
2. 若 `overflow` 为 `hidden` 或 `scroll`：对当前节点布局盒应用 **`clipRRect`**（直角或圆角与背景一致，使用快照中的 `borderRadiusRx`/`Ry`，缺省 `0`）。
3. 若 `opacity < 1`：**在 clip 之后** `saveLayer`，bounds 取该节点 **布局盒的 LTRB**（与现逻辑一致，但与 clip 对齐）。
4. `try/finally` 中调用现有 `paintNodeContent`（背景、文本、子递归）。
5. `opacity` 分支 `restore` + `delete` layer paint 与现有一致。
6. 最外层 `skCanvas.restore()`。

在文件内用 **中文注释** 写死「先 clip 再 saveLayer」的约定，替换原「若日后增加 clipRect」占位段。

- [ ] **Step 3：背景描边**

规格允许实现选择：圆角填充 + **是否保留** 调试用深色描边。若 `drawRRect` 描边路径复杂，可 **仅圆角填充** 或 **`drawRRect` 描边一次**；与产品一致即可，在 commit 消息中写一句。

- [ ] **Step 4：`vp test packages/core-v2` 与 `vp check`**

- [ ] **Step 5：Commit**

---

### Task 5：快照 / 集成向单测（可选但推荐）

**Files:**

- Create或Modify: `packages/core-v2/tests/...`（若已有 layout 快照测试则追加用例）

- [ ] **Step 1：在 `layout-sync.test.ts` 或新建测试中，挂载带 `overflow: "hidden"` + `borderRadius: "25%"` 的节点后 `getLayoutSnapshot()`，断言对应 id 上存在 `overflow` 与有限 `borderRadiusRx`/`Ry`。**

（若当前测试 harness 无 `getLayoutSnapshot` 暴露，可仅依赖 Task 3 + 手动 v2；此 Task 可标为可选。）

- [ ] **Step 2：`vp test packages/core-v2`**

- [ ] **Step 3：Commit**（可选任务可 squash 进 Task 4）

---

### Task 6：`apps/v2` 演示

**Files:**

- Modify: `apps/v2/src/core-smoke.tsx` 和/或 `apps/v2/src/react-smoke.tsx`

- [ ] **Step 1：在现有 style demo 或独立小块中，增加父容器 `overflow: "hidden"`、`borderRadius: "15%"`（或 `"20%"`）、固定宽高，子元素明显超出父盒，确认圆角外无子像素。**

- [ ] **Step 2：本地 `pnpm v2` 或 `vp dev` 打开 apps/v2 目测**（计划执行者操作）。

- [ ] **Step 3：`vp check`**

- [ ] **Step 4：Commit**

---

## 规格自检（计划作者已核对）

| 规格章节                | 对应任务                 |
| ----------------------- | ------------------------ |
| §1 裁剪 + 圆角 + 数据流 | Task 2、4                |
| §2 命中不改             | 全计划无 `hit-test` 修改 |
| §3 `borderRadius` API   | Task 1                   |
| §4 快照                 | Task 2                   |
| §5 Skia 顺序            | Task 4                   |
| §6 解析与 clamp         | Task 3                   |
| §7 测试与 v2            | Task 3、6（Task 5 可选） |

无 TBD 占位；类型名 `borderRadiusRx`/`Ry` 与 Task 2–4 保持一致。

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-04-12-overflow-border-radius.md`。可选执行方式：

1. **Subagent-Driven（推荐）** — 每任务派生子代理，任务间 review，迭代快。
2. **Inline Execution** — 本会话按勾选逐步改代码，配合 checkpoints。

你更倾向哪一种？若直接说「开始实现」，默认按 **Inline** 从 Task 1 做起。
