import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import {
  AD_TEXT,
  AD_TEXT_SECONDARY,
  DEMO_PAGE_BG,
  DEMO_PAGE_PADDING_X,
  demoPageContentWidth,
} from "../constants.ts";

export function PointerDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  const halfH = Math.floor((H - 56) / 2);
  const contentW = demoPageContentWidth(W);
  return (
    <View
      id="pointer-root"
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
      <View style={{ marginBottom: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例一：红先绿后，重叠区点后绘者`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`绿块后插入、面积更大；重叠处点击应记录绿块。`}
        </Text>
      </View>
      <View
        id="demo-wrap-1"
        style={{
          width: contentW,
          height: halfH,
          position: "relative",
          backgroundColor: "#e2e8f0",
          borderRadius: 6,
        }}
      >
        <View
          id="hit-sm"
          style={{
            position: "absolute",
            left: 32,
            top: 24,
            width: 110,
            height: 100,
            backgroundColor: "#ef4444",
          }}
        />
        <View
          id="hit-lg"
          style={{
            position: "absolute",
            left: 88,
            top: 48,
            width: 180,
            height: Math.max(72, halfH - 64),
            backgroundColor: "#22c55e",
          }}
        />
      </View>

      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例二：小范围叠放（右下）`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`蓝在上、紫在下；重叠处应命中蓝块。`}
        </Text>
      </View>
      <View
        id="demo-wrap-2"
        style={{
          width: contentW,
          height: Math.max(80, H - halfH - 120),
          position: "relative",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
        }}
      >
        <View
          id="hit-sm2-back"
          style={{
            position: "absolute",
            right: 40,
            bottom: 20,
            width: 100,
            height: 56,
            backgroundColor: "#a855f7",
          }}
        />
        <View
          id="hit-sm2-front"
          style={{
            position: "absolute",
            right: 56,
            bottom: 28,
            width: 100,
            height: 56,
            backgroundColor: "#0ea5e9",
          }}
        />
      </View>
    </View>
  );
}
