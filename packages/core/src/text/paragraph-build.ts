import type {
  CanvasKit,
  FontCollection,
  Paragraph,
  ParagraphStyle,
  TextStyle as SkTextStyle,
} from "canvaskit-wasm";
import { MeasureMode } from "yoga-layout/load";
import type { TextOnlyProps } from "../style/text-style.ts";
import { getLayoutCanvasKit } from "../layout/canvas-kit.ts";

/** One styled run after nested `<Text>` flattening (measure + paint). */
export type ParagraphSpan = { style: TextOnlyProps; text: string };

/** When set (e.g. tests or app init), fonts are registered for Paragraph shaping. */
let paragraphFontBuffers: ArrayBuffer[] | null = null;
/** One CSS family name per buffer, passed to `TypefaceFontProvider.registerFont`. */
let paragraphEmbeddedRegisterNames: string[] = [];
/** Default `fontFamilies` stack when `TextOnlyProps.fontFamily` is omitted. */
let paragraphFontFamilies: string[] = ["sans-serif"];

/** CSS `font-family` list: comma-separated, optional quotes per segment. */
export function parseFontFamilyList(value: string): string[] {
  const parts = value.split(",");
  const out: string[] = [];
  for (const part of parts) {
    const name = part.trim().replace(/^["']|["']$/g, "");
    if (name.length > 0) out.push(name);
  }
  return out;
}

export function hasParagraphFontsRegistered(): boolean {
  return paragraphFontBuffers !== null && paragraphFontBuffers.length > 0;
}

/** Clears embedded paragraph fonts (tests only). */
export function resetParagraphFontStateForTests(): void {
  disposeEmbeddedFontCollectionCache();
  paragraphFontBuffers = null;
  paragraphEmbeddedRegisterNames = [];
  paragraphFontFamilies = ["sans-serif"];
}

/**
 * Register one font file per family name (TTF/OTF). `families.length` must equal buffer count.
 * Each name is both the registration key and the default stack entry (in order) for fallback.
 */
export function setParagraphFontForTests(
  buffer: ArrayBuffer | ArrayBuffer[],
  families: string[],
): void {
  const buffers = Array.isArray(buffer) ? buffer : [buffer];
  if (buffers.length === 0) {
    disposeEmbeddedFontCollectionCache();
    paragraphFontBuffers = null;
    paragraphEmbeddedRegisterNames = [];
    return;
  }
  if (families.length !== buffers.length) {
    throw new Error(
      `[react-canvas] setParagraphFontForTests: families.length (${families.length}) must match buffer count (${buffers.length}).`,
    );
  }
  disposeEmbeddedFontCollectionCache();
  paragraphFontBuffers = buffers;
  paragraphEmbeddedRegisterNames = [...families];
  paragraphFontFamilies = [...families];
}

/**
 * Re-registering large embedded fonts on every Paragraph build exhausts or corrupts CanvasKit WASM
 * memory; keep one FontCollection per CanvasKit instance for the current embedded font bytes.
 */
let embeddedFontCollectionCache: {
  ck: CanvasKit;
  fc: FontCollection;
  dispose: () => void;
} | null = null;

function disposeEmbeddedFontCollectionCache(): void {
  if (!embeddedFontCollectionCache) return;
  embeddedFontCollectionCache.dispose();
  embeddedFontCollectionCache = null;
}

function createEmbeddedFontCollection(ck: CanvasKit): { fc: FontCollection; dispose: () => void } {
  if (!paragraphFontBuffers || paragraphFontBuffers.length === 0) {
    throw new Error("[react-canvas] embedded paragraph fonts not set");
  }
  const tfp = ck.TypefaceFontProvider.Make();
  for (let i = 0; i < paragraphFontBuffers.length; i++) {
    tfp.registerFont(paragraphFontBuffers[i]!, paragraphEmbeddedRegisterNames[i]!);
  }
  const fc = ck.FontCollection.Make();
  fc.setDefaultFontManager(tfp);
  fc.enableFontFallback();
  return {
    fc,
    dispose: () => {
      fc.delete();
      tfp.delete();
    },
  };
}

function getOrCreateEmbeddedFontCollection(ck: CanvasKit): FontCollection {
  if (embeddedFontCollectionCache && embeddedFontCollectionCache.ck !== ck) {
    disposeEmbeddedFontCollectionCache();
  }
  if (embeddedFontCollectionCache) {
    return embeddedFontCollectionCache.fc;
  }
  const { fc, dispose } = createEmbeddedFontCollection(ck);
  embeddedFontCollectionCache = { ck, fc, dispose };
  return fc;
}

/**
 * Default `fontFamilies` stack when `TextOnlyProps.fontFamily` is omitted. Does not load bytes;
 * pairing with {@link initCanvasRuntime} (default fonts) or `setParagraphFontForTests` is required
 * for glyphs on CanvasKit Web.
 */
export function setParagraphFontFamilies(families: string[]): void {
  paragraphFontFamilies = families.length > 0 ? [...families] : ["sans-serif"];
}

function mapFontWeight(
  ck: CanvasKit,
  w: TextOnlyProps["fontWeight"],
): NonNullable<SkTextStyle["fontStyle"]>["weight"] | undefined {
  if (w === undefined) return undefined;
  if (w === "normal") return ck.FontWeight.Normal;
  if (w === "bold") return ck.FontWeight.Bold;
  if (typeof w === "string" && /^\d+$/.test(w)) {
    const n = Number.parseInt(w, 10);
    if (n <= 350) return ck.FontWeight.Light;
    if (n <= 550) return ck.FontWeight.Normal;
    if (n <= 750) return ck.FontWeight.SemiBold;
    return ck.FontWeight.Bold;
  }
  return ck.FontWeight.Normal;
}

/**
 * Skia `TextStyle.heightMultiplier` is the line-height ratio vs font size (e.g. 1.45 → 1.45×).
 * We support:
 * - **Unitless** (CSS-like): `lineHeight` in ~0.5–4 (e.g. 1.45) → use as multiplier directly.
 * - **Absolute px** (React Native): larger values → `lineHeight / fontSize`.
 */
export function lineHeightToSkHeightMultiplier(lineHeight: number, fontSize: number): number {
  if (lineHeight >= 0.5 && lineHeight <= 4) {
    return lineHeight;
  }
  return lineHeight / fontSize;
}

function mapTextAlign(
  ck: CanvasKit,
  a: TextOnlyProps["textAlign"],
): ParagraphStyle["textAlign"] | undefined {
  if (a === "left") return ck.TextAlign.Left;
  if (a === "center") return ck.TextAlign.Center;
  if (a === "right") return ck.TextAlign.Right;
  return undefined;
}

function resolveFontFamilies(text: TextOnlyProps): string[] {
  if (text.fontFamily != null && text.fontFamily.trim() !== "") {
    const parsed = parseFontFamilyList(text.fontFamily);
    if (parsed.length > 0) return parsed;
  }
  return [...paragraphFontFamilies];
}

function toSkTextStyle(ck: CanvasKit, text: TextOnlyProps): SkTextStyle {
  const fontStyle: NonNullable<SkTextStyle["fontStyle"]> = {};
  const weight = mapFontWeight(ck, text.fontWeight);
  if (weight !== undefined) fontStyle.weight = weight;

  const ts: SkTextStyle = {
    fontSize: text.fontSize ?? 14,
    fontFamilies: resolveFontFamilies(text),
    fontStyle: Object.keys(fontStyle).length > 0 ? fontStyle : undefined,
  };
  if (text.color !== undefined) {
    ts.color = ck.parseColorString(text.color);
  }
  if (text.lineHeight !== undefined && text.fontSize !== undefined && text.fontSize > 0) {
    ts.heightMultiplier = lineHeightToSkHeightMultiplier(text.lineHeight, text.fontSize);
  }
  /** `pushStyle` does not run `TextStyle()`; Embind requires `decoration`, default colors, etc. */
  return new ck.TextStyle(ts);
}

function toParagraphStyle(ck: CanvasKit, text: TextOnlyProps): ParagraphStyle {
  /** Embind requires this field at runtime even though `.d.ts` marks it optional. */
  const ps: ParagraphStyle = {
    disableHinting: false,
    textStyle: toSkTextStyle(ck, text),
  };
  const ta = mapTextAlign(ck, text.textAlign);
  if (ta !== undefined) ps.textAlign = ta;
  if (text.numberOfLines !== undefined) ps.maxLines = text.numberOfLines;
  if (text.ellipsizeMode === "tail") ps.ellipsis = "…";
  /** Normalizes ellipsis → `_ellipsisPtr`, strut defaults, `TextStyle` sub-fields, etc. */
  return new ck.ParagraphStyle(ps);
}

/** Paragraph-level alignment / ellipsis / max lines come from the outer `Text`; first span supplies default textStyle. */
function paragraphShellForMultiSpans(
  ck: CanvasKit,
  outer: TextOnlyProps,
  firstSpanMerged: TextOnlyProps,
): ParagraphStyle {
  const combined: TextOnlyProps = { ...firstSpanMerged };
  if (outer.textAlign !== undefined) combined.textAlign = outer.textAlign;
  if (outer.numberOfLines !== undefined) combined.numberOfLines = outer.numberOfLines;
  if (outer.ellipsizeMode !== undefined) combined.ellipsizeMode = outer.ellipsizeMode;
  return toParagraphStyle(ck, combined);
}

/** Build a Skia Paragraph (caller must `delete()` when done). */
export function buildParagraph(ck: CanvasKit, body: string, text: TextOnlyProps): Paragraph {
  const style = toParagraphStyle(ck, text);
  if (paragraphFontBuffers && paragraphFontBuffers.length > 0) {
    const fc = getOrCreateEmbeddedFontCollection(ck);
    const pb = ck.ParagraphBuilder.MakeFromFontCollection(style, fc);
    pb.addText(body);
    const p = pb.build();
    pb.delete();
    return p;
  }
  const fontSrc = ck.TypefaceFontProvider.Make();
  const pb = ck.ParagraphBuilder.MakeFromFontProvider(style, fontSrc);
  pb.addText(body);
  const p = pb.build();
  pb.delete();
  fontSrc.delete();
  return p;
}

/** Build a multi-style Paragraph (caller must `delete()` when done). */
export function buildParagraphFromSpans(
  ck: CanvasKit,
  outer: TextOnlyProps,
  spans: ParagraphSpan[],
): Paragraph {
  if (spans.length === 0) {
    return buildParagraph(ck, "", outer);
  }
  const shell = paragraphShellForMultiSpans(ck, outer, spans[0].style);
  if (paragraphFontBuffers && paragraphFontBuffers.length > 0) {
    const fc = getOrCreateEmbeddedFontCollection(ck);
    const pb = ck.ParagraphBuilder.MakeFromFontCollection(shell, fc);
    pb.addText(spans[0].text);
    for (let i = 1; i < spans.length; i++) {
      pb.pushStyle(toSkTextStyle(ck, spans[i].style));
      pb.addText(spans[i].text);
      pb.pop();
    }
    const p = pb.build();
    pb.delete();
    return p;
  }
  const fontSrc = ck.TypefaceFontProvider.Make();
  const pb = ck.ParagraphBuilder.MakeFromFontProvider(shell, fontSrc);
  pb.addText(spans[0].text);
  for (let i = 1; i < spans.length; i++) {
    pb.pushStyle(toSkTextStyle(ck, spans[i].style));
    pb.addText(spans[i].text);
    pb.pop();
  }
  const p = pb.build();
  pb.delete();
  fontSrc.delete();
  return p;
}

/**
 * Max width passed to `Paragraph.layout` for Yoga measure. `Undefined` → no line constraint (intrinsic width).
 * Non-finite or negative `width` would break Skia shaping; treat like unbounded.
 */
function layoutMaxWidthForMeasure(width: number, widthMode: MeasureMode): number {
  if (widthMode === MeasureMode.Undefined) {
    return 1e9;
  }
  if (!Number.isFinite(width) || width < 0) {
    return 1e9;
  }
  return width;
}

/**
 * Measure flattened spans for Yoga `setMeasureFunc`. Uses `getLayoutCanvasKit()` (set during `calculateLayout`).
 */
export function measureParagraphSpans(
  outer: TextOnlyProps,
  spans: ParagraphSpan[],
  width: number,
  widthMode: MeasureMode,
  _height: number,
  _heightMode: MeasureMode,
): { width: number; height: number } {
  const ck = getLayoutCanvasKit();
  if (!ck || spans.length === 0) {
    return { width: 0, height: 0 };
  }
  const p = buildParagraphFromSpans(ck, outer, spans);
  try {
    if (widthMode !== MeasureMode.Undefined && Number.isFinite(width) && width <= 0) {
      return { width: 0, height: 0 };
    }
    const maxW = layoutMaxWidthForMeasure(width, widthMode);
    p.layout(maxW);
    const lineWidth = p.getLongestLine();
    const w = widthMode === MeasureMode.Undefined ? lineWidth : Math.min(lineWidth, maxW);
    const h = p.getHeight();
    return { width: w, height: h };
  } finally {
    p.delete();
  }
}

/**
 * Measure text for Yoga `setMeasureFunc`. Uses `getLayoutCanvasKit()` (set during `calculateLayout`).
 */
export function measureTextForYoga(
  text: TextOnlyProps,
  body: string,
  width: number,
  widthMode: MeasureMode,
  _height: number,
  _heightMode: MeasureMode,
): { width: number; height: number } {
  const ck = getLayoutCanvasKit();
  if (!ck || body.length === 0) {
    return { width: 0, height: 0 };
  }
  const p = buildParagraph(ck, body, text);
  try {
    if (widthMode !== MeasureMode.Undefined && Number.isFinite(width) && width <= 0) {
      return { width: 0, height: 0 };
    }
    const maxW = layoutMaxWidthForMeasure(width, widthMode);
    p.layout(maxW);
    const lineWidth = p.getLongestLine();
    const w = widthMode === MeasureMode.Undefined ? lineWidth : Math.min(lineWidth, maxW);
    const h = p.getHeight();
    return { width: w, height: h };
  } finally {
    p.delete();
  }
}
