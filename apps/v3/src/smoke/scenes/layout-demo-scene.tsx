import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { LiveProvider } from "react-live";

import { CanvasReadonlyCodePreview } from "../components/canvas-readonly-code-preview.tsx";
import { LiveTranspileErrorText } from "../components/live-transpile-error-text.tsx";
import { AD_TEXT, AD_TEXT_SECONDARY, AD_TEXT_TERTIARY } from "../constants.ts";
import { LAYOUT_SNIPPET_FLEX_GRID, LAYOUT_SNIPPET_ROW_THREE } from "./layout-demo-snippets.ts";
import { layoutDemoLiveScope } from "./layout-live-scope.ts";

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

const CODE_COL_W = 302;
const ROW1_H = 152;
const ROW2_H = 72;

export function LayoutDemoScene({ W, H }: { W: number; H: number }) {
  const { t } = useLingui();
  const innerW = Math.max(0, W - 28);

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
      <LiveProvider code={LAYOUT_SNIPPET_FLEX_GRID} scope={layoutDemoLiveScope} language="tsx">
        <View style={{ width: innerW, flexDirection: "column", gap: 8 }}>
          <ExampleLabel
            title={t`示例一：多行 flex 比例`}
            subtitle={t`左侧为画布预览；右侧为对应 JSX 片段（只读）。`}
          />
          <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch", width: innerW }}>
            <View
              id="flex-block-1"
              style={{
                flex: 1,
                minWidth: 0,
                height: ROW1_H,
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
            <View style={{ width: CODE_COL_W, flexDirection: "column" }}>
              <CanvasReadonlyCodePreview
                code={LAYOUT_SNIPPET_FLEX_GRID}
                width={CODE_COL_W}
                height={ROW1_H}
              />
              <LiveTranspileErrorText />
            </View>
          </View>
        </View>
      </LiveProvider>

      <LiveProvider code={LAYOUT_SNIPPET_ROW_THREE} scope={layoutDemoLiveScope} language="tsx">
        <View style={{ width: innerW, flexDirection: "column", gap: 8 }}>
          <ExampleLabel
            title={t`示例二：单行三等分`}
            subtitle={t`同一行 flex:1 三等分；右侧为对应片段。`}
          />
          <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch", width: innerW }}>
            <View
              id="flex-block-2"
              style={{
                flex: 1,
                minWidth: 0,
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
            <View style={{ width: CODE_COL_W, flexDirection: "column" }}>
              <CanvasReadonlyCodePreview
                code={LAYOUT_SNIPPET_ROW_THREE}
                width={CODE_COL_W}
                height={ROW2_H}
              />
              <LiveTranspileErrorText />
            </View>
          </View>
        </View>
      </LiveProvider>

      <Text style={{ fontSize: 11, color: AD_TEXT_TERTIARY, lineHeight: 1.4 }}>
        {t`提示：右侧源码由 react-live 转译校验；展示使用 ScrollView + Text（不可编辑）。画布预览与 DOM LivePreview 无关。`}
      </Text>
    </View>
  );
}
