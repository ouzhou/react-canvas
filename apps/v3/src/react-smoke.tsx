import { Canvas, CanvasProvider, Modal, Text, useSceneRuntime, View } from "@react-canvas/react-v2";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  DEMO_CURSOR,
  DEMO_HOVER,
  DEMO_LAYOUT,
  DEMO_MODAL,
  DEMO_POINTER,
  DEMO_STYLE,
  DEMO_TEXT,
  DEMO_THROUGH,
  TEXT_DEMO_WRAP_MAX,
  TEXT_DEMO_WRAP_MIN,
} from "./demo-dimensions.ts";
import { SMOKE_DEMO_LIST, readDemoSearch, type SmokeDemoId } from "./smoke-types.ts";
import {
  STYLE_DEMO_CASES,
  STYLE_OPACITY_SLIDER_DEFAULT,
  STYLE_OPACITY_SLIDER_MAX,
  STYLE_OPACITY_SLIDER_MIN,
  type StyleDemoCase,
} from "./style-demo-content.ts";
import { MODAL_CARD_HELP, MODAL_OPEN_BTN_LABEL, MODAL_STRIP_LABEL } from "./modal-demo-content.ts";
import {
  TEXT_DEMO_CAPTION,
  TEXT_DEMO_LONG_WRAP,
  TEXT_VIZ_CENTER,
  TEXT_VIZ_DECO,
  TEXT_VIZ_FONT_FALLBACK,
  TEXT_VIZ_INTRO,
  TEXT_VIZ_ITALIC_RGBA,
  TEXT_VIZ_JUSTIFY,
  TEXT_VIZ_RIGHT,
  TEXT_VIZ_SPACING,
} from "./text-demo-content.ts";

function PointerClickLog(props: { onHit: (label: string) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("hit-sm", "click", () => props.onHit("hit-sm（红，先插入）"));
    const o2 = rt.addListener("hit-lg", "click", () => props.onHit("hit-lg（绿，后插入）"));
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit]);
  return null;
}

function ThroughClickLog(props: { onHit: (label: string) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("through-back", "click", () =>
      props.onHit("through-back（绿，背后层）"),
    );
    const o2 = rt.addListener("through-front", "click", () =>
      props.onHit("错误：through-front（橙）不应收到 click"),
    );
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit]);
  return null;
}

const SIDEBAR_W = 212;

