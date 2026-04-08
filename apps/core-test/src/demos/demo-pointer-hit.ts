import {
  buildPathToRoot,
  dispatchBubble,
  hitTest,
  shouldEmitClick,
  TextNode,
  type PointerDownSnapshot,
  ViewNode,
} from "@react-canvas/core";

import { clientToCanvasLogical } from "../lib/client-to-logical.ts";
import { createDemoHost } from "../lib/demo-host.ts";

function attachClickRouting(
  canvas: HTMLCanvasElement,
  sceneRoot: ViewNode,
  canvasKit: Parameters<typeof hitTest>[3],
  logicalWidth: number,
  logicalHeight: number,
): () => void {
  const down = new Map<number, PointerDownSnapshot>();

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const onPointerDown = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const leaf = hitTest(sceneRoot, pageX, pageY, canvasKit);
    if (!leaf) return;
    down.set(ev.pointerId, { pageX, pageY, target: leaf });
    const path = buildPathToRoot(leaf, sceneRoot);
    dispatchBubble(path, sceneRoot, "pointerdown", pageX, pageY, ev.pointerId, ev.timeStamp);
  };

  const onPointerUp = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const snap = down.get(ev.pointerId);
    down.delete(ev.pointerId);

    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit);
    const pathForUp = hit
      ? buildPathToRoot(hit, sceneRoot)
      : snap
        ? buildPathToRoot(snap.target, sceneRoot)
        : null;
    if (pathForUp) {
      dispatchBubble(pathForUp, sceneRoot, "pointerup", pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    if (!snap) return;
    if (shouldEmitClick(snap, pageX, pageY, sceneRoot, canvasKit)) {
      const pathClick = buildPathToRoot(snap.target, sceneRoot);
      dispatchBubble(pathClick, sceneRoot, "click", pageX, pageY, ev.pointerId, ev.timeStamp);
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
  };
}

export async function mountPointerHitDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createDemoHost(container, 360, 200);
  const { runtime, canvasKit, canvas, requestFrame, dispose, logicalWidth, logicalHeight } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    gap: 12,
    flexDirection: "column",
    backgroundColor: "#0c4a6e",
  });

  const row = new ViewNode(yoga, "View");
  row.setStyle({ flexDirection: "row", gap: 12, flex: 1 });

  const mkButton = (label: string, color: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({
      flex: 1,
      minHeight: 72,
      backgroundColor: color,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    });
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 16, color: "#f8fafc", textAlign: "center" });
    t.appendTextSlot({ nodeValue: label });
    v.appendChild(t);
    v.interactionHandlers = {
      onClick: () => {
        onStatus(`点击：${label}`);
      },
    };
    return v;
  };

  row.appendChild(mkButton("按钮 A", "#0369a1"));
  row.appendChild(mkButton("按钮 B", "#0d9488"));
  root.appendChild(row);

  requestFrame(root);

  const detach = attachClickRouting(canvas, root, canvasKit, logicalWidth, logicalHeight);

  return () => {
    detach();
    root.destroy();
    dispose();
  };
}
