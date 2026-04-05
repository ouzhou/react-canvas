import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useState } from "react";

function RangeRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, onChange } = props;
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "9rem 1fr 3rem",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.8125rem",
        color: "#e2e8f0",
      }}
    >
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </label>
  );
}

function TextPlaygroundDemo() {
  const [canvasW, setCanvasW] = useState(420);
  const [canvasH, setCanvasH] = useState(220);
  const [titleSize, setTitleSize] = useState(22);
  const [bodySize, setBodySize] = useState(15);
  const [padding, setPadding] = useState(16);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "min(100%, 56rem)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>
        默认在 <code style={{ color: "#e2e8f0" }}>initCanvasRuntime</code> 中加载内置段落字体（与
        Yoga / CanvasKit 并行），业务代码一般<strong>无需</strong>再写{" "}
        <code style={{ color: "#e2e8f0" }}>fetch</code>。 需要离线或自定义字库时，可{" "}
        <code style={{ color: "#e2e8f0" }}>setParagraphFontForTests</code> 或 传入{" "}
        <code style={{ color: "#e2e8f0" }}>runtimeOptions.defaultParagraphFontUrl</code>。
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
        }}
      >
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
          属性（拖动同时更新下方两列：Canvas 与 DOM）
        </span>
        <RangeRow label="Canvas 宽" value={canvasW} min={280} max={560} onChange={setCanvasW} />
        <RangeRow label="Canvas 高" value={canvasH} min={160} max={400} onChange={setCanvasH} />
        <RangeRow label="内边距" value={padding} min={8} max={40} onChange={setPadding} />
        <RangeRow label="标题字号" value={titleSize} min={14} max={36} onChange={setTitleSize} />
        <RangeRow label="正文字号" value={bodySize} min={12} max={24} onChange={setBodySize} />
      </div>

      <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
        左列：<code style={{ color: "#94a3b8" }}>View</code> /{" "}
        <code style={{ color: "#94a3b8" }}>Text</code>（Yoga + Skia Paragraph）。右列：普通{" "}
        <code style={{ color: "#94a3b8" }}>div</code> /{" "}
        <code style={{ color: "#94a3b8" }}>span</code>，样式与尺寸与左列对齐，便于对照。
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <section>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#94a3b8",
              margin: "0 0 0.5rem",
              letterSpacing: "0.02em",
            }}
          >
            Canvas · View + Text
          </h3>
          <Canvas width={canvasW} height={canvasH}>
            <View
              style={{
                flex: 1,
                flexDirection: "column",
                backgroundColor: "#0f172a",
                padding,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: titleSize,
                  color: "#f8fafc",
                  fontWeight: "600",
                  lineHeight: 1.25,
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                React Canvas · Text
              </Text>
              <Text
                style={{
                  fontSize: bodySize,
                  color: "#cbd5e1",
                  lineHeight: 1.45,
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                外层样式为正文色。嵌套
                <Text style={{ color: "#38bdf8", fontWeight: "600" }}>蓝色强调</Text>与
                <Text style={{ color: "#a78bfa" }}>紫色辅助</Text>
                会合并为同一段落中的多段样式。
              </Text>
            </View>
          </Canvas>
        </section>

        <section>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#94a3b8",
              margin: "0 0 0.5rem",
              letterSpacing: "0.02em",
            }}
          >
            原生 HTML · div + span
          </h3>
          <div
            style={{
              width: canvasW,
              height: canvasH,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#0f172a",
              padding,
              gap: 10,
              borderRadius: 4,
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                fontSize: titleSize,
                color: "#f8fafc",
                fontWeight: 600,
                lineHeight: 1.25,
                fontFamily: '"Noto Sans SC", ui-sans-serif, system-ui, sans-serif',
              }}
            >
              React Canvas · Text
            </div>
            <div
              style={{
                fontSize: bodySize,
                color: "#cbd5e1",
                lineHeight: 1.45,
                fontFamily: '"Noto Sans SC", ui-sans-serif, system-ui, sans-serif',
              }}
            >
              外层样式为正文色。嵌套
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>蓝色强调</span>与
              <span style={{ color: "#a78bfa" }}>紫色辅助</span>
              会合并为同一段落中的多段样式。
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function TextPlayground() {
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) return <p>Failed to load runtime: {error.message}</p>;
        if (!isReady) return <p>Loading Yoga + CanvasKit + fonts…</p>;
        return <TextPlaygroundDemo />;
      }}
    </CanvasProvider>
  );
}