function useViewportSize(): { vw: number; vh: number } {
  const [s, setS] = useState(() => ({
    vw: typeof window !== "undefined" ? window.innerWidth : 1024,
    vh: typeof window !== "undefined" ? window.innerHeight : 640,
  }));
  useEffect(() => {
    const on = () => setS({ vw: window.innerWidth, vh: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

function blurbForDemo(demo: SmokeDemoId, styleCase: StyleDemoCase): string {
  if (demo === "style") {
    const h = STYLE_DEMO_CASES.find((x) => x.id === styleCase)?.hint;
    return h ?? "";
  }
  switch (demo) {
    case "modal":
      return "Modal：先点蓝钮打开；点红区外→背板关闭；绿条不关。";
    case "layout":
      return "Flex 三行：顶3·中2·底4。";
    case "pointer":
      return "重叠区应命中后绘制的绿块 hit-lg。";
    case "through":
      return "橙层 pointer-events:none，命中背后绿块。";
    case "text":
      return "段落/对齐/装饰/间距/斜体/rgba/字体回退；± 调宽。";
    case "cursor":
      return "静态 cursor、继承/覆盖、hover 改 cursor、穿透、grab/grabbing。";
    case "hover":
      return "移入左上块变红，移出变蓝。";
    default:
      return "";
  }
}

function TextDemoScene(props: {
  W: number;
  H: number;
  wrapWidth: number;
  defaultParagraphFontFamily: string;
  onBodyClick?: () => void;
}) {
  const { W, H, wrapWidth, defaultParagraphFontFamily, onBodyClick } = props;
  return (
    <View
      id="text-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#f8fafc",
        padding: 16,
      }}
    >
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
        {TEXT_DEMO_CAPTION}
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
        M3：外层 15px 字色继承；整段 lineHeight≈1.82。嵌套{" "}
        <Text style={{ color: "#b91c1c", fontWeight: "bold" }}>粗体红</Text>
        {" 与 "}
        <Text style={{ fontSize: 18, color: "#0369a1" }}>18px 蓝</Text>
        <Text style={{ lineHeight: 2.45, color: "#7c3aed" }}> 与 局部行距↑2.45</Text>
        。自动换行段：
        {"\n"}
        {TEXT_DEMO_LONG_WRAP}
        {"\n"}
        ── 硬换行收尾：拖窄灰条主段应自动增高。
      </Text>
      <Text
        id="text-viz-intro"
        style={{
          width: wrapWidth,
          marginTop: 12,
          fontSize: 12,
          color: "#475569",
          backgroundColor: "#f1f5f9",
          lineHeight: 1.45,
        }}
      >
        {TEXT_VIZ_INTRO}
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
        {TEXT_VIZ_CENTER}
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
        {TEXT_VIZ_RIGHT}
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
        {TEXT_VIZ_JUSTIFY}
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
        {TEXT_VIZ_DECO}
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
        {TEXT_VIZ_SPACING}
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
        {TEXT_VIZ_ITALIC_RGBA}
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
        {TEXT_VIZ_FONT_FALLBACK}
      </Text>
    </View>
  );
}

/** 与命令式 smoke 示例同 id，便于对照 Yoga 扩展字段。 */
function StyleDemoScene({
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
  const innerW = Math.min(W - 48, 308);
  if (scene === "margin-gap") {
    return (
      <View
        key={scene}
        id="style-root"
        style={{
          width: W,
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="mg-row"
          style={{
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
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="pw-inner"
          style={{
            width: innerW,
            height: H - 48,
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
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="fl-row"
          style={{
            width: W - 24,
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
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="rev-row"
          style={{
            width: W - 24,
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
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="btn-row"
          style={{
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
              确认
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
          height: H,
          flexDirection: "column",
          backgroundColor: "#f1f5f9",
          padding: 12,
        }}
      >
        <View
          id="op-stack"
          style={{
            flex: 1,
            flexDirection: "column",
            gap: 14,
            marginTop: 8,
          }}
        >
          <View id="op-single-row" style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
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
              width: Math.min(W - 48, 280),
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
        height: H,
        flexDirection: "column",
        backgroundColor: "#f1f5f9",
        padding: 12,
      }}
    >
      <View
        id="ar-stack"
        style={{
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
            width: Math.min(W - 48, 200),
            height: 52,
            overflow: "hidden",
            borderRadius: "15%",
            backgroundColor: "#cbd5e1",
          }}
        >
          <View id="ov-wide" style={{ width: 280, height: 36, backgroundColor: "#f59e0b" }} />
        </View>
      </View>
    </View>
  );
}

function FlexDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="flex-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#eef2f6",
        padding: 12,
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
  );
}

function PointerDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="demo-wrap"
      style={{
        width: W,
        height: H,
        position: "relative",
        backgroundColor: "#e2e8f0",
      }}
    >
      <View
        id="hit-sm"
        style={{
          position: "absolute",
          left: 40,
          top: 50,
          width: 120,
          height: 120,
          backgroundColor: "#ef4444",
        }}
      />
      <View
        id="hit-lg"
        style={{
          position: "absolute",
          left: 100,
          top: 90,
          width: 200,
          height: 160,
          backgroundColor: "#22c55e",
        }}
      />
    </View>
  );
}

function ThroughDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="through-wrap"
      style={{
        width: W,
        height: H,
        position: "relative",
        backgroundColor: "#e2e8f0",
      }}
    >
      <View
        id="through-back"
        style={{
          position: "absolute",
          left: 50,
          top: 60,
          width: 280,
          height: 180,
          backgroundColor: "#16a34a",
        }}
      />
      <View
        id="through-front"
        style={{
          position: "absolute",
          left: 50,
          top: 60,
          width: 280,
          height: 180,
          backgroundColor: "#fb923c",
          pointerEvents: "none",
        }}
      />
    </View>
  );
}

function HoverDemoScene() {
  return (
    <View
      id="hover-wrap"
      style={{
        width: DEMO_HOVER.w,
        height: DEMO_HOVER.h,
        position: "relative",
        backgroundColor: "#f1f5f9",
      }}
    >
      <View
        id="v-hover"
        style={({ hovered }) => ({
          width: 100,
          height: 60,
          position: "absolute" as const,
          left: 0,
          top: 0,
          backgroundColor: hovered ? "#ff0000" : "#0000ff",
        })}
      />
    </View>
  );
}

/** 默认张开手（grab），按下抓手（grabbing），在画布外松开也恢复 */
function DragCursorStrip({ W }: { W: number }) {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!pressed) return;
    const onUp = () => setPressed(false);
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [pressed]);

  return (
    <View
      id="c-drag-strip"
      style={{
        width: W - 16,
        height: 64,
        backgroundColor: pressed ? "#f9a8d4" : "#fce7f3",
        cursor: pressed ? "grabbing" : "grab",
      }}
      onPointerDown={() => setPressed(true)}
    />
  );
}

/** 光标：静态多类、父链继承与覆盖、hover 联动 cursor、穿透命中 */
function CursorDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="cursor-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        padding: 8,
        backgroundColor: "#f1f5f9",
      }}
    >
      <View id="cursor-row-static" style={{ flexDirection: "row", height: 74 }}>
        <View
          id="c-static-ptr"
          style={{ flex: 1, backgroundColor: "#fecaca", cursor: "pointer" }}
        />
        <View id="c-static-txt" style={{ flex: 1, backgroundColor: "#bbf7d0", cursor: "text" }} />
        <View
          id="c-static-cross"
          style={{ flex: 1, backgroundColor: "#dbeafe", cursor: "crosshair" }}
        />
      </View>

      <View id="cursor-gap-1" style={{ height: 8 }} />

      <View id="cursor-row-chain" style={{ flexDirection: "row", height: 92 }}>
        <View
          id="c-chain-parent-only"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#e9d5ff",
            cursor: "progress",
          }}
        >
          <View
            id="c-chain-inherit"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#c084fc",
            }}
          />
        </View>
        <View
          id="c-chain-child-wins"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#fef3c7",
            cursor: "alias",
          }}
        >
          <View
            id="c-chain-zoom"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#f59e0b",
              cursor: "zoom-in",
            }}
          />
        </View>
      </View>

      <View id="cursor-gap-2" style={{ height: 8 }} />

      <View
        id="c-hover-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#e2e8f0",
        }}
      >
        <View
          id="c-hover-fn"
          style={({ hovered }) => ({
            position: "absolute",
            left: 12,
            top: 8,
            width: W - 40,
            height: 54,
            backgroundColor: hovered ? "#0ea5e9" : "#94a3b8",
            cursor: hovered ? "grab" : "col-resize",
          })}
        />
      </View>

      <View id="cursor-gap-3" style={{ height: 8 }} />

      <View
        id="c-through-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#cbd5e1",
        }}
      >
        <View
          id="c-through-back"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "#16a34a",
            cursor: "pointer",
          }}
        />
        <View
          id="c-through-front"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "rgba(251, 146, 60, 0.45)",
            pointerEvents: "none",
          }}
        />
      </View>

      <View id="cursor-gap-4" style={{ height: 8 }} />

      <DragCursorStrip W={W} />
    </View>
  );
}

