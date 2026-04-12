import {
  attachCanvasStagePointer,
  attachSceneSkiaPresenter,
  createSceneRuntime,
  DEFAULT_PARAGRAPH_FONT_FAMILY,
  initRuntime,
  type AttachSceneSkiaOptions,
  type SceneRuntime,
} from "@react-canvas/core-v2";
import { MODAL_CARD_HELP, MODAL_OPEN_BTN_LABEL, MODAL_STRIP_LABEL } from "./modal-demo-content.ts";
import {
  textDemoBodyFlatRuns,
  textDemoCaptionFlatRuns,
  TEXT_DEMO_WRAP_NODE_IDS,
  TEXT_VIZ_CENTER,
  TEXT_VIZ_DECO,
  TEXT_VIZ_FONT_FALLBACK,
  TEXT_VIZ_INTRO,
  TEXT_VIZ_ITALIC_RGBA,
  TEXT_VIZ_JUSTIFY,
  TEXT_VIZ_RIGHT,
  TEXT_VIZ_SPACING,
} from "./text-demo-content.ts";
import { useEffect, useRef, useState } from "react";
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
import type { SmokeDemoId } from "./smoke-types.ts";
import {
  STYLE_DEMO_CASES,
  STYLE_OPACITY_SLIDER_DEFAULT,
  STYLE_OPACITY_SLIDER_MAX,
  STYLE_OPACITY_SLIDER_MIN,
  type StyleDemoCase,
} from "./style-demo-content.ts";

function buildLayoutDemo(r: SceneRuntime, root: string, W: number, H: number): void {
  r.insertView(root, "flex-root", {
    width: W,
    height: H,
    flexDirection: "column",
    backgroundColor: "#eef2f6",
    padding: 12,
  });
  r.insertView("flex-root", "row-top", { flex: 1, flexDirection: "row" });
  r.insertView("row-top", "t1", { flex: 1, backgroundColor: "#f97316" });
  r.insertView("row-top", "t2", { flex: 1, backgroundColor: "#fb923c" });
  r.insertView("row-top", "t3", { flex: 1, backgroundColor: "#fdba74" });
  r.insertView("flex-root", "row-mid", { flex: 1, flexDirection: "row" });
  r.insertView("row-mid", "m1", { flex: 1, backgroundColor: "#22c55e" });
  r.insertView("row-mid", "m2", { flex: 1, backgroundColor: "#4ade80" });
  r.insertView("flex-root", "row-bot", { flex: 1, flexDirection: "row" });
  r.insertView("row-bot", "b1", { flex: 1, backgroundColor: "#3b82f6" });
  r.insertView("row-bot", "b2", { flex: 1, backgroundColor: "#60a5fa" });
  r.insertView("row-bot", "b3", { flex: 1, backgroundColor: "#93c5fd" });
  r.insertView("row-bot", "b4", { flex: 1, backgroundColor: "#bfdbfe" });
}

function buildPointerDemo(r: SceneRuntime, root: string, W: number, H: number): void {
  r.insertView(root, "demo-wrap", {
    width: W,
    height: H,
    position: "relative",
    backgroundColor: "#e2e8f0",
  });
  r.insertView("demo-wrap", "hit-sm", {
    position: "absolute",
    left: 40,
    top: 50,
    width: 120,
    height: 120,
    backgroundColor: "#ef4444",
  });
  r.insertView("demo-wrap", "hit-lg", {
    position: "absolute",
    left: 100,
    top: 90,
    width: 200,
    height: 160,
    backgroundColor: "#22c55e",
  });
}

/** 前景后插入、半透明；`pointerEvents: none` 时命中落到背后同区域绿块。 */
function buildThroughDemo(r: SceneRuntime, root: string, W: number, H: number): void {
  r.insertView(root, "through-wrap", {
    width: W,
    height: H,
    position: "relative",
    backgroundColor: "#e2e8f0",
  });
  r.insertView("through-wrap", "through-back", {
    position: "absolute",
    left: 50,
    top: 60,
    width: 280,
    height: 180,
    backgroundColor: "#16a34a",
  });
  r.insertView("through-wrap", "through-front", {
    position: "absolute",
    left: 50,
    top: 60,
    width: 280,
    height: 180,
    backgroundColor: "#fb923c",
    pointerEvents: "none",
  });
}

