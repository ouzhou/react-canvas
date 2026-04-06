import type {
  CanvasSyntheticPointerEvent,
  InteractionHandlers,
  ViewStyle,
} from "@react-canvas/core";
import { View } from "@react-canvas/react";
import { useContext, useMemo } from "react";
import { useControllableValue } from "../../hooks/use-controllable-value.ts";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import {
  getSwitchMetrics,
  getSwitchThumbOffset,
  getSwitchThumbStyle,
  getSwitchTrackStyle,
  type SwitchSize,
} from "./variants.ts";

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  size?: SwitchSize;
  style?: ViewStyle;
  onChange?: (checked: boolean) => void;
  token?: CanvasToken;
} & InteractionHandlers;

export function Switch(props: SwitchProps) {
  const ctx = useContext(CanvasThemeContext);
  const {
    token: tokenProp,
    size = "md",
    disabled,
    style,
    onChange,
    onClick,
    ...restHandlers
  } = props;

  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Switch: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
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

  const { pad } = getSwitchMetrics(size);
  const thumbOffset = getSwitchThumbOffset(size, checked);

  const trackStyle = mergeViewStyles(
    {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
    },
    getSwitchTrackStyle(size, token, checked),
    disabled ? { opacity: 0.5 } : {},
    style,
  );

  const handleClick = (e: CanvasSyntheticPointerEvent) => {
    if (disabled) return;
    setValue(!checked);
    onClick?.(e);
  };

  return (
    <View style={trackStyle} onClick={handleClick} {...restHandlers}>
      <View
        style={mergeViewStyles(
          {
            position: "absolute",
            left: pad + thumbOffset,
            top: pad,
          },
          getSwitchThumbStyle(size),
        )}
      />
    </View>
  );
}
