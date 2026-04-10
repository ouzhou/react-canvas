import { CanvasRuntime, useSceneRuntime, View } from "@react-canvas/react-v2";
import { PointerDebugPanel } from "./debug-panel.tsx";

function PanelFromContext() {
  const rt = useSceneRuntime();
  return <PointerDebugPanel runtime={rt} />;
}

const W = 400;
const H = 300;

function ReactScene() {
  return (
    <View id="row" style={{ width: W, height: H, flexDirection: "row" }}>
      <View id="col-a" style={{ flex: 1, height: H }} />
      <View id="col-b" style={{ flex: 1, height: H }} />
    </View>
  );
}

/** 冒烟：`@react-canvas/react-v2` 的 CanvasRuntime（内置 Skia 画布）+ View。 */
export function ReactSmoke() {
  return (
    <CanvasRuntime width={W} height={H}>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#444" }}>
            react-v2：<code>CanvasRuntime</code> 内嵌 Skia <code>&lt;canvas /&gt;</code> +{" "}
            <code>View</code>
          </p>
          <ReactScene />
        </div>
        <PanelFromContext />
      </div>
    </CanvasRuntime>
  );
}