/** 与 {@link ReactSmoke} Modal 示例同布局；弹窗层由点击后用命令式 API 挂到 `getModalRootId()`。 */
function buildModalPageDemo(r: SceneRuntime, contentRoot: string, W: number, H: number): void {
  r.insertView(contentRoot, "modal-page", {
    width: W,
    height: H,
    position: "relative",
    backgroundColor: "#e8eef5",
  });
  r.insertView("modal-page", "modal-open-btn", {
    position: "absolute",
    left: 16,
    top: 16,
    width: 140,
    height: 44,
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  });
  r.insertText("modal-open-btn", "modal-open-btn-label", MODAL_OPEN_BTN_LABEL, {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
    lineHeight: 1.2,
  });
  r.insertView("modal-page", "modal-main-block", {
    position: "absolute",
    left: 16,
    top: 80,
    width: 280,
    height: 100,
    backgroundColor: "#fca5a5",
  });
}

function buildHoverDemo(r: SceneRuntime, root: string, W: number, H: number): void {
  r.insertView(root, "hover-wrap", {
    width: W,
    height: H,
    position: "relative",
    backgroundColor: "#f1f5f9",
  });
  r.insertView("hover-wrap", "v-hover", {
    width: 100,
    height: 60,
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: "#0000ff",
  });
}

/** 与 {@link ReactSmoke} 中 <code>StyleDemoScene</code> 同 id / 样式语义。 */
function buildStyleDemo(
  r: SceneRuntime,
  root: string,
  W: number,
  H: number,
  c: StyleDemoCase,
): void {
  r.insertView(root, "style-root", {
    width: W,
    height: H,
    flexDirection: "column",
    backgroundColor: "#f1f5f9",
    padding: 12,
  });

  if (c === "margin-gap") {
    r.insertView("style-root", "mg-row", {
      flex: 1,
      minHeight: 120,
      flexDirection: "row",
      gap: 14,
      alignItems: "flex-start",
      padding: 14,
      marginTop: 8,
      backgroundColor: "#e2e8f0",
    });
    r.insertView("mg-row", "mg-a", {
      width: 44,
      height: 40,
      marginTop: 16,
      backgroundColor: "#fb923c",
    });
    r.insertView("mg-row", "mg-b", {
      width: 44,
      height: 40,
      marginLeft: 8,
      marginRight: 12,
      backgroundColor: "#fb7185",
    });
    r.insertView("mg-row", "mg-c", { width: 44, height: 40, backgroundColor: "#4ade80" });
    return;
  }

  if (c === "padding-wrap") {
    const innerW = Math.min(W - 48, 308);
    r.insertView("style-root", "pw-inner", {
      width: innerW,
      height: H - 48,
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 10,
      paddingTop: 28,
      gap: 10,
      backgroundColor: "#cbd5e1",
    });
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"] as const;
    for (let i = 0; i < colors.length; i++) {
      r.insertView("pw-inner", `pw-chip-${i}`, {
        width: 88,
        height: 36,
        backgroundColor: colors[i],
      });
    }
    return;
  }

  if (c === "flex-longhands") {
    r.insertView("style-root", "fl-row", {
      width: W - 24,
      height: 80,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      backgroundColor: "#e2e8f0",
      padding: 10,
    });
    r.insertView("fl-row", "fl-fix", {
      width: 76,
      height: 52,
      backgroundColor: "#2563eb",
    });
    r.insertView("fl-row", "fl-grow", {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 40,
      minWidth: 0,
      height: 52,
      marginLeft: 10,
      backgroundColor: "#22d3ee",
    });
    return;
  }

  if (c === "flex-reverse") {
    r.insertView("style-root", "rev-row", {
      width: W - 24,
      height: 76,
      flexDirection: "row-reverse",
      gap: 12,
      alignItems: "center",
      padding: 10,
      marginTop: 8,
      backgroundColor: "#e2e8f0",
    });
    r.insertView("rev-row", "rv-first", { width: 72, height: 48, backgroundColor: "#e11d48" });
    r.insertView("rev-row", "rv-second", { width: 72, height: 48, backgroundColor: "#0d9488" });
    return;
  }

  if (c === "opacity") {
    const opPlay = STYLE_OPACITY_SLIDER_DEFAULT / 100;
    r.insertView("style-root", "op-stack", {
      flex: 1,
      flexDirection: "column",
      gap: 14,
      marginTop: 8,
    });
    r.insertView("op-stack", "op-single-row", {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    });
    r.insertView("op-single-row", "op-ref", {
      width: 72,
      height: 56,
      backgroundColor: "#2563eb",
    });
    r.insertView("op-single-row", "op-alone", {
      width: 72,
      height: 56,
      backgroundColor: "#2563eb",
      opacity: opPlay,
    });
    r.insertView("op-stack", "op-ancestor", {
      width: Math.min(W - 48, 280),
      height: 112,
      flexDirection: "row",
      gap: 10,
      padding: 10,
      backgroundColor: "#64748b",
      opacity: opPlay,
    });
    r.insertView("op-ancestor", "op-child-a", {
      width: 88,
      height: 88,
      backgroundColor: "#f97316",
      opacity: 0.85,
    });
    r.insertView("op-ancestor", "op-child-b", {
      width: 88,
      height: 88,
      backgroundColor: "#22d3ee",
      opacity: 0.85,
    });
    return;
  }

  r.insertView("style-root", "ar-stack", {
    flex: 1,
    minHeight: 140,
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
  });
  r.insertView("ar-stack", "ar-ratio", {
    width: 120,
    aspectRatio: 1.5,
    backgroundColor: "#9333ea",
  });
  r.insertView("ar-stack", "ov-shell", {
    width: Math.min(W - 48, 200),
    height: 52,
    overflow: "hidden",
    backgroundColor: "#cbd5e1",
  });
  r.insertView("ov-shell", "ov-wide", {
    width: 280,
    height: 36,
    backgroundColor: "#f59e0b",
  });
}

