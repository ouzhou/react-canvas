import { Canvas, CanvasProvider, Image, SvgPath, Text, View } from "@react-canvas/react";
import { useCallback, useEffect, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

const heroUrl = new URL("../assets/hero.png", import.meta.url).href;

function NodeModelApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const [canvasW, setCanvasW] = useState(400);
  const [canvasH, setCanvasH] = useState(420);
  const [textWrapW, setTextWrapW] = useState(360);

  const applyStatus = useCallback((): void => {
    onStatus(
      `画布 ${Math.round(canvasW)}×${Math.round(canvasH)} · 段落容器宽 ${Math.round(textWrapW)}px（Skia Paragraph 随宽度换行）`,
    );
  }, [canvasH, canvasW, onStatus, textWrapW]);

  useEffect(() => {
    applyStatus();
  }, [applyStatus]);

  return (
    <div>
      <div
        className="node-model-toolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px 16px",
          padding: "10px 12px",
          marginBottom: 8,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 10,
          fontSize: 12,
          color: "#cbd5e1",
        }}
      >
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          画布宽
          <input
            type="range"
            min={260}
            max={640}
            step={10}
            value={canvasW}
            onChange={(e) => {
              setCanvasW(Number(e.target.value));
            }}
          />
          <span style={{ minWidth: 42, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(canvasW)}
          </span>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          画布高
          <input
            type="range"
            min={300}
            max={640}
            step={10}
            value={canvasH}
            onChange={(e) => {
              setCanvasH(Number(e.target.value));
            }}
          />
          <span style={{ minWidth: 42, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(canvasH)}
          </span>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          段落容器宽
          <input
            type="range"
            min={120}
            max={560}
            step={10}
            value={textWrapW}
            onChange={(e) => {
              setTextWrapW(Number(e.target.value));
            }}
          />
          <span style={{ minWidth: 42, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(textWrapW)}
          </span>
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
            <Canvas width={Math.round(canvasW)} height={Math.round(canvasH)}>
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  padding: 12,
                  gap: 10,
                  flexDirection: "column",
                  backgroundColor: "#0f172a",
                }}
              >
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                  §5 节点模型 — View · Text · Image · SvgPath（React 版）
                </Text>

                <View style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>
                  <View
                    style={{ flex: 1, height: 48, backgroundColor: "#2563eb", borderRadius: 8 }}
                  />
                  <View
                    style={{ flex: 1, height: 48, backgroundColor: "#059669", borderRadius: 8 }}
                  />
                  <View
                    style={{ flex: 1, height: 48, backgroundColor: "#d97706", borderRadius: 8 }}
                  />
                </View>

                <View style={{ alignSelf: "flex-start", width: Math.round(textWrapW) }}>
                  <Text style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.4 }}>
                    TextNode：Skia Paragraph，中文与 English 混排；收窄滑块可看换行。
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                  <Image
                    source={{ uri: heroUrl }}
                    resizeMode="contain"
                    style={{ width: 160, height: 100, borderRadius: 8 }}
                    onLoad={() => {
                      onStatus("ImageNode onLoad");
                    }}
                    onError={(e) => {
                      onStatus(`ImageNode onError：${String(e)}`);
                    }}
                  />
                  <Text style={{ fontSize: 11, color: "#94a3b8", flex: 1 }}>
                    ImageNode：异步解码、SkImage；解码完成触发 requestLayoutPaint。
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <SvgPath
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    viewBox="0 0 24 24"
                    size={72}
                    stroke="#a5b4fc"
                    fill="#6366f1"
                    strokeWidth={1.5}
                  />
                  <Text style={{ fontSize: 11, color: "#c7d2fe", flex: 1 }}>
                    SvgPathNode：d + viewBox，矢量图标。
                  </Text>
                </View>
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>
    </div>
  );
}

export function mountNodeModelDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <NodeModelApp onStatus={onStatus} />));
}
