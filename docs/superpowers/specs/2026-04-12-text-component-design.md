# Text 组件（CanvasKit + Yoga）设计

日期：2026-04-12  
范围：`@react-canvas/core-v2`（场景节点、布局测量、Skia 绘制、运行时初始化）；`@react-canvas/react-v2`（`<Text>`）。  
对齐：`docs/core-design.md` §5.3（TextNode、嵌套规则）；**不**替代 `core-design` 全文，仅收敛本仓库 **v1 可实现** 行为。

---

## 1. 目标

实现顺序以 **§1.1 分阶段交付** 为准：先完成 **字体等资源加载 + 统一 loading 门闩 + v2 可见文字**，再迭代 **换行 / Yoga 测量 / 嵌套样式** 等能力。下文 §2–§10 为 **完整 v1 行为** 说明；未列入 M1 的条目在对应里程碑落地前 **不作为首版验收**。

1. **RN 风格 `<Text>`**（M2+）：`children` 为 **字符串** 与/或 **嵌套 `<Text>`**；**禁止**在 `<Text>` 内放 `<View>`；**禁止**在 `<View>` 下直接挂裸字符串（与 `core-design` 一致）。
2. **换行**（M2）：在父级给出的 **可用宽度** 内 **自动换行**；支持字符串中的 **`\\n` 硬换行**。
3. **嵌套样式**（M3）：子 `<Text>` 覆盖父级样式；未指定的字段 **继承** 父级（语义对齐 RN `Text` 嵌套，字段级规则见 §6）。
4. **布局**（M2）：`Text` 作为 **Yoga 叶节点**，通过 **`measureFunc`** 将 Skia Paragraph 测量结果回写给 Yoga（宽度策略与 RN 一致：**有 maxWidth 时按宽度折行**，高度由内容撑开）。
5. **绘制**（M1 起）：使用 **CanvasKit Paragraph**（或等价：`ParagraphBuilder` 构建 + `paint`）在 `layout` 框内绘制；M1 可用 **默认 `TextStyle` / 单色**；颜色等完整来自解析后的 `TextStyle`（M3 与 §6 对齐）。
6. **默认字体**（M1）：使用仓库导出常量 **`BUILTIN_PARAGRAPH_FONT_URL`**（见 §3），在运行时初始化阶段 **加载字体文件（OTF 等）** 并注册，作为 **默认 `fontFamily` / 默认 Paragraph 字体源**。

### 1.1 分阶段交付（实现顺序）

| 阶段                | 验收要点                                                                                                                                                                                                                            | 说明                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **M1 — 加载与可见** | **字体等资源文件**经 `fetch` → 注册到 CK；**加载/失败状态并入运行时统一的 `loading` / `error`（或等价快照）**，不得在未完成字体就绪时进入对外 **`ready`**；`apps/v2` 中挂载最简 `<Text>`（如固定字符串）能在画布 **看到渲染文字**。 | 可先 **固定宽度/单行** 或 **占位 layout**，不强制 §4.3 `measureFunc` 与换行正确性；以「资源在门闩内、字能显示」为界。 |
| **M2 — 换行与布局** | §4.3 Yoga `measureFunc`、§5.3 自动换行与 `\\n`、父级 **maxWidth** 下高度随内容。                                                                                                                                                    | 与 RN 宽度优先语义对齐。                                                                                              |
| **M3 — 嵌套与样式** | §5 React 合法性、扁平 run、§6 继承表、多 `TextStyle` 绘制。                                                                                                                                                                         | 在 M2 测量稳定后接。                                                                                                  |

若产品后续需要 **从 URL/本地加载纯文本素材文件**（非字体），在 M1 验收通过后 **单独开 task**，不阻塞 M1 的字体门闩与 v2 演示。

---

## 2. 非目标（v1 不做）

