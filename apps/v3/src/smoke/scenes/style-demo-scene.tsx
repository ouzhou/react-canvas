import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import type { StyleDemoCase } from "../../style-demo-content.ts";

import {
  DEMO_PAGE_BG,
  DEMO_PAGE_MARGIN_TOP,
  DEMO_PAGE_PADDING_X,
  demoPageContentWidth,
} from "../constants.ts";

export function StyleDemoScene({
  W,
  H,
  scene,
  opacityDemoPercent,
}: {
  W: number;
  H: number;
  scene: StyleDemoCase;
  opacityDemoPercent: number;
}) {
  const { t } = useLingui();
  const contentW = demoPageContentWidth(W);
  const rootH = H - DEMO_PAGE_MARGIN_TOP;
  if (scene === "margin-gap") {
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="mg-row"
          style={{
            width: contentW,
            flex: 1,
            minHeight: 120,
            flexDirection: "row",
            gap: 14,
            alignItems: "flex-start",
            padding: 14,
            marginTop: 8,
            backgroundColor: "#e2e8f0",
          }}
        >
          <View
            id="mg-a"
            style={{ width: 44, height: 40, marginTop: 16, backgroundColor: "#fb923c" }}
          />
          <View
            id="mg-b"
            style={{
              width: 44,
              height: 40,
              marginLeft: 8,
              marginRight: 12,
              backgroundColor: "#fb7185",
            }}
          />
          <View id="mg-c" style={{ width: 44, height: 40, backgroundColor: "#4ade80" }} />
        </View>
      </View>
    );
  }
  if (scene === "padding-wrap") {
    const chipColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"] as const;
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="pw-inner"
          style={{
            width: contentW,
            height: H - DEMO_PAGE_MARGIN_TOP - 2 * DEMO_PAGE_PADDING_X,
            flexDirection: "row",
            flexWrap: "wrap",
            padding: 10,
            paddingTop: 28,
            gap: 10,
            backgroundColor: "#cbd5e1",
          }}
        >
          {chipColors.map((bg, i) => (
            <View
              key={`pw-chip-${i}`}
              id={`pw-chip-${i}`}
              style={{ width: 88, height: 36, backgroundColor: bg }}
            />
          ))}
        </View>
      </View>
    );
  }
  if (scene === "flex-longhands") {
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="fl-row"
          style={{
            width: contentW,
            height: 80,
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            backgroundColor: "#e2e8f0",
            padding: 10,
          }}
        >
          <View id="fl-fix" style={{ width: 76, height: 52, backgroundColor: "#2563eb" }} />
          <View
            id="fl-grow"
            style={{
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: 40,
              minWidth: 0,
              height: 52,
              marginLeft: 10,
              backgroundColor: "#22d3ee",
            }}
          />
        </View>
      </View>
    );
  }
  if (scene === "flex-reverse") {
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="rev-row"
          style={{
            width: contentW,
            height: 76,
            flexDirection: "row-reverse",
            gap: 12,
            alignItems: "center",
            padding: 10,
            marginTop: 8,
            backgroundColor: "#e2e8f0",
          }}
        >
          <View id="rv-first" style={{ width: 72, height: 48, backgroundColor: "#e11d48" }} />
          <View id="rv-second" style={{ width: 72, height: 48, backgroundColor: "#0d9488" }} />
        </View>
      </View>
    );
  }
  if (scene === "style-button") {
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="btn-row"
          style={{
            width: contentW,
            flex: 1,
            minHeight: 100,
            flexDirection: "row",
            gap: 20,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <View
            id="style-btn"
            style={({ hovered }) => ({
              width: 152,
              height: 48,
              borderRadius: 12,
              backgroundColor: hovered ? "#3b82f6" : "#1d4ed8",
              cursor: "pointer",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <Text
              id="style-btn-label"
              style={{ fontSize: 16, color: "#ffffff", textAlign: "center" }}
            >
              {t`确认`}
            </Text>
          </View>
          <View
            id="style-btn-round"
            style={({ hovered }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: hovered ? "#14b8a6" : "#0f766e",
              cursor: "pointer",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <Text
              id="style-btn-round-label"
              style={{ fontSize: 22, color: "#ffffff", textAlign: "center" }}
            >
              +
            </Text>
          </View>
        </View>
      </View>
    );
  }
  if (scene === "opacity") {
    const playO = opacityDemoPercent / 100;
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: rootH,
          flexDirection: "column",
          backgroundColor: DEMO_PAGE_BG,
          marginTop: DEMO_PAGE_MARGIN_TOP,
          padding: DEMO_PAGE_PADDING_X,
        }}
      >
        <View
          id="op-stack"
          style={{
            width: contentW,
            flex: 1,
            flexDirection: "column",
            gap: 14,
            marginTop: 8,
          }}
        >
          <View
            id="op-single-row"
            style={{ flexDirection: "row", gap: 12, alignItems: "center", width: contentW }}
          >
            <View id="op-ref" style={{ width: 72, height: 56, backgroundColor: "#2563eb" }} />
            <View
              id="op-alone"
              style={{
                width: 72,
                height: 56,
                backgroundColor: "#2563eb",
                opacity: playO,
              }}
            />
          </View>
          <View
            id="op-ancestor"
            style={{
              width: contentW,
              height: 112,
              flexDirection: "row",
              gap: 10,
              padding: 10,
              backgroundColor: "#64748b",
              opacity: playO,
            }}
          >
            <View
              id="op-child-a"
              style={{ width: 88, height: 88, backgroundColor: "#f97316", opacity: 0.85 }}
            />
            <View
              id="op-child-b"
              style={{ width: 88, height: 88, backgroundColor: "#22d3ee", opacity: 0.85 }}
            />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View
      key={scene}
      id="style-root"
      style={{
        width: W,
        height: rootH,
        flexDirection: "column",
        backgroundColor: DEMO_PAGE_BG,
        marginTop: DEMO_PAGE_MARGIN_TOP,
        padding: DEMO_PAGE_PADDING_X,
      }}
    >
      <View
        id="ar-stack"
        style={{
          width: contentW,
          flex: 1,
          minHeight: 140,
          flexDirection: "column",
          gap: 10,
          marginTop: 8,
        }}
      >
        <View id="ar-ratio" style={{ width: 120, aspectRatio: 1.5, backgroundColor: "#9333ea" }} />
        <View
          id="ov-shell"
          style={{
            width: contentW,
            height: 52,
            overflow: "hidden",
            borderRadius: "15%",
            backgroundColor: "#cbd5e1",
          }}
        >
          <View
            id="ov-wide"
            style={{ width: contentW + 120, height: 36, backgroundColor: "#f59e0b" }}
          />
        </View>
      </View>
    </View>
  );
}
