export type PointerEventType =
  | "pointerdown"
  | "pointerup"
  | "click"
  | "pointermove"
  | "pointerenter"
  | "pointerleave";

/** 程序化指针事件；`stopPropagation()` 后不再调用后续监听（捕获与冒泡均停止）。 */
export class ScenePointerEvent {
  private propagationStopped = false;

  readonly type: PointerEventType;
  readonly x: number;
  readonly y: number;
  readonly targetId: string;
  currentTargetId: string;
  phase: "capture" | "bubble";

  constructor(type: PointerEventType, x: number, y: number, targetId: string) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.targetId = targetId;
    this.currentTargetId = targetId;
    this.phase = "capture";
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  getPropagationStopped(): boolean {
    return this.propagationStopped;
  }
}
