# core-v2：`Image` 与 `SvgPath` — 设计规格

**日期：** 2026-04-12  
**状态：** 待审阅（实现前门禁）  
**范围：** **`packages/core-v2`**：场景树、`SceneRuntime`、`LayoutCommitPayload` / `LayoutSnapshot`、`attachSceneSkiaPresenter` 对齐支持 **位图 `Image`** 与 **矢量 `SvgPath`**。**不含** `packages/react-v2` 的 JSX 宿主实现（仅 §7 声明契约边界）。  
**继承与差异：** 语义上与归档 [阶段四 Image 与 SvgPath](../archive/superpowers/specs/2026-04-05-phase-4-image-svgpath-design.md) 及 [Lucide Icon](../archive/superpowers/specs/2026-04-08-ui-icon-lucide-design.md) 对齐；本文将落点 **明确为 core-v2 文件与类型**，并冻结下列 **V1 决策**（与对话结论一致）。

**非目标：** 本文不写具体 patch 清单；实现计划由 **writing-plans** 在规格通过后产出。

---

## 1. 目标与非目标

### 1.1 目标（V1）

- **`Image`**
  - 数据来源：**仅 HTTP(S) / 浏览器可 `fetch` 的 URL 字符串**（与 M4 `source: { uri }` 对齐；实现可选用字段名 `imageUri` 或嵌套 `source`，但 **对外类型与文档须统一**）。
  - **布局**：绘制盒完全由 **Yoga + `ViewStyle`** 决定；**不提供** 按位图固有尺寸的 `measureFunc`。
  - **绘制**：在布局矩形内支持 **`objectFit`** 三模式：**`contain` | `cover` | `fill`**（`fill` 为拉伸铺满，对应常见「stretch」语义）。
  - **异步**：`fetch` → `ArrayBuffer` → CanvasKit 解码为 **`SkImage`**；成功后 **`onLoad`** 并 **`emitLayoutCommit`** 触发重绘；失败 **`onError`**。
  - **缓存**：进程内 **`uri → SkImage`** 的 **Map**；同一 URI 多节点共享；**合并 in-flight** 请求，避免重复解码。
- **`SvgPath`**
  - 数据：**SVG path 的 `d` 字符串**；CanvasKit 构造 **`SkPath`** 后 **`drawPath`**。
  - **`viewBox`**：**`viewBox?: string`**；**省略时等价于 `"0 0 24 24"`**，以保证与 **Lucide 默认画布** 及 UI 层 Icon 规格一致。
  - **映射**：将 **viewBox 用户空间** **等比缩放并居中** 落入 Yoga 布局矩形（letterbox，**不**非均匀拉伸）。
  - **样式**：`stroke` / `fill` / `strokeWidth` 等画笔字段为 **节点专有字段**（见 §3），与 M4 一致；**不**塞进通用 `ViewStyle`，以免类型与 Yoga 无关字段混淆。
- **交互与命中**
  - **指针命中**：**布局轴对齐包围盒（AABB）**；**不**做 path 内点测试，**不**做位图 alpha 命中。
  - 与现有 **`scrollView`** 组合：作为普通叶节点参与 **clip** 与 **scrollY** 内容变换（与现 presenter / hit-test 行为一致；若实现验证中发现顺序问题，在实现计划中写死 clip / translate 顺序）。

### 1.2 非目标（V1 不验收）

- **完整 SVG 文档**、`<g>` transform 子树、`<defs>`、CSS、SMIL。
- **非 path 图元**在 core 内解析（`<circle>` 等）；由调用方先转为 `d`（参见 Lucide 规格）。
- **LRU / 引用计数** 图片全局缓存、**Worker 解码**、**ArrayBuffer / `ImageBitmap` 源**（可作为后续规格）。
- **路径级命中**、**按像素透明度的 Image 命中**。

---

## 2. 方案对比与决议（架构）

