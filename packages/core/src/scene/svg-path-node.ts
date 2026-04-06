import type { CanvasKit, Path as SkPath } from "canvaskit-wasm";
import type { Yoga } from "yoga-layout/load";
import type { ViewStyle } from "../style/view-style.ts";
import { ViewNode } from "./view-node.ts";

function mergeStyleWithSize(style: ViewStyle | undefined, size: number | undefined): ViewStyle {
  const base: ViewStyle = { ...style };
  if (size != null && Number.isFinite(size)) {
    base.width = size;
    base.height = size;
  }
  return base;
}

export type SvgPathStrokeLinecap = "butt" | "round" | "square";
export type SvgPathStrokeLinejoin = "miter" | "round" | "bevel";

export class SvgPathNode extends ViewNode {
  d = "";
  viewBoxStr = "0 0 24 24";
  /** When set, Yoga layout uses `size × size` (merged into style). */
  size: number | undefined;
  color: string | undefined;
  stroke: string | undefined;
  fill: string | undefined;
  strokeWidth = 1;
  strokeLinecap: SvgPathStrokeLinecap | undefined;
  strokeLinejoin: SvgPathStrokeLinejoin | undefined;
  onErrorCb?: (e: unknown) => void;

  private cachedPath: SkPath | null = null;
  private pathCacheKey = "";

  constructor(yoga: Yoga) {
    super(yoga, "SvgPath");
  }

  setSvgPathProps(style: ViewStyle | undefined, props: SvgPathPropPayload): void {
    this.setStyle(mergeStyleWithSize(style, props.size));
    this.d = props.d;
    this.viewBoxStr = props.viewBox ?? "0 0 24 24";
    this.size = props.size;
    this.color = props.color;
    this.stroke = props.stroke;
    this.fill = props.fill;
    this.strokeWidth = props.strokeWidth ?? 1;
    this.strokeLinecap = props.strokeLinecap;
    this.strokeLinejoin = props.strokeLinejoin;
    this.onErrorCb = props.onError;
    this.invalidatePathCache();
  }

  updateSvgPathProps(
    prev: SvgPathPropPayload & { style?: ViewStyle },
    next: SvgPathPropPayload & { style?: ViewStyle },
  ): void {
    this.updateStyle(
      mergeStyleWithSize(prev.style, prev.size),
      mergeStyleWithSize(next.style, next.size),
    );
    this.d = next.d;
    this.viewBoxStr = next.viewBox ?? "0 0 24 24";
    this.size = next.size;
    this.color = next.color;
    this.stroke = next.stroke;
    this.fill = next.fill;
    this.strokeWidth = next.strokeWidth ?? 1;
    this.strokeLinecap = next.strokeLinecap;
    this.strokeLinejoin = next.strokeLinejoin;
    this.onErrorCb = next.onError;
    if (
      prev.d !== next.d ||
      (prev.viewBox ?? "0 0 24 24") !== (next.viewBox ?? "0 0 24 24") ||
      prev.size !== next.size
    ) {
      this.invalidatePathCache();
    }
    this.dirty = true;
  }

  private invalidatePathCache(): void {
    this.cachedPath?.delete();
    this.cachedPath = null;
    this.pathCacheKey = "";
  }

  /** Lazily build SkPath from `d`; returns null if invalid. */
  getOrCreatePath(canvasKit: CanvasKit): SkPath | null {
    const key = `${this.d}\0${this.viewBoxStr}`;
    if (this.cachedPath && this.pathCacheKey === key) {
      return this.cachedPath;
    }
    this.invalidatePathCache();
    const p = canvasKit.Path.MakeFromSVGString(this.d);
    if (!p) {
      this.onErrorCb?.(new Error("[react-canvas] invalid SVG path d"));
      return null;
    }
    this.cachedPath = p;
    this.pathCacheKey = key;
    return p;
  }

  override destroy(): void {
    this.invalidatePathCache();
    super.destroy();
  }
}

export type SvgPathPropPayload = {
  d: string;
  viewBox?: string;
  size?: number;
  color?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  strokeLinecap?: SvgPathStrokeLinecap;
  strokeLinejoin?: SvgPathStrokeLinejoin;
  onError?: (e: unknown) => void;
};