/** 与 {@link CursorDemoScene}（react-smoke）同结构，便于对照光标与 hover 联动 */
function buildCursorDemo(r: SceneRuntime, root: string, W: number, H: number): void {
  r.insertView(root, "cursor-root", {
    width: W,
    height: H,
    flexDirection: "column",
    padding: 8,
    backgroundColor: "#f1f5f9",
  });
  r.insertView("cursor-root", "cursor-row-static", { flexDirection: "row", height: 74 });
  r.insertView("cursor-row-static", "c-static-ptr", {
    flex: 1,
    backgroundColor: "#fecaca",
    cursor: "pointer",
  });
  r.insertView("cursor-row-static", "c-static-txt", {
    flex: 1,
    backgroundColor: "#bbf7d0",
    cursor: "text",
  });
  r.insertView("cursor-row-static", "c-static-cross", {
    flex: 1,
    backgroundColor: "#dbeafe",
    cursor: "crosshair",
  });

  r.insertView("cursor-root", "cursor-gap-1", { height: 8 });

  r.insertView("cursor-root", "cursor-row-chain", { flexDirection: "row", height: 92 });
  r.insertView("cursor-row-chain", "c-chain-parent-only", {
    flex: 1,
    position: "relative",
    backgroundColor: "#e9d5ff",
    cursor: "progress",
  });
  r.insertView("c-chain-parent-only", "c-chain-inherit", {
    position: "absolute",
    left: 24,
    top: 16,
    width: 120,
    height: 48,
    backgroundColor: "#c084fc",
  });
  r.insertView("cursor-row-chain", "c-chain-child-wins", {
    flex: 1,
    position: "relative",
    backgroundColor: "#fef3c7",
    cursor: "alias",
  });
  r.insertView("c-chain-child-wins", "c-chain-zoom", {
    position: "absolute",
    left: 24,
    top: 16,
    width: 120,
    height: 48,
    backgroundColor: "#f59e0b",
    cursor: "zoom-in",
  });

  r.insertView("cursor-root", "cursor-gap-2", { height: 8 });

  r.insertView("cursor-root", "c-hover-wrap", {
    height: 70,
    position: "relative",
    backgroundColor: "#e2e8f0",
  });
  r.insertView("c-hover-wrap", "c-hover-fn", {
    position: "absolute",
    left: 12,
    top: 8,
    width: W - 40,
    height: 54,
    backgroundColor: "#94a3b8",
    cursor: "col-resize",
  });

  r.insertView("cursor-root", "cursor-gap-3", { height: 8 });

  r.insertView("cursor-root", "c-through-wrap", {
    height: 70,
    position: "relative",
    backgroundColor: "#cbd5e1",
  });
  r.insertView("c-through-wrap", "c-through-back", {
    position: "absolute",
    left: 16,
    top: 8,
    width: 280,
    height: 54,
    backgroundColor: "#16a34a",
    cursor: "pointer",
  });
  r.insertView("c-through-wrap", "c-through-front", {
    position: "absolute",
    left: 16,
    top: 8,
    width: 280,
    height: 54,
    backgroundColor: "rgba(251, 146, 60, 0.45)",
    pointerEvents: "none",
  });

  r.insertView("cursor-root", "cursor-gap-4", { height: 8 });

  r.insertView("cursor-root", "c-drag-strip", {
    width: W - 16,
    height: 64,
    backgroundColor: "#fce7f3",
    cursor: "grab",
  });
}