/** Modal：`scene-modal` 槽 + 全屏背板。 */
function ModalDemoInCanvas(props: { W: number; H: number; onLog: (msg: string) => void }) {
  const { W, H, onLog } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <View
        id="modal-page"
        style={{
          width: W,
          height: H,
          position: "relative",
          backgroundColor: "#e8eef5",
        }}
      >
        <View
          id="modal-open-btn"
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            width: 140,
            height: 44,
            backgroundColor: "#3b82f6",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => {
            setOpen(true);
            onLog("已打开 Modal");
          }}
        >
          <Text
            id="modal-open-btn-label"
            style={{
              fontSize: 15,
              fontWeight: "bold",
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {MODAL_OPEN_BTN_LABEL}
          </Text>
        </View>
        <View
          id="modal-main-block"
          style={{
            position: "absolute",
            left: 16,
            top: 80,
            width: 280,
            height: 100,
            backgroundColor: "#fca5a5",
          }}
          onClick={() => onLog("主界面红块收到点击（仅 Modal 关闭时）")}
        />
      </View>
      <Modal
        visible={open}
        backdropId="modal-backdrop"
        onRequestClose={() => {
          setOpen(false);
          onLog("onRequestClose（点背板关闭）");
        }}
      >
        <View
          id="modal-card"
          style={{
            position: "absolute",
            left: 70,
            top: 90,
            width: 260,
            height: 140,
            backgroundColor: "#ffffff",
          }}
        >
          <View
            id="modal-inner-strip"
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              width: 220,
              height: 36,
              backgroundColor: "#86efac",
            }}
            onClick={() => onLog("弹窗内绿条（不关闭 Modal）")}
          >
            <Text
              id="modal-strip-label"
              style={{
                position: "absolute",
                left: 10,
                top: 8,
                width: 200,
                fontSize: 13,
                fontWeight: "bold",
                color: "#14532d",
                lineHeight: 1.25,
              }}
            >
              {MODAL_STRIP_LABEL}
            </Text>
          </View>
          <Text
            id="modal-card-help"
            style={{
              position: "absolute",
              left: 12,
              top: 52,
              width: 236,
              fontSize: 13,
              color: "#334155",
              lineHeight: 1.45,
            }}
          >
            {MODAL_CARD_HELP}
          </Text>
        </View>
      </Modal>
    </>
  );
}

