# ViewStyle 扩展（Yoga / CSS 命名）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans，按任务勾选 `- [ ]` 逐步实施。

**Goal:** 按 `docs/superpowers/specs/2026-04-12-viewstyle-yoga-css-design.md` 分 **阶段 A（盒模型 + min/max + right/bottom）** 与 **阶段 B（gap、flexWrap、alignContent、alignSelf、flexGrow/Shrink/Basis）** 扩展 `ViewStyle`，并在 `clearYogaLayoutStyle` / `applyStylesToYoga` 中与 `yoga-layout@3.2.1` 的 `Node` API 对齐。

**Architecture:** 仍在 `packages/core-v2/src/layout/style-map.ts` 集中维护类型与映射；**边长**统一为 `number`（px 语义）或 `` `${number}%` ``（与现有 `width`/`height` 一致）；`padding`/`margin` 的 shorthand 与单边字段按 spec §5 **按边解析**；`flex` 与分项按 spec §6：**仅当 `typeof style.flex === "number"` 时走 `setFlex`，否则应用 `flexGrow`/`flexShrink`/`flexBasis`**。`rebuildYogaStyle` 保持「先 `clearYogaLayoutStyle` 再 `applyStylesToYoga`」不变。

**Tech Stack:** TypeScript、`yoga-layout/load`（`Align`、`Edge`、`Gutter`、`Justify`、`Wrap` 等枚举）、Vite+（`vp test`、`vp check`）、`packages/core-v2`；`packages/react-v2` 仅消费导出的 `ViewStyle`，一般无需改代码。

**规格对照：** 阶段 A ↔ spec §4 阶段 A、§5、§3；阶段 B ↔ spec §4 阶段 B、§6；自检 ↔ spec §9。

---

## 文件结构（将创建 / 修改）

| 路径                                                             | 职责                                                                                                                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/layout/style-map.ts`                       | 扩展 `ViewStyle`；实现 `resolvePaddingEdge` / `resolveMarginEdge`（或内联）；扩展 `clearYogaLayoutStyle`、`applyStylesToYoga`；新增 `flexWrap`/`alignContent`/`alignSelf` 等到 Yoga 的映射表 |
| `packages/core-v2/tests/layout-sync.test.ts`                     | 阶段 A/B 布局回归用例（直接 `createNodeStore` + `applyStylesToYoga` + `calculateAndSyncLayout`）                                                                                             |
| `packages/core-v2/tests/dispatch.test.ts`、`hit-test.test.ts` 等 | 若类型变更导致编译失败则按需修正；逻辑不变则不动                                                                                                                                             |

---

### Task 1：阶段 A — 类型与边解析辅助

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：在文件顶部增加可复用的长度别名（供字段复用）**

```ts
/** 与现有 width/height 一致：px 或百分比字符串。 */
export type YogaLength = number | `${number}%`;
```

- [ ] **Step 2：扩展 `ViewStyle`（阶段 A 字段）**

在现有字段基础上增加（命名对齐 CSS）：

```ts
  margin?: YogaLength;
  marginTop?: YogaLength;
  marginRight?: YogaLength;
  marginBottom?: YogaLength;
  marginLeft?: YogaLength;
  paddingTop?: YogaLength;
  paddingRight?: YogaLength;
  paddingBottom?: YogaLength;
  paddingLeft?: YogaLength;
  minWidth?: YogaLength;
  maxWidth?: YogaLength;
  minHeight?: YogaLength;
  maxHeight?: YogaLength;
  right?: YogaLength;
  bottom?: YogaLength;