| 方案                            | 说明                                                                                                                                                                                     | 结论                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **A. runtime + presenter 直扩** | 扩展 `SceneNode` / `LayoutSnapshot` / `buildLayoutSnapshotWithoutRun` / `attachSceneSkiaPresenter`；`SceneRuntime` 增加 `insertImage` / `insertSvgPath`；解码与 URI 缓存放 core 包内模块 | **采用（V1）**            |
| B. 可注入 `ImageDecoder` 等接口 | 测试更稳，但多一层接线                                                                                                                                                                   | 若单测倒逼再抽，不阻塞 V1 |
| C. Worker 解码                  | 复杂度高                                                                                                                                                                                 | **不采用**                |

---

## 3. 数据模型（core-v2）

### 3.1 `SceneNodeKind` 与 `SceneNode`

- **`SceneNodeKind`** 增加 **`"image"`**、**`"svgPath"`**。
- **叶子约束**：上述两类 **`children` 必须为空**；`insertImage` / `insertSvgPath` 与 `insertText` 一样视为 **叶节点 API**（非法子节点：**实现计划**在「忽略 / 开发断言」中二选一成文）。

**专有字段（命名可在实现计划中微调，须与快照一致）**

| `kind`    | 字段                                             | 说明                                                      |
| --------- | ------------------------------------------------ | --------------------------------------------------------- |
| `image`   | `imageUri: string`                               | 必填。                                                    |
|           | `imageObjectFit: "contain" \| "cover" \| "fill"` | 必填或由默认值 **`contain`** 填充（实现计划写死默认值）。 |
| `svgPath` | `svgPathD: string`                               | 必填。                                                    |
|           | `svgViewBox?: string`                            | 省略时运行时使用 **`"0 0 24 24"`**。                      |
|           | `svgStroke?`, `svgFill?`, `svgStrokeWidth?`, …   | 与 M4 §5.2 对齐的可选子集；**实现计划**列首批字段。       |

两类节点均保留 **`viewStyle?: ViewStyle`**，用于 **宽高、flex、margin、opacity、圆角、边框** 等现有逻辑。

### 3.2 `LayoutSnapshot` 扩展

在 **`buildLayoutSnapshotWithoutRun`** 中，对 `image` / `svgPath` 写入 presenter 所需字段，例如：

- **Image**：`imageUri`、`imageObjectFit`（解码状态 **不进入** 快照；presenter 以 URI + 节点 id 维护「当前帧是否有图」）。
- **SvgPath**：`svgPathD`；**已解析** 的 **`viewBoxMinX` / `viewBoxMinY` / `viewBoxWidth` / `viewBoxHeight`**（四有限数字；解析在构建快照时完成）；以及画笔字段的副本。

**原则：** **`attachSceneSkiaPresenter` 只读 `LayoutCommitPayload`**，不读 `SceneNode` 内部可变状态（与 `text` 分支一致）。

### 3.3 `SceneRuntime` API（示意）

- **`insertImage(parentId, id, options)`**  
  `options`：`uri`、`objectFit`、`style: ViewStyle`，可选 `onLoad`、`onError`。  
  创建节点、`kind: "image"`、应用 Yoga；启动异步加载；**URI 或 objectFit 变更** 时取消该节点上一 in-flight 并更新字段。
- **`insertSvgPath(parentId, id, options)`**  
  `options`：`d`、`viewBox?`、`style`、画笔可选字段、可选 `onError`。  
  **同步**；`d` / `viewBox` / 影响几何或画笔的字段变化时，使 presenter 侧 **Path 缓存** 按约定键失效。
- **`updateStyle` / `patchStyle` / `removeView`**：与现有一致；**`removeView`** 时取消该 `id` 关联的未完成 Image 请求，并清除 presenter 内 **按节点 id** 挂接的解码状态（**不**强制从全局 `uri → SkImage` 删除条目）。

---

## 4. 绘制、缓存与生命周期

### 4.1 `Image`

