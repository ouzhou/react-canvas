# v3 Popover（基于 Modal）设计

## 目标与范围

在 `apps/v3` 实现 demo 级 `Popover`，并新增一个 smoke 页面用于验证。

本次只覆盖：

- 基于 `Modal` 槽位承载浮层
- 打开/关闭交互（trigger toggle + click away）
- 四向定位（`top` / `bottom` / `left` / `right`）
- 基础边界修正（平移回可见区，不做自动翻转）
- 滚动即关闭（策略 A）

不覆盖：

- 动画
- 通用库导出（`packages/react-v2` 的正式对外 API）
- 自动翻转与复杂 fallback 策略

---

## 设计决策

### 决策 1：使用 Modal 槽位承载 Popover

- Popover 内容渲染在 `scene-modal`，通过透明 backdrop 实现 click-away。
- 选择该方案的原因：
  - 避免被业务树祖先 `overflow` 裁剪
  - 顶层命中与层级更稳定
  - 外部点击关闭路径简单明确

### 决策 2：滚动策略采用 A（滚动即关闭）

- 任意关联滚动发生时，立即关闭 Popover。
- 不做滚动跟随重算，降低 v3 demo 实现复杂度。

### 决策 3：定位能力采用“4 向 + 边界平移修正”

- 支持 `top | bottom | left | right`。
- 当面板越界时，仅做平移回可见区，不改变 placement（不自动翻转）。

---

## 组件与文件结构

## `smoke/components/popover.tsx`

新增 demo 级 `Popover` 组件（仅用于 `apps/v3`）。

建议 props：

- `open: boolean`
- `onOpenChange(next: boolean): void`
- `triggerRect: { left: number; top: number; width: number; height: number } | null`
- `placement: "top" | "bottom" | "left" | "right"`
- `offset?: number`（默认 8）
- `viewportW: number`
- `viewportH: number`
- `content: ReactNode`
- `children?: ReactNode`（可选，用于扩展）

职责：

- 渲染透明 `Modal` backdrop，并处理 click-away 关闭
- 计算面板坐标并渲染面板
- 内部点击不触发关闭

## `smoke/lib/compute-popover-position.ts`

新增定位纯函数，输入为几何数据，输出最终 `left/top`：

- 先按 placement 计算理想位置
- 再做可视区 clamp：
  - `left ∈ [padding, viewportW - panelW - padding]`
  - `top ∈ [padding, viewportH - panelH - padding]`

该函数保持无副作用，便于后续单测或复用。

## `smoke/scenes/popover-demo-scene.tsx`

新增测试场景，负责：

- 4 个 trigger（四向）
- 打开/关闭状态管理
- 记录日志（打开、关闭、外部关闭、滚动关闭）
- 提供一个可滚动区域用于验证“滚动即关闭”

---

## 页面接入改动

需要在以下位置注册 `popover` demo：

- `apps/v3/src/smoke-types.ts`
  - 扩展 `SmokeDemoId` 增加 `"popover"`
  - URL 解析支持 `demo=popover`
- `apps/v3/src/demo-dimensions.ts`
  - 增加 `DEMO_POPOVER` 尺寸常量
- `apps/v3/src/smoke/demo-stage.ts`
  - `demoStageSize` 支持 `popover`
- `apps/v3/src/smoke/hooks/use-demo-catalog.tsx`
  - 增加导航标题与描述
- `apps/v3/src/react-smoke.tsx`
  - 导入并挂载 `PopoverDemoScene`
  - 新增日志分支（与 pointer/modal 保持一致风格）

---

## 交互时序

1. 点击 trigger：
   - 若关闭 -> 记录当前 trigger 与 placement，打开
   - 若打开且同 trigger -> 关闭
   - 若打开且不同 trigger -> 切换 anchor 与 placement，保持打开
2. 点击 popover panel 内部：
   - 不关闭
3. 点击 backdrop（panel 外部）：
   - 关闭
4. 发生滚动：
   - 关闭（策略 A）

---

## 错误处理与边界条件

- `triggerRect` 为空时不渲染 panel（避免无效定位）
- 面板尺寸大于可视区时，优先保证面板左上角可见（按 clamp 规则）
- demo 切换时强制关闭，避免状态残留
- backdrop 与 panel 事件边界需明确，防止“点击 panel 被判定为外部点击”

---

## 验收标准

- 可通过 4 个触发器打开对应方向 Popover
- 面板不超出可视区（允许贴边）
- trigger 再点可关闭
- 点外部关闭，点内部不关闭
- 触发滚动后立即关闭
- 与场景其他交互块叠放时命中行为正确

---

## 风险与后续演进

当前为 v3 demo 方案，已知取舍：

- 滚动场景体验不如“跟随重算”
- 未实现自动翻转
- 组件 API 暂不对外承诺稳定

后续如进入 `packages/react-v2` 正式化，可在此基础补齐：

- 滚动/布局变化实时重定位
- 自动翻转与 fallback placement
- 统一浮层管理（多 Popover/Tooltip/Dropdown 并存）