```

保留现有 `padding?: number`（解释为四边，与 `%` 组合规则：若某边需要 `%` 请用单边字段；shorthand `padding` 继续只支持 `number` 除非你在本任务外刻意扩展）。

- [ ] **Step 3：实现内部解析函数（不导出或按需导出）**

对 `top/right/bottom/left` 单边使用同一套逻辑，例如：

```ts
function resolveBoxEdge(
  edge: "Top" | "Right" | "Bottom" | "Left",
  shorthand: YogaLength | undefined,
  top: YogaLength | undefined,
  right: YogaLength | undefined,
  bottom: YogaLength | undefined,
  left: YogaLength | undefined,
): YogaLength | undefined {
  const specific =
    edge === "Top" ? top : edge === "Right" ? right : edge === "Bottom" ? bottom : left;
  return specific ?? shorthand;
}
```

`padding` 四边：`shorthand = style.padding`（仅 number 时转为四边相同数值；若希望与 `YogaLength` 统一可在后续小步重构）。`margin` 四边：`shorthand = style.margin`。

- [ ] **Step 4：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: 通过（仅类型时尚可能无调用点告警，可忽略至 Task 2）。

---

### Task 2：阶段 A — `clearYogaLayoutStyle` 补全重置

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：从 `yoga-layout/load` 增加本任务所需 import**

确保可用：`Edge`（已有）、`Node` 类型不变。

- [ ] **Step 2：在 `clearYogaLayoutStyle` 中于现有语句之外追加**

逻辑要求（与 spec §3、§9 一致）：

1. 四边 `margin` 置 `0`：`setMargin(Edge.Left, 0)`、`Edge.Top`、`Edge.Right`、`Edge.Bottom`（若 API 支持 `Edge.All` 且语义为四边，可用 `All`；以你本地 `wrapAssembly.d.ts` 为准）。
2. `minWidth` / `maxWidth` / `minHeight` / `maxHeight`：使用 `Node` 上接受的「解除约束」写法——类型签名为 `number | \`${number}%` | undefined` 时，传 **`undefined`** 清除（对四个 setter 各调用一次）。
3. `right` / `bottom`：`setPositionAuto(Edge.Right)`、`setPositionAuto(Edge.Bottom)`（与已有 `Left`/`Top` 对称）。

`padding` 仍可用 `setPadding(Edge.All, 0)` 一次清零四边（在扩展 `applyStylesToYoga` 后会再写入解析结果）。

- [ ] **Step 3：Commit（可选小步）**

```bash
git add packages/core-v2/src/layout/style-map.ts
git commit -m "feat(core-v2): reset yoga margin min-max position edges in clearYogaLayoutStyle"
```

---

### Task 3：阶段 A — `applyStylesToYoga` 映射

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：抽取「长度 → Yoga」小函数（与 `setWidthSmart` 并列）**

例如对 `minWidth`：

```ts
function setMinWidthSmart(node: YogaNode, v: YogaLength | undefined): void {
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMinWidthPercent(Number.parseFloat(v));
  } else if (typeof v === "number") {
    node.setMinWidth(v);
  }
}
```

对 `maxWidth`、`minHeight`、`maxHeight` 对称实现（分别调用 `setMaxWidth` / `setMinHeightPercent` 等，**方法名以 `wrapAssembly.d.ts` 为准**）。

对 `margin`/`padding` 单边：在 `number` 与 `` `${n}%` `` 分支分别调用 `setMargin` + `setMarginPercent` 或 `setPadding` + `setPaddingPercent`（与 `setWidthSmart` 模式一致）。**暂不实现** `margin: "auto"`（spec 未要求；Yoga 有 `setMarginAuto` 可留后续）。

- [ ] **Step 2：`padding` 四边应用**

对每个 `Edge`：

1. `const v = resolveBoxEdge(..., style.padding, style.paddingTop, ...)`
2. 若 `v !== undefined`，调用对应 `setPadding` / `setPaddingPercent`。

若仅存在旧的 `padding?: number` 且无单边字段，四边均应得到该数值。

- [ ] **Step 3：`margin` 四边应用**

与 Step 2 对称，使用 `setMargin` / `setMarginPercent`。

- [ ] **Step 4：`right` / `bottom`**

若 `style.right !== undefined`，按 point / percent 调用 `setPosition` 或 `setPositionPercent(Edge.Right, ...)`；`bottom` 同理 `Edge.Bottom`。

- [ ] **Step 5：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

---

### Task 4：阶段 A — 布局单测

**Files:**

- Modify: `packages/core-v2/tests/layout-sync.test.ts`

- [ ] **Step 1：新增「marginTop 推开下方兄弟」用例**

```ts
test("marginTop on first child increases second child top", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(a.yogaNode, { width: 100, height: 30, marginTop: 10 });
  applyStylesToYoga(b.yogaNode, { width: 100, height: 30 });
  store.appendChild(root.id, a.id);
  store.appendChild(root.id, b.id);
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(store.get(a.id)!.layout!.top).toBe(0);
  expect(store.get(b.id)!.layout!.top).toBe(40);
});
```

- [ ] **Step 2：新增「paddingTop 优先于 padding shorthand」用例**

```ts
test("paddingTop overrides padding for top edge only", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const box = store.createNode("box");
  const inner = store.createNode("inner");
  applyStylesToYoga(box.yogaNode, { width: 100, height: 100, padding: 4, paddingTop: 10 });
  applyStylesToYoga(inner.yogaNode, { width: 100, height: 100, flex: 1 });
  store.appendChild(root.id, box.id);
  store.appendChild(box.id, inner.id);
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(store.get(inner.id)!.layout!.top).toBe(10);
  expect(store.get(inner.id)!.layout!.left).toBe(4);
});
```

（若 `flex: 1` 在子高度上与 Yoga 默认列行为不一致，可改为给 `inner` 固定 `height: 50` 并断言 `top`/`left`；**以实际计算结果调整期望值**。）

- [ ] **Step 3：新增「minHeight 撑高」用例**

```ts
test("minHeight enlarges auto height", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 200);
  const box = store.createNode("box");
  applyStylesToYoga(box.yogaNode, { minHeight: 80 });
  store.appendChild(root.id, box.id);
  calculateAndSyncLayout(store, root.id, 100, 200);
  expect(store.get(box.id)!.layout!.height).toBeGreaterThanOrEqual(80);
});
```

- [ ] **Step 4：运行测试**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: 全部 PASS

- [ ] **Step 5：Commit**

```bash
git add packages/core-v2/src/layout/style-map.ts packages/core-v2/tests/layout-sync.test.ts
git commit -m "feat(core-v2): apply ViewStyle margin padding min-max right bottom (phase A)"
```

---

### Task 5：阶段 B — Flex 扩展类型与枚举映射

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：从 `yoga-layout/load` 增加 `Gutter`、`Wrap`（及 `Align` 若尚未覆盖 alignContent 子集）**

- [ ] **Step 2：扩展 `ViewStyle`**

```ts
  gap?: YogaLength;
  rowGap?: YogaLength;
  columnGap?: YogaLength;
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  alignContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | `${number}%` | "auto";
```

- [ ] **Step 3：`flexWrap` 映射表**

```ts
const flexWrapMap = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
} as const satisfies Record<NonNullable<ViewStyle["flexWrap"]>, Wrap>;
```

- [ ] **Step 4：`alignContent` 映射**

复用或扩展与 `alignItems` 类似的 `Align` 值（含 `SpaceBetween` / `SpaceAround` / `SpaceEvenly`）。使用 `as const satisfies Record<...>` 保证穷尽。

- [ ] **Step 5：`alignSelf` 映射**

含 `auto` → `Align.Auto`，其余与 `alignItems` 一致。

---

### Task 6：阶段 B — `clearYogaLayoutStyle` 与 `applyStylesToYoga`

**Files:**

- Modify: `packages/core-v2/src/layout/style-map.ts`

- [ ] **Step 1：`clearYogaLayoutStyle` 追加重置**

- `setFlexWrap(Wrap.NoWrap)`
- `setAlignContent(Align.FlexStart)`（若与 `applyRNLayoutDefaults` 重复，保持单一真源：**以 clear 最终状态为准**）
- `setAlignSelf(Align.Stretch)` 或 Yoga 默认对齐方式（以 `Align` 枚举中表示「未覆盖子项」的默认值为准；**优先与当前子节点创建后行为一致**）
- `setGap(Gutter.Column, undefined)`、`setGap(Gutter.Row, undefined)` 或 `Gutter.All`（以类型支持的清除方式为准）
- `setFlexGrow(undefined)`、`setFlexShrink(undefined)`、`setFlexBasisAuto()` 或 `setFlexBasis(undefined)`（与 d.ts 一致）

- [ ] **Step 2：`applyStylesToYoga` 中 flex 伸缩语义（spec §6）**

在设置 `flex` 之前或之后统一分支：

```ts
if (typeof style.flex === "number") {
  node.setFlex(style.flex);
} else {
  if (style.flexGrow !== undefined) node.setFlexGrow(style.flexGrow);
  if (style.flexShrink !== undefined) node.setFlexShrink(style.flexShrink);
  if (style.flexBasis !== undefined) {
    if (style.flexBasis === "auto") node.setFlexBasisAuto();
    else if (typeof style.flexBasis === "string" && style.flexBasis.endsWith("%")) {
      node.setFlexBasisPercent(Number.parseFloat(style.flexBasis));
    } else if (typeof style.flexBasis === "number") {
      node.setFlexBasis(style.flexBasis);
    }
  }
}
```

并确保：**当 `typeof style.flex === "number"` 时不再执行 `flexGrow`/`flexShrink`/`flexBasis` 分支**。

若当前实现在 `typeof style.flex === "number"` 之外仍调用 `node.setFlex(0)` 于 clear 之后由 `apply` 写入，保持与现有 `flex` 字段行为兼容。

- [ ] **Step 3：`gap` / `rowGap` / `columnGap`**

CSS 语义建议：

- 若设置 `gap`，且未设置 `rowGap`/`columnGap`，则两者均应用 `gap`。
- 若同时设置 `gap` 与 `rowGap`，则以 **`rowGap`/`columnGap` 优先** 覆盖对应轴。

实现上使用 `Gutter.Row`、`Gutter.Column` 调用 `setGap` / `setGapPercent`。

- [ ] **Step 4：`flexWrap`、`alignContent`、`alignSelf`**

在对应字段 `!== undefined` 时调用 setter。

- [ ] **Step 5：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

---

### Task 7：阶段 B — 布局单测

**Files:**

- Modify: `packages/core-v2/tests/layout-sync.test.ts`

- [ ] **Step 1：`row` + `gap` 推开第二个子节点**

```ts
test("row gap increases horizontal offset between children", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(200, 100);
  const row = store.createNode("row");
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(row.yogaNode, {
    width: 200,
    height: 50,
    flexDirection: "row",
    gap: 12,
  });
  applyStylesToYoga(a.yogaNode, { width: 30, height: 30 });
  applyStylesToYoga(b.yogaNode, { width: 30, height: 30 });
  store.appendChild(root.id, row.id);
  store.appendChild(row.id, a.id);
  store.appendChild(row.id, b.id);
  calculateAndSyncLayout(store, root.id, 200, 100);
  expect(store.get(b.id)!.layout!.left).toBe(42);
});
```

（期望值 `30 + 12`；若 Yoga 版本 gap 语义不同，**以实测调整**。）

- [ ] **Step 2：`flexWrap: wrap` 第二行 `top` 下移**

构造两个子节点总宽度超过父 `width`，断言第二个子 `top > 0`。

- [ ] **Step 3：`flex` 优先于 `flexGrow`**

同一 `viewStyle` 对象上同时设 `flex: 1` 与 `flexGrow: 99`，行为应与仅 `flex: 1` 一致（可对比 `getComputedWidth`/`layout` 与只设 `flex: 1` 的叶节点）。

- [ ] **Step 4：运行测试**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: PASS

- [ ] **Step 5：Commit**

```bash
git add packages/core-v2/src/layout/style-map.ts packages/core-v2/tests/layout-sync.test.ts
git commit -m "feat(core-v2): ViewStyle gap flexWrap alignContent alignSelf flex basis (phase B)"
```

---

### Task 8：全量校验与合并前检查

**Files:**

- 仓库根

- [ ] **Step 1：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

- [ ] **Step 2：`vp test`（至少 core-v2 + react-v2）**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test`  
Expected: PASS

