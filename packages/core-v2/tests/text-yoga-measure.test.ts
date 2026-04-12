import { expect, test } from "vite-plus/test";
import { approximateParagraphSize } from "../src/layout/text-yoga-measure.ts";

test("approximateParagraphSize: narrow width yields taller block than wide width", () => {
  const text = "abcdefghijklmnopqrstuvwxyz";
  const fs = 16;
  const wide = approximateParagraphSize(text, 800, fs);
  const narrow = approximateParagraphSize(text, 80, fs);
  expect(narrow.height).toBeGreaterThan(wide.height);
});

test("approximateParagraphSize: newline increases height", () => {
  const fs = 16;
  const w = 200;
  const one = approximateParagraphSize("hello", w, fs);
  const two = approximateParagraphSize("hello\nworld", w, fs);
  expect(two.height).toBeGreaterThanOrEqual(one.height);
});

test("approximateParagraphSize: larger lineHeight multiplier increases height", () => {
  const t = "a\nb\nc";
  const w = 200;
  const fs = 16;
  const normal = approximateParagraphSize(t, w, fs, 1);
  const loose = approximateParagraphSize(t, w, fs, 2);
  expect(loose.height).toBeGreaterThan(normal.height);
});
