import { TextNode, ViewNode, type ViewStyle } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/** `Stage.createTicker()` + `updateStyle` + `requestPaintOnly`（`core-design.md` §9）。 */
export async function mountAnimationDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 360, 160);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    backgroundColor: "#0c0a09",
    justifyContent: "center",
    alignItems: "center",
  });

  const box = new ViewNode(yoga, "View");
  const baseStyle: ViewStyle = {
    width: 200,
    height: 72,
    backgroundColor: "#10b981",
    borderRadius: 12,
    opacity: 1,
    justifyContent: "center",
    alignItems: "center",
  };
  box.setStyle(baseStyle);
  const label = new TextNode(yoga);
  label.setStyle({ fontSize: 14, color: "#ecfdf5" });
  label.appendTextSlot({ nodeValue: "opacity 呼吸 (Ticker)" });
  box.appendChild(label);

  root.appendChild(box);
  sceneRoot.appendChild(root);
  requestFrame();

  const start = performance.now();
  let prevStyle: ViewStyle = { ...baseStyle };

  const ticker = stage.createTicker();
  ticker.add((_deltaMs: number, now: number) => {
    const t = (now - start) / 1000;
    const o = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    const next: ViewStyle = { ...prevStyle, opacity: o };
    box.updateStyle(prevStyle, next);
    prevStyle = next;
    onStatus(`opacity = ${o.toFixed(2)}`);
    stage.requestPaintOnly();
    return false;
  });
  ticker.start();

  return () => {
    ticker.destroy();
    root.destroy();
    dispose();
  };
}
