import canvaskitWasmUrl from "canvaskit-wasm/bin/canvaskit.wasm?url";

export function canvasKitLocateFile(file: string): string {
  const slash = canvaskitWasmUrl.lastIndexOf("/");
  const base = slash >= 0 ? canvaskitWasmUrl.slice(0, slash + 1) : canvaskitWasmUrl;
  return `${base}${file}`;
}
