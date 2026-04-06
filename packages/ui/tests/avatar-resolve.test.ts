import { describe, expect, it } from "vite-plus/test";
import { resolveAvatarVisibleLayer } from "../src/components/avatar/resolve-avatar-content.ts";

describe("resolveAvatarVisibleLayer", () => {
  it("loaded + source shows image", () => {
    expect(
      resolveAvatarVisibleLayer({
        source: { uri: "x" },
        loadState: "loaded",
        hasIcon: true,
        hasChildren: true,
      }),
    ).toBe("image");
  });

  it("loading prefers icon over text", () => {
    expect(
      resolveAvatarVisibleLayer({
        source: { uri: "x" },
        loadState: "loading",
        hasIcon: true,
        hasChildren: true,
      }),
    ).toBe("icon");
  });

  it("error falls back to icon", () => {
    expect(
      resolveAvatarVisibleLayer({
        source: { uri: "x" },
        loadState: "error",
        hasIcon: true,
        hasChildren: false,
      }),
    ).toBe("icon");
  });

  it("no source uses icon then text", () => {
    expect(
      resolveAvatarVisibleLayer({
        source: undefined,
        loadState: "loaded",
        hasIcon: true,
        hasChildren: true,
      }),
    ).toBe("icon");
  });
});
