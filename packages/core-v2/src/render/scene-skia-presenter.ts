import type { CanvasKit } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import type { LayoutCommitPayload, SceneRuntime } from "../runtime/scene-runtime.ts";
import { initCanvasKit } from "./canvaskit.ts";

function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** HSL(0–360, 0–100, 0–100) → 0–255 RGB */
function hslToRgb(hIn: number, s: number, l: number): { r: number; g: number; b: number } {
  const h = ((hIn % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = light - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export type AttachSceneSkiaOptions = {
  /** 默认 `globalThis.devicePixelRatio` 或 1 */
  dpr?: number;
};

/**
 * 将 {@link SceneRuntime} 的布局盒绘制到 `<canvas>`（CanvasKit Skia）。
 * 与 DOM 调试层视觉相近：半透明填充 + 描边；随 `subscribeAfterLayout` 刷新。
 */
export async function attachSceneSkiaPresenter(
  runtime: SceneRuntime,
  canvas: HTMLCanvasElement,
  options?: AttachSceneSkiaOptions,
): Promise<() => void> {
  const ck: CanvasKit = await initCanvasKit();
  const viewport = runtime.getViewport();
  const lw = viewport.width;
  const lh = viewport.height;
  const g = globalThis as typeof globalThis & {
    devicePixelRatio?: number;
    WebGLRenderingContext?: unknown;
    requestAnimationFrame?: (cb: (time: number) => void) => number;
    cancelAnimationFrame?: (id: number) => void;
  };
  const dpr = options?.dpr ?? (typeof g.devicePixelRatio === "number" ? g.devicePixelRatio : 1);

  const { bw, bh, rootScale } = canvasBackingStoreSize(lw, lh, dpr);
  canvas.width = bw;
  canvas.height = bh;
  canvas.style.width = `${lw}px`;
  canvas.style.height = `${lh}px`;

  const surface =
    typeof g.WebGLRenderingContext === "function"
      ? (ck.MakeWebGLCanvasSurface(canvas) ?? ck.MakeSWCanvasSurface(canvas))
      : ck.MakeSWCanvasSurface(canvas);
  if (!surface) {
    throw new Error("[@react-canvas/core-v2] Failed to create CanvasKit surface for <canvas>.");
  }
  const skSurface = surface;

  let rafId: number | null = null;
  let lastPayload: LayoutCommitPayload | null = null;

  function paint(): void {
    const payload = lastPayload;
    if (!payload) return;
    const skCanvas = skSurface.getCanvas();
    skCanvas.save();
    skCanvas.scale(rootScale, rootScale);
    skCanvas.clear(ck.Color(248, 250, 252, 255));

    const paintFill = new ck.Paint();
    paintFill.setAntiAlias(true);
    paintFill.setStyle(ck.PaintStyle.Fill);

    const paintStroke = new ck.Paint();
    paintStroke.setAntiAlias(true);
    paintStroke.setStyle(ck.PaintStyle.Stroke);
    paintStroke.setStrokeWidth(2);

    const entries = Object.entries(payload.layout).sort(([a], [b]) => a.localeCompare(b));
    for (const [id, box] of entries) {
      const hue = hueForId(id);
      const fillRgb = hslToRgb(hue, 70, 55);
      const strokeRgb = hslToRgb(hue, 65, 42);
      paintFill.setColor(ck.Color(fillRgb.r, fillRgb.g, fillRgb.b, Math.floor(0.12 * 255)));
      paintStroke.setColor(ck.Color(strokeRgb.r, strokeRgb.g, strokeRgb.b, Math.floor(0.9 * 255)));
      const rect = ck.LTRBRect(
        box.absLeft,
        box.absTop,
        box.absLeft + box.width,
        box.absTop + box.height,
      );
      skCanvas.drawRect(rect, paintFill);
      skCanvas.drawRect(rect, paintStroke);
    }

    paintFill.delete();
    paintStroke.delete();
    skCanvas.restore();
    skSurface.flush();
  }

  function schedulePaint(): void {
    if (rafId !== null) return;
    const raf =
      typeof g.requestAnimationFrame === "function"
        ? g.requestAnimationFrame.bind(g)
        : (cb: (time: number) => void) =>
            setTimeout(() => {
              cb(0);
            }, 0) as unknown as number;
    rafId = raf(() => {
      rafId = null;
      paint();
    }) as unknown as number;
  }

  const unsubLayout = runtime.subscribeAfterLayout((p) => {
    lastPayload = p;
    schedulePaint();
  });

  return () => {
    unsubLayout();
    if (rafId !== null && typeof g.cancelAnimationFrame === "function") {
      g.cancelAnimationFrame(rafId as number);
    }
    skSurface.delete();
  };
}
