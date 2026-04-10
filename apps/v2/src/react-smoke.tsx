import { CanvasRuntime, useSceneRuntime, View } from "@react-canvas/react-v2";
import { PointerDebugPanel } from "./debug-panel.tsx";

function PanelFromContext() {
  const rt = useSceneRuntime();
  return <PointerDebugPanel runtime={rt} />;
}

const W = 400;
const H = 300;

/** 冒烟：`@react-canvas/react-v2` 的 CanvasRuntime + View。 */
export function ReactSmoke() {
  return (
    <CanvasRuntime width={W} height={H}>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#444" }}>
            react-v2：CanvasRuntime + View（底层仍为 core-v2 SceneRuntime）
          </p>
          <div
            style={{
              width: W,
              height: H,
              border: "1px solid #cbd5e1",
              boxSizing: "border-box",
              background: "#f8fafc",
            }}
          >
            <View id="row" style={{ width: W, height: H, flexDirection: "row" }}>
              <View id="col-a" style={{ flex: 1, height: H }} />
              <View id="col-b" style={{ flex: 1, height: H }} />
            </View>
          </div>
        </div>
        <PanelFromContext />
      </div>
    </CanvasRuntime>
  );
}
