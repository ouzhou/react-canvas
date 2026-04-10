import type { ViewNode } from "../scene/view-node.ts";

/** 由指针与焦点管线写入；外部只读。见 `core-design.md` §14.3。 */
export type InteractionState = {
  readonly hovered: boolean;
  readonly pressed: boolean;
  readonly focused: boolean;
};

/**
 * Synthetic pointer / click event for canvas hosts (not a DOM Event).
 * `location*` is relative to `currentTarget`; `page*` is relative to the canvas logical origin.
 */
export type CanvasSyntheticPointerEvent = {
  type:
    | "pointerdown"
    | "pointerup"
    | "pointermove"
    | "pointercancel"
    | "click"
    | "pointerenter"
    | "pointerleave";
  pointerId: number;
  /** Deepest hit node (same for whole dispatch). */
  target: ViewNode;
  currentTarget: ViewNode;
  locationX: number;
  locationY: number;
  pageX: number;
  pageY: number;
  timestamp: number;
  stopPropagation(): void;
  preventDefault(): void;
  /** True after `preventDefault()` (reserved; canvas has little default behavior). */
  defaultPrevented: boolean;
};

/** Callbacks stored on `ViewNode` / `TextNode` (via `ViewNode`). */
export type InteractionHandlers = {
  onPointerDown?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerUp?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerMove?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerEnter?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerLeave?: (e: CanvasSyntheticPointerEvent) => void;
  onClick?: (e: CanvasSyntheticPointerEvent) => void;
};
