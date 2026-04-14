import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import {
  AD_TEXT,
  AD_TEXT_SECONDARY,
  DEMO_PAGE_BG,
  DEMO_PAGE_MARGIN_TOP,
  DEMO_PAGE_PADDING_X,
} from "../constants.ts";

export function TextDemoScene(props: {
  W: number;
  H: number;
  wrapWidth: number;
  defaultParagraphFontFamily: string;
  onBodyClick?: () => void;
}) {
  const { t } = useLingui();
  const { W, H, wrapWidth, defaultParagraphFontFamily, onBodyClick } = props;
  const textDemoLongWrap =
    t`你好 react-canvas · Hello paragraph demo。重复中文与 English mixed content，用于自动折行与测量。`.repeat(
      2,
    );
  return (
    <View
      id="text-root"
      style={{
        width: W,
        height: H - DEMO_PAGE_MARGIN_TOP,
        flexDirection: "column",
        backgroundColor: DEMO_PAGE_BG,
        marginTop: DEMO_PAGE_MARGIN_TOP,
        padding: DEMO_PAGE_PADDING_X,
      }}
    >
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例一：段落、嵌套 run 与主段点击`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`Caption + 主灰条（可点）+ 长文换行；用顶栏控件调节主段宽度。`}
        </Text>
      </View>
      <Text
        id="text-caption"
        style={{
          width: wrapWidth,
          fontSize: 12,
          color: "#64748b",
          backgroundColor: "#eef2f6",
          lineHeight: 1.38,
        }}
      >
        {t`【Caption】小号灰条 lineHeight≈1.38；与主段同宽随滑块变宽。主段外层≈1.82，并含嵌套 run 更高行距。覆盖 M3、硬换行与自动换行。`}
      </Text>
      <Text
        id="text-body"
        style={{
          width: wrapWidth,
          fontSize: 15,
          color: "#0f172a",
          backgroundColor: "#e2e8f0",
          lineHeight: 1.82,
        }}
        onClick={onBodyClick}
      >
        {t`M3：外层 15px 字色继承；整段 lineHeight≈1.82。嵌套 `}
        <Text style={{ color: "#b91c1c", fontWeight: "bold" }}>{t`粗体红`}</Text>
        {t` 与 `}
        <Text style={{ fontSize: 18, color: "#0369a1" }}>{t`18px 蓝`}</Text>
        <Text style={{ lineHeight: 2.45, color: "#7c3aed" }}>{t` 与 局部行距↑2.45`}</Text>
        {t`。自动换行段：`}
        {"\n"}
        {textDemoLongWrap}
        {"\n"}
        {t`── 硬换行收尾：拖窄灰条主段应自动增高。`}
      </Text>

      <View style={{ marginTop: 14, marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
          {t`示例二：对齐、装饰、间距与字体`}
        </Text>
        <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.45, marginTop: 2 }}>
          {t`多行短条展示 textAlign / textDecoration / letterSpacing / rgba / fontFamily 回退。`}
        </Text>
      </View>
      <Text
        id="text-viz-intro"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 12,
          color: "#475569",
          backgroundColor: "#f1f5f9",
          lineHeight: 1.45,
        }}
      >
        {t`【Skia 文本样式】textAlign · textDecoration（含 decorationColor）· letterSpacing / wordSpacing · fontStyle · rgba() · fontFamily 逗号回退`}
      </Text>
      <Text
        id="text-viz-center"
        style={{
          width: wrapWidth,
          marginTop: 6,
          fontSize: 14,
          textAlign: "center",
          color: "#0f172a",
          backgroundColor: "#dbeafe",
          lineHeight: 1.35,
        }}
      >
        {t`textAlign: center — 拖窄灰条仍可看出居中`}
      </Text>
      <Text
        id="text-viz-right"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 14,
          textAlign: "right",
          color: "#0f172a",
          backgroundColor: "#e0e7ff",
          lineHeight: 1.35,
        }}
      >
        {t`textAlign: right`}
      </Text>
      <Text
        id="text-viz-justify"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 13,
          textAlign: "justify",
          color: "#1c1917",
          backgroundColor: "#fef3c7",
          lineHeight: 1.42,
        }}
      >
        {t`textAlign: justify。多行时观察左右对齐；宽度随上方滑块变化。第二句用于撑满行长以便看 justify 效果。`}
      </Text>
      <Text
        id="text-viz-deco"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 14,
          color: "#1e293b",
          backgroundColor: "#fce7f3",
          lineHeight: 1.4,
          textDecorationLine: ["underline", "line-through"],
          textDecorationColor: "#b91c1c",
          textDecorationStyle: "solid",
          textDecorationThickness: 1.25,
        }}
      >
        {t`underline + line-through；装饰线深红、字色深灰（textDecorationColor 与 color 分离）。`}
      </Text>
      <Text
        id="text-viz-spacing"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 13,
          color: "#134e4a",
          backgroundColor: "#ccfbf1",
          lineHeight: 1.4,
          letterSpacing: 2,
          wordSpacing: 10,
        }}
      >
        {t`letterSpacing:2px，wordSpacing:10px → alpha·beta·gamma·delta（看点距与词距）`}
      </Text>
      <Text
        id="text-viz-italic"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 15,
          fontStyle: "italic",
          color: "rgba(14,116,144,0.78)",
          backgroundColor: "#ecfeff",
          lineHeight: 1.4,
        }}
      >
        {t`fontStyle: italic；color: rgba(14,116,144,0.78)`}
      </Text>
      <Text
        id="text-viz-fontfb"
        style={{
          width: wrapWidth,
          marginTop: 4,
          fontSize: 13,
          color: "#14532d",
          backgroundColor: "#dcfce7",
          lineHeight: 1.4,
          fontFamily: `__NoSuchFont__, ${defaultParagraphFontFamily}`,
        }}
      >
        {t`fontFamily: "__NoSuchFont__", ${defaultParagraphFontFamily}（应正常显示）`}
      </Text>
    </View>
  );
}
