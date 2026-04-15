# Minimal Post-Process (SkSL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `attachSceneSkiaPresenter` 中实现 spec [2026-04-15-minimal-postprocess-sksl-design.md](../specs/2026-04-15-minimal-postprocess-sksl-design.md)：WebGL 下先完整渲染到独立 **scene 颜色** 离屏 Surface，再 **RuntimeEffect (SkSL)** 全屏采样到主 canvas；SW 回退时关闭后处理；SkSL 仅 attach 时编译；**绝不**复用 `pickSurface`。

**Architecture:** 将现有 `paint()` 内「绘制整棵树」逻辑抽成 **`paintSceneOntoCanvas(targetCanvas, …)`**，主路径与离屏路径共用。启用后处理且 `skSurface.reportBackendTypeIsGPU()` 为真时：在 **`sceneColorSurface`**（与主面同像素的兼容离屏，优先 `skSurface.makeSurface(imageInfo)`，失败再 `ck.MakeSurface(bw,bh)`）上调用同一 `paintSceneOntoCanvas` → `makeImageSnapshot()` → `Image.makeShaderOptions` 作为 **child** → `ck.RuntimeEffect.Make(sksl)` 的 `makeShaderWithChildren(uniforms, [sceneShader])` → 主 canvas 画全屏矩形 → `flush`。`uniforms` 用 `Float32Array`，长度 `effect.getUniformFloatCount()`，按 `getUniform(i)` 元数据顺序打包（见 Task 4）。

**Tech Stack:** TypeScript，`canvaskit-wasm@0.41.0`（`CanvasKit.RuntimeEffect.Make`、`RuntimeEffect.makeShaderWithChildren`、`Surface.makeImageSnapshot`、`Image.makeShaderOptions`），`vp test` / `vp check`。

**CanvasKit 参考（已核对 typings）：**

- `CanvasKit.RuntimeEffect.Make(sksl: string, callback?: (err: string) => void): RuntimeEffect | null`
- `RuntimeEffect.makeShaderWithChildren(uniforms, children?: Shader[], localMatrix?)`
- `Surface.makeImageSnapshot(bounds?)` → `Image`
- `Image.makeShaderOptions(tx, ty, fm, mm, localMatrix?)` → `Shader`（child 输入）

**SkSL 合同（实现时写入 README 片段）：** 用户 SkSL 必须声明 **恰好一个** `shader` 型子节点（例如 `shader colorChild;`），`main` 签名遵循 CanvasKit 文档中的 **color filter / shader** 范例（实现第一步从官方 SkSL 样例复制能通过 `RuntimeEffect.Make` 的最小 shader，再写进测试固定字符串）。

---

## 文件映射

| 文件                                                           | 职责                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/render/scene-skia-presenter.ts`          | 抽 `paintSceneOntoCanvas`；`sceneColorSurface` 生命周期；后处理分支；`flush`                                                |
| `packages/core-v2/src/render/post-process-uniforms.ts`（新建） | 将 `Record<string, number>` 或 `Float32Array` 转为与 `RuntimeEffect` 一致的 `Float32Array`（按 uniform 名反射顺序）；可单测 |
| `packages/core-v2/src/index.ts`                                | 导出新类型 `PostProcessOptions`、`PostProcessDisabledReason` 等                                                             |
| `packages/core-v2/tests/post-process-*.test.ts`（新建）        | mock CanvasKit，断言分支与 uniform 打包                                                                                     |
| `packages/react-v2/src/scene-skia-canvas.tsx`                  | 透传 `postProcess` / `onPostProcessDisabled` 至 `attachSceneSkiaPresenter`                                                  |
| `packages/core-v2/README.md`                                   | 一小节：如何写 SkSL、uniform 命名、SW 行为                                                                                  |

---

### Task 1: 类型与 `AttachSceneSkiaOptions` 扩展

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`（类型定义区）
- Modify: `packages/core-v2/src/index.ts`（re-export）

- [x] **Step 1: 添加类型（仍不接线逻辑）**

在 `scene-skia-presenter.ts` 中增加并导出：

```ts
export type PostProcessDisabledReason = "software-surface" | "compile-failed";

export type PostProcessUniformContext = {
  /** backing store 像素宽 */
  width: number;
  /** backing store 像素高 */
  height: number;
  /** 与 presenter 使用的 dpr 一致 */
  dpr: number;
};

/**
 * 每帧可调数值；键为 SkSL 中 `uniform` 声明名（实现按名填入 Float32Array）。
 * 若某 uniform 本帧未提供，填 0（并在文档中说明）。
 */
export type PostProcessUniforms = Record<string, number | Float32Array>;

export type PostProcessOptions = {
  /** SkSL 源码；须含一个 shader 子节点供场景采样 */
  sksl: string;
  getUniforms: (ctx: PostProcessUniformContext) => PostProcessUniforms;
};

export type AttachSceneSkiaOptions = {
  // ... existing ...
  postProcess?: PostProcessOptions;
  /** 首次判定不可用或编译失败时调用，每种 reason 至多一次（实现用 Set 去重） */
  onPostProcessDisabled?: (reason: PostProcessDisabledReason) => void;
};
```

