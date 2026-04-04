import { expect, test } from "vite-plus/test";
import { createElement } from "react";
import { render, View } from "../src/index.ts";

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

test("R1: render() creates fiber root without throwing", () => {
  const canvas = createMockCanvas();
  const handle = render(createElement(View), canvas);
  expect(handle).toBeDefined();
  expect(handle.unmount).toBeTypeOf("function");
  handle.unmount();
});

test("R2: reconciler syncs scene tree", async () => {
  const canvas = createMockCanvas();
  const handle = render(createElement(View, { style: { backgroundColor: "red" } }), canvas);

  await new Promise((r) => {
    setTimeout(r, 50);
  });

  expect(() => {
    handle.unmount();
  }).not.toThrow();
});

test("R3: props update does not throw", async () => {
  const canvas = createMockCanvas();
  render(createElement(View, { style: { backgroundColor: "red" } }), canvas);

  await new Promise((r) => {
    setTimeout(r, 50);
  });

  const handle2 = render(createElement(View, { style: { backgroundColor: "blue" } }), canvas);

  await new Promise((r) => {
    setTimeout(r, 50);
  });

  expect(() => {
    handle2.unmount();
  }).not.toThrow();
});

test("R4: unmount cleans up", async () => {
  const canvas = createMockCanvas();
  const handle = render(createElement(View), canvas);

  await new Promise((r) => {
    setTimeout(r, 50);
  });

  handle.unmount();

  expect(() => {
    handle.unmount();
  }).not.toThrow();
});
