import type { InteractionState, Stage, ViewStyle } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import type { MutableRefObject } from "react";
import { useRef, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function panelStyle(s: InteractionState): ViewStyle {
  const borderColor = s.focused ? "#fbbf24" : s.hovered ? "#38bdf8" : "#475569";
  const backgroundColor = s.pressed ? "#1e3a5f" : s.hovered ? "#0f172a" : "#1e293b";
  return {
    flex: 1,
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 3,
    borderColor,
    backgroundColor,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  };
}

function FocusPanel({
  label,
  stageRef,
  onLine,
}: {
  label: string;
  stageRef: MutableRefObject<Stage | null>;
  onLine: (msg: string) => void;
}) {
  const [s, setS] = useState<InteractionState>({
    hovered: false,
    pressed: false,
    focused: false,
  });

  return (
    <View
      style={{ cursor: "pointer", ...panelStyle(s) }}
      onInteractionStateChange={(next) => {
        setS(next);
        onLine(
          `「${label}」hovered=${next.hovered} pressed=${next.pressed} focused=${next.focused}`,
        );
        const st = stageRef.current;
        if (st) st.requestPaintOnly(st.defaultLayer.root);
      }}
    >
      <Text style={{ fontSize: 14, color: "#e2e8f0", textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function InteractionFocusApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const stageRef = useRef<Stage | null>(null);

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
          <Canvas width={360} height={220} onStageReady={(st) => (stageRef.current = st)}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 14,
                gap: 12,
                flexDirection: "column",
                backgroundColor: "#0f172a",
              }}
            >
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                §14 伪类模拟系统 — interactionState：hover / pressed / focused（React 版）
              </Text>
              <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                <FocusPanel label="可聚焦 A" stageRef={stageRef} onLine={onStatus} />
                <FocusPanel label="可聚焦 B" stageRef={stageRef} onLine={onStatus} />
              </View>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountInteractionFocusDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <InteractionFocusApp onStatus={onStatus} />));
}
