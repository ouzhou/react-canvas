declare module "yoga-layout/dist/binaries/yoga-wasm-base64-esm.js" {
  /** Emscripten factory; resolves when WASM is ready (see `yoga-layout/load`). */
  function loadYogaWasm(): Promise<unknown>;
  export default loadYogaWasm;
}

declare module "yoga-layout/dist/src/wrapAssembly.js" {
  import type { Yoga } from "yoga-layout/load";

  export default function wrapAssembly(lib: unknown): Yoga;
}
