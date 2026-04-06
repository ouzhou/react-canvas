import type {
  CanvasSyntheticPointerEvent,
  InteractionHandlers,
  ViewStyle,
} from "@react-canvas/core";
import { SvgPath, View } from "@react-canvas/react";
import { useContext, useMemo, type ReactNode } from "react";
import { useControllableValue } from "../../hooks/use-controllable-value.ts";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import {
  checkboxBoxSize,
  getCheckboxCheckedStyles,
  getCheckboxStyles,
  type CheckboxSize,
} from "./variants.ts";

const CHECK_D = "M4 12 L9 17 L20 6";

export type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: CheckboxSize;
  style?: ViewStyle;
  children?: ReactNode;
  onChange?: (checked: boolean) => void;
  token?: CanvasToken;
} & InteractionHandlers;

export function Checkbox(props: CheckboxProps) {
  const ctx = useContext(CanvasThemeContext);
  const {
    token: tokenProp,
    size = "md",
    disabled,
    indeterminate = false,
    style,
    children,
    onChange,
    onClick,
    ...restHandlers
  } = props;

  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Checkbox: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }

  const controlProps = useMemo(() => {
    const p: Record<string, unknown> = { onChange };
    if (Object.hasOwn(props, "checked")) p.checked = props.checked;
    if (Object.hasOwn(props, "defaultChecked")) p.defaultChecked = props.defaultChecked;
    return p;
  }, [props, onChange]);

  const [checked, setValue] = useControllableValue<boolean>(controlProps, {
    valuePropName: "checked",
    defaultValuePropName: "defaultChecked",
    trigger: "onChange",
    defaultValue: false,
  });

  const showIndeterminate = indeterminate;
  const showChecked = !showIndeterminate && checked;
  const dim = checkboxBoxSize(size);
  const markSize = Math.max(10, dim - 6);

  const base = mergeViewStyles(getCheckboxStyles(size, token), style ?? {});
  const filled = showChecked || showIndeterminate ? getCheckboxCheckedStyles(token) : {};

  const merged = mergeViewStyles(base, filled, disabled ? { opacity: 0.5 } : {});

  const handleClick = (e: CanvasSyntheticPointerEvent) => {
    if (disabled) return;
    if (showIndeterminate) {
      setValue(true);
    } else {
      setValue(!checked);
    }
    onClick?.(e);
  };

  /**
   * 画布合成 `click` 要求 down/up 命中同一节点；方框与 `children`（文案）为兄弟时会失败。
   * 用透明层盖住整行，使整段交互区命中一致（等价于 DOM `<label>` 包一整行）。
   */
  const hitLayerStyle: ViewStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  };

  return (
    <View
      style={{
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        gap: token.paddingSM,
      }}
    >
      <View style={merged}>
        {showIndeterminate ? (
          <View
            style={{
              width: dim - 6,
              height: 2,
              backgroundColor: "#ffffff",
              borderRadius: 1,
            }}
          />
        ) : null}
        {showChecked ? (
          <SvgPath
            d={CHECK_D}
            viewBox="0 0 24 24"
            size={markSize}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.5}
            style={{ marginTop: -1 }}
          />
        ) : null}
      </View>
      {children}
      <View style={hitLayerStyle} onClick={handleClick} {...restHandlers} />
    </View>
  );
}
