import { describe, expect, it } from "vite-plus/test";
import {
  getInitialUncontrolledValue,
  isControlledProp,
} from "../src/hooks/use-controllable-value.ts";

describe("useControllableValue helpers", () => {
  it("isControlledProp: checked false is still controlled", () => {
    expect(isControlledProp({ checked: false }, "checked")).toBe(true);
    expect(isControlledProp({}, "checked")).toBe(false);
  });

  it("getInitialUncontrolledValue reads defaultChecked", () => {
    expect(getInitialUncontrolledValue({ defaultChecked: true }, "defaultChecked", false)).toBe(
      true,
    );
    expect(getInitialUncontrolledValue({}, "defaultChecked", false)).toBe(false);
  });
});
