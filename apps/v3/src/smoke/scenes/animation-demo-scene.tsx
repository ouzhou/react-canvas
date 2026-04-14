import { Text, View } from "@react-canvas/react-v2";
import type { ViewStyle } from "@react-canvas/core-v2";
import { useEffect, useState, type ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";

import {
  AD_TEXT,
  AD_TEXT_SECONDARY,
  AD_TEXT_TERTIARY,
  DEMO_PAGE_BG,
  DEMO_PAGE_MARGIN_TOP,
  DEMO_PAGE_PADDING_X,
  DEMO_PAGE_SECTION_GAP,
  demoPageContentWidth,
} from "../constants.ts";

function useRafMs(): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      setMs(performance.now() - t0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ms;
}

export function AnimationDemoScene(props: { W: number; H: number }): ReactNode {
  const { W, H } = props;
  const { t } = useLingui();
  const ms = useRafMs();
  const s = ms / 1000;
  const innerW = demoPageContentWidth(W);

  const rotateDeg = (Math.sin(s * 1.1) * 0.5 + 0.5) * 360;
  const scalePulse = 0.85 + (Math.sin(s * 2.4) * 0.5 + 0.5) * 0.28;
  const slideX = Math.sin(s * 1.8) * 72;
  const fade = 0.35 + (Math.sin(s * 2) * 0.5 + 0.5) * 0.65;

  const spinBox: ViewStyle = {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: "#1677ff",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: `${rotateDeg.toFixed(2)}deg` }, { scale: scalePulse }],
  };

  const slideBox: ViewStyle = {
    width: 96,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateX: slideX }],
  };

  const fadeBox: ViewStyle = {
    width: 120,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    opacity: fade,
  };

  const combo: ViewStyle = {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#ec4899",
    transform: [
      { translateX: Math.sin(s * 2.2 + 1) * 40 },
      { translateY: Math.cos(s * 1.7) * 16 },
      { rotate: `${(s * 55).toFixed(2)}deg` },
      { scale: 0.75 + (Math.sin(s * 3) * 0.5 + 0.5) * 0.35 },
    ],
    opacity: 0.55 + (Math.sin(s * 2.8) * 0.5 + 0.5) * 0.45,
  };

  return (
    <View
      id="animation-demo-root"
      style={{
        width: W,
        minHeight: H,
        backgroundColor: DEMO_PAGE_BG,
        marginTop: DEMO_PAGE_MARGIN_TOP,
        paddingLeft: DEMO_PAGE_PADDING_X,
        paddingRight: DEMO_PAGE_PADDING_X,
        paddingBottom: DEMO_PAGE_PADDING_X,
        flexDirection: "column",
        gap: DEMO_PAGE_SECTION_GAP,
      }}
    >
      <View style={{ flexDirection: "column", gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: 600, color: AD_TEXT_TERTIARY, lineHeight: 1.35 }}>
          {t`ANIMATION · RAF`}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`时间与变换`}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: AD_TEXT_SECONDARY,
            lineHeight: 1.55,
            width: innerW,
          }}
        >
          {t`以下示例通过 requestAnimationFrame 更新 React 状态，驱动 style.opacity 与 style.transform（rotate / scale / translate）。用于观察逐帧重绘、矢量变换与（若有）命中区域是否随矩阵更新。`}
        </Text>
      </View>

      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例一：旋转 + 缩放`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, width: innerW }}>
          {t`正弦相位驱动 rotate 与 scale，方块在原地脉动旋转。`}
        </Text>
        <View
          style={{
            width: innerW,
            height: 140,
            position: "relative",
            backgroundColor: "#f1f5f9",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View id="anim-spin-box" style={spinBox}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
              RAF
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例二：水平平移`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, width: innerW }}>
          {t`translateX 在灰色槽内往复，便于对照布局盒与视觉位置。`}
        </Text>
        <View
          style={{
            width: innerW,
            height: 100,
            position: "relative",
            backgroundColor: "#f1f5f9",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <View id="anim-slide-box" style={slideBox}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
              {t`滑动`}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例三：透明度脉冲`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, width: innerW }}>
          {t`opacity 在约 0.35–1 之间连续变化。`}
        </Text>
        <View
          style={{
            width: innerW,
            height: 88,
            position: "relative",
            backgroundColor: "#f1f5f9",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View id="anim-fade-box" style={fadeBox}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
              {t`淡入淡出`}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例四：组合变换`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, width: innerW }}>
          {t`translate、rotate、scale、opacity 同时作用在同一视图上。`}
        </Text>
        <View
          style={{
            width: innerW,
            height: 140,
            position: "relative",
            backgroundColor: "#f1f5f9",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <View id="anim-combo-box" style={combo} />
        </View>
      </View>
    </View>
  );
}
