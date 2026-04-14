import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";

import { AD_TEXT, AD_TEXT_SECONDARY, AD_TEXT_TERTIARY } from "../constants.ts";
import type { DemoPageMeta } from "../hooks/use-demo-catalog.tsx";

const kicker = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.6,
  lineHeight: 1.35,
  color: AD_TEXT_TERTIARY,
} as const;

const h1 = {
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.28,
  color: AD_TEXT,
} as const;

const h2 = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.4,
  color: AD_TEXT,
} as const;

const body = {
  fontSize: 13,
  lineHeight: 1.62,
  color: AD_TEXT_SECONDARY,
} as const;

export function IntroDemoScene({
  W,
  H,
  pages,
}: {
  W: number;
  H: number;
  pages: readonly DemoPageMeta[];
}) {
  const { t } = useLingui();

  return (
    <View
      id="intro-root"
      style={{
        width: W,
        minHeight: H,
        position: "relative",
        backgroundColor: "#ffffff",
        marginTop: 16,
        padding: 28,
        flexDirection: "column",
        gap: 18,
      }}
    >
      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={kicker}>{t`SMOKE · INTRO`}</Text>
        <Text style={h1}>{t`画布场景：从布局到像素再到指针`}</Text>
        <Text style={{ ...body, fontSize: 14 }}>
          {t`这里用几句话说明本仓库在浏览器里实际跑什么：几何由 Yoga 算，帧由 CanvasKit / Skia 画，交互走 core-v2 的命中与派发；@react-canvas/react-v2 只把这一切包进组件与 hooks，不替代 DOM。`}
        </Text>
      </View>

      <View style={{ flexDirection: "column", gap: 14 }}>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`几何`}</Text>
          <Text style={body}>
            {t`场景是一棵树：insertView / removeView / updateStyle 驱动变化，Yoga 产出尺寸与偏移；需要绝对盒时用 absoluteBoundsFor，滚动位移可在 subscribeAfterLayout 里读 scrollY（滚动示例里有用法）。`}
          </Text>
        </View>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`绘制`}</Text>
          <Text style={body}>
            {t`initRuntime 拉起 CanvasKit，attachSceneSkiaPresenter 订阅布局提交后重绘。除 View 背景外，还支持 Image 与 SvgPath；canvas 与 DPR 的关系由 canvasBackingStoreSize 等与 backing store 对齐。`}
          </Text>
        </View>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`指针`}</Text>
          <Text style={body}>
            {t`attachCanvasStagePointer 把指针事件送进舞台，clientXYToStageLocal 换成舞台坐标；hitTestAt 按「同父级后插入在上」的规则取最深节点，pointer-events: none 会摘掉整棵子树。dispatchPointerLike 负责捕获与冒泡；hover 的 enter / leave 只在叶节点之间切换（README 所称方案 A）。`}
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 8,
          backgroundColor: "#f7f8fa",
          borderWidth: 1,
          borderColor: "#eceef2",
        }}
      >
        <Text style={{ ...body, fontSize: 12, lineHeight: 1.55 }}>
          {t`initRuntime 同时持有 Yoga 与 CanvasKit；core-v2 的导出与框架无关。若在 React 里等就绪，可用 subscribeRuntimeInit、getRuntimeSnapshot 配合 useSyncExternalStore。`}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#eceef2", width: W - 56 }} />

      <View style={{ flexDirection: "column", gap: 6 }}>
        <Text style={h2}>{t`能力索引`}</Text>
        <Text style={body}>{t`每张卡片与左侧导航同名；点侧栏或记住 demo= 参数即可切换。`}</Text>
      </View>

      <View style={{ flexDirection: "column", gap: 10 }}>
        {pages.map((p) => (
          <View
            key={p.id}
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#eceef2",
              padding: 14,
              flexDirection: "column",
              gap: 8,
              backgroundColor: "#fafbfc",
            }}
          >
            <Text style={{ fontSize: 11, lineHeight: 1.35, color: AD_TEXT_TERTIARY }}>
              {p.navLabel}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: AD_TEXT }}>
              {p.title}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 1.6, color: AD_TEXT_SECONDARY }}>
              {p.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
