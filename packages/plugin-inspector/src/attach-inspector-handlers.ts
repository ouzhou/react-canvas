import { hitTest, type ViewNode } from "@react-canvas/core";
import { getCanvasFrame } from "@react-canvas/react";
import { clientToCanvasLogical } from "./client-to-logical.ts";
import { pickHoverNode } from "./pick-hover.ts";

export type InspectorState = {
  hoverNode: ViewNode | null;
  /** 自顶向下：当前「编辑上下文」栈；空表示从整场景选最深叶。 */
  scopeStack: readonly ViewNode[];
};

export type AttachInspectorHandlersOptions = {
  logicalWidth: number;
  logicalHeight: number;
  onStateChange: (state: InspectorState) => void;
};

function modifiersDown(ev: PointerEvent): boolean {
  return ev.metaKey || ev.ctrlKey;
}

/**
 * 悬停高亮（相对 scope 的下一层）+ 双击压栈 + Esc 出栈。
 * 与 `attachViewportHandlers` 并存时：Cmd/Ctrl+左键拖拽平移时不更新 hover。
 */
export function attachInspectorHandlers(
  canvas: HTMLCanvasElement,
  options: AttachInspectorHandlersOptions,
): () => void {
  const { logicalWidth, logicalHeight, onStateChange } = options;

  const scopeStackRef: { current: ViewNode[] } = { current: [] };
  let lastHover: ViewNode | null = null;
  let lastPage: { x: number; y: number } | null = null;
  let raf = 0;

  const emit = (hoverNode: ViewNode | null): void => {
    if (hoverNode === lastHover) return;
    lastHover = hoverNode;
    onStateChange({ hoverNode, scopeStack: [...scopeStackRef.current] });
  };

  const emitScope = (): void => {
    onStateChange({ hoverNode: lastHover, scopeStack: [...scopeStackRef.current] });
  };

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const tickHover = (pageX: number, pageY: number): void => {
    const frame = getCanvasFrame(canvas);
    if (!frame?.sceneRoot) {
      emit(null);
      return;
    }
    const { sceneRoot, canvasKit, camera } = frame;
    const leaf = hitTest(sceneRoot, pageX, pageY, canvasKit, camera);
    const scope =
      scopeStackRef.current.length > 0
        ? scopeStackRef.current[scopeStackRef.current.length - 1]!
        : null;
    const hover = pickHoverNode(leaf, scope, sceneRoot);
    emit(hover);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (ev.pointerType !== "mouse" && ev.pointerType !== "pen") return;

    const r = canvas.getBoundingClientRect();
    const inside =
      ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom;

    if (!inside) {
      cancelAnimationFrame(raf);
      raf = 0;
      emit(null);
      return;
    }

    /** 视口平移：与 plugin-viewport 一致，修饰键+左键按下时不抢 hover */
    if (modifiersDown(ev) && ev.buttons === 1) {
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }

    const { x: pageX, y: pageY } = route(ev);
    lastPage = { x: pageX, y: pageY };
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      tickHover(pageX, pageY);
    });
  };

  const onDblClick = (ev: MouseEvent): void => {
    const { x, y } = clientToCanvasLogical(
      ev.clientX,
      ev.clientY,
      canvas,
      logicalWidth,
      logicalHeight,
    );
    const h = lastHover;
    if (!h) return;
    scopeStackRef.current = [...scopeStackRef.current, h];
    tickHover(x, y);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key !== "Escape") return;
    if (scopeStackRef.current.length === 0) return;
    scopeStackRef.current = scopeStackRef.current.slice(0, -1);
    if (lastPage) tickHover(lastPage.x, lastPage.y);
    else emitScope();
  };

  document.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("dblclick", onDblClick);
  window.addEventListener("keydown", onKeyDown);

  onStateChange({ hoverNode: null, scopeStack: [] });

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("dblclick", onDblClick);
    window.removeEventListener("keydown", onKeyDown);
  };
}
