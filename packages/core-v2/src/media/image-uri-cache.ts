import type { CanvasKit } from "canvaskit-wasm";

type EncodedImage = NonNullable<ReturnType<CanvasKit["MakeImageFromEncoded"]>>;

const decoded = new Map<string, EncodedImage>();
const inflight = new Map<string, Promise<EncodedImage | null>>();

/** 与 `fetch` 忽略 fragment 一致，缓存键去掉 `#` 及后缀。 */
export function normalizeUriKey(uri: string): string {
  const i = uri.indexOf("#");
  return i === -1 ? uri : uri.slice(0, i);
}

export function peekDecodedImage(key: string): EncodedImage | undefined {
  return decoded.get(key);
}

/**
 * 同一 URI（规范化键）共享一次 fetch+解码；并发调用 await 同一 Promise。
 * 成功后将 `SkImage` 写入全局表直至 `resetImageUriCacheForTests`。
 */
export function getOrStartInflightDecode(
  key: string,
  uriForFetch: string,
  ck: CanvasKit,
  fetchImpl: typeof fetch,
): Promise<EncodedImage | null> {
  const cached = decoded.get(key);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }
  let p = inflight.get(key);
  if (!p) {
    p = (async (): Promise<EncodedImage | null> => {
      try {
        const res = await fetchImpl(uriForFetch);
        if (!res.ok) {
          throw new Error(`[core-v2] image fetch failed: HTTP ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        const img = ck.MakeImageFromEncoded(new Uint8Array(buf));
        if (!img) {
          return null;
        }
        decoded.set(key, img);
        return img;
      } catch {
        return null;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
  }
  return p;
}

/** 单测用：释放已解码图像并清空 in-flight。 */
export function resetImageUriCacheForTests(): void {
  inflight.clear();
  for (const img of decoded.values()) {
    img.delete();
  }
  decoded.clear();
}