function demoStageSize(demo: SmokeDemoId): { dw: number; dh: number } {
  const dw =
    demo === "layout"
      ? DEMO_LAYOUT.w
      : demo === "pointer"
        ? DEMO_POINTER.w
        : demo === "through"
          ? DEMO_THROUGH.w
          : demo === "cursor"
            ? DEMO_CURSOR.w
            : demo === "modal"
              ? DEMO_MODAL.w
              : demo === "text"
                ? DEMO_TEXT.w
                : demo === "style"
                  ? DEMO_STYLE.w
                  : DEMO_HOVER.w;
  const dh =
    demo === "layout"
      ? DEMO_LAYOUT.h
      : demo === "pointer"
        ? DEMO_POINTER.h
        : demo === "through"
          ? DEMO_THROUGH.h
          : demo === "cursor"
            ? DEMO_CURSOR.h
            : demo === "modal"
              ? DEMO_MODAL.h
              : demo === "text"
                ? DEMO_TEXT.h
                : demo === "style"
                  ? DEMO_STYLE.h
                  : DEMO_HOVER.h;
  return { dw, dh };
}

/**
 * 整页仅一块 {@link Canvas}（另含库内部的定位容器与 `<canvas />`）。
 * 侧栏、说明、工具与日志均在场景树内，无业务用 HTML 控件。
 */
