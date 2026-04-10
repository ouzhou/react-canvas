import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import { Edge } from "yoga-layout/load";
import { buildParagraphFromSpans } from "../text/paragraph-build.ts";
import { computeImageSrcDestRects } from "../image/image-rect.ts";
import type { ImageNode } from "../scene/image-node.ts";
import type { SvgPathNode } from "../scene/svg-path-node.ts";
import type { TextNode } from "../scene/text-node.ts";
import { isDisplayNone } from "../layout/layout.ts";
import { getVerticalScrollMetrics, type ScrollViewNode } from "../scene/scroll-view-node.ts";
import type { ViewNode } from "../scene/view-node.ts";
import { parseViewBox, viewBoxToAffine } from "../geometry/viewbox.ts";
import { getSortedChildrenForPaint } from "./children-z-order.ts";
import {
  buildViewportCameraMatrix,
  isViewportCameraIdentity,
  type ViewportCamera,
} from "./camera.ts";
import { buildLocalTransformMatrix } from "./transform.ts";

/** 将绘制限制在布局盒内；圆角与背景 `drawRRect` 使用同一套半径（经 `min` 钳制）。 */
function clipToLayoutRoundedRect(
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  w: number,
  h: number,
  borderRadius: number,
): void {
  const rect = canvasKit.LTRBRect(0, 0, w, h);
  const r = borderRadius ?? 0;
  if (r > 0) {
    const rr = Math.min(r, w / 2, h / 2);
    const rrect = canvasKit.RRectXY(rect, rr, rr);
    skCanvas.clipRRect(rrect, canvasKit.ClipOp.Intersect, true);
  } else {
    skCanvas.clipRect(rect, canvasKit.ClipOp.Intersect, true);
  }
}

/** 视口右侧垂直滚动指示器（与 `getVerticalScrollMetrics` 一致，画在子内容之后）。 */
function paintScrollViewVerticalScrollbar(
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  paint: Paint,
  sv: ScrollViewNode,
): void {
  const m = getVerticalScrollMetrics(sv);
  if (!m) return;
  if (!sv.scrollbarHoverVisible) return;

  const { trackLeft, trackTop, trackH, barW, thumbTop, thumbH } = m;

  /** 仅绘滑块，无轨道底色；滑块比命中区窄 20%，水平居中。 */
  const thumbDrawW = barW * 0.8;
  const thumbLeft = trackLeft + (barW - thumbDrawW) / 2;

  paint.setStyle(canvasKit.PaintStyle.Fill);
  paint.setAntiAlias(true);

  const thumbBottom = Math.min(trackTop + trackH, thumbTop + thumbH);
  const thumbHVisible = thumbBottom - thumbTop;
  const thumbRect = canvasKit.LTRBRect(thumbLeft, thumbTop, thumbLeft + thumbDrawW, thumbBottom);
  /** 与 CSS `border-radius: 50%` 等价的胶囊形：短边一半的圆角。 */
  const thumbRr = Math.min(thumbDrawW, thumbHVisible) / 2;
  /** 在上次基础上再深约 20%（RGB×0.8）。 */
  paint.setColor(canvasKit.parseColorString("rgba(141,141,146,0.92)"));
  skCanvas.drawRRect(canvasKit.RRectXY(thumbRect, thumbRr, thumbRr), paint);
}

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
  camera?: ViewportCamera | null,
): void {
  skCanvas.save();
  skCanvas.scale(dpr, dpr);
  skCanvas.clear(canvasKit.TRANSPARENT);
  if (!isViewportCameraIdentity(camera)) {
    skCanvas.concat(buildViewportCameraMatrix(canvasKit, camera!));
  }
  paintNode(root, skCanvas, canvasKit, paint);
  skCanvas.restore();
}

/**
 * 多 {@link Layer} 根节点按顺序叠加绘制（共享相机与 DPR）；整帧仅 `clear` 一次。与 `core-design.md` §4 一致。
 */
export function paintStageLayers(
  roots: ViewNode[],
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  dpr: number,
  paint: Paint,
  camera?: ViewportCamera | null,
): void {
  skCanvas.save();
  skCanvas.scale(dpr, dpr);
  skCanvas.clear(canvasKit.TRANSPARENT);
  if (!isViewportCameraIdentity(camera)) {
    skCanvas.concat(buildViewportCameraMatrix(canvasKit, camera!));
  }
  for (const root of roots) {
    paintNode(root, skCanvas, canvasKit, paint);
  }
  skCanvas.restore();
}

