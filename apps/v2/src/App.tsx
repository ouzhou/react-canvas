import type { PointerEventType } from "@react-canvas/react-v2";
import { useReducer, useState } from "react";
import { CanvasRuntime, useSceneRuntime, View } from "@react-canvas/react-v2";

function JsonBlock(props: { title: string; body: string }) {
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

function DemoPanel() {
  const rt = useSceneRuntime();
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

export function App() {
  return (
    <div style={{ padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>react-canvas v2（无绘制）</h1>
      <CanvasRuntime width={400} height={300}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 0.5rem", color: "#444" }}>
              场景 400×300（以下为 Yoga + 命中；无像素绘制）
            </p>
            <div
              style={{
                width: 400,
                height: 300,
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
                background: "#f8fafc",
              }}
            >
              <View id="row" style={{ width: 400, height: 300, flexDirection: "row" }}>
                <View id="col-a" style={{ flex: 1, height: 300 }} />
                <View id="col-b" style={{ flex: 1, height: 300 }} />
              </View>
            </div>
          </div>
          <DemoPanel />
        </div>
      </CanvasRuntime>
    </div>
  );
}
