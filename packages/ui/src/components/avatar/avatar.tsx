import type { ImageSource, InteractionHandlers, ViewStyle } from "@react-canvas/core";
import { Image, View } from "@react-canvas/react";
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "../icon/icon.tsx";
import type { LucideIconData } from "../icon/types.ts";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import { resolveAvatarVisibleLayer, type AvatarLoadState } from "./resolve-avatar-content.ts";
import { AvatarGroupContext } from "./avatar-group.tsx";
import {
  getAvatarContainerStyle,
  getAvatarGroupRingStyle,
  resolveAvatarPixelSize,
  type AvatarSizePreset,
} from "./variants.ts";

export type AvatarProps = {
  token?: CanvasToken;
  style?: ViewStyle;
  size?: number | AvatarSizePreset;
  source?: ImageSource;
  icon?: LucideIconData;
  children?: ReactNode;
} & InteractionHandlers;

export function Avatar(props: AvatarProps) {
  const ctx = useContext(CanvasThemeContext);
  const inGroup = useContext(AvatarGroupContext);
  const { token: tokenProp, style, size: sizeProp, source, icon, children, ...handlers } = props;

  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Avatar: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }

  const px = resolveAvatarPixelSize(sizeProp, token);
  const hasIcon = icon != null;
  const hasChildren = children != null;

  const [loadState, setLoadState] = useState<AvatarLoadState>(() =>
    source ? "loading" : "loaded",
  );

  useEffect(() => {
    if (source) {
      setLoadState("loading");
    } else {
      setLoadState("loaded");
    }
  }, [source?.uri]);

  const layer = useMemo(
    () =>
      resolveAvatarVisibleLayer({
        source,
        loadState,
        hasIcon,
        hasChildren,
      }),
    [source, loadState, hasIcon, hasChildren],
  );

  const iconDim = Math.round(px * 0.55);

  const base = mergeViewStyles(
    getAvatarContainerStyle(px, token),
    inGroup ? getAvatarGroupRingStyle(token) : {},
    style ?? {},
  );

  const showImage = source && loadState !== "error";
  const imageOpaque = loadState === "loaded";

  return (
    <View style={base} {...handlers}>
      {showImage ? (
        <Image
          source={source}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: px,
            height: px,
            opacity: imageOpaque ? 1 : 0,
          }}
          onLoad={() => {
            setLoadState("loaded");
          }}
          onError={() => {
            setLoadState("error");
          }}
        />
      ) : null}
      {layer === "icon" && icon ? (
        <Icon icon={icon} size={iconDim} color={token.colorText} />
      ) : null}
      {layer === "text" && children ? (
        <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
      ) : null}
      {layer === "empty" ? (
        <View
          style={{
            width: px * 0.35,
            height: px * 0.35,
            borderRadius: px * 0.175,
            backgroundColor: token.colorBgLayout,
          }}
        />
      ) : null}
    </View>
  );
}