/**
 * 子树绘制：每层 `save` 后 `concat(translate(layout) * localTransform)`，在 **局部坐标**（0…width × 0…height）下绘制，
 * 与 Yoga 布局盒一致；子节点递归时继续叠加，避免世界坐标与局部坐标混用。
 */
export function paintNode(
  node: ViewNode,
  skCanvas: Canvas,
  canvasKit: CanvasKit,
  paint: Paint,
): void {
  if (isDisplayNone(node)) return;

  const lx = node.layout.left;
  const ly = node.layout.top;
  const w = node.layout.width;
  const h = node.layout.height;
  const skipBackground = w <= 0 || h <= 0;

  const localT = buildLocalTransformMatrix(canvasKit, w, h, node.props.transform);
  const incremental = canvasKit.Matrix.multiply(canvasKit.Matrix.translated(lx, ly), localT);

  skCanvas.save();
  skCanvas.concat(incremental);

  const op = node.props.opacity;
  const useLayer = op !== undefined && op < 1;
  if (useLayer) {
    const layerPaint = paint.copy();
    layerPaint.setAlphaf(op);
    layerPaint.setAntiAlias(true);
    skCanvas.saveLayer(layerPaint);
    layerPaint.delete();
  }

  const bg = node.props.backgroundColor;
  /** `"transparent"` is truthy in JS but CanvasKit may paint it as opaque black; skip fill. */
  const skipTransparentBg = typeof bg === "string" && bg.trim().toLowerCase() === "transparent";

  if (!skipBackground && bg && !skipTransparentBg) {
    paint.setColor(canvasKit.parseColorString(bg));
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
    const br = node.props.borderRadius ?? 0;
    const clipImage = !skipBackground && (node.props.overflow === "hidden" || br > 0);
    if (clipImage) {
      skCanvas.save();
      clipToLayoutRoundedRect(skCanvas, canvasKit, w, h, br);
    }
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
    for (const c of getSortedChildrenForPaint(node)) {
      paintNode(c, skCanvas, canvasKit, paint);
    }
    if (clipImage) skCanvas.restore();
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
    let clipSvgChildren = false;
    if (node.props.overflow === "hidden" && !skipBackground) {
      skCanvas.save();
      clipToLayoutRoundedRect(skCanvas, canvasKit, w, h, node.props.borderRadius ?? 0);
      clipSvgChildren = true;
    }
    for (const c of getSortedChildrenForPaint(node)) {
      paintNode(c, skCanvas, canvasKit, paint);
    }
    if (clipSvgChildren) skCanvas.restore();
    if (useLayer) skCanvas.restore();
    skCanvas.restore();
    return;
  }

  if (node.type === "ScrollView") {
    const sv = node as ScrollViewNode;
    const sx = sv.scrollX;
    const sy = sv.scrollY;

    if (!skipBackground) {
      skCanvas.save();
      clipToLayoutRoundedRect(skCanvas, canvasKit, w, h, node.props.borderRadius ?? 0);
      skCanvas.translate(-sx, -sy);
      for (const c of getSortedChildrenForPaint(node)) {
        paintNode(c, skCanvas, canvasKit, paint);
      }
      skCanvas.restore();

      skCanvas.save();
      clipToLayoutRoundedRect(skCanvas, canvasKit, w, h, node.props.borderRadius ?? 0);
      paintScrollViewVerticalScrollbar(skCanvas, canvasKit, paint, sv);
      skCanvas.restore();
    } else {
      skCanvas.save();
      skCanvas.translate(-sx, -sy);
      for (const c of getSortedChildrenForPaint(node)) {
        paintNode(c, skCanvas, canvasKit, paint);
      }
      skCanvas.restore();
    }
    if (useLayer) skCanvas.restore();
    skCanvas.restore();
    return;
  }

  let clipViewChildren = false;
  if (node.props.overflow === "hidden" && !skipBackground) {
    skCanvas.save();
    clipToLayoutRoundedRect(skCanvas, canvasKit, w, h, node.props.borderRadius ?? 0);
    clipViewChildren = true;
  }
  for (const c of getSortedChildrenForPaint(node)) {
    paintNode(c, skCanvas, canvasKit, paint);
  }
  if (clipViewChildren) skCanvas.restore();

  if (useLayer) skCanvas.restore();
  skCanvas.restore();
}
