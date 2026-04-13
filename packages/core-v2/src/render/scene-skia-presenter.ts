import type { CanvasKit, Paint, TypefaceFontProvider } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import { computeImageDestSrcRects } from "../media/image-object-fit.ts";
import { normalizeUriKey, peekDecodedImage } from "../media/image-uri-cache.ts";
import { viewBoxToDestTransform } from "../media/view-box.ts";
import type { ViewStyle } from "../layout/style-map.ts";
import { setParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import type {
  LayoutCommitPayload,
  LayoutSnapshot,
  SceneRuntime,
} from "../runtime/scene-runtime.ts";
import { colorStringToCkColor } from "../text/css-color.ts";
import { buildAndDrawParagraphRuns } from "../text/paragraph-from-runs.ts";
import { mapParagraphTextAlign, mergedRunStyleToCkTextStyle } from "../text/skia-text-style.ts";
import { mergePlainTextStyle } from "../text/text-flat-run.ts";
import { PickBuffer } from "../hit/pick-buffer.ts";
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
 * 仅当节点提供可解析的 `backgroundColor` 时绘制填充（不画默认描边，避免 UI 出现粗线框感）；随 `subscribeAfterLayout` 刷新。
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

  let pickSurface = ck.MakeSurface(bw, bh);
  if (!pickSurface) {
    throw new Error("[@react-canvas/core-v2] Failed to create CanvasKit pick surface.");
  }
  const pickBuffer = new PickBuffer();
  runtime.setHitResolver((x, y) => pickBuffer.hitAt(x, y));

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

    const paintBorder = new ck.Paint();
    paintBorder.setAntiAlias(true);
    paintBorder.setStyle(ck.PaintStyle.Stroke);

    function readOpacity(box: LayoutSnapshot[string] | undefined): number {
      const o = box?.opacity;
      if (typeof o === "number" && Number.isFinite(o)) {
        if (o >= 1) return 1;
        if (o <= 0) return 0;
        return o;
      }
      return 1;
    }

    /** 纵向滚动条：轨道 + 滑块长度与位置反映 `scrollY / maxScrollY`。 */
    function paintScrollViewIndicator(
      scrollBox: NonNullable<LayoutSnapshot[string]>,
      sceneNode: LayoutCommitPayload["scene"]["nodes"][string],
    ): void {
      const innerId = sceneNode.children[0];
      if (!innerId) return;
      const inner = commit.layout[innerId];
      const vpH = scrollBox.height;
      const contentH = inner?.height ?? 0;
      const maxScroll = Math.max(0, contentH - vpH);
      if (maxScroll <= 0) return;

      const railPad = 2;
      const railW = Math.max(4, Math.round(6 * 1.2));
      const minThumb = 22;
      const trackLeft = scrollBox.absLeft + scrollBox.width - railW - railPad;
      const trackTop = scrollBox.absTop + railPad;
      const trackH = Math.max(0, scrollBox.height - 2 * railPad);
      if (trackH < 4) return;

      const syRaw = scrollBox.scrollY ?? 0;
      const sy =
        typeof syRaw === "number" && Number.isFinite(syRaw)
          ? Math.min(Math.max(0, syRaw), maxScroll)
          : 0;

      const thumbHIdeal = (vpH / contentH) * trackH;
      const thumbH = Math.min(trackH, Math.max(minThumb, thumbHIdeal));
      const thumbTravel = Math.max(0, trackH - thumbH);
      const thumbTop = trackTop + (maxScroll > 0 ? (sy / maxScroll) * thumbTravel : 0);

      const rx = railW / 2;
      const lighten = (n: number, t: number) => Math.min(255, Math.round(n + (255 - n) * t));
      /** 基准灰 + 向白浅 20%；不透明度再降 20%，整体更淡。 */
      const thumbRect = ck.LTRBRect(trackLeft, thumbTop, trackLeft + railW, thumbTop + thumbH);
      paintFill.setColor(
        ck.Color(
          lighten(70, 0.2),
          lighten(75, 0.2),
          lighten(88, 0.2),
          Math.max(0, Math.round(140 * 0.8)),
        ),
      );
      skCanvas.drawRRect(ck.RRectXY(thumbRect, rx, rx), paintFill);
    }

    /**
     * 与 `hit-test` 叠放一致：兄弟中 `children` 靠后者在上。
     * 前序 DFS（先画本节点，再按子节点正序递归）→ 后插入的子节点后绘制、盖住先插入的兄弟。
     *
     * **clip 与 `saveLayer`（组透明）顺序**：有 `overflow: hidden|scroll` 时先 `save` + `clipRect`/`clipRRect`，
     * 再按需 `saveLayer`；避免半透明渗出裁切区外。
     */
    function paintSubtree(id: string): void {
      const box = commit.layout[id];
      const a = readOpacity(box);
      const bounds =
        box &&
        ck.LTRBRect(box.absLeft, box.absTop, box.absLeft + box.width, box.absTop + box.height);

      const ov = box?.overflow;
      const clipPushed = Boolean(bounds) && (ov === "hidden" || ov === "scroll");
      const clipRx = box?.borderRadiusRx ?? 0;
      const clipRy = box?.borderRadiusRy ?? 0;

      if (clipPushed && bounds) {
        skCanvas.save();
        if (clipRx > 0 || clipRy > 0) {
          skCanvas.clipRRect(ck.RRectXY(bounds, clipRx, clipRy), ck.ClipOp.Intersect, true);
        } else {
          skCanvas.clipRect(bounds, ck.ClipOp.Intersect, true);
        }
      }

      let layerPaint: Paint | null = null;
      if (a < 1 && bounds) {
        layerPaint = new ck.Paint();
        layerPaint.setAlphaf(a);
        skCanvas.saveLayer(layerPaint, bounds, null);
      }
      try {
        paintNodeContent(id);
      } finally {
        if (layerPaint) {
          skCanvas.restore();
          layerPaint.delete();
        }
        if (clipPushed) {
          skCanvas.restore();
        }
      }
    }

    function paintNodeContent(id: string): void {
      const box = commit.layout[id];
      if (!box) return;

      const rect = ck.LTRBRect(
        box.absLeft,
        box.absTop,
        box.absLeft + box.width,
        box.absTop + box.height,
      );
      const brx = box.borderRadiusRx ?? 0;
      const bry = box.borderRadiusRy ?? 0;

      if (box.backgroundColor) {
        const fillC = colorStringToCkColor(ck, box.backgroundColor);
        const a =
          typeof fillC === "object" &&
          fillC !== null &&
          "length" in fillC &&
          typeof (fillC as Float32Array).length === "number" &&
          (fillC as Float32Array).length >= 4
            ? (fillC as Float32Array)[3]
            : 1;
        if (typeof a !== "number" || a > 1e-4) {
          paintFill.setColor(fillC);
          if (brx > 0 || bry > 0) {
            skCanvas.drawRRect(ck.RRectXY(rect, brx, bry), paintFill);
          } else {
            skCanvas.drawRect(rect, paintFill);
          }
        }
      }

      const bw = box.borderWidth;
      const bcol = box.borderColor;
      if (
        typeof bw === "number" &&
        Number.isFinite(bw) &&
        bw > 0 &&
        bcol !== undefined &&
        bcol.length > 0
      ) {
        paintBorder.setStrokeWidth(bw);
        paintBorder.setColor(colorStringToCkColor(ck, bcol));
        if (brx > 0 || bry > 0) {
          skCanvas.drawRRect(ck.RRectXY(rect, brx, bry), paintBorder);
        } else {
          skCanvas.drawRect(rect, paintBorder);
        }
      }

      if (box.nodeKind === "image" && box.imageUri) {
        const key = normalizeUriKey(box.imageUri);
        const img = peekDecodedImage(key);
        if (img) {
          const iw = img.width();
          const ih = img.height();
          const { dest, src } = computeImageDestSrcRects({
            objectFit: box.imageObjectFit ?? "contain",
            destW: box.width,
            destH: box.height,
            imageW: iw,
            imageH: ih,
          });
          const srcR = ck.LTRBRect(src.x, src.y, src.x + src.width, src.y + src.height);
          const dstR = ck.LTRBRect(
            box.absLeft + dest.x,
            box.absTop + dest.y,
            box.absLeft + dest.x + dest.width,
            box.absTop + dest.y + dest.height,
          );
          const pImg = new ck.Paint();
          pImg.setAntiAlias(true);
          if (brx > 0 || bry > 0) {
            skCanvas.save();
            skCanvas.clipRRect(ck.RRectXY(rect, brx, bry), ck.ClipOp.Intersect, true);
            skCanvas.drawImageRect(img, srcR, dstR, pImg, false);
            skCanvas.restore();
          } else {
            skCanvas.drawImageRect(img, srcR, dstR, pImg, false);
          }
          pImg.delete();
        }
      }

      if (
        box.nodeKind === "svgPath" &&
        box.svgPathD &&
        typeof box.svgPathViewBoxMinX === "number" &&
        typeof box.svgPathViewBoxMinY === "number" &&
        typeof box.svgPathViewBoxWidth === "number" &&
        typeof box.svgPathViewBoxHeight === "number"
      ) {
        const pathSvg = ck.Path.MakeFromSVGString(box.svgPathD);
        if (pathSvg) {
          const vb = {
            minX: box.svgPathViewBoxMinX,
            minY: box.svgPathViewBoxMinY,
            width: box.svgPathViewBoxWidth,
            height: box.svgPathViewBoxHeight,
          };
          const t = viewBoxToDestTransform(vb, {
            x: box.absLeft,
            y: box.absTop,
            width: box.width,
            height: box.height,
          });
          const invScale = t.scale > 0 ? 1 / t.scale : 1;
          const strokeW = (box.svgStrokeWidth ?? 1) * invScale;

          if (brx > 0 || bry > 0) {
            skCanvas.save();
            skCanvas.clipRRect(ck.RRectXY(rect, brx, bry), ck.ClipOp.Intersect, true);
          }
          skCanvas.save();
          skCanvas.translate(t.translateX, t.translateY);
          skCanvas.scale(t.scale, t.scale);
          skCanvas.translate(-vb.minX, -vb.minY);

          const fillPaint = new ck.Paint();
          fillPaint.setAntiAlias(true);
          fillPaint.setStyle(ck.PaintStyle.Fill);
          const strokePaint = new ck.Paint();
          strokePaint.setAntiAlias(true);
          strokePaint.setStyle(ck.PaintStyle.Stroke);
          strokePaint.setStrokeWidth(strokeW);

          if (box.svgFill !== undefined && box.svgFill !== "none") {
            fillPaint.setColor(colorStringToCkColor(ck, box.svgFill));
            skCanvas.drawPath(pathSvg, fillPaint);
          }
          if (box.svgStroke !== undefined && box.svgStroke.length > 0) {
            strokePaint.setColor(colorStringToCkColor(ck, box.svgStroke));
            skCanvas.drawPath(pathSvg, strokePaint);
          }

          fillPaint.delete();
          strokePaint.delete();
          skCanvas.restore();
          if (brx > 0 || bry > 0) {
            skCanvas.restore();
          }
          pathSvg.delete();
        }
      }

      if (box.nodeKind === "text" && paragraphFontProvider && defaultParagraphFontFamily) {
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
          const effectiveTextStyle: ViewStyle = { ...layoutBoxStyle };
          if (typeof box.textFontSize === "number" && box.textFontSize > 0) {
            effectiveTextStyle.fontSize = box.textFontSize;
          }
          const merged = mergePlainTextStyle(effectiveTextStyle, defaultParagraphFontFamily);
          const textStyle = mergedRunStyleToCkTextStyle(ck, merged);
          const paraStyle = new ck.ParagraphStyle({
            textAlign: mapParagraphTextAlign(ck, layoutBoxStyle.textAlign),
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
      if (box.nodeKind === "scrollView") {
        const syRaw = box.scrollY ?? 0;
        const sy = typeof syRaw === "number" && Number.isFinite(syRaw) ? syRaw : 0;
        skCanvas.save();
        skCanvas.translate(0, -sy);
        try {
          for (const childId of sceneNode.children) {
            paintSubtree(childId);
          }
        } finally {
          skCanvas.restore();
        }
        paintScrollViewIndicator(box, sceneNode);
        return;
      }
      for (const childId of sceneNode.children) {
        paintSubtree(childId);
      }
    }

    paintSubtree(commit.rootId);

    paintFill.delete();
    paintBorder.delete();
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
    pickBuffer.rebuildPickIdMap(p);
    if (pickSurface) {
      pickBuffer.rebuildSurface(p, ck, pickSurface, rootScale);
    }
    lastPayload = p;
    schedulePaint();
  });

  return () => {
    unsubLayout();
    if (rafId !== null && typeof g.cancelAnimationFrame === "function") {
      g.cancelAnimationFrame(rafId as number);
    }
    runtime.setHitResolver(null);
    pickSurface?.delete();
    skSurface.delete();
  };
}
