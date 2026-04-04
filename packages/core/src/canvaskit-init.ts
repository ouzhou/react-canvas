import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";

import { canvasKitLocateFile } from "./canvaskit-locate.ts";

type CanvasKitLoader = (opts?: CanvasKitInitOptions) => Promise<CanvasKit>;

/** Load CanvasKit with default `locateFile` (local wasm next to `canvaskit-wasm`). */
export async function initCanvasKit(options?: CanvasKitInitOptions): Promise<CanvasKit> {
  const m = await import("canvaskit-wasm");
  const load = (m as unknown as { default: CanvasKitLoader }).default;
  return load({
    ...options,
    locateFile:
      options?.locateFile != null
        ? (file: string) => options.locateFile!(file)
        : canvasKitLocateFile,
  });
}
