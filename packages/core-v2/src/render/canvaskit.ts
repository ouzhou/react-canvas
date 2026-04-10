import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";
import * as canvaskitWasm from "canvaskit-wasm";

import { canvasKitLocateFile } from "./locate.ts";

type CanvasKitLoader = (opts?: CanvasKitInitOptions) => Promise<CanvasKit>;

const loadCanvasKit = canvaskitWasm.default as unknown as CanvasKitLoader;

let canvasKitPromise: Promise<CanvasKit> | null = null;

/** 单例加载 CanvasKit（WASM）。 */
export function initCanvasKit(options?: CanvasKitInitOptions): Promise<CanvasKit> {
  canvasKitPromise ??= loadCanvasKit({
    ...options,
    locateFile:
      options?.locateFile != null
        ? (file: string) => options.locateFile!(file)
        : canvasKitLocateFile,
  });
  return canvasKitPromise;
}
