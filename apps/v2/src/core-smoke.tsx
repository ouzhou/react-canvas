import {
  attachCanvasStagePointer,
  attachSceneSkiaPresenter,
  createSceneRuntime,
  type SceneRuntime,
} from "@react-canvas/core-v2";
import { useEffect, useRef, useState } from "react";
import { DEMO_HOVER, DEMO_LAYOUT, DEMO_POINTER, DEMO_THROUGH } from "./demo-dimensions.ts";
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
        const root = r.getRootId();

        if (demo === "layout") {
          buildLayoutDemo(r, root, dim.w, dim.h);
        } else if (demo === "pointer") {
          buildPointerDemo(r, root, dim.w, dim.h);
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
          buildThroughDemo(r, root, dim.w, dim.h);
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
        } else {
          buildHoverDemo(r, root, dim.w, dim.h);
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
      {demo === "pointer" || demo === "through" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
          上次 click 监听来自：<strong>{lastClickTarget ?? "（尚未点击）"}</strong>
        </p>
      ) : null}
    </div>
  );
}
