# 文本输入：跨包命名约定

**日期：** 2026-04-07  
**状态：** 已定稿（实现前约定）

---

## 决议

| 包                    | 对外概念名    | 说明                                                                                                                                                        |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@react-canvas/core`  | **TextInput** | 场景树中的宿主节点：实现上为 `TextInputNode` 类，reconciler / 场景 `type` 字符串为 **`"TextInput"`**，与现有 `View` / `ViewNode`、`"View"` 的对应关系一致。 |
| `@react-canvas/react` | **TextInput** | JSX 宿主组件 **`<TextInput />`**，HostConfig 创建 / 更新 `TextInputNode`；DOM 输入桥接（如隐藏 `<input>`）归属本包，不进入 core。                           |
| `@react-canvas/ui`    | **Input**     | 设计系统层可复用组件（主题、标签、错误态、默认样式等），内部组合 **`@react-canvas/react` 的 `TextInput`**。                                                 |

---

## 与 `core/src/input/` 的区别

`packages/core/src/input/` 表示 **指针 / 命中 / 事件分发** 等交互管线，**不是** 文本框业务类型。  
**TextInput** 指 **可编辑文本的宿主节点与 React 封装**；实现时避免把二者混在同一目录语义下（例如文本编辑相关模块使用独立子路径，如 `scene/text-input-node.ts`、`editing/` 等，与现有 `input/` 并列）。

---

## 参考

- [react-canvas-ui-design.md](./ui/react-canvas-ui-design.md) — DOM 浮层与画布分工。
- [hostconfig-guide.md](./react/hostconfig-guide.md) — HostConfig 与场景节点关系。
