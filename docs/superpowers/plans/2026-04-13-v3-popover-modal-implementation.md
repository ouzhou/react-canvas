# v3 Popover (Modal-based) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/v3` 增加基于 `Modal` 的 demo 级 `Popover` 组件，并新增一个 smoke 页面验证定位、关闭行为和层级命中。

**Architecture:** `Popover` 通过 `scene-modal` 槽渲染浮层，透明 backdrop 负责 click-away；定位逻辑下沉为纯函数，支持四向定位与视口内边界修正（不翻转）。测试页通过四个 trigger 验证行为，并在滚动时按策略 A 直接关闭 Popover。

**Tech Stack:** React、TypeScript、`@react-canvas/react-v2`、Vite+ (`vp`)、Vitest

---

## File Structure

- Create: `apps/v3/src/smoke/lib/compute-popover-position.ts`（Popover 几何定位纯函数）
- Create: `apps/v3/src/smoke/components/popover.tsx`（demo 级 Popover 组件，Modal 承载）
- Create: `apps/v3/src/smoke/scenes/popover-demo-scene.tsx`（测试场景）
- Create: `apps/v3/src/smoke/lib/compute-popover-position.test.ts`（定位函数测试）
- Modify: `apps/v3/src/smoke-types.ts`（新增 `popover` demo id）
- Modify: `apps/v3/src/demo-dimensions.ts`（新增舞台尺寸）
- Modify: `apps/v3/src/smoke/demo-stage.ts`（接入新尺寸分支）
- Modify: `apps/v3/src/smoke/hooks/use-demo-catalog.tsx`（导航与说明）
- Modify: `apps/v3/src/react-smoke.tsx`（挂载场景 + 日志）

---

### Task 1: 定位函数与测试先行（TDD）

**Files:**

- Create: `apps/v3/src/smoke/lib/compute-popover-position.ts`
- Create: `apps/v3/src/smoke/lib/compute-popover-position.test.ts`

- [ ] **Step 1: 写失败测试（四向 + clamp）**

```ts
import { describe, expect, it } from "vite-plus/test";
import { computePopoverPosition } from "./compute-popover-position";

describe("computePopoverPosition", () => {
  const viewport = { width: 300, height: 200 };
  const trigger = { left: 120, top: 80, width: 40, height: 24 };
  const panel = { width: 100, height: 60 };

  it("places bottom and keeps x centered by default", () => {
    const p = computePopoverPosition({
      placement: "bottom",
      triggerRect: trigger,
      panelSize: panel,
      viewportSize: viewport,
      offset: 8,
      padding: 8,
    });
    expect(p.left).toBe(90);
    expect(p.top).toBe(112);
  });

  it("clamps into viewport when overflowing right", () => {
    const p = computePopoverPosition({
      placement: "right",
      triggerRect: { left: 270, top: 20, width: 20, height: 20 },
      panelSize: panel,
      viewportSize: viewport,
      offset: 8,
      padding: 8,
    });
    expect(p.left).toBe(192);
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `vp test apps/v3/src/smoke/lib/compute-popover-position.test.ts`  
Expected: FAIL，提示 `computePopoverPosition` 未实现或断言不通过。

- [ ] **Step 3: 写最小实现**

```ts
export type PopoverPlacement = "top" | "bottom" | "left" | "right";

