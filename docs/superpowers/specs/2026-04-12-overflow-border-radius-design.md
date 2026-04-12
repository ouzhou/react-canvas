# Overflow 裁剪与圆角（Skia 绘制层）设计

日期：2026-04-12  
范围：`@react-canvas/core-v2`（`ViewStyle`、`LayoutSnapshot`、布局提交、`attachSceneSkiaPresenter`）；`apps/v2` 演示可选。  
对齐：现有 Yoga `overflow` 映射（`style-map.ts`）；命中测试仍按 **轴对齐布局盒**（`packages/core-v2/README.md`），**本期不改**。

---

## 1. 目标

1. **视觉裁剪**：当节点 `overflow` 为 `hidden` 或 `scroll` 时，在 Skia 层将 **子树绘制** 限制在该节点 **布局盒**（绝对坐标下的 `width`×`height`）内，与常见 CSS 子集一致。
2. **圆角背景**：节点带 `backgroundColor` 时，背景轮廓为 **圆角矩形**（四角相同），而非当前轴对齐 `drawRect`。
3. **`borderRadius` 表达力**：单一属性，支持 **非负数字（px）** 与 **百分比字符串**（与现有 `YogaLength` 中 `%` 写法一致，例如 `"50%"`）。**不支持**四角独立半径（无 `borderTopLeftRadius` 等）。
4. **数据流**：绘制所需信息经 **`LayoutSnapshot`** 下发（与 `backgroundColor`、`opacity` 同路径），`attachSceneSkiaPresenter` **只读** `LayoutCommitPayload`，不新增「绘制时查 runtime」的必需路径。

---

## 2. 非目标

- **命中测试**：仍使用 **轴对齐矩形**；不保证点击区域与圆角/裁剪边界一致（已知偏差，调用方接受）。
- **`scroll` 交互**：无滚动条、无手势滚动；**绘制上**与 `hidden` 同样裁剪子内容。
- **`overflow: auto`**：未在本 spec 引入；若日后与 Yoga 对齐再单独立项。
- **边框（border）**：非背景描边；当前调试用描边若与圆角冲突，以「背景填充 + 裁剪」语义为准，实现阶段可收敛为纯 `drawRRect` 填充或保留直角描边等细节，在实现计划中写清。

---

## 3. API（`ViewStyle`）

- **新增** `borderRadius?: number | \`${number}%\``。
- **`overflow`**：沿用已有 `"visible" | "hidden" | "scroll"`；仅补充快照透传与绘制语义（见 §4、§5）。

---

## 4. 布局快照（`LayoutSnapshot`）

每条布局条目在现有字段基础上增加（命名可在实现计划中最终定稿，语义如下）：

| 字段                                | 类型                                     | 说明                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overflow`                          | `"visible" \| "hidden" \| "scroll"` 可选 | 省略视为 **`visible`**（不裁剪）。                                                                                                                                                                    |
| `borderRadius`                      | `number \| \`${number}%\`` 可选          | 与 `ViewStyle` 一致，供调试或二次解析；**若实现选择「仅在 runtime 解析一次」可省略，仅保留解析结果字段。**                                                                                            |
| `borderRadiusRx` / `borderRadiusRy` | `number`（非负，可选）                   | **推荐**：在 **`width`/`height` 已确定** 之后，按 §6 解析并 **clamp** 后的水平/垂直半径（px），供 Skia 直接使用。若只存一对字段，也可用 `borderRadiusResolved: { rx: number; ry: number }` 等价表示。 |

**解析时机**：在 `buildLayoutSnapshotWithoutRun`（或等价的快照构建路径）中，在拿到该节点 **布局宽高** 后计算 `rx`/`ry`，避免 Presenter 重复实现 CSS 规则。

---

## 5. Skia 绘制语义

### 5.1 裁剪（overflow）

- 当 `overflow` 为 **`hidden`** 或 **`scroll`**：对该节点布局盒（`absLeft`、`absTop`、`width`、`height`）建立 **裁剪区**。
- 裁剪形状：与圆角一致——**`clipRRect`**，圆角半径为 §6 解析后的 **`rx`/`ry`**（未设置 `borderRadius` 时 **`rx = ry = 0`**，等价于轴对齐 `clipRect`）。
- **`visible`**：不对子树施加本节点盒裁剪（祖先裁剪仍生效）。

### 5.2 背景

- 有 `backgroundColor` 且可解析时：使用 **`drawRRect`**（或等价 Path），半径 **同上** `rx`/`ry`，与裁剪轮廓一致。

### 5.3 与子节点、文本的顺序

- 维持与 README 一致的 **前序 DFS**、兄弟 **正序绘制、后插入者在上**。
- **本节点**：先建立本帧的 `save` / 裁剪 /（按需）`saveLayer`，再绘制本节点背景与文本（若有），再递归子节点。
- **子节点溢出**：被 **祖先链** 上最近的裁剪区限制；本节点 `overflow: visible` 时不增加新裁剪。

### 5.4 与 `opacity < 1` 的 `saveLayer` 顺序

- 必须 **先 `clip`（或 `clipRRect`）再 `saveLayer`**（若两者同时存在），**`saveLayer` 的 bounds** 与裁剪外接矩形一致（或与布局盒一致），避免半透明绘制渗出裁剪区外。
- 实现须在 `scene-skia-presenter.ts` 中用注释写死顺序，替换现有「若日后增加 clipRect」的占位说明。

---

## 6. 半径解析与 clamp

### 6.1 数字（px）

- 语义：**四角相同**，且为 **各向同性** 圆角：`rx = ry =` 该数字（在 clamp 之后）。
- **非法值**：非有限数或 `< 0` 时，视为 **`0`**（无圆角），或在实现计划中统一为「忽略该属性」二选一，全仓库一致即可。

### 6.2 百分比

- 与 **CSS `border-radius`** 一致：水平方向半径参考 **盒宽**，垂直方向参考 **盒高**。
- 单一百分比 `p`：`rx = (p/100) * width`，`ry = (p/100) * height`（在应用 **6.3 clamp** 之前先按原始几何计算，再进入收缩算法）。
- 百分比字符串解析：与现有布局 `%` 解析风格一致；非法串视为 **`0`** 或忽略（与 6.1 非法值策略一致）。

### 6.3 收缩（clamp）

- 应用 **CSS 圆角收缩规则**（相邻角半径之和不超过对应边长等）；本期为 **四角相同** 的简化情形，实现须引用或内联与规范一致的算法，保证 **任意宽高** 下 Skia 不收到无效 RRect。
- clamp 后 **`rx`、`ry` 均为非负有限数**。

---

## 7. 测试与演示

- **单元测试**：`rx`/`ry` 解析（数字、`%`、宽或高为 0 边界）、clamp 后单调性/不越界；可选快照字段存在性。
- **`apps/v2`**：增加或调整 smoke，使 **overflow hidden + 百分比圆角** 肉眼可验证（与现有 `borderRadius: 6` 等演示对齐本 spec 类型系统）。

---

## 8. 方案回顾（已定稿）

- **数据路径**：采用 **扩展 `LayoutSnapshot`**（不推荐单独为 Presenter 增加 runtime 查询作为唯一数据源）。
- **命中**：**不修改** `hit-test` 行为。
- **四角**：**仅**单一 `borderRadius`，**无**四角独立属性。
