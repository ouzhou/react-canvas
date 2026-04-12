import type { CanvasKit, TypefaceFontProvider } from "canvaskit-wasm";

/**
 * 注册到 {@link TypefaceFontProvider} 的逻辑族名，与 Paragraph `fontFamilies` 一致。
 */
export const DEFAULT_PARAGRAPH_FONT_FAMILY = "ReactCanvasDefaultParagraph";

export type LoadedParagraphFont = {
  provider: TypefaceFontProvider;
  familyName: string;
};

/**
 * 拉取字体二进制并注册到 CanvasKit，供 Paragraph 使用。
 */
export async function loadDefaultParagraphFont(
  ck: CanvasKit,
  url: string,
): Promise<LoadedParagraphFont> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `[@react-canvas/core-v2] Paragraph font fetch failed HTTP ${res.status} for ${url}`,
    );
  }
  const buf = await res.arrayBuffer();
  const provider = ck.TypefaceFontProvider.Make();
  provider.registerFont(buf, DEFAULT_PARAGRAPH_FONT_FAMILY);
  return { provider, familyName: DEFAULT_PARAGRAPH_FONT_FAMILY };
}
