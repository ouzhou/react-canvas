# 文档索引

说明文档按 monorepo **npm 包**划分为主目录，**仓库级**（跨包）文档保留在 `docs/` 根下。  
**`docs/superpowers/`**（规格草案与实现计划）保持独立目录，**不**随包迁移。

---

## 仓库级（`docs/` 根目录）

| 文档                                                                                         | 说明                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [known-limitations.md](./known-limitations.md)                                               | 平台能力边界：缺陷 vs 非缺陷                                              |
| [development-roadmap.md](./development-roadmap.md)                                           | 分阶段路线图与验收                                                        |
| [text-input-naming.md](./text-input-naming.md)                                               | TextInput / Input 跨包命名约定                                            |
| [realtime-browser-code-execution-research.md](./realtime-browser-code-execution-research.md) | 浏览器内实时运行：路线与产品选型（React Live、Sandpack、WebContainer 等） |
| [live-code-preview-implementation.md](./live-code-preview-implementation.md)                 | 「改源码即预览」实现逻辑：dumi / Ant Design 文档与 react-live 对照        |

---

## `@react-canvas/core` — [docs/core/](./core/README.md)

场景树、Yoga、Skia、测量与排版相关说明。叠放与 `zIndex` 见 [core/z-index.md](./core/z-index.md)。

---

## `@react-canvas/react` — [docs/react/](./react/README.md)

Reconciler、HostConfig、场景树与 Yoga 对照、阶段一主设计等。

---

## `@react-canvas/ui` — [docs/ui/](./ui/README.md)

多框架范式调研与 **@react-canvas/ui** 设计结论（主题、样式、结构、样板）；实现规格见 `docs/superpowers/specs/`。

---

## 规格与计划（未移动）

| 路径                                       | 说明                                    |
| ------------------------------------------ | --------------------------------------- |
| [superpowers/specs/](./superpowers/specs/) | 阶段澄清、交互、多媒体、UI 包等设计规格 |
| [superpowers/plans/](./superpowers/plans/) | 对应实现计划                            |
