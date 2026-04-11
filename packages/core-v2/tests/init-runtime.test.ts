import type { CanvasKit } from "canvaskit-wasm";
import { beforeEach, expect, test, vi } from "vite-plus/test";

vi.mock("../src/render/canvaskit.ts", () => ({
  initCanvasKit: vi.fn().mockResolvedValue({} as CanvasKit),
}));

import {
  getRuntimeSnapshot,
  initRuntime,
  resetRuntimeInitForTests,
  subscribeRuntimeInit,
} from "../src/runtime/init-runtime.ts";

beforeEach(() => {
  resetRuntimeInitForTests();
});

test("getRuntimeSnapshot is idle before init", () => {
  expect(getRuntimeSnapshot()).toEqual({ status: "idle" });
});

test("first initRuntime sets loading synchronously then ready", async () => {
  const p = initRuntime();
  expect(getRuntimeSnapshot().status).toBe("loading");
  await p;
  expect(getRuntimeSnapshot().status).toBe("ready");
  const snap = getRuntimeSnapshot();
  if (snap.status !== "ready") throw new Error("expected ready");
  expect(snap.runtime.yoga).toBeDefined();
  expect(snap.runtime.canvasKit).toBeDefined();
});

test("multiple initRuntime calls share one Promise", () => {
  const a = initRuntime();
  const b = initRuntime();
  expect(a).toBe(b);
});

test("subscribeRuntimeInit runs when snapshot changes", async () => {
  const statuses: string[] = [];
  const unsub = subscribeRuntimeInit(() => {
    statuses.push(getRuntimeSnapshot().status);
  });
  await initRuntime();
  unsub();
  expect(statuses).toContain("loading");
  expect(statuses).toContain("ready");
});

test("resetRuntimeInitForTests clears state for a fresh init", async () => {
  await initRuntime();
  expect(getRuntimeSnapshot().status).toBe("ready");
  resetRuntimeInitForTests();
  expect(getRuntimeSnapshot()).toEqual({ status: "idle" });
  const p = initRuntime();
  expect(getRuntimeSnapshot().status).toBe("loading");
  await p;
  expect(getRuntimeSnapshot().status).toBe("ready");
});

test("initRuntime failure sets error snapshot", async () => {
  const { initCanvasKit } = await import("../src/render/canvaskit.ts");
  vi.mocked(initCanvasKit).mockRejectedValueOnce(new Error("ck load failed"));
  resetRuntimeInitForTests();
  await expect(initRuntime()).rejects.toThrow("ck load failed");
  const failed = getRuntimeSnapshot();
  expect(failed.status).toBe("error");
  if (failed.status === "error") {
    expect(failed.error.message).toContain("ck load failed");
  }
  vi.mocked(initCanvasKit).mockResolvedValue({} as CanvasKit);
});
