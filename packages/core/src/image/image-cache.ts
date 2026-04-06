import type { Image as SkImage } from "canvaskit-wasm";

/** URL → decoded bitmap. v1: unbounded Map; long sessions may grow memory. */
const uriToImage = new Map<string, SkImage>();

export function peekCachedImage(uri: string): SkImage | undefined {
  return uriToImage.get(uri);
}

/** Replaces existing entry and deletes the previous SkImage to avoid leaks. */
export function putCachedImage(uri: string, image: SkImage): void {
  const prev = uriToImage.get(uri);
  if (prev !== undefined && prev !== image) {
    prev.delete();
  }
  uriToImage.set(uri, image);
}

/** Test helper: clear cache without deleting images (unsafe if images still used). */
export function clearImageCacheForTests(): void {
  uriToImage.clear();
}
