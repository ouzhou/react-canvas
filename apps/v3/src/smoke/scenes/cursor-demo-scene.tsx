import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { AD_TEXT, AD_TEXT_SECONDARY } from "../constants.ts";
import { CursorDragGrabSection } from "./cursor-drag-strip.tsx";

export function CursorDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  return (
    <View
      id="cursor-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        padding: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.35 }}>
        {t`示例一：静态 cursor`}
      </Text>
      <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.4, marginBottom: 6 }}>
        {t`三列分别为 pointer / text / crosshair。`}
      </Text>
      <View id="cursor-row-static" style={{ flexDirection: "row", height: 74 }}>
        <View
          id="c-static-ptr"
          style={{ flex: 1, backgroundColor: "#fecaca", cursor: "pointer" }}
        />
        <View id="c-static-txt" style={{ flex: 1, backgroundColor: "#bbf7d0", cursor: "text" }} />
        <View
          id="c-static-cross"
          style={{ flex: 1, backgroundColor: "#dbeafe", cursor: "crosshair" }}
        />
      </View>

      <View id="cursor-gap-1" style={{ height: 8 }} />

      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.35 }}>
        {t`示例二：继承与覆盖`}
      </Text>
      <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.4, marginBottom: 6 }}>
        {t`左：子块继承父 progress；右：子块 zoom-in 覆盖父 alias。`}
      </Text>
      <View id="cursor-row-chain" style={{ flexDirection: "row", height: 92 }}>
        <View
          id="c-chain-parent-only"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#e9d5ff",
            cursor: "progress",
          }}
        >
          <View
            id="c-chain-inherit"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#c084fc",
            }}
          />
        </View>
        <View
          id="c-chain-child-wins"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#fef3c7",
            cursor: "alias",
          }}
        >
          <View
            id="c-chain-zoom"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#f59e0b",
              cursor: "zoom-in",
            }}
          />
        </View>
      </View>

      <View id="cursor-gap-2" style={{ height: 8 }} />

      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.35 }}>
        {t`示例三：hover 切换 cursor`}
      </Text>
      <View
        id="c-hover-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#e2e8f0",
        }}
      >
        <View
          id="c-hover-fn"
          style={({ hovered }) => ({
            position: "absolute",
            left: 12,
            top: 8,
            width: W - 40,
            height: 54,
            backgroundColor: hovered ? "#0ea5e9" : "#94a3b8",
            cursor: hovered ? "grab" : "col-resize",
          })}
        />
      </View>

      <View id="cursor-gap-3" style={{ height: 8 }} />

      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.35 }}>
        {t`示例四：穿透命中光标`}
      </Text>
      <View
        id="c-through-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#cbd5e1",
        }}
      >
        <View
          id="c-through-back"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "#16a34a",
            cursor: "pointer",
          }}
        />
        <View
          id="c-through-front"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "rgba(251, 146, 60, 0.45)",
            pointerEvents: "none",
          }}
        />
      </View>

      <View id="cursor-gap-4" style={{ height: 8 }} />

      <CursorDragGrabSection />
    </View>
  );
}