type CoreSmokeProps = { demo: SmokeDemoId };

/**
 * 仅 `@react-canvas/core-v2`（Skia + 画布指针），不经 `react-v2`。
 * 与 {@link ReactSmoke} 使用相同场景尺寸与结构，便于对照。
 */
export function CoreSmoke({ demo }: CoreSmokeProps) {
  const [rt, setRt] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastClickTarget, setLastClickTarget] = useState<string | null>(null);
  const [textWrapWidth, setTextWrapWidth] = useState(TEXT_DEMO_WRAP_MAX);
  const [textDemoClickLog, setTextDemoClickLog] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [styleCase, setStyleCase] = useState<StyleDemoCase>("margin-gap");
  const [styleOpacityPercent, setStyleOpacityPercent] = useState(STYLE_OPACITY_SLIDER_DEFAULT);

  const dim =
    demo === "layout"
      ? DEMO_LAYOUT
      : demo === "pointer"
        ? DEMO_POINTER
        : demo === "through"
          ? DEMO_THROUGH
          : demo === "cursor"
            ? DEMO_CURSOR
            : demo === "modal"
              ? DEMO_MODAL
              : demo === "text"
                ? DEMO_TEXT
                : demo === "style"
                  ? DEMO_STYLE
                  : DEMO_HOVER;

  useEffect(() => {
    if (demo !== "style") setStyleCase("margin-gap");
  }, [demo]);

  useEffect(() => {
    let cancelled = false;
    const listenerOffs: Array<() => void> = [];
    setError(null);
    setRt(null);
    setLastClickTarget(null);
    setTextDemoClickLog(null);

    void createSceneRuntime({ width: dim.w, height: dim.h })
      .then(async (r) => {
        if (cancelled) return;
        // 与 React：Canvas 仅在 initRuntime ready 后挂载子树一致。否则首帧 Yoga 测量拿不到
        // Paragraph 上下文，会走 approximate，盒高偏矮；拖滑块 patch 后才与绘制对齐。
        if (demo === "text" || demo === "modal") {
          try {
            await initRuntime();
          } catch (e: unknown) {
            console.error("[core-smoke] initRuntime（含 Text 的场景首帧测量需要段落上下文）:", e);
          }
        }
        if (cancelled) return;
        const contentRoot = r.getContentRootId();
        const modalRoot = r.getModalRootId();

        const openCoreModal = (): void => {
          if (r.hasSceneNode("modal-backdrop")) return;
          r.patchStyle(modalRoot, { pointerEvents: "auto" });
          r.insertView(modalRoot, "modal-backdrop", {
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.45)",
          });
          r.insertView(modalRoot, "modal-card", {
            position: "absolute",
            left: 70,
            top: 90,
            width: 260,
            height: 140,
            backgroundColor: "#ffffff",
          });
          r.insertView("modal-card", "modal-inner-strip", {
            position: "absolute",
            left: 12,
            top: 12,
            width: 220,
            height: 36,
            backgroundColor: "#86efac",
          });
          r.insertText("modal-inner-strip", "modal-strip-label", MODAL_STRIP_LABEL, {
            position: "absolute",
            left: 10,
            top: 8,
            width: 200,
            fontSize: 13,
            fontWeight: "bold",
            color: "#14532d",
            lineHeight: 1.25,
          });
          r.insertText("modal-card", "modal-card-help", MODAL_CARD_HELP, {
            position: "absolute",
            left: 12,
            top: 52,
            width: 236,
            fontSize: 13,
            color: "#334155",
            lineHeight: 1.45,
          });
        };

        const closeCoreModal = (): void => {
          if (r.hasSceneNode("modal-card")) {
            r.removeView("modal-card");
          }
          if (r.hasSceneNode("modal-backdrop")) {
            r.removeView("modal-backdrop");
          }
          r.patchStyle(modalRoot, { pointerEvents: "none" });
        };

        if (demo === "layout") {
          buildLayoutDemo(r, contentRoot, dim.w, dim.h);
        } else if (demo === "pointer") {
          buildPointerDemo(r, contentRoot, dim.w, dim.h);
          listenerOffs.push(
            r.addListener("hit-sm", "click", () => {
              setLastClickTarget("hit-sm（红，先插入）");
            }),
          );
          listenerOffs.push(
            r.addListener("hit-lg", "click", () => {
              setLastClickTarget("hit-lg（绿，后插入）");
            }),
          );
        } else if (demo === "through") {
          buildThroughDemo(r, contentRoot, dim.w, dim.h);
          listenerOffs.push(
            r.addListener("through-back", "click", () => {
              setLastClickTarget("through-back（绿，背后层）");
            }),
          );
          listenerOffs.push(
            r.addListener("through-front", "click", () => {
              setLastClickTarget("错误：through-front（橙）不应收到 click");
            }),
          );
        } else if (demo === "cursor") {
          buildCursorDemo(r, contentRoot, dim.w, dim.h);
          listenerOffs.push(
            r.addListener("c-hover-fn", "pointerenter", () => {
              r.patchStyle("c-hover-fn", {
                backgroundColor: "#0ea5e9",
                cursor: "grab",
              });
            }),
          );
          listenerOffs.push(
            r.addListener("c-hover-fn", "pointerleave", () => {
              r.patchStyle("c-hover-fn", {
                backgroundColor: "#94a3b8",
                cursor: "col-resize",
              });
            }),
          );
          let dragStripActive = false;
          const dragStripRest = () => {
            dragStripActive = false;
            r.patchStyle("c-drag-strip", {
              backgroundColor: "#fce7f3",
              cursor: "grab",
            });
          };
          const dragStripPress = () => {
            dragStripActive = true;
            r.patchStyle("c-drag-strip", {
              backgroundColor: "#f9a8d4",
              cursor: "grabbing",
            });
          };
          listenerOffs.push(r.addListener("c-drag-strip", "pointerdown", dragStripPress));
          const onWindowPointerUp = () => {
            if (dragStripActive) dragStripRest();
          };
          window.addEventListener("pointerup", onWindowPointerUp);
          listenerOffs.push(() => window.removeEventListener("pointerup", onWindowPointerUp));
        } else if (demo === "modal") {
          buildModalPageDemo(r, contentRoot, dim.w, dim.h);
          listenerOffs.push(
            r.addListener("modal-open-btn", "click", () => {
              openCoreModal();
              setLastClickTarget("已打开 Modal");
            }),
          );
          listenerOffs.push(
            r.addListener("modal-backdrop", "click", () => {
              closeCoreModal();
              setLastClickTarget("onRequestClose（点背板关闭）");
            }),
          );
          listenerOffs.push(
            r.addListener("modal-main-block", "click", () => {
              setLastClickTarget("主界面红块收到点击（仅 Modal 关闭时）");
            }),
          );
          listenerOffs.push(
            r.addListener("modal-inner-strip", "click", () => {
              setLastClickTarget("弹窗内绿条（不关闭 Modal）");
            }),
          );
        } else if (demo === "text") {
          r.insertView(contentRoot, "text-root", {
            width: dim.w,
            height: dim.h,
            flexDirection: "column",
            backgroundColor: "#f8fafc",
            padding: 16,
          });
          r.insertText("text-root", "text-caption", textDemoCaptionFlatRuns(), {
            width: TEXT_DEMO_WRAP_MAX,
            fontSize: 12,
            color: "#64748b",
            backgroundColor: "#eef2f6",
            lineHeight: 1.38,
          });
          r.insertText("text-root", "text-body", textDemoBodyFlatRuns(), {
            width: TEXT_DEMO_WRAP_MAX,
            fontSize: 15,
            color: "#0f172a",
            backgroundColor: "#e2e8f0",
            lineHeight: 1.82,
          });
          r.insertText("text-root", "text-viz-intro", TEXT_VIZ_INTRO, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 12,
            fontSize: 12,
            color: "#475569",
            backgroundColor: "#f1f5f9",
            lineHeight: 1.45,
          });
          r.insertText("text-root", "text-viz-center", TEXT_VIZ_CENTER, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 6,
            fontSize: 14,
            textAlign: "center",
            color: "#0f172a",
            backgroundColor: "#dbeafe",
            lineHeight: 1.35,
          });
          r.insertText("text-root", "text-viz-right", TEXT_VIZ_RIGHT, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 14,
            textAlign: "right",
            color: "#0f172a",
            backgroundColor: "#e0e7ff",
            lineHeight: 1.35,
          });
          r.insertText("text-root", "text-viz-justify", TEXT_VIZ_JUSTIFY, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 13,
            textAlign: "justify",
            color: "#1c1917",
            backgroundColor: "#fef3c7",
            lineHeight: 1.42,
          });
          r.insertText("text-root", "text-viz-deco", TEXT_VIZ_DECO, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 14,
            color: "#1e293b",
            backgroundColor: "#fce7f3",
            lineHeight: 1.4,
            textDecorationLine: ["underline", "line-through"],
            textDecorationColor: "#b91c1c",
            textDecorationStyle: "solid",
            textDecorationThickness: 1.25,
          });
          r.insertText("text-root", "text-viz-spacing", TEXT_VIZ_SPACING, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 13,
            color: "#134e4a",
            backgroundColor: "#ccfbf1",
            lineHeight: 1.4,
            letterSpacing: 2,
            wordSpacing: 10,
          });
          r.insertText("text-root", "text-viz-italic", TEXT_VIZ_ITALIC_RGBA, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 15,
            fontStyle: "italic",
            color: "rgba(14,116,144,0.78)",
            backgroundColor: "#ecfeff",
            lineHeight: 1.4,
          });
          r.insertText("text-root", "text-viz-fontfb", TEXT_VIZ_FONT_FALLBACK, {
            width: TEXT_DEMO_WRAP_MAX,
            marginTop: 4,
            fontSize: 13,
            color: "#14532d",
            backgroundColor: "#dcfce7",
            lineHeight: 1.4,
            fontFamily: `__NoSuchFont__, ${DEFAULT_PARAGRAPH_FONT_FAMILY}`,
          });
          listenerOffs.push(
            r.addListener("text-body", "click", () => {
              setTextDemoClickLog(`text-body click · ${new Date().toLocaleTimeString()}`);
            }),
          );
        } else if (demo === "style") {
          buildStyleDemo(r, contentRoot, dim.w, dim.h, styleCase);
        } else {
          buildHoverDemo(r, contentRoot, dim.w, dim.h);
          listenerOffs.push(
            r.addListener("v-hover", "pointerenter", () => {
              r.patchStyle("v-hover", { backgroundColor: "#ff0000" });
            }),
          );
          listenerOffs.push(
            r.addListener("v-hover", "pointerleave", () => {
              r.patchStyle("v-hover", { backgroundColor: "#0000ff" });
            }),
          );
        }

        if (cancelled) {
          for (const off of listenerOffs) {
            off();
          }
          return;
        }
        setRt(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
      for (const off of listenerOffs) {
        off();
      }
    };
  }, [demo, dim.w, dim.h, demo === "style" ? styleCase : "_"]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!rt || !canvas) return;

    let detachSkia: (() => void) | undefined;
    let detachPointer: (() => void) | undefined;
    let cancelled = false;

    const dpr =
      typeof globalThis !== "undefined" &&
      "devicePixelRatio" in globalThis &&
      typeof (globalThis as { devicePixelRatio?: number }).devicePixelRatio === "number"
        ? (globalThis as { devicePixelRatio: number }).devicePixelRatio
        : 1;

    void (async () => {
      const skiaOpts: AttachSceneSkiaOptions = { dpr };
      if (demo === "text" || demo === "modal") {
        try {
          const mod = await initRuntime();
          skiaOpts.paragraphFontProvider = mod.paragraphFontProvider;
          skiaOpts.defaultParagraphFontFamily = mod.defaultParagraphFontFamily;
        } catch (e: unknown) {
          console.error("[core-smoke] initRuntime（含 Text 的 demo 需要默认字体）:", e);
        }
      }
      try {
        const detach = await attachSceneSkiaPresenter(rt, canvas, skiaOpts);
        if (!cancelled) detachSkia = detach;
      } catch (e: unknown) {
        console.error("[core-smoke] attachSceneSkiaPresenter:", e);
      }
    })();

    detachPointer = attachCanvasStagePointer(canvas, rt);

    return () => {
      cancelled = true;
      detachSkia?.();
      detachPointer?.();
    };
  }, [rt, demo]);

  useEffect(() => {
    if (!rt || demo !== "text") return;
    for (const id of TEXT_DEMO_WRAP_NODE_IDS) {
      if (rt.hasSceneNode(id)) rt.patchStyle(id, { width: textWrapWidth });
    }
  }, [rt, demo, textWrapWidth]);

  useEffect(() => {
    if (!rt || demo !== "style" || styleCase !== "opacity") return;
    const v = styleOpacityPercent / 100;
    if (rt.hasSceneNode("op-alone")) rt.patchStyle("op-alone", { opacity: v });
    if (rt.hasSceneNode("op-ancestor")) rt.patchStyle("op-ancestor", { opacity: v });
  }, [rt, demo, styleCase, styleOpacityPercent]);

  if (error) {
    return <p style={{ color: "crimson" }}>Core 加载失败：{error.message}</p>;
  }
  if (!rt) {
    return <p style={{ color: "#64748b" }}>正在加载 SceneRuntime（core-v2）…</p>;
  }

  const blurb =
    demo === "layout" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 560 }}>
        三行 flex：顶 3 格、中 2 格、底 4 格；与 React 侧 <code>View</code> 树一致（{dim.w}×{dim.h}
        ）。
      </p>
    ) : demo === "pointer" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 560 }}>
        树序绘制与 hit-test：重叠区应<strong>见绿在上</strong>，点击重叠中心应对应{" "}
        <code>hit-lg</code>。
      </p>
    ) : demo === "through" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 560 }}>
        橙块盖在绿块上，但橙块 <code>pointerEvents: &quot;none&quot;</code>
        ，命中应穿透到 <code>through-back</code>；不应出现「前景收到 click」。
      </p>
    ) : demo === "cursor" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 640 }}>
        与 React 侧同布局：① 三列静态 cursor；② 父链继承 / 子覆盖；③ Core 用 <code>patchStyle</code>{" "}
        同步 hover 区颜色与 cursor；④ 穿透区光标为绿块 <code>pointer</code>；⑤ 底栏{" "}
        <code>pointerdown</code> / 窗口 <code>pointerup</code> 切换 <code>grab</code> ↔{" "}
        <code>grabbing</code>。
      </p>
    ) : demo === "modal" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 640 }}>
        与 React 同树名：<code>modal-backdrop</code> / <code>modal-card</code> /{" "}
        <code>modal-inner-strip</code>；蓝条 / 绿条内 <code>insertText</code> 与 <code>Text</code>{" "}
        同文案。点蓝块往 <code>getModalRootId()</code> 挂层并{" "}
        <code>
          patchStyle(modalRoot, {"{"} pointerEvents: &quot;auto&quot; {"}"} )
        </code>
        ；下方「操作日志」与 React Modal 示例同句。
      </p>
    ) : demo === "text" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 680 }}>
        与 React 对齐：<strong>两段</strong>（Caption + 主段）+ <strong>样式可视化</strong>（
        <code>textAlign</code>、<code>textDecoration</code>、<code>letterSpacing</code>/
        <code>wordSpacing</code>、<code>fontStyle</code>、<code>rgba()</code>、
        <code>fontFamily</code> 逗号回退）。<code>lineHeight</code>、主段多 run、硬换行 + 长段换行；
        <code>await initRuntime()</code> 后首帧测量；滑块批量 <code>patchStyle</code>{" "}
        宽度。点击主灰条 <code>text-body</code> 记日志。
      </p>
    ) : demo === "style" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 680 }}>
        <code>ViewStyle</code> 扩展：<code>margin</code> / 单边、<code>gap</code>、
        <code>padding</code> + 单边覆盖、<code>flexWrap</code>、<code>minHeight</code>、
        <code>flexGrow</code> / <code>flexShrink</code> / <code>flexBasis</code>、
        <code>flexDirection</code>（含 <code>row-reverse</code>）、<code>aspectRatio</code>、
        <code>overflow</code>（Skia 裁剪另议）。与 Core 命令式树 id 对齐；下方工具栏切换子场景。
        <code>opacity</code> 子场景带滑块实时 <code>patchStyle</code>。
      </p>
    ) : (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 560 }}>
        移入左上角方块应变红（<code>#ff0000</code>），移出变蓝（<code>#0000ff</code>），与 React
        函数式 style 一致。
      </p>
    );

  const styleDemoToolbar =
    demo === "style" ? (
      <div
        role="toolbar"
        aria-label="样式子场景"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          margin: "0 0 0.5rem",
          maxWidth: Math.max(DEMO_STYLE.w, 480),
        }}
      >
        {STYLE_DEMO_CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStyleCase(c.id)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              borderRadius: 6,
              border: `1px solid ${styleCase === c.id ? "var(--accent, #3b82f6)" : "var(--border)"}`,
              background: styleCase === c.id ? "rgba(59,130,246,0.12)" : "var(--surface, #fff)",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
        <span style={{ flex: "1 1 220px", fontSize: 13, color: "var(--text-h)" }}>
          {STYLE_DEMO_CASES.find((x) => x.id === styleCase)?.hint}
        </span>
      </div>
    ) : null;

  const textWidthSlider =
    demo === "text" ? (
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 0.5rem",
          fontSize: 14,
          color: "var(--text)",
          maxWidth: Math.max(DEMO_TEXT.w, 480),
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>文字区宽度</span>
        <input
          type="range"
          min={TEXT_DEMO_WRAP_MIN}
          max={TEXT_DEMO_WRAP_MAX}
          value={textWrapWidth}
          onChange={(e) => setTextWrapWidth(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120 }}
        />
        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: "3.5rem" }}>
          {textWrapWidth}px
        </span>
      </label>
    ) : null;

  const styleOpacitySlider =
    demo === "style" && styleCase === "opacity" ? (
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 0.5rem",
          fontSize: 14,
          color: "var(--text)",
          maxWidth: Math.max(DEMO_STYLE.w, 480),
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>半透明强度</span>
        <input
          type="range"
          min={STYLE_OPACITY_SLIDER_MIN}
          max={STYLE_OPACITY_SLIDER_MAX}
          value={styleOpacityPercent}
          onChange={(e) => setStyleOpacityPercent(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120 }}
        />
        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: "3.5rem" }}>
          {styleOpacityPercent}%
        </span>
      </label>
    ) : null;

  return (
    <div>
      {blurb}
      {styleDemoToolbar}
      {styleOpacitySlider}
      {textWidthSlider}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: dim.w,
          height: dim.h,
          border: "1px solid var(--border)",
          boxSizing: "border-box",
          background: "#f8fafc",
        }}
      />
      {demo === "pointer" || demo === "through" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
          上次 click 监听来自：<strong>{lastClickTarget ?? "（尚未点击）"}</strong>
        </p>
      ) : null}
      {demo === "modal" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
          操作日志：<strong>{lastClickTarget ?? "（尚未点击）"}</strong>
        </p>
      ) : null}
      {demo === "text" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 13, color: "var(--text-h)" }}>
          主段落点击：<strong>{textDemoClickLog ?? "（点击主灰条 text-body）"}</strong>
        </p>
      ) : null}
    </div>
  );
}
