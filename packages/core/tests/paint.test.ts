import { expect, test, vi } from "vite-plus/test";
import { ViewNode, paintScene } from "../src/index.ts";
import type { RenderBackend } from "../src/index.ts";

test("C5: paintScene calls backend methods", () => {
  const backend: RenderBackend = {
    clear: vi.fn(),
    fillRect: vi.fn(),
  };

  const root = new ViewNode({ style: { backgroundColor: "#ff0000" } });
  paintScene([root], backend, 800, 600);

  expect(backend.clear).toHaveBeenCalledWith(800, 600);
  expect(backend.fillRect).toHaveBeenCalledWith(0, 0, 800, 600, "#ff0000");
});
