import { expect, test } from "vite-plus/test";
import { pickIdToRgba, rgbaToPickId, PICK_ID_EMPTY } from "../src/hit/pick-id-codec.ts";

test("PICK_ID_EMPTY is 0", () => {
  expect(PICK_ID_EMPTY).toBe(0);
});

test("pickIdToRgba encodes pickId=1 correctly", () => {
  const [r, g, b, a] = pickIdToRgba(1);
  expect(r).toBe(0);
  expect(g).toBe(0);
  expect(b).toBe(1);
  expect(a).toBe(255);
});

test("pickIdToRgba encodes max 24-bit id correctly", () => {
  const id = 0xffffff;
  const [r, g, b, a] = pickIdToRgba(id);
  expect(r).toBe(0xff);
  expect(g).toBe(0xff);
  expect(b).toBe(0xff);
  expect(a).toBe(255);
});

test("pickIdToRgba encodes mid-range id correctly", () => {
  const id = 0x123456;
  const [r, g, b] = pickIdToRgba(id);
  expect(r).toBe(0x12);
  expect(g).toBe(0x34);
  expect(b).toBe(0x56);
});

test("rgbaToPickId decodes 0,0,1 to pickId=1", () => {
  expect(rgbaToPickId(0, 0, 1)).toBe(1);
});

test("rgbaToPickId decodes 0,0,0 to PICK_ID_EMPTY", () => {
  expect(rgbaToPickId(0, 0, 0)).toBe(PICK_ID_EMPTY);
});

test("rgbaToPickId round-trips with pickIdToRgba", () => {
  for (const id of [1, 255, 65535, 0x123456, 0xffffff]) {
    const [r, g, b] = pickIdToRgba(id);
    expect(rgbaToPickId(r, g, b)).toBe(id);
  }
});
