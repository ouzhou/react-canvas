import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useEffect, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

/** React 版用 rAF + state 更新 opacity，与 TS 版 Ticker 路径不同，但可视化一致。 */
function AnimationApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const start = performance.now();
    let id = 0;
    const tick = (now: number): void => {
      const t = (now - start) / 1000;
      const o = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
      setOpacity(o);
      onStatus(`opacity = ${o.toFixed(2)}`);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
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
          <Canvas width={360} height={160}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 16,
                backgroundColor: "#0c0a09",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 200,
                  height: 72,
                  backgroundColor: "#10b981",
                  borderRadius: 12,
                  opacity,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, color: "#ecfdf5" }}>
                  §9 动画 — rAF 驱动 opacity（React 版）
                </Text>
              </View>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountAnimationDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <AnimationApp onStatus={onStatus} />));
}
