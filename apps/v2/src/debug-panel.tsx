import type { PointerEventType, SceneRuntime } from "@react-canvas/core-v2";
import { useReducer, useState } from "react";

export function JsonBlock(props: { title: string; body: string }) {
  return (
    <details open>
      <summary>{props.title}</summary>
      <pre
        style={{
          maxHeight: 240,
          overflow: "auto",
          fontSize: 12,
          margin: "0.5rem 0",
          padding: "0.5rem",
          background: "#111",
          color: "#e2e8f0",
        }}
      >
        {props.body}
      </pre>
    </details>
  );
}

/** 仅依赖 `SceneRuntime`，供 Core 冒烟与 React 冒烟复用。 */
export function PointerDebugPanel(props: { runtime: SceneRuntime }) {
  const { runtime: rt } = props;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  const dispatchAt = (type: PointerEventType) => {
    rt.dispatchPointerLike({ type, x, y });
    bump();
  };

  const scene = JSON.stringify(rt.getSceneGraphSnapshot(), null, 2);
  const layout = JSON.stringify(rt.getLayoutSnapshot(), null, 2);
  const trace = JSON.stringify(rt.getLastDispatchTrace(), null, 2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: 480,
        minWidth: 280,
      }}
    >
      <section>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>程序化坐标</h2>
        <label>
          x{" "}
          <input
            type="number"
            value={x}
            onChange={(e) => setX(Number.parseFloat(e.target.value) || 0)}
            step={1}
          />
        </label>{" "}
        <label>
          y{" "}
          <input
            type="number"
            value={y}
            onChange={(e) => setY(Number.parseFloat(e.target.value) || 0)}
            step={1}
          />
        </label>
        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" onClick={() => dispatchAt("pointerdown")}>
            pointerdown
          </button>
          <button type="button" onClick={() => dispatchAt("pointerup")}>
            pointerup
          </button>
          <button type="button" onClick={() => dispatchAt("click")}>
            click
          </button>
        </div>
      </section>

      <JsonBlock title="场景图 (getSceneGraphSnapshot)" body={scene} />
      <JsonBlock title="布局 (getLayoutSnapshot)" body={layout} />
      <JsonBlock title="最近派发 (getLastDispatchTrace)" body={trace} />
    </div>
  );
}
