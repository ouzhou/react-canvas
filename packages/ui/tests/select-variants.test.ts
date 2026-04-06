import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";
import {
  getSelectOptionRowStyle,
  getSelectPanelStyle,
  selectFontSize,
  selectPopoverBackground,
  selectTriggerPadding,
} from "../src/components/select/variants.ts";

const token = getCanvasToken({});

describe("select variants", () => {
  it("md metrics are not smaller than sm", () => {
    expect(selectTriggerPadding("md", token)).toBeGreaterThanOrEqual(
      selectTriggerPadding("sm", token),
    );
    expect(selectFontSize("md", token)).toBeGreaterThanOrEqual(selectFontSize("sm", token));
  });

  it("selected option uses distinct background from transparent row", () => {
    const sel = getSelectOptionRowStyle(token, { hovered: false, selected: true });
    const plain = getSelectOptionRowStyle(token, { hovered: false, selected: false });
    expect(sel.backgroundColor).not.toBe(plain.backgroundColor);
  });

  it("popover panel uses solid background (light: white, dark: elevated)", () => {
    expect(selectPopoverBackground(token)).toBe("#ffffff");
    expect(getSelectPanelStyle(token).backgroundColor).toBe("#ffffff");
    const dark = getCanvasToken({ appearance: "dark" });
    expect(selectPopoverBackground(dark)).toBe(dark.colorBgHover);
  });
});
