import type {
  CanvasSyntheticPointerEvent,
  InteractionHandlers,
  ViewNode,
  ViewStyle,
} from "@react-canvas/core";
import chevronDown from "@lucide/icons/icons/chevron-down";
import { Text, useAllocateOverlayZIndex, useCanvasClickAway, View } from "@react-canvas/react";
import { useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useControllableValue } from "../../hooks/use-controllable-value.ts";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import { Icon } from "../icon/icon.tsx";
import {
  getSelectOptionRowStyle,
  getSelectPanelStyle,
  getSelectTriggerShellStyle,
  selectFontSize,
  type SelectSize,
} from "./variants.ts";

export type SelectOption = {
  value: string;
  /** 未传时使用 `value` 作为展示文案。 */
  label?: ReactNode;
};

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** 未选中或选中值不在 `options` 内时的占位；默认 `"请选择"`。 */
  placeholder?: ReactNode;
  disabled?: boolean;
  size?: SelectSize;
  style?: ViewStyle;
  token?: CanvasToken;
} & InteractionHandlers;

function findLabel(options: SelectOption[], value: string | undefined): ReactNode | undefined {
  if (value === undefined) return undefined;
  const hit = options.find((o) => o.value === value);
  if (!hit) return undefined;
  return hit.label !== undefined ? hit.label : hit.value;
}

export function Select(props: SelectProps) {
  const ctx = useContext(CanvasThemeContext);
  const {
    options,
    placeholder = "请选择",
    disabled = false,
    size = "md",
    style,
    token: tokenProp,
    onChange: _onChange,
    onClick,
    onPointerEnter,
    onPointerLeave,
    ...restHandlers
  } = props;

  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Select: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }

  const controlProps = useMemo(() => {
    const p: Record<string, unknown> = { onChange: props.onChange };
    if (Object.hasOwn(props, "value")) p.value = props.value;
    if (Object.hasOwn(props, "defaultValue")) p.defaultValue = props.defaultValue;
    return p;
  }, [props]);

  const [value, setValue] = useControllableValue<string | undefined>(controlProps, {
    valuePropName: "value",
    defaultValuePropName: "defaultValue",
    trigger: "onChange",
    defaultValue: undefined,
  });

  const [open, setOpen] = useState(false);
  /** 每次展开重新分配；在 `CanvasProvider` 内与该实例绑定，多画布互不抢号 */
  const [overlayZ, setOverlayZ] = useState(1000);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const allocateOverlayZ = useAllocateOverlayZIndex();
  const selectRootRef = useRef<ViewNode | null>(null);

  useLayoutEffect(() => {
    if (open) {
      setOverlayZ(allocateOverlayZ());
    }
  }, [open, allocateOverlayZ]);

  /** document 上 pointerdown：画布外用 DOM 命中；画布内用 `hitTest` 与根 `ViewNode` 边界（见 `registerCanvasFrame`） */
  useCanvasClickAway(() => setOpen(false), {
    enabled: open && !disabled,
    boundaryRef: selectRootRef,
  });

  const display = findLabel(options, value);
  const labelContent = display !== undefined ? display : placeholder;
  const fontSize = selectFontSize(size, token);
  const chevronSize = size === "sm" ? 14 : 16;

  const triggerShell = getSelectTriggerShellStyle(size, token, { disabled });
  const panelStyle = getSelectPanelStyle(token);

  const handleTriggerClick = (e: CanvasSyntheticPointerEvent) => {
    if (disabled) return;
    setOpen((o) => !o);
    onClick?.(e);
  };

  const handleOptionClick = (next: string) => {
    setValue(next);
    setOpen(false);
  };

  return (
    <View
      viewNodeRef={selectRootRef}
      style={mergeViewStyles(
        {
          position: "relative",
          alignSelf: "stretch",
          /** 展开时抬高整棵子树；数值每次打开递增，避免多个 Select 同开时仍被后兄弟盖住 */
          zIndex: open ? overlayZ : 0,
        },
        style ?? {},
      )}
      {...restHandlers}
    >
      {open ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
          onPointerDown={() => setOpen(false)}
        />
      ) : null}

      {/* 锚点：高度仅含触发条；下拉为 absolute，不撑开父级布局 */}
      <View style={{ position: "relative", alignSelf: "stretch" }}>
        <View
          style={triggerShell}
          onClick={handleTriggerClick}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        >
          <Text
            style={{
              fontSize,
              color: token.colorText,
              opacity: display === undefined ? 0.45 : 1,
              flexShrink: 1,
            }}
          >
            {labelContent}
          </Text>
          <View style={{ marginLeft: token.paddingSM, opacity: open ? 1 : 0.75 }}>
            <Icon
              icon={chevronDown}
              size={chevronSize}
              stroke={token.colorText}
              strokeWidth={2}
              style={{
                transform: [{ rotate: open ? "180deg" : "0deg" }],
              }}
            />
          </View>
        </View>

        {open ? (
          <View style={panelStyle}>
            {options.map((opt, index) => {
              const selected = value === opt.value;
              const hovered = hoveredIndex === index;
              const row = getSelectOptionRowStyle(token, { hovered, selected });
              const optLabel = opt.label !== undefined ? opt.label : opt.value;
              return (
                <View
                  key={opt.value}
                  style={row}
                  onClick={() => handleOptionClick(opt.value)}
                  onPointerEnter={() => setHoveredIndex(index)}
                  onPointerLeave={() => setHoveredIndex((h) => (h === index ? null : h))}
                >
                  <Text
                    style={{
                      fontSize,
                      color: selected ? token.colorPrimary : token.colorText,
                      fontWeight: selected ? "600" : "400",
                    }}
                  >
                    {optLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
