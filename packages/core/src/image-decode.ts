import type { CanvasKit } from "canvaskit-wasm";

export function decodeImageFromEncoded(
  canvasKit: CanvasKit,
  bytes: Uint8Array,
): import("canvaskit-wasm").Image | null {
  return canvasKit.MakeImageFromEncoded(bytes);
}

export async function loadImageFromUri(
  canvasKit: CanvasKit,
  uri: string,
  signal?: AbortSignal,
): Promise<import("canvaskit-wasm").Image | null> {
  const res = await fetch(uri, { signal });
  if (!res.ok) {
    throw new Error(`[react-canvas] Image fetch failed: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  return decodeImageFromEncoded(canvasKit, bytes);
}
