import {
  attachCanvasStagePointer,
  attachSceneSkiaPresenter,
  createSceneRuntime,
  type SceneRuntime,
} from "@react-canvas/core-v2";
import { useEffect, useRef, useState } from "react";

const W = 400;
const H = 300;

/**
 * 冒烟：仅 `@react-canvas/core-v2`（Skia + 画布指针），不经 `react-v2`。
 * 页面外壳仍用 React 便于与 App 一致。
 */
export function CoreSmoke() {
  const [rt, setRt] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    createSceneRuntime({ width: W, height: H })
      .then((r) => {
        if (cancelled) return;
        const root = r.getRootId();
        r.insertView(root, "row", {
          width: W,
          height: H,
          flexDirection: "row",
          backgroundColor: "#e2e8f0",
        });
        r.insertView("row", "col-a", { flex: 1, height: H, backgroundColor: "#93c5fd" });
        r.insertView("row", "col-b", { flex: 1, height: H, backgroundColor: "#fca5a5" });
        setRt(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem", color: "#444" }}>
        仅 core-v2：<code>attachSceneSkiaPresenter</code> + <code>attachCanvasStagePointer</code>
      </p>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: W,
          height: H,
          border: "1px solid #cbd5e1",
          boxSizing: "border-box",
          background: "#f8fafc",
        }}
      />
    </div>
  );
}
