import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function ClipColumn(props: { clip: boolean; title: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "column", gap: 6, minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#cbd5e1" }}>{props.title}</Text>
      <View
        style={{
          width: "100%",
          height: 112,
          backgroundColor: "#1e293b",
          borderRadius: props.clip ? 22 : 6,
          overflow: props.clip ? "hidden" : "visible",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 24,
            top: 28,
            width: 160,
            height: 96,
            backgroundColor: "#ea580c",
            opacity: 0.95,
          }}
        />
      </View>
    </View>
  );
}

function OverflowClipApp() {
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
          <Canvas width={380} height={200}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 12,
                gap: 12,
                flexDirection: "column",
                backgroundColor: "#0f172a",
              }}
            >
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                §16 Overflow 与 BorderRadius 实现 — 左：visible 子可绘出盒外；右：hidden + 圆角 clip
                子内容（React 版）
              </Text>
              <View style={{ flexDirection: "row", gap: 14, flex: 1, alignItems: "stretch" }}>
                <ClipColumn clip={false} title="overflow 默认 / visible" />
                <ClipColumn clip title="overflow:hidden + borderRadius" />
              </View>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountOverflowClipDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <OverflowClipApp />));
}