- **文本选择、光标、IME、剪贴板**。
- **完整国际化排版**（复杂 BiDi、竖排等）—— 仅要求常见 **LTR + 中文 + 英文** 可接受；若 CK Paragraph 有边界，在实现计划中记 **已知限制**。
- **每字符 / 每 span 独立命中与独立 `onPress`**（v1 **整块 Text** 使用 **轴对齐布局盒**参与 `hitTest`，与现有 `View` 一致）。
- **Emoji 彩色字体**：不强制；若默认字体覆盖不足，允许 **豆腐块** 或后续补字体 fallback。

---

## 3. 默认字体与加载策略

### 3.1 常量

```ts
/** 默认正文：Noto Sans SC Subset OTF（体积相对全量 CJK 更小，适合网页）。 */
export const BUILTIN_PARAGRAPH_FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf";
```

- **存放位置（建议）**：`packages/core-v2/src/fonts/builtin.ts`（或同级），并由 `core-v2` **导出**，供 `initRuntime` / 应用配置引用。
- **可覆盖**：`initRuntime({ defaultParagraphFontUrl?: string })` **优先于**常量（便于内网镜像或本地文件）；未传则使用 `BUILTIN_PARAGRAPH_FONT_URL`。

### 3.2 加载时机

- 在 **`initRuntime`** 解析链中：**`fetch` → `ArrayBuffer` → 注册到 CanvasKit FontMgr / Typeface**（具体 API 名以锁定的 `canvaskit-wasm` 类型为准）。
- **顺序要求**：在首帧需要 **`measure` / 绘制** 任意 `Text` 之前，默认字体必须 **已成功注册**；否则不得进入 `ready`（见 §3.3）。
- **与统一 loading 对齐（M1）**：字体 **pending** 应体现在运行时对外可见的 **loading** 路径中（与 CK/WASM 等其他初始化步骤一致，合并为同一套条件，避免「全局已 ready 但 Text 仍缺字」）；**全部就绪**后再转入 **`ready`**。

### 3.3 失败策略（v1 写死）

- **字体加载或解析失败**：`initRuntime` **reject** 或快照为 **`error`**（与现有运行时错误模型一致），**不**提供「静默空白字」的降级；调用方显式处理错误 UI。
- **理由**：避免调试困难与「有布局无字」的隐性状态。

---

## 4. Core：节点与存储

### 4.1 判别

- 在现有 `SceneNode`（或 node-store）上增加 **`kind: 'view' | 'text'`**（或等价字段）。
- **`text` 节点**：**不**通过 `insertView` 挂子 Yoga 子树表示嵌套；嵌套 **仅存逻辑结构**（见 §5）。

### 4.2 Text 节点数据（逻辑）

- **`slots`**：`Array<TextSlot>`，其中  
  `TextSlot = { kind: 'string'; value: string } | { kind: 'text'; nodeId: string }`（与 `core-design` 一致；实现可用扁平树 + id）。
- **`textStyle`**：解析后的 **`TextStyle`**（合并继承后、用于 Paragraph 的最终样式；或分层存「自有 + 继承指针」由实现选择，**对外行为**以 §6 为准）。
- **Paragraph 缓存**：依赖 **`slots` + 有效宽度 + 字体度量**；任一变化则 **失效** 并 `layoutDirty`。

### 4.3 Yoga

- `Text` 对应 **叶节点**：`measureFunc(width, heightMode)` → 使用 **Paragraph 排版** 得到 **measured width/height**（RN 语义：**宽度优先**，高度随内容）。
- **宽度来源**：由父 flex 约束传入的 **max width**（与现有 `View` 父盒一致）。

---

## 5. 嵌套与内容树

### 5.1 React 层

- **合法**：`<Text>plain</Text>`、`<Text><Text style={{ fontWeight: 'bold' }}>b</Text>plain</Text>`。
- **非法**：`<Text><View /></Text>`、`<View>text</View>` —— **开发环境**抛错或文档说明由 reconciler 校验。

### 5.2 扁平化为 Paragraph runs

- 深度优先遍历 **slots**，将 **嵌套 Text** 展开为 **带样式的 run 列表**（每个 run：字符串片段 + 合并后 `TextStyle`）。
- **继承规则**：子节点 `TextStyle` **覆盖** 父节点；未设置字段 **继承** 父（§6 表）。

