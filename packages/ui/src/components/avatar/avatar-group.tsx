import type { ViewStyle } from "@react-canvas/core";
import { View } from "@react-canvas/react";
import { Children, createContext, useMemo, type ReactNode } from "react";
import { mergeViewStyles } from "../../style/merge.ts";

export const AvatarGroupContext = createContext(false);

export type AvatarGroupProps = {
  children?: ReactNode;
  /**
   * 相邻头像水平重叠量（逻辑像素）。仅对第 2 个及之后的子项施加负 `marginLeft`。
   * @default 10
   */
  overlap?: number;
  style?: ViewStyle;
};

export function AvatarGroup({ children, overlap = 10, style }: AvatarGroupProps) {
  const items = useMemo(() => Children.toArray(children).filter((c) => c != null), [children]);

  return (
    <AvatarGroupContext.Provider value={true}>
      <View style={mergeViewStyles({ flexDirection: "row", alignItems: "center" }, style ?? {})}>
        {items.map((child, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}>
            {child}
          </View>
        ))}
      </View>
    </AvatarGroupContext.Provider>
  );
}
