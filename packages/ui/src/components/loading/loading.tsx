import type { ViewStyle } from "@react-canvas/core";
import loaderCircle from "@lucide/icons/icons/loader-circle";
import { Text, View } from "@react-canvas/react";
import { useContext, useEffect, useState, type ReactNode } from "react";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import { Icon } from "../icon/icon.tsx";
import { getLoadingMetrics, type LoadingSize } from "./variants.ts";

export type LoadingProps = {
  /** 指示器与文案尺寸。 */
  size?: LoadingSize;
  /**
   * 图标下方的说明文案；默认 `"Loading"`。
   * 传 `null` 时不渲染文案。
   */
  description?: ReactNode | null;
  /** 为 `true` 时图标旋转；为 `false` 时静止。 */
  spinning?: boolean;
  style?: ViewStyle;
  /**
   * 在 `<Canvas>` 内须传入，或由外层 `CanvasThemeProvider` 提供。
   */
  token?: CanvasToken;
};

export function Loading(props: LoadingProps) {
  const ctx = useContext(CanvasThemeContext);
  const { size = "md", description, spinning = true, style, token: tokenProp } = props;

  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Loading: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }

  const { iconSize, descriptionFontSize, gap } = getLoadingMetrics(size);
  const [rotationDeg, setRotationDeg] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    let cancelled = false;
    let raf = 0;
    let last = performance.now();
    const degPerSec = 320;
    const tick = (now: number) => {
      if (cancelled) return;
      const dt = (now - last) / 1000;
      last = now;
      setRotationDeg((r) => (r + degPerSec * dt) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [spinning]);

  const descContent = description === undefined ? "Loading" : description;
  const showDescription = descContent !== null;

  const root = mergeViewStyles(
    {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap,
    },
    style ?? {},
  );

  const iconWrapperStyle: ViewStyle = spinning
    ? {
        width: iconSize,
        height: iconSize,
        transform: [{ rotate: `${rotationDeg}deg` }],
      }
    : { width: iconSize, height: iconSize };

  return (
    <View style={root}>
      <View style={iconWrapperStyle}>
        <Icon icon={loaderCircle} size={iconSize} stroke={token.colorPrimary} strokeWidth={2} />
      </View>
      {showDescription ? (
        <Text
          style={{
            fontSize: descriptionFontSize,
            color: token.colorText,
            textAlign: "center",
          }}
        >
          {descContent}
        </Text>
      ) : null}
    </View>
  );
}
