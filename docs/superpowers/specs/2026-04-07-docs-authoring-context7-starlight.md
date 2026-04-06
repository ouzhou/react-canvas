# 文档撰写：Context7 + Starlight 内置组件 — 设计约定

**日期：** 2026-04-07  
**状态：** 已定稿（与对话结论一致）  
**范围：** `apps/website` 内 **MDX 文档** 使用 **@astrojs/starlight** 内置组件时的流程约束；**不**改变 Starlight 或 Astro 版本策略。

---

## 1. 规则

1. 凡需在文档站使用 **Starlight 内置组件**（例如 `Card`、`CardGrid`、`Tabs`、`TabItem`、`Steps`、`Badge`、`LinkCard`、`Aside` 等），**必须先**通过 **Context7** 查询库 **`/withastro/starlight`**，核对 **import 路径、组件名、props、示例** 与当前所用 Starlight 主版本兼容。
2. **禁止**为上述场景 **自行实现** 可替代的通用文档组件（自定义 Astro/React 包装），除非经单独规格批准且说明与上游分叉的理由与升级策略。
3. 若 Context7 结果不足，以 [starlight.astro.build](https://starlight.astro.build/) 官方文档为准补全。

---

## 2. 落点

- **作者向说明**：`apps/website/src/content/docs/intro/authoring.mdx` 已写入同条约定，供日常撰写对照。

---

## 3. 非目标

- 不规定每次查询的具体 Context7 提示词模板。
- 不要求为历史 MDX 一次性全部复查；新稿与重大改版时遵守即可。
