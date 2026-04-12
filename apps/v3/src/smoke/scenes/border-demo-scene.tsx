import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { AD_TEXT, AD_TEXT_SECONDARY } from "../constants.ts";

export function BorderDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  const shellW = Math.min(320, W - 32);
  return (
    <View
      id="border-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        padding: 16,
        backgroundColor: "#fafafa",
        gap: 14,
      }}
    >
      <View style={{ marginBottom: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例一：粗边框 + 圆角 + padding`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`borderWidth 12 与 padding 8 同时挤占内区；内层 flex:1 展示剩余空间。`}
        </Text>
      </View>
      <View
        id="border-shell"
        style={{
          width: shellW,
          height: 128,
          flexDirection: "column",
          padding: 8,
          borderWidth: 12,
          borderColor: "#1677ff",
          borderRadius: 10,
          backgroundColor: "#ffffff",
        }}
      >
        <View
          id="border-inner"
          style={{
            flex: 1,
            backgroundColor: "#e6f4ff",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            id="border-inner-label"
            style={{ fontSize: 11, color: "#0958d9", textAlign: "center" }}
          >
            {t`内区（flex:1）`}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例二：细边框与 rgba 描边`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`半透明描边与实色底叠加，用于肉眼核对 Skia 颜色解析。`}
        </Text>
      </View>
      <View
        id="border-rgba-card"
        style={{
          width: Math.min(280, W - 32),
          height: 64,
          borderWidth: 2,
          borderColor: "rgba(22, 119, 255, 0.55)",
          borderRadius: 12,
          backgroundColor: "#f0f9ff",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: AD_TEXT }}>{t`2px rgba 蓝边`}</Text>
      </View>

      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例三：线宽对比`}
        </Text>
      </View>
      <View id="border-chips" style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View
          id="border-chip-1"
          style={{
            width: 92,
            height: 44,
            borderWidth: 1,
            borderColor: "#d9d9d9",
            borderRadius: 6,
            backgroundColor: "#fafafa",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 10, color: "#595959" }}>{t`1px 灰`}</Text>
        </View>
        <View
          id="border-chip-3"
          style={{
            width: 92,
            height: 44,
            borderWidth: 3,
            borderColor: "#fa8c16",
            borderRadius: 6,
            backgroundColor: "#fff7e6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 10, color: "#d46b08" }}>{t`3px 橙`}</Text>
        </View>
        <View
          id="border-chip-none"
          style={{
            width: 92,
            height: 44,
            borderRadius: 6,
            backgroundColor: "#f0f0f0",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 10, color: "#8c8c8c" }}>{t`无边`}</Text>
        </View>
      </View>
    </View>
  );
}
