import type { CanvasSyntheticPointerEvent } from "@react-canvas/react";
import { Canvas, CanvasProvider, ScrollView, Text, View } from "@react-canvas/react";
import { useState } from "react";

const W = 400;
const H = 420;
const ROWS = 36;
const ROW_H = 34;

function LogPanel(props: { title: string; lines: string[] }) {
  const { title, lines } = props;
  return (
    <div className="mt-2 max-h-[4.5rem] overflow-auto font-mono text-[0.75rem] text-[var(--sl-color-gray-3)]">
      <span className="text-[var(--sl-color-gray-4)]">{title}：</span>
      {lines.length === 0 ? (
        <span className="opacity-60">（暂无）</span>
      ) : (
        lines.map((l, i) => (
          <span key={`${i}-${l}`}>
            {i > 0 ? " → " : ""}
            <span className="text-[var(--sl-color-text)]">{l}</span>
          </span>
        ))
      )}
    </div>
  );
}

export function ScrollViewPlayground() {
  const [clickLog, setClickLog] = useState<string[]>([]);

  const onRowClick = (label: string) => (_e: CanvasSyntheticPointerEvent) => {
    setClickLog((prev) => [...prev.slice(-10), label]);
  };

  return (
    <div className="flex max-w-[min(100%,32rem)] flex-col gap-5">
      <p className="m-0 text-[0.8125rem] leading-relaxed text-[var(--sl-color-gray-3)]">
        固定高度 <code className="text-[var(--sl-color-text)]">ScrollView</code>
        ，内容包在<strong className="text-[var(--sl-color-text)]">单层 </strong>
        <code className="text-[var(--sl-color-text)]">View</code> 内（多行子节点）；在画布上
        <strong className="text-[var(--sl-color-text)]">拖拽</strong>或
        <strong className="text-[var(--sl-color-text)]">滚轮</strong>
        滚动；右侧为画布内绘制的<strong className="text-[var(--sl-color-text)]">滚动条</strong>
        （轨道 + 滑块）。点击带底色的行可验证滚动后命中。
      </p>

      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) return <p>Failed to load runtime: {error.message}</p>;
          if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
          return (
            <div className="[&_canvas]:block">
              <Canvas width={W} height={H}>
                <View
                  style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#0f172a",
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
                    ScrollView（高 260）
                  </Text>
                  <ScrollView
                    style={{
                      height: 260,
                      width: "100%",
                      backgroundColor: "#1e293b",
                      borderRadius: 8,
                    }}
                  >
                    <View
                      style={{
                        width: "100%",
                        paddingVertical: 6,
                        paddingLeft: 8,
                        paddingRight: 14,
                      }}
                    >
                      {Array.from({ length: ROWS }, (_, i) => {
                        const isSample = i === 5 || i === 22;
                        return (
                          <View
                            key={i}
                            style={{
                              height: ROW_H,
                              justifyContent: "center",
                              marginBottom: i === ROWS - 1 ? 0 : 2,
                              backgroundColor: isSample ? "#334155" : "transparent",
                              borderRadius: 4,
                              paddingHorizontal: isSample ? 6 : 0,
                            }}
                            onClick={isSample ? onRowClick(`第 ${i + 1} 行`) : undefined}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: isSample ? "#f8fafc" : "#94a3b8",
                              }}
                            >
                              {isSample ? `第 ${i + 1} 行（可点）` : `第 ${i + 1} 行 — 列表项`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </Canvas>
            </div>
          );
        }}
      </CanvasProvider>

      <LogPanel title="可点击行 onClick" lines={clickLog} />
    </div>
  );
}
