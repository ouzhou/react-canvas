# React Canvas

用 React 组件直接渲染到 Canvas 画布。

借鉴 React Native 的组件体系与 `style` 属性设计，通过 Skia（CanvasKit WASM）绘制、Yoga 驱动 Flexbox 布局，在浏览器 `<canvas>` 上实现高性能的声明式 UI。

## 架构

```
JSX 组件树
    │  React custom reconciler
    ▼
可变场景树（@react-canvas/core）
    │  Yoga 布局计算
    ▼
Skia / CanvasKit 绘制 → <canvas>
```

**`@react-canvas/react`** 通过 custom reconciler 将 JSX 的增删改同步到 **`@react-canvas/core`** 的可变场景树；core 再按树结构驱动 Skia 在 `<canvas>` 上绘制。

## 核心设计

- **React Native 式组件模型** — 宿主类型（`View`、`Text` 等）+ `style` 对象描述外观与布局，而非「舞台 + 图形原语」式 API。
- **Skia 绘制** — 经 CanvasKit（WASM）接入，提供 GPU 加速的 2D 渲染能力。
- **Yoga 布局** — 完整的 Flexbox 布局引擎，支持与 React Native 一致的布局语义。
- **分层解耦** — `core` 只维护场景树与绘制管线，不依赖 React；`react` 封装 reconciler、JSX 类型与入口 API（`render`、`<Canvas>` 等）。

## 仓库结构

| 路径 | 包名 | 说明 |
| --- | --- | --- |
| `packages/core` | `@react-canvas/core` | 场景树、Yoga 布局、Skia 绘制管线 |
| `packages/react` | `@react-canvas/react` | React reconciler、JSX 类型、入口 API |
| `apps/website` | — | 文档站（Astro Starlight） |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动文档站开发服务器
pnpm dev

# 格式化 + 检查 + 测试 + 构建
pnpm run ready
```

> 以上示例使用 pnpm，也可以换成 npm / yarn 等任意包管理工具——实际执行的是 `package.json` 中定义的 scripts。

## 技术栈

| 领域 | 技术 |
| --- | --- |
| 渲染引擎 | [CanvasKit (Skia WASM)](https://skia.org/docs/user/modules/canvaskit/) |
| 布局引擎 | [Yoga](https://yogalayout.dev/) |
| UI 框架 | [React 19](https://react.dev/) + [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler) + [scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) |
| 工具链 | [Vite+](https://vite.dev/) · pnpm workspace |

工具链与命令约定见 [`AGENTS.md`](AGENTS.md)。
