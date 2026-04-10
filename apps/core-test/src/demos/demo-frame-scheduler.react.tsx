import type { Plugin, Stage, ViewNode, ViewStyle } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useEffect, useRef, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function FrameSchedulerApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const stageRef = useRef<Stage | null>(null);
  const boxRef = useRef<ViewNode | null>(null);
  const prevStyleRef = useRef<ViewStyle>({
    width: 140,
    height: 72,
    backgroundColor: "#334155",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  });

  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    if (!stage) return;

    let layoutFrames = 0;
    let paintOnlyFrames = 0;
    let untapAfterPaint: (() => void) | undefined;

    const counterPlugin: Plugin = {
      name: "core-test-frame-scheduler-counter",
      attach(ctx) {
        untapAfterPaint = ctx.onAfterPaint.tap((e) => {
          if (e.didLayout) layoutFrames++;
          else paintOnlyFrames++;
          onStatusRef.current(
            `afterPaint：含 Yoga 布局 ${layoutFrames} 次 · 仅重绘 ${paintOnlyFrames} 次（didLayout=${String(e.didLayout)}）`,
          );
        });
      },
      detach() {
        untapAfterPaint?.();
      },
    };

    stage.use(counterPlugin);
    onStatusRef.current("§10 帧调度器 — 点击按钮，观察 onAfterPaint 中 didLayout 与计数。");
    stage.requestLayoutPaint();

    return () => {
      untapAfterPaint?.();
      stage.removePlugin("core-test-frame-scheduler-counter");
    };
  }, [stage]);

  const onLayoutClick = (): void => {
    const st = stageRef.current;
    const box = boxRef.current;
    if (!st || !box) return;
    const prev = prevStyleRef.current;
    const w = prev.width === 140 ? 220 : 140;
    const next: ViewStyle = { ...prev, width: w };
    box.updateStyle(prev, next);
    prevStyleRef.current = next;
    st.requestLayoutPaint();
  };

  const onPaintOnlyClick = (): void => {
    const st = stageRef.current;
    const box = boxRef.current;
    if (!st || !box) return;
    const prev = prevStyleRef.current;
    const bg = prev.backgroundColor === "#334155" ? "#0d9488" : "#334155";
    const next: ViewStyle = { ...prev, backgroundColor: bg };
    box.updateStyle(prev, next);
    prevStyleRef.current = next;
    st.requestPaintOnly();
  };

  return (
    <div>
      <div className="camera-tools" style={{ marginBottom: 8 }}>
        <button type="button" onClick={onLayoutClick}>
          切换宽度（走 layout + 绘制）
        </button>
        <button type="button" onClick={onPaintOnlyClick}>
          切换背景色（仅 requestPaintOnly）
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
              width={360}
              height={140}
              onStageReady={(s) => {
                stageRef.current = s;
                setStage(s);
              }}
            >
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
                <View viewNodeRef={boxRef} style={prevStyleRef.current}>
                  <Text style={{ fontSize: 12, color: "#e2e8f0" }}>帧调度</Text>
                </View>
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}

export function mountFrameSchedulerDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <FrameSchedulerApp onStatus={onStatus} />));
}
