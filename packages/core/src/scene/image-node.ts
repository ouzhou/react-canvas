import type { CanvasKit, Image as SkImage } from "canvaskit-wasm";
import type { Yoga } from "yoga-layout/load";
import { loadImageFromUri } from "../image/image-decode.ts";
import { peekCachedImage, putCachedImage } from "../image/image-cache.ts";
import { requestRedrawFromImage } from "../render/paint-frame-requester.ts";
import type { ResizeMode } from "../image/image-rect.ts";
import type { ViewStyle } from "../style/view-style.ts";
import { ViewNode } from "./view-node.ts";

export type ImageSource = { uri: string };

export class ImageNode extends ViewNode {
  sourceUri = "";
  imageResizeMode: ResizeMode = "cover";
  /** Decoded bitmap; may reference a shared cache entry — do not delete unless removed from cache. */
  skImage: SkImage | null = null;
  loadState: "idle" | "loading" | "loaded" | "error" = "idle";
  loadError: unknown = null;
  private abortController: AbortController | null = null;
  onLoadCb?: () => void;
  onErrorCb?: (e: unknown) => void;

  constructor(yoga: Yoga) {
    super(yoga, "Image");
  }

  setImageProps(style: ViewStyle | undefined, props: ImageNodePropPayload): void {
    this.setStyle(style ?? {});
    this.sourceUri = props.source.uri;
    this.imageResizeMode = props.resizeMode ?? "cover";
    this.onLoadCb = props.onLoad;
    this.onErrorCb = props.onError;
  }

  updateImageProps(
    prev: ImageNodePropPayload & { style?: ViewStyle },
    next: ImageNodePropPayload & { style?: ViewStyle },
  ): void {
    this.updateStyle(prev.style ?? {}, next.style ?? {});
    this.sourceUri = next.source.uri;
    this.imageResizeMode = next.resizeMode ?? "cover";
    this.onLoadCb = next.onLoad;
    this.onErrorCb = next.onError;
    if (prev.source.uri !== next.source.uri) {
      this.abortLoad();
      this.skImage = null;
      this.loadState = "idle";
      this.loadError = null;
    }
    this.dirty = true;
  }

  /** Call after `CanvasKit` is ready (e.g. first `resetAfterCommit`). */
  beginLoad(canvasKit: CanvasKit): void {
    const uri = this.sourceUri;
    if (!uri) return;
    if (this.loadState === "loading") return;

    const cached = peekCachedImage(uri);
    if (cached) {
      this.skImage = cached;
      this.loadState = "loaded";
      this.loadError = null;
      this.onLoadCb?.();
      requestRedrawFromImage();
      return;
    }

    this.abortController?.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.loadState = "loading";
    this.loadError = null;

    void (async () => {
      try {
        const img = await loadImageFromUri(canvasKit, uri, signal);
        if (signal.aborted) return;
        if (!img) {
          throw new Error("[react-canvas] Image decode returned null");
        }
        putCachedImage(uri, img);
        this.skImage = img;
        this.loadState = "loaded";
        this.onLoadCb?.();
        requestRedrawFromImage();
      } catch (e) {
        if (signal.aborted) return;
        this.loadState = "error";
        this.loadError = e;
        this.skImage = null;
        this.onErrorCb?.(e);
        requestRedrawFromImage();
      }
    })();
  }

  abortLoad(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  override destroy(): void {
    this.abortLoad();
    this.skImage = null;
    super.destroy();
  }
}

export type ImageNodePropPayload = {
  source: ImageSource;
  resizeMode?: ResizeMode;
  onLoad?: () => void;
  onError?: (e: unknown) => void;
};
