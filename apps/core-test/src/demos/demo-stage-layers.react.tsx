import type { CanvasSyntheticPointerEvent } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useCallback, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

/**
 * React 版用单 defaultLayer + 高 zIndex 模拟 modal（与 TS 版多 Layer API 不同，便于对照 UI 行为）。
 */
function LayersApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback((): void => {
    setOpen(true);
    onStatus("modal（React 模拟）：顶层遮罩 + 面板；打开时底层按钮不可点");
  }, [onStatus]);

  const closeModal = useCallback((): void => {
    setOpen(false);
    onStatus("关闭 modal · 事件回到主内容");
  }, [onStatus]);

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
          <Canvas width={400} height={280}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 16,
                gap: 12,
                flexDirection: "column",
                backgroundColor: "#ecfdf5",
                position: "relative",
              }}
            >
              <Text style={{ fontSize: 11, color: "#166534" }}>
                §4 defaultLayer — 主界面；React 版用 zIndex 叠放模拟弹窗（非 modalLayer API）
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  padding: 10,
                  paddingLeft: 16,
                  paddingRight: 16,
                  backgroundColor: "#059669",
                  borderRadius: 10,
                  cursor: "pointer",
                  zIndex: open ? 0 : 2,
                }}
                onClick={() => {
                  if (!open) openModal();
                }}
              >
                <Text style={{ fontSize: 14, color: "#ffffff" }}>打开弹窗（模拟）</Text>
              </View>

              <View
                style={{
                  alignSelf: "flex-start",
                  padding: 10,
                  backgroundColor: "#86efac",
                  borderRadius: 8,
                  cursor: "pointer",
                  zIndex: open ? 0 : 2,
                }}
                onClick={() => {
                  if (!open) onStatus("底层仍收到点击（异常）");
                }}
              >
                <Text style={{ fontSize: 12, color: "#14532d" }}>探测：弹窗打开时点我应无反应</Text>
              </View>

              <View
                style={{
                  margin: 10,
                  padding: 8,
                  alignSelf: "center",
                  backgroundColor: "#fef08a",
                  borderRadius: 8,
                  zIndex: 5,
                }}
              >
                <Text style={{ fontSize: 12, color: "#713f12" }}>
                  §4 overlay 心智（示意条，zIndex=5）
                </Text>
              </View>

              {open ? (
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(15,23,42,0.72)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 100,
                  }}
                  onClick={() => {
                    closeModal();
                  }}
                >
                  <View
                    style={{
                      padding: 20,
                      backgroundColor: "#f8fafc",
                      borderRadius: 14,
                      minWidth: 220,
                      maxWidth: 280,
                      gap: 12,
                    }}
                    onClick={(e: CanvasSyntheticPointerEvent) => {
                      e.stopPropagation();
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a" }}>
                      Modal（zIndex 模拟）
                    </Text>
                    <Text style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                      遮罩点击关闭；面板内点击不穿透（stopPropagation）。
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                      <View
                        style={{
                          padding: 8,
                          paddingLeft: 14,
                          paddingRight: 14,
                          backgroundColor: "#2563eb",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                        onClick={(e: CanvasSyntheticPointerEvent) => {
                          e.stopPropagation();
                          closeModal();
                        }}
                      >
                        <Text style={{ fontSize: 13, color: "#ffffff" }}>关闭</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountStageLayersDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <LayersApp onStatus={onStatus} />));
}