- **解码**：`fetch(uri)` → `ArrayBuffer` → **`MakeImageFromEncoded`**（以 `canvaskit-wasm` 实际导出为准）。
- **CORS**：遵循浏览器；跨域无许可时 **fetch 失败** → **`onError`**。
- **绘制**：在 **`absLeft/absTop/width/height`** 矩形内，按 **`imageObjectFit`** 计算 **源 rect / 目标 rect**；边界情况（零尺寸、非有限值）在 **实现计划** 用表格枚举。
- **圆角与透明度**：与现有 `View` 一致——若快照含 **`borderRadiusRx/Ry`**，对图片绘制前 **`clipRRect`**（顺序与现 `paintNodeContent` 一致）；**`opacity`** 复用现有组透明策略。

### 4.2 全局 **`uri → SkImage`** 缓存

- **键**：URI 字符串（是否 strip `#fragment` 在实现计划写死）。
- **值**：解码后的图像句柄。
- **并发**：同 URI **单次 in-flight**；多节点共享结果。
- **内存**：V1 **不**做 LRU；文档注明长期运行内存增长风险。

### 4.3 `SvgPath`

- **`d` → `SkPath`**：使用 **`MakeFromSVGString`**（或类型定义中的等价 API）；传入内容须为 **path `d` 语法**（不是整段 XML）。
- **变换矩阵**：由 **viewBox 四元组** 与 **布局矩形** 得 **uniform scale + translate 居中**。
- **缓存**：按 **`(d, 规范 viewBox 串, strokeWidth, …)`** 等键缓存 **`SkPath`**（或 path + 每帧矩阵；**实现计划**选定以平衡 CPU/内存）。
- **圆角**：在布局盒上 **`clipRRect`** 后再 `drawPath`，与 Image 一致。

---

## 5. 错误语义（冻结）

| 场景                               | 行为                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Image** fetch 或解码失败         | 调用 **`onError`**；**不绘制**位图；**不向 React/调用方抛未捕获异常**。                            |
| **Image** 成功                     | 调用 **`onLoad`**；**`emitLayoutCommit`**。                                                        |
| **`viewBox` 无法解析为四有限数字** | **不绘制 path**；若提供了 **`onError`** 则 **调用 `onError`**；未提供则 **静默**（不向全局抛错）。 |
| **`d` 无法得到可绘制 path**        | 同上。                                                                                             |

开发环境 **`console.warn`** 是否启用由 **实现计划** 决定，**不作为** 本规格验收项。

---

## 6. 测试与导出

- **单元测试**：`objectFit` 矩形纯函数；`viewBox` 字符串解析；viewBox → 布局矩形的 **2D 变换** 数值断言；runtime 快照字段；`removeView` 取消请求。Image 解码测使用 **`data:` URL** 或 **fetch mock**，避免 CI 外网依赖。
- **`packages/core-v2/src/index.ts`**：导出更新后的 **`SceneNodeKind`** 等公共类型；**不**导出内部缓存表实现细节。

---

## 7. `react-v2` 边界（非本文实现范围）

- **`<Image />` / `<SvgPath />`** 的 props 命名（例如 React 侧 `resizeMode` 与 core **`objectFit`** 是否别名）在 **react-v2 规格或实现计划** 中写死，但 **命令式 core 契约** 以本文 §3 为准。
- **Lucide `<Icon>`**：仍通过 **合并 `d` + 默认 viewBox `0 0 24 24`** 映射到 **`SvgPath`**（见归档 Lucide 规格）；与本文 **默认 viewBox** 一致。

---

## 8. 交付顺序

1. **`Image`** 端到端（runtime → snapshot → presenter → 测试）。
2. **`SvgPath`** 同上。
3. **`react-v2`** 接线（可独立 PR，但依赖 §3 契约冻结）。

---

## 9. 交叉引用

- [阶段四 Image 与 SvgPath（归档）](../archive/superpowers/specs/2026-04-05-phase-4-image-svgpath-design.md)
- [Lucide Icon（归档）](../archive/superpowers/specs/2026-04-08-ui-icon-lucide-design.md)
- [ScrollView — core-v2（2026-04-12）](./2026-04-12-scrollview-core-v2-design.md)（clip / 命中坐标系参照）
