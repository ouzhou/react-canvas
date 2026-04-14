import { Text, View } from "@react-canvas/react-v2";
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
import type { DemoPageMeta } from "../hooks/use-demo-catalog.tsx";
import { LucideIcon } from "../components/lucide-icon.tsx";
import type { LucideIconData } from "../lib/lucide-icon-to-d.ts";

import info from "@lucide/icons/icons/info";
import imageIcon from "@lucide/icons/icons/image";
import scrollText from "@lucide/icons/icons/scroll-text";
import layoutTemplate from "@lucide/icons/icons/layout-template";
import mousePointer2 from "@lucide/icons/icons/mouse-pointer-2";
import layers from "@lucide/icons/icons/layers";
import pointer from "@lucide/icons/icons/pointer";
import textCursorInput from "@lucide/icons/icons/text-cursor-input";
import squareDashedBottom from "@lucide/icons/icons/square-dashed-bottom";
import messageSquareHeart from "@lucide/icons/icons/message-square-heart";
import typeIcon from "@lucide/icons/icons/type";
import palette from "@lucide/icons/icons/palette";
import panelTop from "@lucide/icons/icons/panel-top";
import fileText from "@lucide/icons/icons/file-text";
import sparkles from "@lucide/icons/icons/sparkles";

const DEMO_ICONS: Record<string, LucideIconData> = {
  intro: info,
  media: imageIcon,
  "scroll-demo": scrollText,
  animation: sparkles,
  layout: layoutTemplate,
  pointer: mousePointer2,
  through: layers,
  hover: pointer,
  cursor: textCursorInput,
  modal: squareDashedBottom,
  popover: messageSquareHeart,
  text: typeIcon,
  style: palette,
  border: panelTop,
};

const DEMO_ICON_COLORS: Record<string, string> = {
  intro: "#3b82f6",
  media: "#8b5cf6",
  "scroll-demo": "#10b981",
  animation: "#f97316",
  layout: "#f59e0b",
  pointer: "#ef4444",
  through: "#6366f1",
  hover: "#ec4899",
  cursor: "#14b8a6",
  modal: "#84cc16",
  popover: "#f43f5e",
  text: "#0ea5e9",
  style: "#a855f7",
  border: "#06b6d4",
};

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
        backgroundColor: DEMO_PAGE_BG,
        marginTop: DEMO_PAGE_MARGIN_TOP,
        padding: DEMO_PAGE_PADDING_X,
        flexDirection: "column",
        gap: DEMO_PAGE_SECTION_GAP,
      }}
    >
      <View style={{ flexDirection: "column", gap: 8 }}>
        <Text style={kicker}>{t`INTRO`}</Text>
        <Text style={h1}>{t`react-canvas 核心技术演示`}</Text>
        <Text style={{ ...body, fontSize: 14 }}>
          {t`这是一个运行在 Canvas 上的高性能 UI 渲染引擎，专为复杂的画布场景（如白板、设计工具、复杂数据可视化等）设计。底层的 core-v2 引擎提供了一套完整的 UI 运行时框架，而 @react-canvas/react-v2 让我们能用熟悉的 React 语法（View、Text 及 Hooks）来构建画布内容。`}
        </Text>
      </View>

      <View style={{ flexDirection: "column", gap: 14 }}>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`排版与布局 (Yoga)`}</Text>
          <Text style={body}>
            {t`使用标准的 Flexbox 布局模型，底层由 Yoga 提供高性能的计算支持。引擎会自动计算场景树中每个元素的精确尺寸与偏移，支持相对布局、绝对定位，以及自定义滚动的处理。`}
          </Text>
        </View>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`高性能渲染 (Skia / CanvasKit)`}</Text>
          <Text style={body}>
            {t`将 UI 直接绘制在 Canvas 上，借助 CanvasKit（Skia）实现了极致的绘制性能。除了基础的视图和文本，还原生支持图片和 SvgPath 矢量绘制，并自动处理不同设备像素比（DPR）的高清适配。`}
          </Text>
        </View>
        <View style={{ flexDirection: "column", gap: 6 }}>
          <Text style={h2}>{t`交互与事件系统`}</Text>
          <Text style={body}>
            {t`内置一套完整的合成事件系统，接管 Canvas 上的所有指针事件。通过精确的命中测试，支持复杂的图层层级穿透与拦截（如 pointer-events: none），并实现了事件的捕获与冒泡机制。`}
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
          {t`核心引擎 core-v2 完全独立于任何前端框架，既可以与 React 深度集成，也可以在纯 JavaScript 环境中独立运行。`}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#eceef2", width: demoPageContentWidth(W) }} />

      <View style={{ flexDirection: "column", gap: 6 }}>
        <Text style={h2}>{t`功能演示列表`}</Text>
        <Text
          style={body}
        >{t`下方卡片展示了目前支持的各项核心能力，你可以点击左侧导航栏或者直接修改 URL 参数来切换浏览不同的演示场景。`}</Text>
      </View>

      <View style={{ flexDirection: "column", gap: 10 }}>
        {pages.map((p) => {
          const icon = DEMO_ICONS[p.id] || fileText;
          const color = DEMO_ICON_COLORS[p.id] || "#64748b";

          return (
            <View
              key={p.id}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#eceef2",
                padding: 14,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
                backgroundColor: "#fafbfc",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: `${color}1a`, // very light background
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <LucideIcon icon={icon} size={20} color={color} strokeWidth={2} />
              </View>
              <View style={{ flexDirection: "column", gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 11, lineHeight: 1.35, color: AD_TEXT_TERTIARY }}>
                  {p.navLabel}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: AD_TEXT }}>
                  {p.title}
                </Text>
                {p.description ? (
                  <Text style={{ fontSize: 12, lineHeight: 1.6, color: AD_TEXT_SECONDARY }}>
                    {p.description}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