export function computePopoverPosition(input: {
  placement: PopoverPlacement;
  triggerRect: { left: number; top: number; width: number; height: number };
  panelSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  offset?: number;
  padding?: number;
}): { left: number; top: number } {
  const { placement, triggerRect, panelSize, viewportSize } = input;
  const offset = input.offset ?? 8;
  const padding = input.padding ?? 8;

  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  let left = triggerCenterX - panelSize.width / 2;
  let top = triggerRect.top + triggerRect.height + offset;

  if (placement === "top") top = triggerRect.top - panelSize.height - offset;
  if (placement === "left") {
    left = triggerRect.left - panelSize.width - offset;
    top = triggerCenterY - panelSize.height / 2;
  }
  if (placement === "right") {
    left = triggerRect.left + triggerRect.width + offset;
    top = triggerCenterY - panelSize.height / 2;
  }

  const minLeft = padding;
  const minTop = padding;
  const maxLeft = Math.max(padding, viewportSize.width - panelSize.width - padding);
  const maxTop = Math.max(padding, viewportSize.height - panelSize.height - padding);

  return {
    left: Math.min(maxLeft, Math.max(minLeft, Math.round(left))),
    top: Math.min(maxTop, Math.max(minTop, Math.round(top))),
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `vp test apps/v3/src/smoke/lib/compute-popover-position.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/v3/src/smoke/lib/compute-popover-position.ts apps/v3/src/smoke/lib/compute-popover-position.test.ts
git commit -m "test(v3): add popover position utility with viewport clamp"
```

---

### Task 2: Popover 组件（Modal 承载）

**Files:**

- Create: `apps/v3/src/smoke/components/popover.tsx`
- Modify: `apps/v3/src/smoke/lib/compute-popover-position.ts`（若需要补类型导出）

- [ ] **Step 1: 写组件行为测试（最小）**

```ts
// 若当前仓库未建立组件测试基建，可先以函数级测试为主，
// 本步骤改为在 scene 集成里做行为验收断言（见 Task 5）。
```

- [ ] **Step 2: 实现 Popover 组件**

```tsx
import { Modal, View } from "@react-canvas/react-v2";
import type { ReactNode } from "react";
import { computePopoverPosition, type PopoverPlacement } from "../lib/compute-popover-position";

export function Popover(props: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  triggerRect: { left: number; top: number; width: number; height: number } | null;
  placement: PopoverPlacement;
  viewportW: number;
  viewportH: number;
  panelW: number;
  panelH: number;
  content: ReactNode;
}) {
  const {
    open,
    onOpenChange,
    triggerRect,
    placement,
    viewportW,
    viewportH,
    panelW,
    panelH,
    content,
  } = props;
  if (!open || !triggerRect) return null;

  const { left, top } = computePopoverPosition({
    placement,
    triggerRect,
    panelSize: { width: panelW, height: panelH },
    viewportSize: { width: viewportW, height: viewportH },
  });

  return (
    <Modal visible={open} transparent onRequestClose={() => onOpenChange(false)}>
      <View
        id="popover-panel"
        style={{
          position: "absolute",
          left,
          top,
          width: panelW,
          height: panelH,
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
      >
        {content}
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: 手工验证 click-away 与内部点击**

Run: `vp dev apps/v3`  
Expected: 点击浮层外部触发关闭；点击浮层内部不触发 `onRequestClose`。

- [ ] **Step 4: 提交**

```bash
git add apps/v3/src/smoke/components/popover.tsx apps/v3/src/smoke/lib/compute-popover-position.ts
git commit -m "feat(v3): add modal-based demo popover component"
```

---

### Task 3: 新增 Popover demo scene

**Files:**

- Create: `apps/v3/src/smoke/scenes/popover-demo-scene.tsx`

- [ ] **Step 1: 先写场景骨架与状态模型**

```tsx
const [open, setOpen] = useState(false);
const [activePlacement, setActivePlacement] = useState<"top" | "bottom" | "left" | "right">(
  "bottom",
);
const [activeTriggerRect, setActiveTriggerRect] = useState<Rect | null>(null);
```

- [ ] **Step 2: 增加四个 trigger 与 toggle 行为**

```tsx
function onTriggerClick(nextPlacement: Placement, rect: Rect) {
  if (open && activePlacement === nextPlacement) {
    setOpen(false);
    return;
  }
  setActivePlacement(nextPlacement);
  setActiveTriggerRect(rect);
  setOpen(true);
}
```

- [ ] **Step 3: 接入 Popover 与日志回调**

```tsx
<Popover
  open={open}
  onOpenChange={(next) => {
    setOpen(next);
    onLog(next ? "popover opened" : "popover closed");
  }}
  placement={activePlacement}
  triggerRect={activeTriggerRect}
  viewportW={viewportW}
  viewportH={viewportH}
  panelW={220}
  panelH={132}
  content={<View>{/* panel content */}</View>}
/>
```

- [ ] **Step 4: 接入“滚动即关闭”**

Run in scene logic:

```ts
useEffect(() => {
  if (!open) return;
  setOpen(false);
  onLog("popover closed by scroll");
}, [scrollSignal]);
```

Expected: 滚动发生后 Popover 立刻关闭。

- [ ] **Step 5: 提交**

```bash
git add apps/v3/src/smoke/scenes/popover-demo-scene.tsx
git commit -m "feat(v3): add popover smoke scene with scroll-close behavior"
```

---

### Task 4: 接入 smoke 导航与舞台

**Files:**

- Modify: `apps/v3/src/smoke-types.ts`
- Modify: `apps/v3/src/demo-dimensions.ts`
- Modify: `apps/v3/src/smoke/demo-stage.ts`
- Modify: `apps/v3/src/smoke/hooks/use-demo-catalog.tsx`

- [ ] **Step 1: 注册 demo id 与 URL 解析**

```ts
export type SmokeDemoId /* ... */ = "popover";
// readDemoSearch 增加 raw === "popover"
```

- [ ] **Step 2: 增加 DEMO_POPOVER 尺寸并接入 demoStageSize**

```ts
export const DEMO_POPOVER = { w: 620, h: 420 } as const;
```

- [ ] **Step 3: 增加导航文案**

```ts
{
  id: "popover",
  navLabel: t`浮层`,
  title: t`Popover`,
  description: t`基于 Modal 槽位渲染的非模态浮层示例，验证 click-away、四向定位与边界修正。`,
}
```

- [ ] **Step 4: 提交**

```bash
git add apps/v3/src/smoke-types.ts apps/v3/src/demo-dimensions.ts apps/v3/src/smoke/demo-stage.ts apps/v3/src/smoke/hooks/use-demo-catalog.tsx
git commit -m "feat(v3): register popover demo metadata and stage sizing"
```

---

### Task 5: 挂载 scene、日志分支与回归验证

**Files:**

- Modify: `apps/v3/src/react-smoke.tsx`

- [ ] **Step 1: 导入并挂载 `PopoverDemoScene`**

```tsx
import { PopoverDemoScene } from "./smoke/scenes/popover-demo-scene.tsx";
```

```tsx
{demo === "popover" ? (
  <PopoverDemoScene W={dw} H={dh} viewportW={vw} viewportH={vh} onLog={onPopoverLog} />
) : /* existing branches */}
```

- [ ] **Step 2: 增加日志状态分支**

```tsx
const [popoverLog, setPopoverLog] = useState<string | null>(null);
// demo === "popover" 时写 logLine
```

- [ ] **Step 3: 全量检查**

Run:

```bash
vp check
vp test
```

Expected:

- `vp check` 通过（fmt/lint/ts）
- `vp test` 通过（含新增定位测试）

- [ ] **Step 4: 提交**

```bash
git add apps/v3/src/react-smoke.tsx
git commit -m "feat(v3): wire popover demo into smoke app"
```

---

## Self-Review

- **Spec coverage:** 已覆盖 Modal 承载、四向定位+clamp、滚动即关闭、测试页面接入与验收项。
- **Placeholder scan:** 无 `TODO/TBD` 占位；每个任务有明确文件与命令。
- **Type consistency:** `PopoverPlacement`、`triggerRect`、`open/onOpenChange` 命名在任务间一致。
