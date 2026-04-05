import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { Button, CanvasThemeProvider, useCanvasToken } from "@react-canvas/ui";
import type { CanvasThemeConfig, CanvasToken } from "@react-canvas/ui";
import { useState } from "react";

const PRIMARY_PRESETS: { label: string; colorPrimary: string }[] = [
  { label: "默认蓝", colorPrimary: "#1677ff" },
  { label: "青绿", colorPrimary: "#13c2c2" },
  { label: "品牌绿", colorPrimary: "#52c41a" },
  { label: "橙色", colorPrimary: "#fa8c16" },
];

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

/** 紧凑模式画布略矮，与 token 内边距缩小一致。 */
function canvasHeightForDensity(density: CanvasThemeConfig["density"]): number {
  return density === "compact" ? 120 : 150;
}

export function UiPlayground() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"default" | "compact">("default");
  const [primaryHex, setPrimaryHex] = useState(PRIMARY_PRESETS[0].colorPrimary);

  const theme: CanvasThemeConfig = {
    appearance,
    density,
    seed: { colorPrimary: primaryHex },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "min(100%, 40rem)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>
        <code style={{ color: "#e2e8f0" }}>CanvasThemeProvider</code> 支持{" "}
        <code style={{ color: "#e2e8f0" }}>appearance</code>（亮/暗）、{" "}
        <code style={{ color: "#e2e8f0" }}>density</code>（默认/紧凑）、{" "}
        <code style={{ color: "#e2e8f0" }}>seed.colorPrimary</code>。画布内组件须传{" "}
        <code style={{ color: "#e2e8f0" }}>token=</code>。
      </p>

      <fieldset
        style={{
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          margin: 0,
        }}
      >
        <legend style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "0 0.35rem" }}>
          主题
        </legend>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            fontSize: "0.8125rem",
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", minWidth: "4.5rem" }}>外观</span>
            {(
              [
                ["light", "亮色"],
                ["dark", "暗色"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="ui-appearance"
                  checked={appearance === v}
                  onChange={() => setAppearance(v)}
                />
                {label}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", minWidth: "4.5rem" }}>密度</span>
            {(
              [
                ["default", "默认"],
                ["compact", "紧凑"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="ui-density"
                  checked={density === v}
                  onChange={() => setDensity(v)}
                />
                {label}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", minWidth: "4.5rem" }}>主色 seed</span>
            {PRIMARY_PRESETS.map((p) => (
              <button
                key={p.colorPrimary}
                type="button"
                onClick={() => setPrimaryHex(p.colorPrimary)}
                style={{
                  fontSize: "0.75rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: primaryHex === p.colorPrimary ? "1px solid #e2e8f0" : "1px solid #475569",
                  background: p.colorPrimary,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                marginLeft: "0.25rem",
              }}
            >
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                自定义
              </span>
              <input
                type="color"
                value={primaryHex}
                onChange={(e) => setPrimaryHex(e.target.value)}
                title="自定义主题色（seed.colorPrimary）"
                style={{
                  width: "2rem",
                  height: "1.75rem",
                  padding: 0,
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: "transparent",
                }}
              />
              <code style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{primaryHex}</code>
            </label>
          </div>
        </div>
      </fieldset>

      <CanvasThemeProvider theme={theme}>
        <UiPlaygroundInner canvasHeight={canvasHeightForDensity(density)} />
      </CanvasThemeProvider>
    </div>
  );
}

function UiPlaygroundCanvasWithHeight({ token, height }: { token: CanvasToken; height: number }) {
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) return <p>Failed to load runtime: {error.message}</p>;
        if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
        return (
          <Canvas width={420} height={height}>
            <View style={{ flex: 1 }}>
              <UiCanvasContent token={token} />
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

function UiPlaygroundInner({ canvasHeight }: { canvasHeight: number }) {
  const token = useCanvasToken();
  return <UiPlaygroundCanvasWithHeight token={token} height={canvasHeight} />;
}
