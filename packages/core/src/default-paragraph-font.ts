import { hasParagraphFontsRegistered, setParagraphFontForTests } from "./paragraph-build.ts";

let defaultLoadPromise: Promise<void> | null = null;

/**
 * Built-in default for {@link initCanvasRuntime}: Noto Sans SC subset (CJK + Latin). Hosts may override
 * via `InitCanvasRuntimeOptions.defaultParagraphFontUrl` or ship their own bytes + `setParagraphFontForTests`.
 */
export const BUILTIN_PARAGRAPH_FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf";

/**
 * Idempotent: registers a default paragraph font unless `setParagraphFontForTests` already ran.
 * Used by {@link initCanvasRuntime}; apps normally do not call this.
 */
export async function ensureDefaultParagraphFonts(options?: { url?: string }): Promise<void> {
  if (hasParagraphFontsRegistered()) return;
  if (defaultLoadPromise) {
    await defaultLoadPromise;
    return;
  }
  defaultLoadPromise = (async () => {
    const url = options?.url ?? BUILTIN_PARAGRAPH_FONT_URL;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`[react-canvas] default paragraph font failed: HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    setParagraphFontForTests(buf, ["Noto Sans SC"]);
  })();
  try {
    await defaultLoadPromise;
  } catch (e) {
    defaultLoadPromise = null;
    throw e;
  }
}

export function resetDefaultParagraphFontLoaderForTests(): void {
  defaultLoadPromise = null;
}
