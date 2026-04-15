# React Canvas

Render React components directly to a `<canvas>`.

The API borrows from React Native’s component model and `style` props: Skia via CanvasKit (WASM) for drawing and Yoga for Flexbox layout, giving declarative, high-performance UI on the canvas.

**Website:** [react-canvas-design.vercel.app](https://react-canvas-design.vercel.app/)

**Other languages:** [简体中文](README.zh-CN.md)

### Architecture

```
JSX tree
    │  React custom reconciler
    ▼
Mutable scene tree (@react-canvas/core-v2)
    │  Yoga layout
    ▼
Skia / CanvasKit drawing → <canvas>
```

**`@react-canvas/react-v2`** uses a custom reconciler to mirror JSX mount/update/unmount into **`@react-canvas/core-v2`**’s mutable scene tree; core then walks the tree and drives Skia to paint on `<canvas>`.

### Design highlights

- **React Native–style primitives** — Host components (`View`, `Text`, …) and `style` objects instead of a low-level “stage + graphics primitives” API.
- **Skia** — CanvasKit (WASM) for GPU-accelerated 2D rendering.
- **Yoga** — Full Flexbox semantics, aligned with React Native layout behavior.
- **Layering** — `core-v2` owns the scene graph and render pipeline with no React dependency; `react-v2` wraps the reconciler, JSX types, and public API (`render`, `<Canvas>`, etc.).

For deeper modules (Runtime, Stage, events, …), see [`docs/core-design.md`](docs/core-design.md). That document still uses legacy package names `@react-canvas/core` / `@react-canvas/react`; they map to the `*-v2` packages in this repo.

### Repository layout

| Path                   | Package                         | Notes                                                       |
| ---------------------- | ------------------------------- | ----------------------------------------------------------- |
| `packages/core-v2`     | `@react-canvas/core-v2`         | Scene graph, Yoga, Skia pipeline                            |
| `packages/react-v2`    | `@react-canvas/react-v2`        | Reconciler, JSX types, public API                           |
| `apps/v3`              | `v3` (private app)              | Primary integration / demo UI (depends on workspace `*-v2`) |
| `apps/open-canvas-lab` | `open-canvas-lab` (private app) | Extended lab / playground UI (depends on workspace `*-v2`)  |
| `docs/`                | —                               | Design notes and archives                                   |

### Requirements

Local **Node.js** and **Git** should meet at least:

| Tool                           | Minimum version |
| ------------------------------ | --------------- |
| [Node.js](https://nodejs.org/) | **22.12.0**     |
| [Git](https://git-scm.com/)    | **2.32**        |

### Quick start

This monorepo uses **Vite+** (global CLI `vp`) and **pnpm** workspaces. Conventions are in [`AGENTS.md`](AGENTS.md).

```bash
# Install dependencies (prefer vp; avoid calling pnpm/npm/yarn for installs directly)
vp install

# Run the primary demo app (apps/v3)
pnpm run v3
# same as: vp run v3#dev

# Run the lab / playground app (apps/open-canvas-lab)
pnpm run lab
# same as: vp run open-canvas-lab#dev

# Format + lint + recursive tests + recursive build
pnpm run ready
```

Root-level `vp test` merges `test.setupFiles` from [`vite.config.ts`](vite.config.ts) so `react-v2` WASM mocks apply correctly.

### Stack

| Area       | Technology                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer   | [CanvasKit (Skia WASM)](https://skia.org/docs/user/modules/canvaskit/)                                                                                                                                   |
| Layout     | [Yoga](https://yogalayout.dev/)                                                                                                                                                                          |
| UI runtime | [React 19](https://react.dev/) + [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler) + [scheduler](https://github.com/facebook/react/tree/main/packages/scheduler) |
| Tooling    | [Vite+](https://vite.dev/) (`vite-plus`) · pnpm workspace                                                                                                                                                |

See [`AGENTS.md`](AGENTS.md) for toolchain and command rules.
