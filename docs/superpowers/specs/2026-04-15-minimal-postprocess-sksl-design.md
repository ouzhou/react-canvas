# Minimal Post-Process (SkSL) — Design

**Date:** 2026-04-15  
**Status:** Proposed  
**Topic:** 在 `@react-canvas/core-v2` 的 CanvasKit 主渲染管线中，增加 **最简 A 方案**：单 pass 全屏后处理，调用方在 **attach 时** 提供 **SkSL**，运行期仅更新 **uniform**；**不**引入第二套 WebGL（如 regl）。

---

## 背景与动机

- 现有 `attachSceneSkiaPresenter` 将场景直接绘制到 **主 WebGL（或 SW）Surface** 并 `flush`，无「先完整渲染再后处理」的扩展点。
- 产品（如 v3）希望在 **同一 CanvasKit / WebGL 上下文** 内叠加透镜、调色等 **全屏效果**，且 **复用渲染结果** 作为采样输入。
- **最简范围**：单 pass、固定 uniform 协议由文档约定；多 pass 链、通用材质系统、用户上传任意 SkSL 沙箱 **不在** 本 spec。

---

## 决策汇总

| 维度                                  | 决策                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 集成方式                              | **A**：后处理留在 CanvasKit 管线内（SkSL / RuntimeEffect），**不**要求 v3 再挂 regl                                           |
| 软件光栅回退（`MakeSWCanvasSurface`） | **关闭后处理**：仅绘制原有场景，行为与当前版本一致；可对外通知「效果未启用」                                                  |
| SkSL 生命周期                         | **attach 时注册一次**；运行期 **仅** 更新 uniform，**不支持** 运行中更换整段 SkSL                                             |
| 与 pick 的关系                        | **必须分离**：后处理输入使用 **新建的离屏「场景颜色」Surface**，**禁止**复用或混淆 `pickSurface`（pick 为 ID 渲染，语义不同） |
| 管线形态                              | **离屏完整场景渲染 → 得到场景图 → 主屏全屏 Runtime 后处理一遍**（见下文架构）                                                 |

---

## 架构与数据流

### 未注册后处理

与现状一致：`skSurface.getCanvas()` → 现有绘制逻辑 → `flush`。

### 已注册后处理且为 WebGL

1. **分配/复用** `sceneColorSurface`（命名仅作说明，实现可调整）：与主画布 **backing store 同尺寸**，随 DPR / 尺寸变化 **重建**。
2. 将 **与主屏相同** 的场景绘制逻辑抽到可复用入口（例如 `paintScene(targetCanvas, …)`），**先** 向 `sceneColorSurface` 绘制 **完整一帧**（含相机、裁剪、滚动等与当前主路径一致）。
3. 从 `sceneColorSurface` 取得 **场景颜色图像**（推荐 `makeImageSnapshot()` 或当前 CanvasKit 版本推荐的等价 API），作为 SkSL 的 **采样输入**。
4. **主 `skSurface` 的 Canvas**：清屏后，用 **RuntimeEffect + SkSL** 生成 `Shader`，绑定上一步图像与 **本帧 uniform**，绘制 **全屏矩形**，再 `flush` 上屏。

### 软件光栅（无 WebGL）

**不** 分配 `sceneColorSurface`，**不** 执行后处理；绘制路径与 **未注册后处理** 相同（直接主 Surface）。

### 与 PickBuffer 的并行关系

- **`pickSurface`**：现有逻辑不变，用于 **pick id** 与 `readPixels` 命中。
- **`sceneColorSurface`**：**仅** 在「WebGL + 已注册后处理」时存在，承载 **可见场景颜色**，供后处理采样。

二者 **不得** 共用同一张 Surface，也 **不得** 用 pick 缓冲代替场景颜色输入。

```
subscribeAfterLayout
    ├─ pickBuffer.rebuild… / markDirty  （现有）
    └─ schedulePaint
            └─ paint()
                 ├─ [无后处理或 SW]  主 Canvas 直接 paintScene → flush
                 └─ [WebGL + 后处理] paintScene → sceneColorSurface
                        → snapshot Image
                        → 主 Canvas 全屏 SkSL pass → flush
```

---

## 对外 API 形态（草案）

在 `AttachSceneSkiaOptions`（或等价挂载选项）上增加可选字段，例如：

| 字段                                | 作用                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `postProcess`                       | 对象；存在且环境允许时表示启用后处理（见下）                                                                  |
| `postProcess.sksl`                  | **attach 时** 传入的 SkSL 源码字符串；**运行期不可换**                                                        |
| `postProcess.getUniforms`           | 每次执行后处理前调用，返回本帧 **uniform 键值**（类型需与 SkSL 声明一致；实现可约束为 `number` / 定长向量等） |
| `postProcess.getUniforms` 入参      | 建议包含 `width`、`height`、`dpr`（或等价 backing 信息），避免调用方重复读 DOM                                |
| `onPostProcessDisabled`（名称待定） | 当后处理被 **永久或策略性关闭** 时回调，原因例如：`software-surface`、`compile-failed`                        |

### `getUniforms` 的职责边界

- **只** 提供 **后处理数值参数**（指针、时间、强度等），**不** 承担布局或场景树逻辑。
- Core 负责将返回值 **按名** 填入 RuntimeEffect；**SkSL 与 uniform 名** 在文档中给出 **最小示例**（实现阶段定稿）。

### `onPostProcessDisabled` 的职责边界

- **compile-failed**：SkSL **首次编译失败** → 采用 **永久关闭** 该 effect、回退无后处理路径，**避免每帧重试**；回调一次（或按 reason 去重）。
- **software-surface**：进入 SW 路径时效果不可用；可在 **首次判定** 时回调，便于 v3 隐藏依赖透镜的 UI。

---

## 错误处理

| 情况                            | 行为                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| WebGL 不可用                    | 不启用后处理；不分配 `sceneColorSurface`                                    |
| SkSL 编译失败                   | 关闭后处理；主路径照常；`onPostProcessDisabled('compile-failed')`（或等价） |
| 运行时 uniform 缺失或类型不匹配 | 实现可定义：本帧跳过 effect 或回退；**须在实现计划中写清**                  |

---

## 测试策略

- **单元测试**：对 CanvasKit / WebGL 强依赖部分以 **mock** 为主，断言：选项传入、SW 路径不调后处理、compile 失败回调。
- **可选**：v3 smoke 或 lab 中最小可视化样例（实现阶段决定，**不** 阻塞本 spec）。

---

## 实现注意事项（非规范正文，供开发核对）

- **CanvasKit 版本**：`RuntimeEffect` / SkSL 入口签名、子 shader / 图像采样方式 **以仓库锁定的 `canvaskit-wasm` 为准**；实现前需对照类型定义或官方示例做一次 **API 核对**。
- **内存**：开启后处理时增加与视窗同尺寸的离屏缓冲；resize 时同步重建。
- **色彩空间 / 预乘**：全屏 pass 的 `Paint` 与图像着色器选项需与主屏一致，避免色差（实现阶段验证）。

---

## 范围外（明确不做）

- 多 pass 后处理链、泛型「材质系统」。
- 运行期热替换 SkSL 源码。
- 每帧 `readPixels` 到 CPU 再上传作为 **常规** 路径。
- 将后处理输入与 **`pickSurface`** 混用。

---

## 自检（spec 质量）

- **占位符**：无 TBD；RuntimeEffect 细节标为「实现核对 CanvasKit」属有意保留。
- **一致性**：先完整渲染场景再后处理；与 pick 分离。
- **范围**：单特性 + 明确排除项，适合单独 implementation plan。
