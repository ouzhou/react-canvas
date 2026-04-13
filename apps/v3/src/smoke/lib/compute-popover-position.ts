export type PopoverPlacement = "top" | "bottom" | "left" | "right";

export type PopoverTriggerRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Size = {
  width: number;
  height: number;
};

type ComputePopoverPositionOptions = {
  placement: PopoverPlacement;
  triggerRect: PopoverTriggerRect;
  panelSize: Size;
  viewportSize: Size;
  offset?: number;
  padding?: number;
};

type Point = {
  left: number;
  top: number;
};

function clampWithinBounds(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function computePopoverPosition({
  placement,
  triggerRect,
  panelSize,
  viewportSize,
  offset = 8,
  padding = 8,
}: ComputePopoverPositionOptions): Point {
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  let left = triggerCenterX - panelSize.width / 2;
  let top = triggerCenterY - panelSize.height / 2;

  if (placement === "top") {
    top = triggerRect.top - panelSize.height - offset;
  } else if (placement === "bottom") {
    top = triggerRect.top + triggerRect.height + offset;
  } else if (placement === "left") {
    left = triggerRect.left - panelSize.width - offset;
  } else {
    left = triggerRect.left + triggerRect.width + offset;
  }

  const minLeft = padding;
  const minTop = padding;
  const maxLeft = viewportSize.width - panelSize.width - padding;
  const maxTop = viewportSize.height - panelSize.height - padding;

  return {
    left: clampWithinBounds(left, minLeft, maxLeft),
    top: clampWithinBounds(top, minTop, maxTop),
  };
}
