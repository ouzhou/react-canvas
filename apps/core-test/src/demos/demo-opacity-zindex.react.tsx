import type { CanvasSyntheticPointerEvent } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function RenderPipelineApp({ appendLog }: { appendLog: (msg: string) => void }) {
  const [zA, setZA] = useState(1);
  const [zB, setZB] = useState(2);

  const log = (msg: string) => (): void => {
    appendLog(`${msg} · z(红,蓝)=${zA},${zB}`);
  };

  return (
    <div>
      <div className="camera-tools" style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 12, fontSize: 12, color: "#d4d4d8" }}>
          红 zIndex
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={zA}
            onChange={(e) => setZA(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
          {zA}
        </label>
        <label style={{ fontSize: 12, color: "#d4d4d8" }}>
          蓝 zIndex
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={zB}
            onChange={(e) => setZB(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
          {zB}
        </label>
      </div>

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
                  backgroundColor: "#18181b",
                  position: "relative",
                  flexDirection: "column",
                  padding: 10,
                  gap: 8,
                }}
                onClick={log("click ④ 冒泡·root")}
              >
                <Text style={{ fontSize: 11, color: "#a1a1aa" }}>
                  §7 渲染管线 — 滑块改 zIndex；点击重叠区观察日志（React 版）
                </Text>

                <View
                  style={{
                    flex: 1,
                    minHeight: 0,
                    position: "relative",
                  }}
                  onClick={log("click ③ 冒泡·重叠区父 stage")}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: 40,
                      top: 40,
                      width: 160,
                      height: 120,
                      backgroundColor: "#ef4444",
                      borderRadius: 12,
                      zIndex: zA,
                      opacity: 0.85,
                    }}
                    onClick={log("click ② target·红 View")}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 100,
                      top: 70,
                      width: 160,
                      height: 120,
                      backgroundColor: "#3b82f6",
                      borderRadius: 12,
                      zIndex: zB,
                    }}
                    onClick={log("click ② 冒泡·蓝 View")}
                  >
                    <Text
                      style={{ fontSize: 12, color: "#f8fafc", margin: 8 }}
                      onClick={(e: CanvasSyntheticPointerEvent) => {
                        e.stopPropagation();
                        appendLog(`click ① target·蓝内文字 · z(红,蓝)=${zA},${zB}`);
                      }}
                    >
                      蓝 zIndex={zB} 叠在红上；点文字或色块可看冒泡；红 opacity=0.85
                    </Text>
                  </View>
                </View>
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}

export function mountRenderPipelineDemoReact(
  container: HTMLElement,
  appendLog: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <RenderPipelineApp appendLog={appendLog} />));
}
