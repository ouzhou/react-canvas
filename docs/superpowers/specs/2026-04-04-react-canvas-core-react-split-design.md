# React Canvas：Core / React 拆分与第一阶段设计

**日期：** 2026-04-04  
**修订：** 渲染后端定为 **Skia（CanvasKit，WebAssembly）**，见下文 §1.3。  
**状态：** 设计已定稿（实现前以本 spec 为准；若有变更再走修订流程）

## 1. 目标与非目标

### 1.1 产品目标

- 用 **React 组件** 在网页上绘制内容；**渲染后端为 Skia**，通过 **[CanvasKit](https://skia.org/docs/user/modules/canvaskit/)**（Skia + WebAssembly）输出到 **HTML `<canvas>`**（WebGL 封装为 `SkSurface`，见官方模块说明）。
- **节点模型**对标 **React Native / 类 HTML**：层级嵌套的 **容器节点**（从 `View` 起步）、**`style` 对象**，而不是 Konva 式的「舞台 + 图形原语」API。
- **实现分层**上仍可参考 Konva / react-konva / @pixi/react（**可变场景树 + reconciler 同步**），但 **对外叙事与 API 形态以 RN 式为主**，不以 Stage/Layer/Shape 为范本。

### 1.2 明确延后（不在第一阶段实现）

- Yoga 布局、通用 CSS 布局/解析、文本节点、`Text`/`Image` 等更多宿主类型（除本阶段约定的 `View` 外）。
- 上述项仅在文档中列为后续阶段，避免第一阶段范围膨胀。

### 1.3 渲染后端决策（已定）

- **不采用**浏览器 **`CanvasRenderingContext2D`** 作为主渲染路径：在复杂场景下 **性能与一致性** 不足。
- **不采用**手写 **WebGL / WebGPU** 裸管线：**复杂度过高**，维护成本不符合当前目标。
- **采用 CanvasKit**：在保持 **声明式 / 高级绘制 API** 的同时，获得 **硬件加速** 与 Skia 生态能力（路径、文本、着色器等由 Skia 提供；具体绑定以所选 npm 包与类型定义为准）。官方概述见 [CanvasKit - Skia + WebAssembly](https://skia.org/docs/user/modules/canvaskit/)。

## 2. 包结构

### 2.1 两个 npm 包（名称暂定）

| 包名                  | 职责                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@react-canvas/core`  | 无 `react` / `react-reconciler` 依赖；场景树（类/可变树）、**基于 CanvasKit 的绘制与资源初始化**、与 **`HTMLCanvasElement` + Skia 表面** 的绑定（尺寸、DPR、resize；**不**以 `CanvasRenderingContext2D` 为唯一绘制接口）。 |
| `@react-canvas/react` | 依赖 `@react-canvas/core`、`react-reconciler`、`scheduler`；`peerDependencies`: `react`。JSX 宿主类型、`<Canvas>`、`render` 等。                                                                                           |

**说明：** npm scope `@react-canvas` 的注册与发布不在本阶段阻塞实现；若后续需更名，仅改 `package.json` 的 `name` 与文档，不改变本 spec 中的架构边界。

**CanvasKit 依赖：** `canvaskit-wasm`（或团队锁定的等价包名/版本）由 **core** 引入；实现阶段需明确 **Vite 对 `.wasm` 的加载方式** 与 **异步初始化**（`Init`）在应用与测试中的挂载点。

### 2.2 仓库布局（建议）

- `packages/core` → 发布为 `@react-canvas/core`
- `packages/react` → 发布为 `@react-canvas/react`
- `apps/website` 依赖 `@react-canvas/react`（workspace 链接），作为演示与手工验收。

## 3. Core 层（第一阶段）

### 3.1 职责

- 维护 **可变场景树**（类实例 + 子节点列表），支持命令式增删改（由 React 层 reconciler 调用，而非最终用户常用路径）。
- 提供 **整树或根触发的绘制入口**（例如提交后全量 `paint`；第一阶段保持与当前「`resetAfterCommit` 后重绘」一致即可），**内部通过 CanvasKit / `SkCanvas`（或项目内封装的等价接口）** 完成绘制。
- **初始化与销毁**：封装 CanvasKit **WASM 加载与 `Init`**，以及 **surface 与 DOM canvas 尺寸、设备像素比** 的同步；具体 API 在实现计划中对照所选 CanvasKit 版本写清。
- **`View` 节点**：承载 `style`（第一阶段至少支持已有能力，如 `backgroundColor`）与子节点列表；映射到 Skia 绘制命令（矩形填充等）在实现计划中定义。

### 3.2 非职责

- 不包含 Fiber、不包含 JSX 运行时。

## 4. React 层（第一阶段）

### 4.1 宿主类型

- 字符串宿主 **`View`**（与现有设计一致），类型增强文件随包放在 `@react-canvas/react`。

### 4.2 推荐使用方式：根组件 `Canvas`

- 对外 **主路径**：**`<Canvas>`** 组件负责：
  - 渲染 DOM **`<canvas>`**（可转发 `className`、`style`、`width`、`height` 等常见 DOM 属性，具体以实现时类型定义为准；与 **core 中 surface / DPR / resize** 行为一致，像素尺寸与 CSS 尺寸的交互在实现计划中写清）；
  - 使用 **ref** 与 **effect**（优先 **`useLayoutEffect`**，减少首帧闪烁；**CanvasKit 异步初始化** 需在 UI 上体现 loading/占位或延迟挂载 reconciler，避免白屏或未定义行为；若存在 SSR/仅客户端约束，在文档中说明）将自定义 renderer 挂载到该 canvas；
  - **`children`** 为画布内的 RN 式子树（如 `<View style={...} />`）；
  - 卸载时执行 **unmount**，释放 Skia / GL 相关资源，避免泄漏。

### 4.3 底层 API（保留）

- 保留 **`render(element, canvasElement)`**（及 `unmount` 句柄），用于测试、headless、多实例或特殊集成（调用方需满足 **CanvasKit 已就绪** 或与测试替身协作）。
- 文档与官网示例以 **`<Canvas>` + children** 为主，不推荐应用代码在 `useEffect` 中手写 `render(…, canvas)` 作为默认模式。

## 5. 测试策略（必须使用 Vite+）

- 所有测试通过 **`vp test`** 运行；测试代码从 **`vite-plus/test`** 引入 `test` / `expect` / `vi` 等，与仓库 `AGENTS.md` 及现有用例一致。配置放在 **`vite.config.ts` 的 `test` 字段**（[Vite+ Test 指南](https://viteplus.dev/guide/test)），不单独维护 `vitest.config.ts`。

### 5.1 与 Canvas2D 方案的差异

- **不再**以 mock **`CanvasRenderingContext2D`** 作为 core 的主断言面；改为 mock **core 对外暴露的绘制抽象**（例如 `Renderer` / `paint(scene, backend)` 的接口），或对 **CanvasKit 初始化结果注入可替换的 test double**（避免每个用例拉完整 WASM，除非少数集成测刻意为之）。

### 5.2 分层建议

- **Core（默认）：** 在 **`node`** 环境下以 **纯 TS 逻辑 + mock 后端** 测场景树与「下发到后端的绘制指令」；**不依赖** WebGL。
- **React：** **`jsdom`（或 `happy-dom`）+ `react-dom` + `@testing-library/react`**，至少一条集成测挂载 `<Canvas><View … /></Canvas>`；**CanvasKit 未加载时**可用 fake backend 或跳过需 WASM 的断言（在实现计划中约定统一模式）。
- **可选加强：** 少量 **真实浏览器**（Vitest Browser / Playwright）或 **真 CanvasKit 初始化** 用例，用于回归 **WASM 加载、DPR、resize**；**不作为** CI 唯一依赖，数量保持极少。
- **Website：** 保留为手工/视觉验收；**不作为** CI 唯一依赖。

## 6. 第二阶段（简述，本阶段不实现）

- 引入 **Yoga** 与 **样式子集**，使布局与排布更接近 HTML/CSS 体验，并与 RN 式 `style` 对象演进路径一致。

## 7. 验收标准（第一阶段）

- Monorepo 中 **`@react-canvas/core` 与 `@react-canvas/react` 可独立构建**，workspace 内引用正常。
- `apps/website` 使用 **`<Canvas>`** 展示至少一个 **`<View style={{ backgroundColor: … }} />`**，且 **CanvasKit 成功初始化并绘制到 `<canvas>`**。
- **Core 与 React 包均具备**基于 **vite-plus/test** 的自动化测试，且 `vp test` 在仓库级可通过（以实际任务配置为准）。
- **不引入** Yoga、通用 CSS 解析、文本宿主类型（除本 spec 已列范围外）。
