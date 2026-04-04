// Same graph as `yoga-layout/load` but with explicit package paths so vp pack
// bundles the base64 WASM module into dist (like a local asset), not a runtime
// `yoga-layout/load` re-export edge.
import loadYogaWasm from "yoga-layout/dist/binaries/yoga-wasm-base64-esm.js";
import wrapAssembly from "yoga-layout/dist/src/wrapAssembly.js";

export type { Yoga } from "yoga-layout/load";

/** Async Yoga WASM (base64-in-JS); WASM bytes ship inside the bundled module. */
export async function initYoga() {
  return wrapAssembly(await loadYogaWasm());
}
