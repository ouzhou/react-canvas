import {
  clientXYToStageLocal,
  type LayoutCommitPayload,
  type SceneRuntime,
} from "@react-canvas/core-v2";

function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/**
 * 纯 DOM：在容器内挂载与 `react-v2` 的 StagePointerSurface + DebugDomLayer 等价的指针层与布局调试叠层。
 * 仅依赖 `@react-canvas/core-v2`，供 Core 冒烟与无 React 宿主参考。
 */
export function mountCoreSmokeStage(container: HTMLElement, rt: SceneRuntime): () => void {
  const pointerLayer = document.createElement("div");
  pointerLayer.setAttribute("role", "presentation");
  pointerLayer.style.cssText =
    "position:absolute;inset:0;z-index:0;touch-action:none;user-select:none;";

  const debugLayer = document.createElement("div");
  debugLayer.setAttribute("aria-hidden", "true");
  debugLayer.style.cssText =
    "position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;";

  function renderDebug(payload: LayoutCommitPayload): void {
    debugLayer.replaceChildren();
    const layout = payload.layout;
    const entries = Object.entries(layout).sort(([a], [b]) => a.localeCompare(b));
    entries.forEach(([id, box], i) => {
      const hue = hueForId(id);
      const boxEl = document.createElement("div");
      boxEl.title = id;
      Object.assign(boxEl.style, {
        position: "absolute",
        left: `${box.absLeft}px`,
        top: `${box.absTop}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        boxSizing: "border-box",
        border: `2px solid hsla(${hue}, 65%, 42%, 0.9)`,
        background: `hsla(${hue}, 70%, 55%, 0.12)`,
        zIndex: String(i + 1),
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        fontSize: "10px",
        lineHeight: "1.2",
        color: "#0f172a",
      });
      const span = document.createElement("span");
      span.textContent = id;
      Object.assign(span.style, {
        background: "rgba(255,255,255,0.88)",
        padding: "1px 4px",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      boxEl.appendChild(span);
      debugLayer.appendChild(boxEl);
    });
  }

  function dispatchFromEvent(
    type: "pointerdown" | "pointerup" | "click",
    el: HTMLElement,
    clientX: number,
    clientY: number,
  ): void {
    const r = el.getBoundingClientRect();
    const { x, y } = clientXYToStageLocal({ left: r.left, top: r.top }, clientX, clientY);
    rt.dispatchPointerLike({ type, x, y });
  }

  const onPointerDown = (e: PointerEvent): void => {
    dispatchFromEvent("pointerdown", pointerLayer, e.clientX, e.clientY);
    if (typeof pointerLayer.setPointerCapture === "function") {
      pointerLayer.setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    dispatchFromEvent("pointerup", pointerLayer, e.clientX, e.clientY);
    if (e.button === 0) {
      dispatchFromEvent("click", pointerLayer, e.clientX, e.clientY);
    }
    if (
      typeof pointerLayer.hasPointerCapture === "function" &&
      pointerLayer.hasPointerCapture(e.pointerId) &&
      typeof pointerLayer.releasePointerCapture === "function"
    ) {
      pointerLayer.releasePointerCapture(e.pointerId);
    }
  };

  pointerLayer.addEventListener("pointerdown", onPointerDown);
  pointerLayer.addEventListener("pointerup", onPointerUp);

  container.appendChild(pointerLayer);
  container.appendChild(debugLayer);

  const unsub = rt.subscribeAfterLayout((payload) => {
    renderDebug(payload);
  });

  return () => {
    unsub();
    pointerLayer.removeEventListener("pointerdown", onPointerDown);
    pointerLayer.removeEventListener("pointerup", onPointerUp);
    pointerLayer.remove();
    debugLayer.remove();
  };
}
