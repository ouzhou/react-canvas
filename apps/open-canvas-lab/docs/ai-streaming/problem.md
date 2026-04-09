# AI 流式渲染：问题分析

**日期：** 2026-04-09

---

## 1. 背景

mobile-app-lab 是一个类 Figma 的工具，接入 AI（DeepSeek）生成/编辑 TSX 代码并通过 React Canvas 实时预览手机 App 界面。

---

## 2. 当前架构

### 2.1 数据流

```
用户在聊天框输入指令
  ↓
useMobileAppLabTsxStreamChat → generateText({ model, tools, maxSteps: 12 })
  ↓
AI 调用工具：
  - set_lab_tsx(code)       → 全量替换 TSX 字符串
  - replace_lab_tsx(old, new) → 唯一匹配替换
  - read_lab_tsx_slice(...)  → 读取行范围
  ↓
setAppliedCode(完整 TSX 字符串)
  ↓
LiveProvider (react-live) → Babel transform + eval → React 组件树
  ↓
React Reconciler → ViewNode 增删改 → Yoga layout → Skia paint
  ↓
画布更新
```

### 2.2 代码组织

所有页面（ProductDetail、Cart、Explore、Search、Filters、Favorites 等）混在 **一个 ~3000 行的 TSX 字符串** 中，包含：

- 共享常量（`PHONE_W=340`、品牌色等）
- 6-7 个页面组件函数
- 一个顶层 IIFE 将它们组装在一起

---

## 3. 问题

### 3.1 以"新增一个页面"为例

```
用户："帮我新增一个收藏页面"
  │
  ├── AI 上下文：3000 行全部代码塞进 system prompt
  │
  ├── AI 输出：一次性返回 ~3500 行（原有 6 页 + 新增 1 页）
  │   └── 用 set_lab_tsx 全量替换
  │
  ├── generateText 阻塞等所有 step 完成（~5-10 秒）
  │   └── 期间画布完全无反馈
  │
  └── react-live 拿到 3500 行 → Babel + eval → 画布一次性跳变
```

### 3.2 三个连锁问题

| 问题           | 根因                                                                 | 影响                                                  |
| -------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| **等待时间长** | `generateText` 阻塞等所有 step 完成；AI 输出 3500 行 token 本身耗时  | 用户等 5-10 秒，画布无任何反馈                        |
| **浪费 token** | 用户只想加 1 个页面（~300 行），AI 却要输出全部 7 个页面（~3500 行） | 输入输出 token 是实际需求的 ~7 倍，费用和延迟线性放大 |
| **容错差**     | 3500 行中任一字符出错，`LiveProvider` 整体 eval 失败                 | 一个错误 → 全屏白                                     |

### 3.3 以"修改某页面样式"为例

```
用户："把购物车页面改成深色主题"
  │
  ├── AI 可以用 replace_lab_tsx 做局部替换（好的情况）
  │   └── 但 AI 上下文仍然要塞入全部 3000 行
  │
  └── 如果改动较多，AI 倾向用 set_lab_tsx 全量替换（差的情况）
      └── 同样输出 3000 行，浪费 token + 等待
```

### 3.4 根因总结

```
根因：代码的组织粒度太粗
  │
  ├── 6 个页面混在 1 个字符串里
  │   ├── AI 没有"页面"概念 → 只能全量读写
  │   ├── eval 没有"页面"概念 → 只能全量编译
  │   └── 错误没有"页面"隔离 → 一错全崩
  │
  └── generateText 是阻塞 API
      └── 即使 AI 分多步 tool call，也要等全部完成才返回结果
```

---

## 4. 理想目标

```
用户："帮我新增一个收藏页面"
  │
  ├── t=0s    画布出现空白页面框（骨架）
  ├── t=0.5s  导航栏出现
  ├── t=1.2s  列表区域出现
  ├── t=2.0s  底部按钮出现
  └── t=2.5s  页面完成 ✅

  全程：
  - 画布实时有反馈
  - AI 只输出新增页面的代码（~300 行），不碰其他 6 个页面
  - 某步出错只影响本步，不影响已有页面
  - Token 用量 ≈ 实际改动量
```

---

## 5. 两个方案

针对以上问题，有两个方向的解法。两者共享同一套基础数据结构（Page Slots），区别在于 **页面内如何实现流式渲染**：

|          | [方案 A：流式参数解析](./solution-a-partial-eval.md)     | [方案 B：小粒度 Tool 调用](./solution-b-multi-tool.md)                    |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 思路     | 监听 AI tool 参数的 token 流，截断 + 补全闭合标签 + eval | 让 AI 把 1 个页面拆成多个小 tool call（create_page → 多次 add_component） |
| 粒度     | 以 JSX 标签为单位（最细）                                | 以 tool call 为单位（一个 UI 区块）                                       |
| 复杂度   | 高（截断检测、闭合补全、partial JSON 解析）              | **低**（每次 execute 的代码都完整）                                       |
| AI 配合  | 不需要                                                   | 需要 System Prompt 引导拆步                                               |
| 依赖     | `experimental_streamToolCalls`（实验性 API）             | 标准 `streamText`（稳定 API）                                             |
| 首屏时间 | ~0.3s                                                    | ~1.0s                                                                     |
| 容错     | 自行处理截断 eval 失败                                   | 天然容错                                                                  |
| 推荐度   | 备选                                                     | **推荐**                                                                  |
