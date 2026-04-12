import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { AD_TEXT, AD_TEXT_SECONDARY, AD_TEXT_TERTIARY } from "../constants.ts";

/** 示例标题条（与主区文档风格一致，略小） */
function ExampleLabel(props: { title: string; subtitle: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
        {props.title}
      </Text>
      <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
        {props.subtitle}
      </Text>
    </View>
  );
}

export function LayoutDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  return (
    <View
      id="layout-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#fafafa",
        padding: 14,
        gap: 12,
      }}
    >
      <ExampleLabel
        title={t`示例一：多行 flex 比例`}
        subtitle={t`纵向三等分；每行内再 flex：顶行 3 等分、中行 2 等分、底行 4 等分。`}
      />
      <View
        id="flex-block-1"
        style={{
          flex: 1,
          minHeight: 120,
          flexDirection: "column",
          backgroundColor: "#eef2f6",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <View id="row-top" style={{ flex: 1, flexDirection: "row" }}>
          <View id="t1" style={{ flex: 1, backgroundColor: "#f97316" }} />
          <View id="t2" style={{ flex: 1, backgroundColor: "#fb923c" }} />
          <View id="t3" style={{ flex: 1, backgroundColor: "#fdba74" }} />
        </View>
        <View id="row-mid" style={{ flex: 1, flexDirection: "row" }}>
          <View id="m1" style={{ flex: 1, backgroundColor: "#22c55e" }} />
          <View id="m2" style={{ flex: 1, backgroundColor: "#4ade80" }} />
        </View>
        <View id="row-bot" style={{ flex: 1, flexDirection: "row" }}>
          <View id="b1" style={{ flex: 1, backgroundColor: "#3b82f6" }} />
          <View id="b2" style={{ flex: 1, backgroundColor: "#60a5fa" }} />
          <View id="b3" style={{ flex: 1, backgroundColor: "#93c5fd" }} />
          <View id="b4" style={{ flex: 1, backgroundColor: "#bfdbfe" }} />
        </View>
      </View>

      <ExampleLabel
        title={t`示例二：单行三等分`}
        subtitle={t`同一行 flex:1 三等分，用于对照「无换行」时的均分宽度。`}
      />
      <View
        id="flex-block-2"
        style={{
          height: 72,
          flexDirection: "row",
          backgroundColor: "#e2e8f0",
          padding: 8,
          borderRadius: 8,
        }}
      >
        <View id="eq-a" style={{ flex: 1, backgroundColor: "#c084fc" }} />
        <View id="eq-b" style={{ flex: 1, backgroundColor: "#a78bfa" }} />
        <View id="eq-c" style={{ flex: 1, backgroundColor: "#818cf8" }} />
      </View>

      <Text style={{ fontSize: 11, color: AD_TEXT_TERTIARY, lineHeight: 1.4 }}>
        {t`提示：点击命中与「绘制顺序」无关；本页仅展示布局结果。`}
      </Text>
    </View>
  );
}
