import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";
import { afterAll, afterEach, beforeAll, expect, test } from "vite-plus/test";

import { setParagraphMeasureContext } from "../src/layout/paragraph-measure-context.ts";
import { measureParagraphFromRuns } from "../src/text/paragraph-from-runs.ts";

const canvaskitBinDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../node_modules/canvaskit-wasm/bin",
);

/** 不经过被 setup mock 的 `initCanvasKit`，用 `locateFile` 指向包内 wasm，便于在 Node 里跑真实 Embind。 */
async function loadRealCanvasKit() {
  const CanvasKitInit = (await import("canvaskit-wasm")).default as unknown as (
    opts?: CanvasKitInitOptions,
  ) => Promise<CanvasKit>;
  return CanvasKitInit({
    locateFile: (file: string) => join(canvaskitBinDir, file),
  });
}

let sharedCk: CanvasKit | null = null;

beforeAll(async () => {
  sharedCk = await loadRealCanvasKit();
}, 60_000);

afterAll(() => {
  sharedCk = null;
});

afterEach(() => {
  setParagraphMeasureContext(null);
});

test("CanvasKit ParagraphBuilder.pushStyle accepts TextStyle with decoration: NoDecoration", () => {
  const ck = sharedCk!;
  const provider = ck.TypefaceFontProvider.Make();
  const complete = {
    color: ck.BLACK,
    decoration: ck.NoDecoration,
    decorationStyle: ck.DecorationStyle.Solid,
    decorationThickness: 1,
    fontSize: 16,
    fontFamilies: ["Helvetica"],
    fontStyle: {
      weight: ck.FontWeight.Normal,
      width: ck.FontWidth.Normal,
      slant: ck.FontSlant.Upright,
    },
    heightMultiplier: 1,
    halfLeading: false,
    letterSpacing: 0,
    wordSpacing: 0,
  };
  const paraStyle = new ck.ParagraphStyle({
    textAlign: ck.TextAlign.Left,
    textStyle: complete,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, provider);
  expect(() => {
    builder.pushStyle(complete);
    builder.addText("x");
  }).not.toThrow();
  builder.delete();
});

/**
 * 目标：带 `color` 的 run 走 `measureParagraphFromRuns` 时不应抛 Embind 错。
 * 未在 `TextStyle` 上补 `decoration` 前，本用例**应失败**（`vp test` 见红）；补全后应变绿，用来确认修改正确。
 */
test("measureParagraphFromRuns does not throw when runs include color (Paragraph TextStyle needs decoration)", () => {
  const ck = sharedCk!;
  const provider = ck.TypefaceFontProvider.Make();
  setParagraphMeasureContext({
    ck,
    fontFamily: "Helvetica",
    fontProvider: provider,
  });
  expect(() =>
    measureParagraphFromRuns([{ text: "ab", color: "#112233" }], { fontSize: 14 }, 80),
  ).not.toThrow();
});

test("measureParagraphFromRuns supports underline + letterSpacing from box style", () => {
  const ck = sharedCk!;
  const provider = ck.TypefaceFontProvider.Make();
  setParagraphMeasureContext({
    ck,
    fontFamily: "Helvetica",
    fontProvider: provider,
  });
  expect(() =>
    measureParagraphFromRuns(
      [{ text: "ab" }],
      {
        fontSize: 14,
        textDecorationLine: "underline",
        letterSpacing: 0.5,
        textAlign: "center",
      },
      80,
    ),
  ).not.toThrow();
});
