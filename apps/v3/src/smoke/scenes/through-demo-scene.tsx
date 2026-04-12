import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { AD_TEXT, AD_TEXT_SECONDARY } from "../constants.ts";

export function ThroughDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  return (
    <View
      id="through-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#fafafa",
        padding: 12,
        gap: 8,
      }}
    >
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例一：前景 pointer-events: none`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`橙层不接收事件，点击应落在绿色底层。`}
        </Text>
      </View>
      <View
        id="through-wrap"
        style={{
          flex: 1,
          minHeight: 160,
          position: "relative",
          backgroundColor: "#e2e8f0",
          borderRadius: 8,
        }}
      >
        <View
          id="through-back"
          style={{
            position: "absolute",
            left: 40,
            top: 36,
            width: Math.min(280, W - 80),
            height: 160,
            backgroundColor: "#16a34a",
          }}
        />
        <View
          id="through-front"
          style={{
            position: "absolute",
            left: 40,
            top: 36,
            width: Math.min(280, W - 80),
            height: 160,
            backgroundColor: "#fb923c",
            pointerEvents: "none",
          }}
        />
      </View>
      <Text style={{ fontSize: 11, color: AD_TEXT_SECONDARY, lineHeight: 1.4 }}>
        {t`示例二：与「点击与层级」对照——此处橙层不参与命中；彼处后绘色块参与命中。`}
      </Text>
    </View>
  );
}
