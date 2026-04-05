import { Canvas, CanvasProvider, Text, View, type ViewProps } from "@react-canvas/react";
import { useState } from "react";

type ViewStyle = NonNullable<ViewProps["style"]>;

type ButtonProps = {
  label: string;
  variant?: "primary" | "outline";
  style?: ViewStyle;
  onClick?: ViewProps["onClick"];
};

/** 外层 View + 内层 Text；hover 用 `onPointerEnter` / `onPointerLeave` 驱动背景色。 */
function Button(props: ButtonProps) {
  const { label, variant = "primary", style, onClick } = props;
  const [hovered, setHovered] = useState(false);

  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: variant === "outline" ? 1 : 0,
    borderColor: variant === "outline" ? "#64748b" : undefined,
    backgroundColor:
      variant === "primary"
        ? hovered
          ? "#3b82f6"
          : "#2563eb"
        : hovered
          ? "rgba(148, 163, 184, 0.22)"
          : "transparent",
  };
  const textColor = variant === "primary" ? "#f8fafc" : "#e2e8f0";
  return (
    <View
      style={{ ...base, ...style }}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: textColor }}>{label}</Text>
    </View>
  );
}

export function ButtonPlayground() {
  const [clicks, setClicks] = useState(0);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "min(100%, 36rem)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>
        用 <code style={{ color: "#e2e8f0" }}>&lt;View onClick&gt;</code>、
        <code style={{ color: "#e2e8f0" }}>onPointerEnter</code> /{" "}
        <code style={{ color: "#e2e8f0" }}>onPointerLeave</code>（鼠标/触控笔悬停）与{" "}
        <code style={{ color: "#e2e8f0" }}>&lt;Text&gt;</code> 组合即可做按钮；Primary 点击次数由{" "}
        <code style={{ color: "#e2e8f0" }}>onClick</code> 累加。
      </p>
      <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>
        画布点击次数：<strong style={{ color: "#e2e8f0" }}>{clicks}</strong>
      </p>
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) return <p>Failed to load runtime: {error.message}</p>;
          if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
          return (
            <Canvas width={360} height={120}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: 16,
                  backgroundColor: "#0f172a",
                }}
              >
                <Button label="Primary" onClick={() => setClicks((c) => c + 1)} />
                <Button label="Outline" variant="outline" />
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}
