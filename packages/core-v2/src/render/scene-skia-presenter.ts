import type { CanvasKit, TextStyle, TypefaceFontProvider } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import type { ViewStyle } from "../layout/style-map.ts";
import { setParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import type { LayoutCommitPayload, SceneRuntime } from "../runtime/scene-runtime.ts";
import { parseCssHexColor } from "../text/css-hex.ts";
import { clampLineHeightMultiplier } from "../text/text-flat-run.ts";
import { buildAndDrawParagraphRuns } from "../text/paragraph-from-runs.ts";
import { initCanvasKit } from "./canvaskit.ts";

export type AttachSceneSkiaOptions = {
  /** 默认 `globalThis.devicePixelRatio` 或 1 */
  dpr?: number;
  /** 与 `initRuntime` 注册的段落字体一致；缺省时跳过文本绘制。 */
  paragraphFontProvider?: TypefaceFontProvider | null;
  defaultParagraphFontFamily?: string;
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
  const paragraphFontProvider = options?.paragraphFontProvider ?? null;
  const defaultParagraphFontFamily = options?.defaultParagraphFontFamily ?? "";

  if (paragraphFontProvider && defaultParagraphFontFamily) {
    setParagraphMeasureContext({
      ck,
      fontFamily: defaultParagraphFontFamily,
      fontProvider: paragraphFontProvider,
    });
  }

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
    const commit = payload;
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

    /**
     * 与 `hit-test` 叠放一致：兄弟中 `children` 靠后者在上。
     * 前序 DFS（先画本节点，再按子节点正序递归）→ 后插入的子节点后绘制、盖住先插入的兄弟。
     */
    function paintSubtree(id: string): void {
      const box = commit.layout[id];
      if (box?.backgroundColor) {
        const rgb = parseCssHexColor(box.backgroundColor);
        if (rgb) {
          const strokeRgb = {
            r: Math.max(0, Math.min(255, Math.round(rgb.r * 0.5))),
            g: Math.max(0, Math.min(255, Math.round(rgb.g * 0.5))),
            b: Math.max(0, Math.min(255, Math.round(rgb.b * 0.5))),
          };
          const fillAlpha = Math.floor(0.88 * 255);
          paintFill.setColor(ck.Color(rgb.r, rgb.g, rgb.b, fillAlpha));
          paintStroke.setColor(
            ck.Color(strokeRgb.r, strokeRgb.g, strokeRgb.b, Math.floor(0.9 * 255)),
          );
          const rect = ck.LTRBRect(
            box.absLeft,
            box.absTop,
            box.absLeft + box.width,
            box.absTop + box.height,
          );
          skCanvas.drawRect(rect, paintFill);
          skCanvas.drawRect(rect, paintStroke);
        }
      }
      if (box && box.nodeKind === "text" && paragraphFontProvider && defaultParagraphFontFamily) {
        const layoutBoxStyle = (box.textLayoutStyle ?? {}) as ViewStyle;
        if (box.textRuns?.length) {
          buildAndDrawParagraphRuns(
            ck,
            paragraphFontProvider,
            defaultParagraphFontFamily,
            box.textRuns,
            layoutBoxStyle,
            Math.max(1, box.width),
            skCanvas,
            box.absLeft,
            box.absTop,
          );
        } else if (box.textContent) {
          const colorHex = layoutBoxStyle.color ?? "#111827";
          const textRgb = parseCssHexColor(colorHex) ?? { r: 17, g: 24, b: 39 };
          const fs = box.textFontSize ?? layoutBoxStyle.fontSize ?? 16;
          const families =
            typeof layoutBoxStyle.fontFamily === "string" && layoutBoxStyle.fontFamily.length > 0
              ? [layoutBoxStyle.fontFamily]
              : [defaultParagraphFontFamily];
          const weight =
            layoutBoxStyle.fontWeight === "bold" || layoutBoxStyle.fontWeight === 700
              ? ck.FontWeight.Bold
              : typeof layoutBoxStyle.fontWeight === "number" && layoutBoxStyle.fontWeight >= 600
                ? ck.FontWeight.Bold
                : ck.FontWeight.Normal;
          const textStyle: TextStyle = {
            color: ck.Color(textRgb.r, textRgb.g, textRgb.b, 255),
            decoration: ck.NoDecoration,
            decorationStyle: ck.DecorationStyle.Solid,
            decorationThickness: 1,
            fontSize: fs,
            fontFamilies: families,
            fontStyle: {
              weight,
              width: ck.FontWidth.Normal,
              slant: ck.FontSlant.Upright,
            },
            heightMultiplier: clampLineHeightMultiplier(layoutBoxStyle.lineHeight),
            halfLeading: false,
            letterSpacing: 0,
            wordSpacing: 0,
          };
          const paraStyle = new ck.ParagraphStyle({
            textAlign: ck.TextAlign.Left,
            textStyle,
          });
          const builder = ck.ParagraphBuilder.MakeFromFontProvider(
            paraStyle,
            paragraphFontProvider,
          );
          builder.pushStyle(textStyle);
          builder.addText(box.textContent);
          const paragraph = builder.build();
          paragraph.layout(Math.max(1, box.width));
          skCanvas.drawParagraph(paragraph, box.absLeft, box.absTop);
          paragraph.delete();
          builder.delete();
        }
      }
      const sceneNode = commit.scene.nodes[id];
      if (!sceneNode) return;
      for (const childId of sceneNode.children) {
        paintSubtree(childId);
      }
    }

    paintSubtree(commit.rootId);

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