- [x] **Step 2: `vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

- [x] **Step 3: `index.ts` re-export 新类型**

- [x] **Step 4: Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts packages/core-v2/src/index.ts
git commit -m "feat(core-v2): add post-process SkSL options types"
```

---

### Task 2: `packPostProcessUniforms` 纯函数 + 单测

**Files:**

- Create: `packages/core-v2/src/render/post-process-uniforms.ts`
- Create: `packages/core-v2/tests/post-process-uniforms.test.ts`

- [ ] **Step 1: 写失败单测（mock RuntimeEffect）**

```ts
import { test, expect, vi } from "vite-plus/test";
import { packPostProcessUniforms } from "../src/render/post-process-uniforms.ts";

test("packs floats in getUniform order", () => {
  const mockEffect = {
    getUniformCount: () => 2,
    getUniformFloatCount: () => 4,
    getUniformName: (i: number) => (i === 0 ? "uA" : "uB"),
    getUniform: (i: number) =>
      i === 0
        ? { columns: 2, rows: 1, slot: 0 } // vec2 → 2 floats
        : { columns: 1, rows: 1, slot: 2 }, // float
  };
  const out = packPostProcessUniforms(mockEffect as any, { uA: [1, 2], uB: 3 });
  expect(out).toEqual(new Float32Array([1, 2, 3, 0]));
});
```

Adjust mock shapes to match real `SkSLUniform` from typings after reading `SkSLUniform` in `index.d.ts`.

Run: `vp test packages/core-v2/tests/post-process-uniforms.test.ts`  
Expected: FAIL（模块不存在）

- [ ] **Step 2: 实现 `packPostProcessUniforms`**

读取 `canvaskit-wasm` 中 `SkSLUniform` 定义，按 `slot` / 列宽展开 `vec2`/`float`；缺失键填 0。

- [ ] **Step 3: 测试通过**

Run: `vp test packages/core-v2/tests/post-process-uniforms.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core-v2/src/render/post-process-uniforms.ts packages/core-v2/tests/post-process-uniforms.test.ts
git commit -m "feat(core-v2): pack RuntimeEffect uniforms from named map"
```

---

### Task 3: 抽取 `paintSceneOntoCanvas`

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

- [ ] **Step 1: 无行为变化的重构**

将 `paint()` 内部从 `skCanvas.save()`、清背景、到 `paintSubtree(root)`、`skCanvas.restore()`、`paintFill.delete()` 等整段，改为调用：

```ts
function paintSceneOntoCanvas(skCanvas: Canvas): void {
  // 与当前 paint() 中相同的 save/scale/camera/clear/paintSubtree/restore/delete paints
}
```

`paint()` 在重构后仅：

```ts
function paint(): boolean {
  if (!lastPayload) return false;
  const skCanvas = skSurface.getCanvas();
  paintSceneOntoCanvas(skCanvas);
  skSurface.flush();
  return true;
}
```

确保 `PickBuffer` / `subscribeAfterLayout` 行为不变。

- [ ] **Step 2: 跑现有 core-v2 测试**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: 全部 PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts
git commit -m "refactor(core-v2): extract paintSceneOntoCanvas for Skia presenter"
```

---

### Task 4: `sceneColorSurface` + RuntimeEffect 管线

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`
- Modify: `packages/core-v2/src/render/post-process-uniforms.ts`（如需导出 packer）

- [ ] **Step 1: 状态变量**

在 `attachSceneSkiaPresenter` 内增加：

- `let sceneColorSurface: Surface | null = null`
- `let postProcessEffect: RuntimeEffect | null = null`
- `let postProcessActive = false`（编译成功且 GPU）
- `let disabledReasons = new Set<PostProcessDisabledReason>()`
- `function notifyDisabled(reason: PostProcessDisabledReason)` 调 `options?.onPostProcessDisabled` 一次

- [ ] **Step 2: `fitCanvas` / resize 时**

与 `canvas.width/height` 同步：若 `sceneColorSurface` 存在则 `delete()` 并重建；若 `postProcessActive` 且 GPU，用 `skSurface.makeSurface(ck.ImageInfo(...))` 或 `ck.MakeSurface(bw,bh)`；**从不**触碰 `pickSurface` 尺寸逻辑 except 二者同用 `bw,bh` 常量。

- [ ] **Step 3: attach 末尾**

若 `options.postProcess` 存在：

