import { useEffect, useRef, type RefObject } from "react";

export type UseClickAwayOptions = {
  /** 为 false 时不注册监听；默认 true */
  enabled?: boolean;
  /**
   * 若点在任一 ref 对应的 DOM 节点内（`contains`）则不触发 `onAway`。
   * 可与 `ignoreCanvas` 组合使用。
   */
  domRefs?: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>;
  /**
   * 为 true 时：若 pointer 落在任意 `<canvas>` 上（`target` 为 canvas，或位于某 canvas 的 DOM 子树内），则不触发。
   * 用于 `<Canvas>` 内浮层：点击页面其它 DOM 时收起，点击画布则交给画布命中与组件内遮罩处理。
   *
   * 说明：`<Canvas>` 使用独立 reconciler 根，无法在画布子树内通过 React Context 拿到 canvas 元素；因此用「是否点在 canvas 上」区分 document 与画布。
   */
  ignoreCanvas?: boolean;
};

function normalizeDomRefs(
  domRefs: UseClickAwayOptions["domRefs"],
): Array<RefObject<HTMLElement | null>> {
  if (domRefs === undefined) return [];
  return Array.isArray(domRefs) ? domRefs : [domRefs];
}

/** 事件目标是否落在任意 canvas 上（含作为 target 或祖先）。 */
export function isPointerEventTargetOnCanvas(event: PointerEvent): boolean {
  const t = event.target;
  if (t instanceof HTMLCanvasElement) return true;
  if (t instanceof Element && t.closest("canvas")) return true;
  return false;
}

/**
 * 在 `document` 上监听 `pointerdown`（**capture**）。当点击路径应视为「外部」时调用 `onAway`。
 *
 * - 使用 ref 保存最新 `onAway`，调用方无需为稳定引用包 `useCallback`。
 * - 与常见 `useClickAway(ref, handler)` 的 DOM 模式兼容：通过 `domRefs` 传入要排除的节点。
 */
export function useClickAway(onAway: () => void, options: UseClickAwayOptions = {}): void {
  const { enabled = true, domRefs, ignoreCanvas = false } = options;
  const onAwayRef = useRef(onAway);
  onAwayRef.current = onAway;
  const domRefsRef = useRef(domRefs);
  domRefsRef.current = domRefs;

  useEffect(() => {
    if (!enabled) return;

    const onPointerDownCapture = (event: Event): void => {
      const e = event as PointerEvent;
      const t = e.target;
      if (!(t instanceof Node)) return;

      if (ignoreCanvas && isPointerEventTargetOnCanvas(e)) return;

      const refs = normalizeDomRefs(domRefsRef.current);
      for (const r of refs) {
        if (r.current?.contains(t)) return;
      }

      onAwayRef.current();
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [enabled, ignoreCanvas]);
}
