import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

export const DEFAULT_CANVASKIT_WASM_URL = canvaskitWasmUrl;

export function canvasKitLocateFile(file: string): string {
  if (file.endsWith(".wasm")) {
    return canvaskitWasmUrl;
  }
  const slash = canvaskitWasmUrl.lastIndexOf("/");
  const base = slash >= 0 ? canvaskitWasmUrl.slice(0, slash + 1) : canvaskitWasmUrl;
  return `${base}${file}`;
}