- [ ] **Step 3：若 `apps/v2` 有类型错误**

仅修复因 `ViewStyle` 扩展导致的编译问题（通常无）。

---

## Plan self-review（已对 spec 覆盖）

| Spec 章节      | 对应任务                                                               |
| -------------- | ---------------------------------------------------------------------- |
| §4 阶段 A      | Task 1–4                                                               |
| §5 shorthand   | Task 1、3、4                                                           |
| §6 flex 优先级 | Task 6–7                                                               |
| §4 阶段 B      | Task 5–7                                                               |
| §3 运行时      | Task 2–3（不修改 `scene-runtime.ts`，除非发现 clear/apply 契约被破坏） |
| §9 自检        | Task 8                                                                 |

**Placeholder 扫描：** 无 TBD；长度清除方式已指向 `wrapAssembly.d.ts` 的 `undefined` 约定。

---

## 执行方式（实施本计划时选一种）

**计划已保存到 `docs/superpowers/plans/2026-04-12-viewstyle-yoga-css.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理执行，任务间人工快速 review。需配合 **superpowers:subagent-driven-development**。
2. **Inline Execution** — 本会话内按 Task 顺序改代码、跑 `vp test`，在 Task 4/7/8 后设检查点。需配合 **superpowers:executing-plans**。

你更倾向哪一种？
