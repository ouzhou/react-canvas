# `@react-canvas/core` 源码与测试目录重构 — 设计规格

**日期：** 2026-04-06  
**状态：** 已定稿（与对话结论一致，待实现）  
**范围：** 仅 **`packages/core`** 内 **`src/`** 与 **`tests/`** 的目录与文件命名整理；**不改变** 包对外导出符号（仍由包根 `src/index.ts` 统一导出）。**不含** 阶段四 Step 9（滚动/裁剪）与阶段五高级绘制的功能实现，仅预留目录语义。

**参考：** [development-roadmap.md](../../development-roadmap.md)、[technical-research.md](../../core/technical-research.md)。

---

## 1. 目标与非目标

### 1.1 目标

- 将当前**扁平**的 `src/` 按**功能域**分层，降低导航成本，并与路线图后续能力（滚动与裁剪、高级绘制、动画驱动的帧队列、列表虚拟化等）在**模块归属**上对齐。
- **`tests/` 与 `src/` 同构镜像**（已确认选项 **A**）：每个测试文件落在与实现相同的相对路径下，便于定位与增量维护。
- 重构后 **`vp check`**、**`vp test`**（在 monorepo 根或 `packages/core` 下按项目惯例）通过；若有其他包 **非法 deep import** `core` 源码路径，一并修正为 **包入口**。

### 1.2 非目标

- **不**新增 `package.json` 的 `exports` 子路径；消费者仍只使用 `@react-canvas/core` 根入口。
- **不**在本任务中实现路线图新功能（ScrollView、`overflow`、阴影渐变等）。
- **不**强制重命名所有源文件：允许分阶段；若首期只移动目录、第二期再统一文件名，需在实现计划中写明。

---

## 2. 源码目录树（目标形态）

下列为**推荐**布局；若迁移时分阶段，可先完成目录搬迁再逐步把「建议新名」落地。

```text
packages/core/src/
  index.ts
  vite-env.d.ts

  runtime/
    runtime.ts                 # 原 runtime-init.ts
    frame-queue.ts             # 原 queue-layout-paint-frame.ts

  layout/
    yoga.ts                    # 原 yoga-init.ts
    yoga-map.ts
    layout.ts
    canvas-kit.ts              # 原 layout-canvas-kit.ts

  render/
    canvaskit.ts               # 原 canvaskit-init.ts
    locate.ts                  # 原 canvaskit-locate.ts
    paint.ts
    paint-frame-requester.ts
    # 阶段五（路线图）：可在 render/ 下增加子目录，如 effects/、path/，按需再建

  scene/
    scene-node.ts
    view-node.ts
    text-node.ts
    image-node.ts
    svg-path-node.ts

  style/
    view-style.ts
    text-style.ts

  text/
    paragraph-build.ts
    default-paragraph-font.ts

  image/
    image-cache.ts
    image-decode.ts
    image-rect.ts

  geometry/
    viewbox.ts                 # 原 viewbox-transform.ts
    world-bounds.ts

  input/
    types.ts                   # 原 pointer-types.ts
    hit-test.ts
    dispatch.ts                # 原 pointer-dispatch.ts
    hover.ts                   # 原 pointer-hover.ts
    click.ts                   # 原 click-activation.ts
```

### 2.1 与路线图的对应关系（预留）

| 路线图能力                                              | 建议归属（未来实现时）                                                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 阶段四 Step 9：`overflow`、ScrollView、惯性滚动         | **`render/`**（裁剪栈、`save`/`clip`/`restore`）与必要时独立 **`scroll/`**（内容偏移、速度状态）；几何类型可复用 **`geometry/`** |
| 阶段五：阴影、渐变、`clipPath`、`transform`、自定义字体 | 主要在 **`render/`**；字体加载可与 **`text/`** 协同                                                                              |
| 阶段六：动画绕过 Reconciler、直接改节点                 | 依赖 **`runtime/frame-queue`** 与节点脏标记；动画驱动器可主要在 **`packages/react`**                                             |
| 阶段六：FlatList                                        | **`layout/`** + **`scene/`**（回收与 Yoga 生命周期）；若体量大可再引入 **`list/`**                                               |

---

## 3. 文件命名对照表（建议）

