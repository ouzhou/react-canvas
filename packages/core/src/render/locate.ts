import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

/**
 * Resolve CanvasKit `locateFile` to the same directory as the bundled `canvaskit.wasm`
 * from `canvaskit-wasm` (version pinned by this package’s dependency).
 *
 * In Vitest, mock this module so Node can open real files under
 * `node_modules/canvaskit-wasm/bin/` (Vite’s `/@fs/...` URLs are not valid for `fs`).
 */
export function canvasKitLocateFile(file: string): string {
  const slash = canvaskitWasmUrl.lastIndexOf("/");
  const base = slash >= 0 ? canvaskitWasmUrl.slice(0, slash + 1) : canvaskitWasmUrl;
  return `${base}${file}`;
}
