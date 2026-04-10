import { createSceneRuntime, type SceneRuntime } from "@react-canvas/core-v2";
import { useEffect, useRef, useState } from "react";
import { mountCoreSmokeStage } from "./core-smoke-stage.ts";
import { PointerDebugPanel } from "./debug-panel.tsx";

const W = 400;
const H = 300;

/**
 * 冒烟：仅 `@react-canvas/core-v2` + 本目录原生 DOM 封装（`mountCoreSmokeStage`），不依赖 `@react-canvas/react-v2`。
 * 外层仍用 React 挂页，便于与 App 路由一致；场景与指针语义均为 core API。
 */
export function CoreSmoke() {
  const [rt, setRt] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    createSceneRuntime({ width: W, height: H })
      .then((r) => {
        if (cancelled) return;
        const root = r.getRootId();
        r.insertView(root, "row", { width: W, height: H, flexDirection: "row" });
        r.insertView("row", "col-a", { flex: 1, height: H });
        r.insertView("row", "col-b", { flex: 1, height: H });
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
    if (!rt || !stageRef.current) return;
    return mountCoreSmokeStage(stageRef.current, rt);
  }, [rt]);

  if (error) {
    return <p style={{ color: "crimson" }}>Core 加载失败：{error.message}</p>;
  }
  if (!rt) {
    return <p style={{ color: "#64748b" }}>正在加载 SceneRuntime（core-v2）…</p>;
  }

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <p style={{ margin: "0 0 0.5rem", color: "#444" }}>
          仅 core-v2：原生 DOM 指针层 + 布局调试叠层（见 <code>core-smoke-stage.ts</code>）
        </p>
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: W,
            height: H,
            border: "1px solid #cbd5e1",
            boxSizing: "border-box",
            background: "#f8fafc",
          }}
        />
      </div>
      <PointerDebugPanel runtime={rt} />
    </div>
  );
}
