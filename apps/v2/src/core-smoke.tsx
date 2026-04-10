import { createSceneRuntime, type SceneRuntime } from "@react-canvas/core-v2";
import { DebugDomLayer } from "@react-canvas/react-v2";
import { useEffect, useState } from "react";
import { PointerDebugPanel } from "./debug-panel.tsx";

const W = 400;
const H = 300;

/** 冒烟：仅 `@react-canvas/core-v2`，不经 `react-v2` 组件。 */
export function CoreSmoke() {
  const [rt, setRt] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);

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
          仅 core-v2 API（insertView / dispatchPointerLike）；彩色框为 DebugDomLayer（订阅布局提交）
        </p>
        <div
          style={{
            position: "relative",
            width: W,
            height: H,
            border: "1px solid #cbd5e1",
            boxSizing: "border-box",
            background: "#f8fafc",
          }}
        >
          <DebugDomLayer runtime={rt} />
        </div>
      </div>
      <PointerDebugPanel runtime={rt} />
    </div>
  );
}