| 当前路径                          | 目标路径                     |
| --------------------------------- | ---------------------------- |
| `src/runtime-init.ts`             | `src/runtime/runtime.ts`     |
| `src/queue-layout-paint-frame.ts` | `src/runtime/frame-queue.ts` |
| `src/yoga-init.ts`                | `src/layout/yoga.ts`         |
| `src/layout-canvas-kit.ts`        | `src/layout/canvas-kit.ts`   |
| `src/canvaskit-init.ts`           | `src/render/canvaskit.ts`    |
| `src/canvaskit-locate.ts`         | `src/render/locate.ts`       |
| `src/viewbox-transform.ts`        | `src/geometry/viewbox.ts`    |
| `src/pointer-types.ts`            | `src/input/types.ts`         |
| `src/pointer-dispatch.ts`         | `src/input/dispatch.ts`      |
| `src/pointer-hover.ts`            | `src/input/hover.ts`         |
| `src/click-activation.ts`         | `src/input/click.ts`         |

其余文件（如 `layout.ts`、`paint.ts`、`yoga-map.ts` 等）可**仅移动目录**而**暂不改名**，以降低首期风险。

---

## 4. 测试目录（选项 A：与 `src` 镜像）

### 4.1 规则

- **`packages/core/tests/`** 下的相对路径 **`tests/<domain>/...`** 与 **`src/<domain>/...`** 一一对应。
- 测试文件命名：**`<basename>.test.ts`**，与源文件 basename 一致（源文件改名后，测试文件名同步）。
- 导入实现：使用 **`../src/<domain>/...`**（与当前 `../src/...` 风格一致），或经评审后统一为包入口别名（若项目引入 `@/` 等）。

### 4.2 当前测试文件 → 目标位置（示例）

| 当前                                                                                  | 目标（与上节源树一致）                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `tests/queue-layout-paint-frame.test.ts`                                              | `tests/runtime/frame-queue.test.ts`（若源改名为 `frame-queue.ts`） |
| `tests/yoga-map-*.test.ts`                                                            | `tests/layout/yoga-map-*.test.ts`                                  |
| `tests/layout-display.test.ts`                                                        | `tests/layout/layout-display.test.ts`                              |
| `tests/paint-display-none.test.ts`                                                    | `tests/render/paint-display-none.test.ts`                          |
| `tests/view-node-tree.test.ts`                                                        | `tests/scene/view-node-tree.test.ts`                               |
| `tests/text-node-tree.test.ts`                                                        | `tests/scene/text-node-tree.test.ts`                               |
| `tests/font-family-parse.test.ts`、`tests/line-height-skia.test.ts`                   | `tests/text/...`                                                   |
| `tests/image-rect.test.ts`                                                            | `tests/image/image-rect.test.ts`                                   |
| `tests/viewbox-transform.test.ts`                                                     | `tests/geometry/viewbox.test.ts`（若源改为 `viewbox.ts`）          |
| `tests/hit-test.test.ts`、`tests/pointer-*.test.ts`、`tests/click-activation.test.ts` | `tests/input/...`                                                  |

实现阶段以 **实际源文件路径** 为准微调上表。

---

## 5. 对外 API 与依赖约束

- **公开 API**：仅 **`packages/core/src/index.ts`** 中的 `export`；路径调整不改变导出名称（除非另有破坏性变更评审）。
- **依赖方向**：优先保持 **`layout` → `render`** 的单向依赖；桥接模块（如 `layout/canvas-kit.ts`）避免引入 **`layout` ↔ `render` 循环**；共享几何类型放在 **`geometry/`**。

---

## 6. 验收标准

- `packages/core`：**`vp check`**、**`vp test`** 全部通过。
- 全仓库检索：无对 `@react-canvas/core` **非入口**路径的稳定依赖（若有测试或文档示例，改为包入口或内部相对路径策略一致）。
- 本文档 §2、§3、§4 与仓库实际结构一致（实现完成后可做一次对照修订）。

---

## 7. 修订记录

| 日期       | 说明                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-06 | 初版：目录方案、测试镜像 A、路线图预留、验收标准。                                                                                                 |
| 2026-04-06 | 实现落地：`src/` / `tests/` 已按本规格迁移；`packages/react/tests/setup.ts` 中 CanvasKit `locate` 的 mock 路径更新为 `core/src/render/locate.ts`。 |
