import type { Stage, ViewNode, ViewportCamera } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function StageApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const [camera, setCamera] = useState<ViewportCamera>({
    translateX: 0,
    translateY: 0,
    scale: 1,
  });
  const stageRef = useRef<Stage | null>(null);
  const cell0Ref = useRef<ViewNode | null>(null);

  const syncStatus = useCallback((): void => {
    const st = stageRef.current;
    if (!st) return;
    onStatus(
      `camera scale=${camera.scale.toFixed(2)} tx=${camera.translateX.toFixed(0)} ty=${camera.translateY.toFixed(0)} · stage ${st.width}×${st.height}`,
    );
  }, [camera, onStatus]);

  useEffect(() => {
    syncStatus();
  }, [camera, syncStatus]);

  const onTool = useCallback(
    (a: string): void => {
      if (a === "zoom-in") {
        setCamera((c) => ({ ...c, scale: Math.min(3, c.scale * 1.15) }));
      } else if (a === "zoom-out") {
        setCamera((c) => ({ ...c, scale: Math.max(0.4, c.scale / 1.15) }));
      } else if (a === "left") {
        setCamera((c) => ({ ...c, translateX: c.translateX - 24 }));
      } else if (a === "right") {
        setCamera((c) => ({ ...c, translateX: c.translateX + 24 }));
      } else if (a === "reset") {
        setCamera({ translateX: 0, translateY: 0, scale: 1 });
      } else if (a === "world") {
        const st = stageRef.current;
        const n = cell0Ref.current;
        if (st && n) {
          const r = st.getNodeWorldRect(n);
          onStatus(
            `getNodeWorldRect(格1)：x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`,
          );
        }
        st?.requestLayoutPaint(undefined, camera);
        return;
      }
    },
    [camera, onStatus],
  );

  return (
    <div>
      <div className="camera-tools">
        <button type="button" data-a="zoom-in" onClick={() => onTool("zoom-in")}>
          放大
        </button>
        <button type="button" data-a="zoom-out" onClick={() => onTool("zoom-out")}>
          缩小
        </button>
        <button type="button" data-a="left" onClick={() => onTool("left")}>
          左移
        </button>
        <button type="button" data-a="right" onClick={() => onTool("right")}>
          右移
        </button>
        <button type="button" data-a="reset" onClick={() => onTool("reset")}>
          重置相机
        </button>
        <button type="button" data-a="world" onClick={() => onTool("world")}>
          worldRect
        </button>
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
            <Canvas
              width={400}
              height={240}
              camera={camera}
              onStageReady={(stage) => {
                stageRef.current = stage;
                syncStatus();
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  padding: 12,
                  backgroundColor: "#422006",
                }}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <View
                      key={i}
                      {...(i === 0 ? { viewNodeRef: cell0Ref } : {})}
                      style={{
                        width: 72,
                        height: 56,
                        backgroundColor: i % 2 === 0 ? "#ca8a04" : "#a16207",
                        borderRadius: 8,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: "#fde68a", marginTop: 6 }}>
                  §3 Stage：相机矩阵与命中一致；「worldRect」取左上角格子的 getNodeWorldRect
                </Text>
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}

export function mountStageDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <StageApp onStatus={onStatus} />));
}