- 若 `!skSurface.reportBackendTypeIsGPU()`：`notifyDisabled('software-surface')`，不编译。
- 否则 `postProcessEffect = ck.RuntimeEffect.Make(options.postProcess.sksl, (err) => { ... })`；若 `null`，`notifyDisabled('compile-failed')`，`postProcessActive = false`。

- [ ] **Step 4: `paint()` 分支**

若 `postProcessActive && postProcessEffect && sceneColorSurface`：

1. `paintSceneOntoCanvas(sceneColorSurface.getCanvas())`
2. `sceneColorSurface.flush()`
3. `const snap = sceneColorSurface.makeImageSnapshot()`（无参全幅）
4. `const child = snap.makeShaderOptions(ck.TileMode.Clamp, ck.TileMode.Clamp, ck.FilterMode.Linear, ck.MipmapMode.None)`
5. `const uniforms = packPostProcessUniforms(postProcessEffect, options.postProcess.getUniforms({ width: bw, height: bh, dpr }))`
6. `const shader = postProcessEffect.makeShaderWithChildren(uniforms, [child])`
7. 主 `skSurface.getCanvas()`：`clear` → `drawRect` 全画布 `LTRBRect(0,0,bw,bh)` + `Paint` setShader
8. `snap.delete()`、`child.delete()`、`shader.delete()`（顺序按 Skia 生命周期安全处理；若文档要求 child 先于 shader，则遵守）

若 **未** 启用后处理：`paintSceneOntoCanvas(skSurface.getCanvas())` 然后 `flush()`（与 Task 3 一致）。

- [ ] **Step 5: teardown**

`return () => { ... sceneColorSurface?.delete(); postProcessEffect?.delete(); ... }`

- [ ] **Step 6: 固定最小 SkSL 字符串常量 + 浏览器手测**

在 `apps/v3` 或临时 demo 中传入 identity 级 SkSL（仅 `sample(colorChild, ...)`），确认无黑屏。

Run: `vp check && vp test packages/core-v2`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core-v2/src/render/scene-skia-presenter.ts packages/core-v2/src/render/post-process-uniforms.ts
git commit -m "feat(core-v2): SkSL post-process pass after scene render"
```

---

### Task 5: presenter 分支单测（mock）

**Files:**

- Create: `packages/core-v2/tests/scene-skia-post-process.test.ts`

- [ ] **Step 1: mock `attachSceneSkiaPresenter` 依赖**

复用项目中对 `initCanvasKit` 的 mock 模式（若有）；断言：当 `reportBackendTypeIsGPU` 返回 false 时 **不**调用 `RuntimeEffect.Make`。

- [ ] **Step 2: Commit**

```bash
git add packages/core-v2/tests/scene-skia-post-process.test.ts
git commit -m "test(core-v2): post-process disabled on software surface"
```

---

### Task 6: react-v2 透传

**Files:**

- Modify: `packages/react-v2/src/scene-skia-canvas.tsx`

- [ ] **Step 1: `SceneSkiaCanvasProps` 增加 `postProcess?`、`onPostProcessDisabled?`**

传入 `attachSceneSkiaPresenter(..., { ... })`。

- [ ] **Step 2: `packages/react-v2/src/index.ts` 若有 barrel 则导出类型**

- [ ] **Step 3: Commit**

```bash
git add packages/react-v2/src/scene-skia-canvas.tsx packages/react-v2/src/index.ts
git commit -m "feat(react-v2): pass post-process options to Skia presenter"
```

---

### Task 7: 文档

**Files:**

- Modify: `packages/core-v2/README.md`

- [ ] **Step 1: 增加「SkSL 后处理（实验）」小节**

说明：SW 关闭、GPU 双缓冲成本、示例 SkSL 骨架、`getUniforms` 与 uniform 名一致。

- [ ] **Step 2: Commit**

```bash
git add packages/core-v2/README.md
git commit -m "docs(core-v2): document SkSL post-process option"
```

---

## Spec 对照自检

| Spec 要求                      | 对应 Task                          |
| ------------------------------ | ---------------------------------- |
| 离屏场景颜色，与 pick 分离     | Task 4（独立 `sceneColorSurface`） |
| 先完整渲染再后处理             | Task 4 `paintSceneOntoCanvas` 顺序 |
| SW 关闭                        | Task 4 `reportBackendTypeIsGPU`    |
| SkSL 仅 attach                 | Task 4 `RuntimeEffect.Make` 一次   |
| compile-failed 永久关闭 + 回调 | Task 4 `notifyDisabled`            |
| getUniforms + 上下文宽高 dpr   | Task 1 + 4                         |
| 测试策略                       | Task 2、5                          |

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-04-15-minimal-postprocess-sksl.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，任务间 review，迭代快。

**2. Inline Execution** — 本会话内按 Task 顺序执行，配合 checkpoints。

Which approach?
