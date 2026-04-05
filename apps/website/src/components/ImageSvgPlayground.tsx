import {
  Canvas,
  CanvasProvider,
  Image,
  type ResizeMode,
  SvgPath,
  Text,
  View,
} from "@react-canvas/react";
import { useState, type CSSProperties } from "react";

const SAMPLE_IMAGE = "https://picsum.photos/seed/react-canvas-media/400/240";

/** Simple house outline (single path), viewBox 0 0 24 24 */
const SAMPLE_PATH_D = "M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z";

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

const resizeModes: ResizeMode[] = ["cover", "contain", "stretch", "center"];

function objectFitForResizeMode(m: ResizeMode): string {
  switch (m) {
    case "cover":
      return "cover";
    case "contain":
      return "contain";
    case "stretch":
      return "fill";
    case "center":
      return "none";
    default:
      return "cover";
  }
}

function ImageSvgPlaygroundDemo() {
  const [canvasW, setCanvasW] = useState(300);
  const [canvasH, setCanvasH] = useState(400);
  const [imgW, setImgW] = useState(200);
  const [imgH, setImgH] = useState(120);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("cover");
  const [iconSize, setIconSize] = useState(40);
  const [imageStatus, setImageStatus] = useState<string>("未加载");

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
        测试 <code style={{ color: "#e2e8f0" }}>Image</code>（远程{" "}
        <code style={{ color: "#e2e8f0" }}>uri</code> 解码）与{" "}
        <code style={{ color: "#e2e8f0" }}>SvgPath</code>（
        <code style={{ color: "#e2e8f0" }}>d</code> + viewBox）。上方为 Canvas 宿主，下方为 HTML{" "}
        <code style={{ color: "#e2e8f0" }}>img</code> /{" "}
        <code style={{ color: "#e2e8f0" }}>svg</code> 对照。
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
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>参数</span>
        <RangeRow label="Canvas 宽" value={canvasW} min={320} max={640} onChange={setCanvasW} />
        <RangeRow label="Canvas 高" value={canvasH} min={160} max={480} onChange={setCanvasH} />
        <RangeRow label="图片区域宽" value={imgW} min={80} max={320} onChange={setImgW} />
        <RangeRow label="图片区域高" value={imgH} min={60} max={220} onChange={setImgH} />
        <RangeRow label="图标 size" value={iconSize} min={16} max={72} onChange={setIconSize} />
        <label
          style={{
            display: "grid",
            gridTemplateColumns: "9rem 1fr",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            color: "#e2e8f0",
          }}
        >
          <span style={{ color: "#94a3b8" }}>resizeMode</span>
          <select
            value={resizeMode}
            onChange={(e) => setResizeMode(e.target.value as ResizeMode)}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: 6,
              border: "1px solid #475569",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              fontSize: "0.8125rem",
            }}
          >
            {resizeModes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          alignItems: "stretch",
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
            Canvas · Image + SvgPath
          </h3>
          <Canvas width={canvasW} height={canvasH}>
            <View
              style={{
                flex: 1,
                flexDirection: "column",
                backgroundColor: "#0f172a",
                padding: 16,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {`Image: ${imageStatus}`}
              </Text>
              <Image
                source={{ uri: SAMPLE_IMAGE }}
                resizeMode={resizeMode}
                style={{ width: imgW, height: imgH, backgroundColor: "#1e293b" }}
                onLoad={() => setImageStatus("已加载")}
                onError={(e) => setImageStatus(`错误: ${String(e)}`)}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <SvgPath
                  d={SAMPLE_PATH_D}
                  size={iconSize}
                  viewBox="0 0 24 24"
                  stroke="#38bdf8"
                  fill="none"
                  strokeWidth={2}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#cbd5e1",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  SvgPath（stroke）
                </Text>
              </View>
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
            原生 HTML · img + svg
          </h3>
          <div
            style={{
              width: canvasW,
              height: canvasH,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#0f172a",
              padding: 16,
              gap: 12,
              borderRadius: 4,
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#94a3b8",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              对照列（object-fit 近似 resizeMode）
            </div>
            <img
              src={SAMPLE_IMAGE}
              alt=""
              width={imgW}
              height={imgH}
              style={{
                width: imgW,
                height: imgH,
                backgroundColor: "#1e293b",
                objectFit: objectFitForResizeMode(resizeMode) as CSSProperties["objectFit"],
                objectPosition: resizeMode === "center" ? "center" : undefined,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path d={SAMPLE_PATH_D} stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  color: "#cbd5e1",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                svg path
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ImageSvgPlayground() {
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) return <p>Failed to load runtime: {error.message}</p>;
        if (!isReady) return <p>Loading Yoga + CanvasKit + fonts…</p>;
        return <ImageSvgPlaygroundDemo />;
      }}
    </CanvasProvider>
  );
}
