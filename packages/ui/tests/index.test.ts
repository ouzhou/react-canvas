import { expect, test } from "vite-plus/test";
import { packageName } from "../src/index.ts";

test("packageName", () => {
  expect(packageName).toBe("@react-canvas/ui");
});
