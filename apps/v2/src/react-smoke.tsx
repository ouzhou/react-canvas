import { Canvas, CanvasProvider, View } from "@react-canvas/react-v2";

const W = 800;
const H = 600;

/**
 * 三行 flex：顶 3 格、中 2 格、底 4 格；每个 {@link View} 使用独立 `backgroundColor`。
 * `Canvas` 内仅 `View`（无 DOM 节点）。
 */
function FlexDemoScene() {
  return (
    <View
      id="flex-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#eef2f6",
        padding: 12,
      }}
    >
      <View id="row-top" style={{ flex: 1, flexDirection: "row" }}>
        <View id="t1" style={{ flex: 1, backgroundColor: "#f97316" }} />
        <View id="t2" style={{ flex: 1, backgroundColor: "#fb923c" }} />
        <View id="t3" style={{ flex: 1, backgroundColor: "#fdba74" }} />
      </View>
      <View id="row-mid" style={{ flex: 1, flexDirection: "row" }}>
        <View id="m1" style={{ flex: 1, backgroundColor: "#22c55e" }} />
        <View id="m2" style={{ flex: 1, backgroundColor: "#4ade80" }} />
      </View>
      <View id="row-bot" style={{ flex: 1, flexDirection: "row" }}>
        <View id="b1" style={{ flex: 1, backgroundColor: "#3b82f6" }} />
        <View id="b2" style={{ flex: 1, backgroundColor: "#60a5fa" }} />
        <View id="b3" style={{ flex: 1, backgroundColor: "#93c5fd" }} />
        <View id="b4" style={{ flex: 1, backgroundColor: "#bfdbfe" }} />
      </View>
    </View>
  );
}

/** 冒烟：`CanvasProvider` → `Canvas` + `View`，与文档示例一致。 */
export function ReactSmoke() {
  return (
    <div>
      <p style={{ margin: "0 0 0.75rem", color: "#444" }}>
        react-v2：<code>CanvasProvider</code> + <code>Canvas</code> + <code>View</code>（画布内无
        DOM）
      </p>
      <CanvasProvider>
        {({ isReady }) =>
          isReady && (
            <Canvas width={W} height={H}>
              <FlexDemoScene />
            </Canvas>
          )
        }
      </CanvasProvider>
    </div>
  );
}
