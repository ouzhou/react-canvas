# React Canvas

**其他语言：** [English](README.md)

**官网：** [react-canvas-design.vercel.app](https://react-canvas-design.vercel.app/)

用 React 组件直接渲染到 Canvas 画布。

借鉴 React Native 的组件体系与 `style` 属性设计，通过 Skia（CanvasKit WASM）绘制、Yoga 驱动 Flexbox 布局，在浏览器 `<canvas>` 上实现高性能的声明式 UI。

### 架构

```
JSX 组件树
    │  React custom reconciler
    ▼
可变场景树（@react-canvas/core-v2）
    │  Yoga 布局计算
    ▼
Skia / CanvasKit 绘制 → <canvas>
```

**`@react-canvas/react-v2`** 通过 custom reconciler 将 JSX 的增删改同步到 **`@react-canvas/core-v2`** 的可变场景树；core 再按树结构驱动 Skia 在 `<canvas>` 上绘制。

### 核心设计

- **React Native 式组件模型** — 宿主类型（`View`、`Text` 等）+ `style` 对象描述外观与布局，而非「舞台 + 图形原语」式 API。
- **Skia 绘制** — 经 CanvasKit（WASM）接入，提供 GPU 加速的 2D 渲染能力。
- **Yoga 布局** — 完整的 Flexbox 布局引擎，支持与 React Native 一致的布局语义。
- **分层解耦** — `core-v2` 只维护场景树与绘制管线，不依赖 React；`react-v2` 封装 reconciler、JSX 类型与入口 API（`render`、`<Canvas>` 等）。

更完整的模块划分、Runtime/Stage/事件等说明见 [`docs/core-design.md`](docs/core-design.md)（文中部分包名仍写作历史名称 `@react-canvas/core` / `react`，与仓库内 `*-v2` 包一一对应）。

### 仓库结构

| 路径                   | 包名                          | 说明                                             |
| ---------------------- | ----------------------------- | ------------------------------------------------ |
| `packages/core-v2`     | `@react-canvas/core-v2`       | 场景树、Yoga 布局、Skia 绘制管线                 |
| `packages/react-v2`    | `@react-canvas/react-v2`      | React reconciler、JSX 类型、入口 API             |
| `apps/v3`              | `v3`（私有应用）              | 主要联调与示例界面（依赖 workspace 中的 v2 包）  |
| `apps/open-canvas-lab` | `open-canvas-lab`（私有应用） | 扩展实验 / 演练界面（依赖 workspace 中的 v2 包） |
| `docs/`                | —                             | 设计文档与归档说明                               |

### 环境要求

请保证本地 **Node.js**、**Git** 的版本**不低于**下表（满足即可，无需完全一致）。

| 工具                           | 推荐最低版本 |
| ------------------------------ | ------------ |
| [Node.js](https://nodejs.org/) | **22.12.0**  |
| [Git](https://git-scm.com/)    | **2.32**     |

### 快速开始

本仓库使用 **Vite+**（全局 CLI `vp`）与 **pnpm** workspace。依赖与脚本约定详见 [`AGENTS.md`](AGENTS.md)。

```bash
# 安装依赖（推荐用 vp，勿直接用 pnpm/npm/yarn 装包）
vp install

# 启动主要示例应用（apps/v3）
pnpm run v3
# 等价：vp run v3#dev

# 启动实验 / 演练应用（apps/open-canvas-lab）
pnpm run lab
# 等价：vp run open-canvas-lab#dev

# 格式化、lint、递归测试、递归构建（根 package.json 的 ready 脚本）
pnpm run ready
```

根目录的 `vp test` 会合并 [`vite.config.ts`](vite.config.ts) 中的 `test.setupFiles`，以保证 `react-v2` 侧 WASM mock 等配置生效。

### 技术栈

| 领域     | 技术                                                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 渲染引擎 | [CanvasKit (Skia WASM)](https://skia.org/docs/user/modules/canvaskit/)                                                                                                                                   |
| 布局引擎 | [Yoga](https://yogalayout.dev/)                                                                                                                                                                          |
| UI 框架  | [React 19](https://react.dev/) + [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler) + [scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) |
| 工具链   | [Vite+](https://vite.dev/)（`vite-plus`）· pnpm workspace                                                                                                                                                |

工具链与命令约定见 [`AGENTS.md`](AGENTS.md)。
