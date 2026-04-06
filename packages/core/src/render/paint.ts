import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import { Edge } from "yoga-layout/load";
import { buildParagraphFromSpans } from "../text/paragraph-build.ts";
import { computeImageSrcDestRects } from "../image/image-rect.ts";
import type { ImageNode } from "../scene/image-node.ts";
import type { SvgPathNode } from "../scene/svg-path-node.ts";
import type { TextNode } from "../scene/text-node.ts";
import { isDisplayNone } from "../layout/layout.ts";
import type { ViewNode } from "../scene/view-node.ts";
import { parseViewBox, viewBoxToAffine } from "../geometry/viewbox.ts";
import { applyViewTransform } from "../style/transform.ts";

/**
 * Full-frame paint: scale by DPR, clear, recurse from root (phase-1-design §2.4).
 * Caller owns `paint` lifecycle (`delete()` after).
 */
export function paintScene(
  root: ViewNode,
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  dpr: number,
  paint: Paint,
): void {
  skCanvas.save();
  skCanvas.scale(dpr, dpr);
  skCanvas.clear(canvasKit.TRANSPARENT);
  paintNode(root, skCanvas, canvasKit, paint, 0, 0);
  skCanvas.restore();
}

export function paintNode(
  node: ViewNode,
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  paint: Paint,
  offsetX: number,
  offsetY: number,
): void {
  if (isDisplayNone(node)) return;

  const x = offsetX + node.layout.left;
  const y = offsetY + node.layout.top;
  const w = node.layout.width;
  const h = node.layout.height;

  const skipBackground = w <= 0 || h <= 0;

  skCanvas.save();
  skCanvas.translate(x, y);
  applyViewTransform(skCanvas, node.props.transform, w, h);

  const op = node.props.opacity;
  const useLayer = op !== undefined && op < 1;
  if (useLayer) {
    const layerPaint = paint.copy();
    layerPaint.setAlphaf(op);
    layerPaint.setAntiAlias(true);
    skCanvas.saveLayer(layerPaint);
    layerPaint.delete();
  }

  if (!skipBackground && node.props.backgroundColor) {
    paint.setColor(canvasKit.parseColorString(node.props.backgroundColor));
    paint.setStyle(canvasKit.PaintStyle.Fill);
    paint.setAntiAlias(true);
    const rect = canvasKit.LTRBRect(0, 0, w, h);
    const r = node.props.borderRadius ?? 0;
    if (r > 0) {
      const rrect = canvasKit.RRectXY(rect, r, r);
      skCanvas.drawRRect(rrect, paint);
    } else {
      skCanvas.drawRect(rect, paint);
    }
  }

  const bw = node.props.borderWidth ?? 0;
  if (!skipBackground && bw > 0 && node.props.borderColor) {
    paint.setStyle(canvasKit.PaintStyle.Stroke);
    paint.setStrokeWidth(bw);
    paint.setColor(canvasKit.parseColorString(node.props.borderColor));
    paint.setAntiAlias(true);
    const rect = canvasKit.LTRBRect(0, 0, w, h);
    const r = node.props.borderRadius ?? 0;
    if (r > 0) {
      const rrect = canvasKit.RRectXY(rect, r, r);
      skCanvas.drawRRect(rrect, paint);
    } else {
      skCanvas.drawRect(rect, paint);
    }
  }

  if (node.type === "Text") {
    const tn = node as TextNode;
    const spans = tn.getParagraphSpans();
    if (spans.length > 0) {
      const padL = tn.yogaNode.getComputedPadding(Edge.Left);
      const padR = tn.yogaNode.getComputedPadding(Edge.Right);
      const padT = tn.yogaNode.getComputedPadding(Edge.Top);
      const boxW = Number.isFinite(w) ? w : 0;
      const innerW = Math.max(0, boxW - padL - padR);
      const p = buildParagraphFromSpans(canvasKit, tn.textProps, spans);
      try {
        p.layout(innerW);
        skCanvas.drawParagraph(p, padL, padT);
      } finally {
        p.delete();
      }
    }
    if (useLayer) skCanvas.restore();
    skCanvas.restore();
    return;
  }

  if (node.type === "Image") {
    const im = node as ImageNode;
    const sk = im.skImage;
    if (sk && !skipBackground) {
      const iw = sk.width();
      const ih = sk.height();
      const { src, dst } = computeImageSrcDestRects(im.imageResizeMode, iw, ih, w, h);
      if (src.width > 0 && dst.width > 0) {
        const srcRect = canvasKit.LTRBRect(
          src.left,
          src.top,
          src.left + src.width,
          src.top + src.height,
        );
        const dstRect = canvasKit.LTRBRect(
          dst.left,
          dst.top,
          dst.left + dst.width,
          dst.top + dst.height,
        );
        paint.setStyle(canvasKit.PaintStyle.Fill);
        paint.setAntiAlias(true);
        skCanvas.drawImageRect(sk, srcRect, dstRect, paint, true);
      }
    }
    for (const c of node.children) {
      paintNode(c, skCanvas, canvasKit, paint, x, y);
    }
    if (useLayer) skCanvas.restore();
    skCanvas.restore();
    return;
  }

  if (node.type === "SvgPath") {
    const sn = node as SvgPathNode;
    const path = sn.getOrCreatePath(canvasKit);
    if (path && !skipBackground) {
      const vb = parseViewBox(sn.viewBoxStr) ?? parseViewBox("0 0 24 24");
      if (vb) {
        const aff = viewBoxToAffine(vb, w, h);
        if (aff.scale > 0) {
          skCanvas.save();
          skCanvas.translate(aff.translateX, aff.translateY);
          skCanvas.scale(aff.scale, aff.scale);
          const fill = sn.fill;
          const strokeCol = sn.stroke ?? sn.color ?? "#000000";
          const sw = sn.strokeWidth;
          if (fill !== undefined && fill !== "none") {
            paint.setStyle(canvasKit.PaintStyle.Fill);
            paint.setColor(canvasKit.parseColorString(fill));
            paint.setAntiAlias(true);
            skCanvas.drawPath(path, paint);
          }
          if (strokeCol && sw > 0) {
            paint.setStyle(canvasKit.PaintStyle.Stroke);
            paint.setStrokeWidth(sw);
            paint.setColor(canvasKit.parseColorString(strokeCol));
            paint.setAntiAlias(true);
            if (sn.strokeLinecap) {
              const cap = sn.strokeLinecap;
              paint.setStrokeCap(
                cap === "round"
                  ? canvasKit.StrokeCap.Round
                  : cap === "square"
                    ? canvasKit.StrokeCap.Square
                    : canvasKit.StrokeCap.Butt,
              );
            }
            if (sn.strokeLinejoin) {
              const j = sn.strokeLinejoin;
              paint.setStrokeJoin(
                j === "round"
                  ? canvasKit.StrokeJoin.Round
                  : j === "bevel"
                    ? canvasKit.StrokeJoin.Bevel
                    : canvasKit.StrokeJoin.Miter,
              );
            }
            skCanvas.drawPath(path, paint);
          }
          skCanvas.restore();
        }
      }
    }
    for (const c of node.children) {
      paintNode(c, skCanvas, canvasKit, paint, x, y);
    }
    if (useLayer) skCanvas.restore();
    skCanvas.restore();
    return;
  }

  for (const c of node.children) {
    paintNode(c, skCanvas, canvasKit, paint, x, y);
  }

  if (useLayer) skCanvas.restore();
  skCanvas.restore();
}
