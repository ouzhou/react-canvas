import { useMemo, useState } from "react";
import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { Icon } from "@react-canvas/ui";
import star from "@lucide/icons/icons/star";

/**
 * 文档站 Icon 参数试验：通过表单调整 props，画布实时预览。
 * Starlight 不提供内置「编辑源码 + 热更新」组件；此处以控件映射 props，等价于改代码中的字面量。
 */
export function IconPlayground() {
  const [size, setSize] = useState(48);
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [color, setColor] = useState("#fbbf24");
  const [stroke, setStroke] = useState("");
  const [fill, setFill] = useState("");
  const [useStyleSize, setUseStyleSize] = useState(false);

  const iconProps = useMemo(() => {
    const base = {
      icon: star,
      strokeWidth,
      color,
      stroke: stroke.trim() || undefined,
      fill: fill.trim() || undefined,
    };
    if (useStyleSize) {
      return { ...base, style: { width: size, height: size } as const };
    }
    return { ...base, size };
  }, [size, strokeWidth, color, stroke, fill, useStyleSize]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "min(100%, 40rem)",
      }}
    >
      <fieldset
        style={{
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          margin: 0,
        }}
      >
        <legend style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "0 0.35rem" }}>
          Icon 参数
        </legend>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            fontSize: "0.8125rem",
            color: "#cbd5e1",
          }}
        >
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <span style={{ color: "#94a3b8", minWidth: "7rem" }}>边长（size / style）</span>
            <input
              type="range"
              min={24}
              max={72}
              step={1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <code style={{ color: "#e2e8f0" }}>{size}</code>
          </label>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={useStyleSize}
              onChange={(e) => setUseStyleSize(e.target.checked)}
            />
            使用 <code style={{ color: "#e2e8f0" }}>style.width</code> /{" "}
            <code style={{ color: "#e2e8f0" }}>height</code> 代替{" "}
            <code style={{ color: "#e2e8f0" }}>size</code>
          </label>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <span style={{ color: "#94a3b8", minWidth: "7rem" }}>strokeWidth</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.5}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
            />
            <code style={{ color: "#e2e8f0" }}>{strokeWidth}</code>
          </label>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <span style={{ color: "#94a3b8", minWidth: "7rem" }}>color</span>
            <input
              type="color"
              value={color.length === 7 ? color : "#fbbf24"}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: "2rem",
                height: "1.75rem",
                padding: 0,
                border: "1px solid #475569",
                borderRadius: "6px",
              }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#fbbf24"
              style={{
                flex: "1 1 8rem",
                minWidth: "6rem",
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.8125rem",
              }}
            />
          </label>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <span style={{ color: "#94a3b8", minWidth: "7rem" }}>stroke（可选）</span>
            <input
              type="text"
              value={stroke}
              onChange={(e) => setStroke(e.target.value)}
              placeholder="留空则使用 color"
              style={{
                flex: "1 1 8rem",
                minWidth: "6rem",
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.8125rem",
              }}
            />
          </label>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
          >
            <span style={{ color: "#94a3b8", minWidth: "7rem" }}>fill（可选）</span>
            <input
              type="text"
              value={fill}
              onChange={(e) => setFill(e.target.value)}
              placeholder="线框图标可留空"
              style={{
                flex: "1 1 8rem",
                minWidth: "6rem",
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.8125rem",
              }}
            />
          </label>
        </div>
      </fieldset>

      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return <p style={{ color: "#f87171", margin: 0 }}>加载失败：{error.message}</p>;
          }
          if (!isReady) {
            return <p style={{ color: "#94a3b8", margin: 0 }}>正在加载 Yoga + CanvasKit…</p>;
          }
          return (
            <Canvas width={400} height={140}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  backgroundColor: "#0f172a",
                }}
              >
                <Icon {...iconProps} />
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}
