import {
  attachCanvasStagePointer,
  attachSceneSkiaPresenter,
  createSceneRuntime,
  type SceneRuntime,
} from "@react-canvas/core-v2";
import { useEffect, useRef, useState } from "react";
import {
  DEMO_CURSOR,
  DEMO_HOVER,
  DEMO_LAYOUT,
  DEMO_MODAL,
  DEMO_POINTER,
  DEMO_THROUGH,
} from "./demo-dimensions.ts";
import type { SmokeDemoId } from "./smoke-types.ts";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
              : DEMO_HOVER;

  useEffect(() => {
    let cancelled = false;
    const listenerOffs: Array<() => void> = [];
    setError(null);
    setRt(null);
    setLastClickTarget(null);

    void createSceneRuntime({ width: dim.w, height: dim.h })
      .then((r) => {
        if (cancelled) return;
        const contentRoot = r.getContentRootId();
        const modalRoot = r.getModalRootId();

        const openCoreModal = (): void => {
          if (r.hasSceneNode("core-modal-backdrop")) return;
          r.patchStyle(modalRoot, { pointerEvents: "auto" });
          r.insertView(modalRoot, "core-modal-backdrop", {
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.45)",
          });
          r.insertView(modalRoot, "core-modal-card", {
            position: "absolute",
            left: 70,
            top: 90,
            width: 260,
            height: 140,
            backgroundColor: "#ffffff",
          });
          r.insertView("core-modal-card", "core-modal-strip", {
            position: "absolute",
            left: 12,
            top: 12,
            width: 220,
            height: 36,
            backgroundColor: "#86efac",
          });
        };

        const closeCoreModal = (): void => {
          if (r.hasSceneNode("core-modal-card")) {
            r.removeView("core-modal-card");
          }
          if (r.hasSceneNode("core-modal-backdrop")) {
            r.removeView("core-modal-backdrop");
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
              setLastClickTarget("已打开 Modal（insertView + patchStyle）");
            }),
          );
          listenerOffs.push(
            r.addListener("core-modal-backdrop", "click", () => {
              closeCoreModal();
              setLastClickTarget("点背板关闭（removeView + scene-modal pointerEvents:none）");
            }),
          );
          listenerOffs.push(
            r.addListener("modal-main-block", "click", () => {
              setLastClickTarget("主界面红块收到 click（仅未打开 Modal 时）");
            }),
          );
          listenerOffs.push(
            r.addListener("core-modal-strip", "click", () => {
              setLastClickTarget("弹窗内绿条（core）");
            }),
          );
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
  }, [demo, dim.w, dim.h]);

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

    void attachSceneSkiaPresenter(rt, canvas, { dpr })
      .then((d) => {
        if (!cancelled) detachSkia = d;
      })
      .catch((e: unknown) => {
        console.error("[core-smoke] attachSceneSkiaPresenter:", e);
      });

    detachPointer = attachCanvasStagePointer(canvas, rt);

    return () => {
      cancelled = true;
      detachSkia?.();
      detachPointer?.();
    };
  }, [rt]);

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
        主内容挂在 <code>getContentRootId()</code>；点蓝块用 <code>insertView</code> 往{" "}
        <code>getModalRootId()</code> 挂背板 + 卡片，并{" "}
        <code>
          patchStyle(modalRoot, {"{"} pointerEvents: &quot;auto&quot; {"}"} )
        </code>
        。点背板 <code>removeView</code> 后 <code>pointerEvents: &quot;none&quot;</code>，与 React{" "}
        <code>&lt;Modal&gt;</code> 行为对齐。
      </p>
    ) : (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 560 }}>
        移入左上角方块应变红（<code>#ff0000</code>），移出变蓝（<code>#0000ff</code>），与 React
        函数式 style 一致。
      </p>
    );

  return (
    <div>
      {blurb}
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
      {demo === "pointer" || demo === "through" || demo === "modal" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
          上次 click 监听来自：<strong>{lastClickTarget ?? "（尚未点击）"}</strong>
        </p>
      ) : null}
    </div>
  );
}
