import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";
import * as canvaskitWasm from "canvaskit-wasm";

import { canvasKitLocateFile } from "./locate.ts";

type CanvasKitLoader = (opts?: CanvasKitInitOptions) => Promise<CanvasKit>;

const loadCanvasKit = canvaskitWasm.default as unknown as CanvasKitLoader;

/** Load CanvasKit with default `locateFile` (local wasm next to `canvaskit-wasm`). */
export async function initCanvasKit(options?: CanvasKitInitOptions): Promise<CanvasKit> {
  return loadCanvasKit({
    ...options,
    locateFile:
      options?.locateFile != null
        ? (file: string) => options.locateFile!(file)
        : canvasKitLocateFile,
  });
}
