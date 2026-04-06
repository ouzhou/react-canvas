import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { Icon } from "@react-canvas/ui";
import camera from "@lucide/icons/icons/camera";
import house from "@lucide/icons/icons/house";

/** 文档页内嵌示例：`<Icon>` + `@lucide/icons` 单文件导入（非 Playground）。 */
export function IconDocDemo() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "min(100%, 40rem)",
      }}
    >
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return <p style={{ color: "#f87171", margin: 0 }}>加载失败：{error.message}</p>;
          }
          if (!isReady) {
            return <p style={{ color: "#94a3b8", margin: 0 }}>正在加载 Yoga + CanvasKit…</p>;
          }
          return (
            <Canvas width={400} height={120}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 28,
                  padding: 16,
                  backgroundColor: "#0f172a",
                }}
              >
                <Icon icon={camera} size={44} color="#e2e8f0" strokeWidth={1.5} />
                <Icon icon={house} size={44} color="#38bdf8" strokeWidth={1.5} />
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}
