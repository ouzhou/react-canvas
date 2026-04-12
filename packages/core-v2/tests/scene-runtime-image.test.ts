import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

vi.mock("../src/render/canvaskit.ts", () => ({
  initCanvasKit: vi.fn(),
}));

import { resetImageUriCacheForTests } from "../src/media/image-uri-cache.ts";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";
import { initCanvasKit } from "../src/render/canvaskit.ts";

const origFetch = globalThis.fetch.bind(globalThis);

afterEach(() => {
  vi.restoreAllMocks();
  resetImageUriCacheForTests();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(initCanvasKit).mockResolvedValue({
    MakeImageFromEncoded: vi.fn(() => ({
      width: () => 2,
      height: () => 3,
      delete: vi.fn(),
    })),
  } as never);
});

function stubFetchForExampleCom(
  response: { ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> } | Promise<never>,
) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const u =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (u.includes("example.com")) {
        return Promise.resolve(response) as Promise<Response>;
      }
      return origFetch(input, init);
    });
}

test("insertImage calls onLoad after decode", async () => {
  stubFetchForExampleCom({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const onLoad = vi.fn();
  rt.insertImage(rt.getContentRootId(), "im", {
    uri: "https://example.com/a.png",
    style: { width: 10, height: 10 },
    onLoad,
  });
  for (let i = 0; i < 100 && onLoad.mock.calls.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(rt.getLayoutSnapshot().im?.imageUri).toBe("https://example.com/a.png");
  expect(rt.getLayoutSnapshot().im?.imageObjectFit).toBe("contain");
});

test("insertImage onError when decode returns null", async () => {
  vi.mocked(initCanvasKit).mockResolvedValue({
    MakeImageFromEncoded: vi.fn(() => null),
  } as never);
  stubFetchForExampleCom({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1),
  });
  const rt = await createSceneRuntime({ width: 80, height: 80 });
  const onError = vi.fn();
  rt.insertImage(rt.getContentRootId(), "im2", {
    uri: "https://example.com/b.png",
    style: { width: 8, height: 8 },
    onError,
  });
  for (let i = 0; i < 100 && onError.mock.calls.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  expect(onError).toHaveBeenCalled();
});

test("insertImage onError when fetch fails", async () => {
  const rt = await createSceneRuntime({ width: 80, height: 80 });
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const u =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (u.includes("example.com")) {
        return Promise.reject(new Error("network"));
      }
      return origFetch(input, init);
    },
  );
  const onError = vi.fn();
  rt.insertImage(rt.getContentRootId(), "im3", {
    uri: "https://example.com/c.png",
    style: { width: 8, height: 8 },
    onError,
  });
  for (let i = 0; i < 100 && onError.mock.calls.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  expect(onError).toHaveBeenCalled();
});
