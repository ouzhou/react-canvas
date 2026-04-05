import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { Button, CanvasThemeProvider, useCanvasToken } from "@react-canvas/ui";
import type { CanvasToken } from "@react-canvas/ui";
import { useState } from "react";

/**
 * `<Canvas>` 使用独立 reconciler 根，**不会**继承外层 `CanvasThemeProvider` 的 React Context，
 * 须在 DOM 侧取 `token` 并传入画布内组件（如 `Button token={...}`）。
 */
function UiCanvasContent({ token }: { token: CanvasToken }) {
  const [clicks, setClicks] = useState(0);
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 16,
        backgroundColor: token.colorBgLayout,
      }}
    >
      <Button token={token} variant="primary" size="md" onClick={() => setClicks((c) => c + 1)}>
        <Text style={{ fontSize: token.fontSizeMD, fontWeight: "600", color: "#ffffff" }}>
          Primary ({clicks})
        </Text>
      </Button>
      <Button token={token} variant="ghost" size="sm">
        <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>Ghost</Text>
      </Button>
    </View>
  );
}

/** 在 `CanvasThemeProvider` 下取 token，再渲染 `<Canvas>`（画布与 DOM 非同一条 React 树）。 */
function UiPlaygroundCanvas() {
  const token = useCanvasToken();
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) return <p>Failed to load runtime: {error.message}</p>;
        if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
        return (
          <Canvas width={400} height={140}>
            <View style={{ flex: 1 }}>
              <UiCanvasContent token={token} />
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function UiPlayground() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
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
        <code style={{ color: "#e2e8f0" }}>@react-canvas/ui</code>：{" "}
        <code style={{ color: "#e2e8f0" }}>CanvasThemeProvider</code>、token 与{" "}
        <code style={{ color: "#e2e8f0" }}>Button</code>（画布内需传{" "}
        <code style={{ color: "#e2e8f0" }}>token=</code>）。内部为{" "}
        <code style={{ color: "#e2e8f0" }}>View</code>+{" "}
        <code style={{ color: "#e2e8f0" }}>Text</code>。
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: "0.8125rem",
          color: "#94a3b8",
        }}
      >
        <span>外观：</span>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
          <input
            type="radio"
            name="ui-appearance"
            checked={appearance === "light"}
            onChange={() => setAppearance("light")}
          />
          Light
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
          <input
            type="radio"
            name="ui-appearance"
            checked={appearance === "dark"}
            onChange={() => setAppearance("dark")}
          />
          Dark
        </label>
      </div>
      <CanvasThemeProvider theme={{ appearance }}>
        <UiPlaygroundCanvas />
      </CanvasThemeProvider>
    </div>
  );
}
