import type { CanvasKit } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import type { LayoutCommitPayload, SceneRuntime } from "../runtime/scene-runtime.ts";
import { initCanvasKit } from "./canvaskit.ts";

function parseCssHexColor(s: string): { r: number; g: number; b: number } | null {
  const m = /^#(?:([\da-f]{3})|([\da-f]{6}))$/i.exec(s.trim());
  if (!m) return null;
  const hex = (m[1] ?? m[2])!;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export type AttachSceneSkiaOptions = {
  /** 默认 `globalThis.devicePixelRatio` 或 1 */
  dpr?: number;
};

/**
 * 将 {@link SceneRuntime} 的布局盒绘制到 `<canvas>`（CanvasKit Skia）。
 * 仅当节点提供可解析的 `backgroundColor` 时绘制填充与描边；随 `subscribeAfterLayout` 刷新。
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

    // 大面积先画（背景），小盒后画，避免父级 id 排在子级之后时用半透明底盖住子节点（如 id「flex-root」盖过「b*」）
    const entries = Object.entries(payload.layout).sort(([, a], [, b]) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaB - areaA;
    });
    for (const [, box] of entries) {
      if (!box.backgroundColor) continue;
      const rgb = parseCssHexColor(box.backgroundColor);
      if (!rgb) continue;
      const strokeRgb = {
        r: Math.max(0, Math.min(255, Math.round(rgb.r * 0.5))),
        g: Math.max(0, Math.min(255, Math.round(rgb.g * 0.5))),
        b: Math.max(0, Math.min(255, Math.round(rgb.b * 0.5))),
      };
      const fillAlpha = Math.floor(0.88 * 255);
      paintFill.setColor(ck.Color(rgb.r, rgb.g, rgb.b, fillAlpha));
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
