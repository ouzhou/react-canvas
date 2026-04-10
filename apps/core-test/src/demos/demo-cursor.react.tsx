import type { CanvasSyntheticPointerEvent, Stage, ViewNode } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useEffect, useRef } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function CursorDemoApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const stageRef = useRef<Stage | null>(null);
  const grabRef = useRef<ViewNode | null>(null);
  const releasePluginCursorRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      releasePluginCursorRef.current?.();
      releasePluginCursorRef.current = null;
    };
  }, []);

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
          <Canvas width={360} height={240} onStageReady={(st) => (stageRef.current = st)}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 14,
                gap: 10,
                flexDirection: "column",
                backgroundColor: "#0c4a6e",
              }}
            >
              <Text style={{ fontSize: 11, color: "#bae6fd" }}>
                §15 光标管理 — CursorManager，node 与 plugin 优先级（React 版）
              </Text>

              <View
                style={{
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: "#082f49",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Text style={{ fontSize: 14, color: "#e0f2fe", textAlign: "center" }}>
                  区域一（cursor: pointer）
                </Text>
              </View>

              <View
                style={{
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: "#082f49",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "text",
                }}
              >
                <Text style={{ fontSize: 14, color: "#e0f2fe", textAlign: "center" }}>
                  区域二（cursor: text）
                </Text>
              </View>

              <View
                viewNodeRef={grabRef}
                style={{
                  height: 64,
                  borderRadius: 8,
                  backgroundColor: "#155e75",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "grab",
                }}
                onPointerDown={(e: CanvasSyntheticPointerEvent) => {
                  const st = stageRef.current;
                  const grab = grabRef.current;
                  if (!st || !grab) return;
                  st.setPointerCapture(grab, e.pointerId);
                  releasePluginCursorRef.current?.();
                  releasePluginCursorRef.current = st.cursorManager.set("grabbing", "plugin");
                  onStatusRef.current("cursor：plugin 覆盖为 grabbing");
                  st.requestPaintOnly(st.defaultLayer.root);
                }}
                onPointerUp={(e: CanvasSyntheticPointerEvent) => {
                  const st = stageRef.current;
                  const grab = grabRef.current;
                  if (!st || !grab) return;
                  st.releasePointerCapture(grab, e.pointerId);
                  releasePluginCursorRef.current?.();
                  releasePluginCursorRef.current = null;
                  onStatusRef.current("cursor：已释放 plugin，回退到 node 解析");
                  st.requestPaintOnly(st.defaultLayer.root);
                }}
              >
                <Text style={{ fontSize: 14, color: "#ecfeff", textAlign: "center" }}>
                  按下：plugin 光标 grabbing；抬起：释放
                </Text>
              </View>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountCursorDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <CursorDemoApp onStatus={onStatus} />));
}
