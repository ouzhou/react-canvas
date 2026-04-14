import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { DEMO_HOVER } from "../../demo-dimensions.ts";
import {
  AD_TEXT,
  AD_TEXT_SECONDARY,
  AD_TEXT_TERTIARY,
  DEMO_PAGE_BG,
  DEMO_PAGE_PADDING_X,
  demoPageContentWidth,
} from "../constants.ts";

export function HoverDemoScene() {
  const { t } = useLingui();
  const W = DEMO_HOVER.w;
  const H = DEMO_HOVER.h;
  const contentW = demoPageContentWidth(W);
  return (
    <View
      id="hover-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: DEMO_PAGE_BG,
        paddingLeft: DEMO_PAGE_PADDING_X,
        paddingRight: DEMO_PAGE_PADDING_X,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
        {t`示例一：左上单色块`}
      </Text>
      <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45 }}>
        {t`移入变红，移出恢复蓝。`}
      </Text>
      <View
        id="hover-wrap-1"
        style={{
          width: contentW,
          height: 72,
          position: "relative",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
        }}
      >
        <View
          id="v-hover"
          style={({ hovered }) => ({
            width: 100,
            height: 56,
            position: "absolute" as const,
            left: 8,
            top: 8,
            backgroundColor: hovered ? "#ff0000" : "#0000ff",
          })}
        />
      </View>

      <Text
        style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4, marginTop: 4 }}
      >
        {t`示例二：右侧块（独立 hover）`}
      </Text>
      <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45 }}>
        {t`移入变浅绿，移出恢复深绿。`}
      </Text>
      <View
        id="hover-wrap-2"
        style={{
          width: contentW,
          height: 72,
          position: "relative",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
        }}
      >
        <View
          id="v-hover-right"
          style={({ hovered }) => ({
            width: 100,
            height: 56,
            position: "absolute" as const,
            right: 8,
            top: 8,
            backgroundColor: hovered ? "#86efac" : "#166534",
          })}
        />
      </View>

      <Text style={{ fontSize: 11, color: AD_TEXT_TERTIARY, lineHeight: 1.4 }}>
        {t`两例互不依赖，用于确认多个节点可同时维护各自 hovered 态。`}
      </Text>
    </View>
  );
}