### 5.3 换行

- Paragraph **自动换行** + 字符 **`\\n`** 分段；与 Skia/CK 行为一致即可。

---

## 6. TextStyle 字段与继承（v1 最小集）

建议首版支持（与现有 `ViewStyle` 可分离类型 **`TextStyle`**）：

| 字段         | 继承 | 说明                                                |
| ------------ | ---- | --------------------------------------------------- |
| `color`      | 是   | 与现有 `#rrggbb` 解析一致                           |
| `fontSize`   | 是   | 逻辑像素                                            |
| `fontWeight` | 是   | 映射到 CK 可用字重（单 Regular 字体时可降级）       |
| `fontFamily` | 是   | 字符串；默认 **注册名** 对应当前加载的 Noto Sans SC |
| `lineHeight` | 是   | 可选；未实现前可用 CK 默认行高                      |

未列字段 **v1 可不实现**；新增时补 spec。

---

## 7. 绘制

- **`attachSceneSkiaPresenter`**（或抽取 `paintNode`）：若 `kind === 'text'`，在 **`layout` 绝对坐标** 下绘制 Paragraph（注意 **DPR / scale** 与现有 `View` 绘制管线一致）。
- **裁剪**：v1 若 Text 超出父盒，行为与 **View overflow** 一致（随现有 Yoga/Skia 策略；若尚无 overflow clip，在实现计划中说明 **暂不 clip** 或 **clipRect**）。

---

## 8. 命中与指针

- v1：**整块 Text** 使用 **布局矩形**（与 `hitTestAt` 现有轴对齐逻辑一致）；**不**做 glyph 级命中。
- **事件**：`Text` 节点可挂 `onClick` 等（与 `View` 一致）；**命中区域为整框**。

---

## 9. 公开 API 形状（react-v2）

```tsx
export type TextProps = {
  style?: TextStyle;
  children?: React.ReactNode; // 仅 string 或 Text
};
export function Text(props: TextProps): React.ReactNode;
```

- **`core-v2`** 若需命令式 API，可另增 `insertText` / `updateText`（可选，随实现计划）。

---

## 10. 测试建议

| 阶段 | 项             | 断言方向                                                                                   |
| ---- | -------------- | ------------------------------------------------------------------------------------------ |
| M1   | 字体 / loading | mock 字体请求：loading 阶段 **未**对外 ready；成功后 **ready** 且可创建 Paragraph          |
| M1   | v2             | `apps/v2` 或集成测试：最简 `<Text>` 挂载后 **有像素/场景断言**（或人工验收清单）证明可见字 |
| M2   | 测量           | 固定宽度下换行后 **高度** > 单行；`\\n` 增加行数                                           |
| M3   | 嵌套           | 子 `fontWeight` 仅作用于子 run                                                             |
| 可选 | 绘制           | 快照或 golden（若项目已有）                                                                |
| M3   | React          | 嵌套结构产生预期 scene 结构                                                                |

---

## 11. 实现路线（非规范，供 planning）

1. **M1**：`initRuntime` 内 **字体 fetch + 注册** 并入 **统一 loading**；`SceneNode` 增加 `kind: 'text'` 的最小数据路径；Presenter 能在 layout 框内 **画一段默认样式 Paragraph**；`react-v2` 导出 `<Text>`；**`apps/v2` 页面可看到字**。
2. **M2**：接 **Yoga `measureFunc`**、宽度约束下 **换行与 `\\n`**。
3. **M3**：**slots / 嵌套 Text**、run 扁平化、§6 **继承与多样式**。

---

## 12. 自检

- **范围**：v1 不承诺 selection、glyph 命中、失败静默降级。
- **默认字体**：常量 + `initRuntime` 覆盖 + 失败即 error；**M1 起** loading 条件包含字体未就绪。
- **与 `core-design`**：嵌套规则一致；实现形态为当前 `SceneNode` 的演进而非另起炉灶。
