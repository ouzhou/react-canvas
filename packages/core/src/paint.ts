import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import { Edge } from "yoga-layout/load";
import { buildParagraphFromSpans } from "./paragraph-build.ts";
import type { TextNode } from "./text-node.ts";
import { isDisplayNone } from "./layout.ts";
import type { ViewNode } from "./view-node.ts";

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
    const rect = canvasKit.LTRBRect(x, y, x + w, y + h);
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
    const rect = canvasKit.LTRBRect(x, y, x + w, y + h);
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
        skCanvas.drawParagraph(p, x + padL, y + padT);
      } finally {
        p.delete();
      }
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
