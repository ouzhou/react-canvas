import { getCanvasRuntimeInitSnapshot, subscribeCanvasRuntimeInit } from "@react-canvas/core";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

function RuntimeScene() {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#14532d",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 14, color: "#bbf7d0" }}>
        §2 Runtime — 运行时初始化 · Stage / WASM 就绪
      </Text>
    </View>
  );
}

function RuntimeApp({ onStatus }: { onStatus: (html: string) => void }) {
  useLayoutEffect(() => {
    onStatus(`初始化前：<code>${getCanvasRuntimeInitSnapshot().status}</code>`);
  }, [onStatus]);

  const snap = useSyncExternalStore(
    subscribeCanvasRuntimeInit,
    getCanvasRuntimeInitSnapshot,
    getCanvasRuntimeInitSnapshot,
  );

  const reportedReady = useRef(false);
  useEffect(() => {
    if (snap.status !== "ready" || reportedReady.current) return;
    reportedReady.current = true;
    onStatus(
      `初始化后：<code>${snap.status}</code>（<code>CanvasProvider</code> 内 <code>initCanvasRuntime</code>）`,
    );
  }, [snap.status, onStatus]);

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
          <Canvas width={360} height={80}>
            <RuntimeScene />
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountRuntimeStatusDemoReact(
  container: HTMLElement,
  onStatus: (html: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <RuntimeApp onStatus={onStatus} />));
}
