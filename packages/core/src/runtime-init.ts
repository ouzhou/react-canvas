import type { CanvasKit } from "canvaskit-wasm";

import { initCanvasKit } from "./canvaskit-init.ts";
import { initYoga } from "./yoga-init.ts";
import type { Yoga } from "./yoga-init.ts";

export type CanvasRuntime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
};

/** Parallel Yoga + CanvasKit init for browser or any host that can run WASM. */
export async function initCanvasRuntime(): Promise<CanvasRuntime> {
  const [yoga, canvasKit] = await Promise.all([initYoga(), initCanvasKit()]);
  return { yoga, canvasKit };
}
