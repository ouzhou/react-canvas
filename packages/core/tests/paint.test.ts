import { expect, test, vi } from "vite-plus/test";
import { ViewNode, paintScene } from "../src/index.ts";
import type { RenderBackend } from "../src/index.ts";

test("C5: paintScene calls backend methods", () => {
  const clear = vi.fn();
  const fillRect = vi.fn();
  const backend: RenderBackend = { clear, fillRect };

  const root = new ViewNode({ style: { backgroundColor: "#ff0000" } });
  paintScene([root], backend, 800, 600);

  expect(clear).toHaveBeenCalledWith(800, 600);
  expect(fillRect).toHaveBeenCalledWith(0, 0, 800, 600, "#ff0000");
});
