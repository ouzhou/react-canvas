import type { CanvasSyntheticPointerEvent } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function EventsApp({ appendLog }: { appendLog: (msg: string) => void }) {
  const bubbleLog =
    (msg: string) =>
    (_e: CanvasSyntheticPointerEvent): void => {
      appendLog(msg);
    };

  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) {
          return (
            <div role="alert" className="impl-react-error">
              {String(error.message)}
            </div>
          );
        }
        if (!isReady) {
          return (
            <div aria-busy="true" className="impl-react-loading">
              Loading…
            </div>
          );
        }
        return (
          <Canvas width={400} height={260}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 14,
                gap: 10,
                flexDirection: "column",
                backgroundColor: "#0c4a6e",
              }}
              onClick={bubbleLog("click ④ 冒泡·root")}
            >
              <Text style={{ fontSize: 11, color: "#bae6fd" }}>
                §8 事件系统 — 下方日志追加打印，可观察冒泡顺序（内层先于外层）
              </Text>

              <View style={{ flexDirection: "row", gap: 10, flex: 1, minHeight: 0 }}>
                <View
                  style={{
                    flex: 1,
                    minHeight: 64,
                    backgroundColor: "#0369a1",
                    borderRadius: 10,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    appendLog("独立按钮：A");
                  }}
                >
                  <Text style={{ fontSize: 15, color: "#f8fafc", textAlign: "center" }}>A</Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minHeight: 64,
                    backgroundColor: "#0d9488",
                    borderRadius: 10,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={() => {
                    appendLog("独立按钮：B");
                  }}
                >
                  <Text style={{ fontSize: 15, color: "#f8fafc", textAlign: "center" }}>B</Text>
                </View>
              </View>

              <View
                style={{
                  padding: 14,
                  backgroundColor: "#155e75",
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 100,
                }}
                onClick={bubbleLog("冒泡：外层 onClick（若先点内层，会先内后外）")}
              >
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "#0e7490",
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onClick={bubbleLog("冒泡：内层 onClick")}
                >
                  <Text style={{ fontSize: 13, color: "#ecfeff" }}>点我（内层）</Text>
                </View>
              </View>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountEventsDemoReact(
  container: HTMLElement,
  appendLog: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <EventsApp appendLog={appendLog} />));
}