export function SmokeCanvasApp() {
  const [{ demo }, setNav] = useState(readDemoSearch);
  const setDemo = useCallback((next: SmokeDemoId) => {
    setNav({ demo: next });
  }, []);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("demo", demo);
    u.searchParams.delete("smoke");
    history.replaceState(null, "", `${u.pathname}?${u.searchParams.toString()}${u.hash}`);
  }, [demo]);

  const { vw, vh } = useViewportSize();
  const innerW = Math.max(120, vw - SIDEBAR_W);

  const [lastClickTarget, setLastClickTarget] = useState<string | null>(null);
  const [textWrapWidth, setTextWrapWidth] = useState(TEXT_DEMO_WRAP_MAX);
  const [textDemoClickLog, setTextDemoClickLog] = useState<string | null>(null);
  const [styleCase, setStyleCase] = useState<StyleDemoCase>("margin-gap");
  const [styleOpacityPercent, setStyleOpacityPercent] = useState(STYLE_OPACITY_SLIDER_DEFAULT);
  const [modalLog, setModalLog] = useState<string | null>(null);
  const onPointerHit = useCallback((label: string) => setLastClickTarget(label), []);
  const onTextBodyClick = useCallback(() => {
    setTextDemoClickLog(`text-body · ${new Date().toLocaleTimeString()}`);
  }, []);
  const onModalLog = useCallback((msg: string) => setModalLog(msg), []);

  useEffect(() => {
    if (demo !== "pointer" && demo !== "through") setLastClickTarget(null);
  }, [demo]);

  useEffect(() => {
    if (demo !== "text") setTextDemoClickLog(null);
  }, [demo]);

  useEffect(() => {
    if (demo !== "style") setStyleCase("margin-gap");
  }, [demo]);

  useEffect(() => {
    if (demo !== "modal") setModalLog(null);
  }, [demo]);

  const { dw, dh } = demoStageSize(demo);

  let logLine: string | null = null;
  if (demo === "pointer" || demo === "through") {
    logLine = `click: ${lastClickTarget ?? "（尚未点击）"}`;
  } else if (demo === "text") {
    logLine = `主段: ${textDemoClickLog ?? "（点主灰条）"}`;
  } else if (demo === "modal") {
    logLine = `modal: ${modalLog ?? "（尚未点击）"}`;
  }

  const bumpTextWrap = (delta: number) => {
    setTextWrapWidth((w) => Math.min(TEXT_DEMO_WRAP_MAX, Math.max(TEXT_DEMO_WRAP_MIN, w + delta)));
  };

  const bumpOpacity = (delta: number) => {
    setStyleOpacityPercent((p) =>
      Math.min(STYLE_OPACITY_SLIDER_MAX, Math.max(STYLE_OPACITY_SLIDER_MIN, p + delta)),
    );
  };

  return (
    <CanvasProvider>
      {({ isReady, runtime }) =>
        isReady && runtime ? (
          <Canvas
            width={vw}
            height={vh}
            paragraphFontProvider={runtime.paragraphFontProvider}
            defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
          >
            <View
              id="smoke-root"
              style={{
                width: vw,
                height: vh,
                flexDirection: "row",
                backgroundColor: "#ffffff",
              }}
            >
              <View
                id="smoke-sidebar"
                style={{
                  width: SIDEBAR_W,
                  height: vh,
                  backgroundColor: "#eef2f6",
                  padding: 8,
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#0f172a" }}>
                  react-canvas v3
                </Text>
                {SMOKE_DEMO_LIST.map((item) => (
                  <View
                    key={item.id}
                    id={`nav-${item.id}`}
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 6,
                      paddingBottom: 6,
                      borderRadius: 6,
                      backgroundColor: demo === item.id ? "#c7d2fe" : "#e2e8f0",
                    }}
                    onClick={() => setDemo(item.id)}
                  >
                    <Text style={{ fontSize: 11, color: "#1e293b" }}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View
                id="smoke-main"
                style={{
                  width: innerW,
                  height: vh,
                  flexDirection: "column",
                  minWidth: 0,
                }}
              >
                <View
                  style={{
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 6,
                    height: 26,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 10, color: "#64748b" }}>
                    全画布 UI · ?demo=layout|pointer|through|hover|cursor|modal|text|style
                  </Text>
                </View>

                {demo === "style" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingBottom: 6,
                    }}
                  >
                    {STYLE_DEMO_CASES.map((c) => (
                      <View
                        key={c.id}
                        id={`style-tab-${c.id}`}
                        style={{
                          paddingLeft: 8,
                          paddingRight: 8,
                          paddingTop: 4,
                          paddingBottom: 4,
                          borderRadius: 4,
                          backgroundColor: styleCase === c.id ? "#bfdbfe" : "#e2e8f0",
                        }}
                        onClick={() => setStyleCase(c.id)}
                      >
                        <Text style={{ fontSize: 10, color: "#0f172a" }}>{c.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {demo === "text" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingBottom: 6,
                    }}
                  >
                    <View
                      id="text-wrap-minus"
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: "#cbd5e1",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={() => bumpTextWrap(-24)}
                    >
                      <Text style={{ fontSize: 14, color: "#0f172a" }}>−</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#334155" }}>{`${textWrapWidth}px`}</Text>
                    <View
                      id="text-wrap-plus"
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: "#cbd5e1",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={() => bumpTextWrap(24)}
                    >
                      <Text style={{ fontSize: 14, color: "#0f172a" }}>+</Text>
                    </View>
                  </View>
                ) : null}

                {demo === "style" && styleCase === "opacity" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingBottom: 6,
                    }}
                  >
                    <View
                      id="opacity-minus"
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: "#cbd5e1",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={() => bumpOpacity(-5)}
                    >
                      <Text style={{ fontSize: 14, color: "#0f172a" }}>−</Text>
                    </View>
                    <Text
                      style={{ fontSize: 11, color: "#334155" }}
                    >{`${styleOpacityPercent}%`}</Text>
                    <View
                      id="opacity-plus"
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: "#cbd5e1",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={() => bumpOpacity(5)}
                    >
                      <Text style={{ fontSize: 14, color: "#0f172a" }}>+</Text>
                    </View>
                  </View>
                ) : null}

                <View style={{ paddingLeft: 8, paddingRight: 8, paddingBottom: 6, minHeight: 28 }}>
                  <Text
                    id="smoke-blurb"
                    style={{
                      fontSize: 10,
                      color: "#475569",
                      width: Math.max(40, innerW - 16),
                      lineHeight: 1.35,
                    }}
                  >
                    {blurbForDemo(demo, styleCase)}
                  </Text>
                </View>

                <View
                  id="smoke-stage"
                  style={{
                    flex: 1,
                    minHeight: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <View
                    id="smoke-stage-inner"
                    style={{
                      width: dw,
                      height: dh,
                      position: "relative",
                    }}
                  >
                    {demo === "layout" ? (
                      <FlexDemoScene W={dw} H={dh} />
                    ) : demo === "text" ? (
                      <TextDemoScene
                        W={dw}
                        H={dh}
                        wrapWidth={textWrapWidth}
                        defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
                        onBodyClick={onTextBodyClick}
                      />
                    ) : demo === "pointer" ? (
                      <>
                        <PointerDemoScene W={dw} H={dh} />
                        <PointerClickLog onHit={onPointerHit} />
                      </>
                    ) : demo === "through" ? (
                      <>
                        <ThroughDemoScene W={dw} H={dh} />
                        <ThroughClickLog onHit={onPointerHit} />
                      </>
                    ) : demo === "cursor" ? (
                      <CursorDemoScene W={dw} H={dh} />
                    ) : demo === "style" ? (
                      <StyleDemoScene
                        W={dw}
                        H={dh}
                        scene={styleCase}
                        opacityDemoPercent={styleOpacityPercent}
                      />
                    ) : demo === "modal" ? (
                      <ModalDemoInCanvas W={dw} H={dh} onLog={onModalLog} />
                    ) : (
                      <HoverDemoScene />
                    )}
                  </View>
                </View>

                {logLine ? (
                  <View
                    id="smoke-log"
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 4,
                      paddingBottom: 8,
                      minHeight: 28,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 10, color: "#0f172a" }}>{logLine}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Canvas>
        ) : null
      }
    </CanvasProvider>
  );
}
