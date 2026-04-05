import type { CanvasSyntheticPointerEvent } from "@react-canvas/react";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

const W = 400;
/** 含嵌套 Text 演示；高度需容纳多段纵向布局 */
const H = 540;

function LogPanel(props: { title: string; lines: string[] }) {
  const { title, lines } = props;
  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: "#94a3b8",
        fontFamily: "ui-monospace, monospace",
        marginTop: "0.35rem",
        maxHeight: "4.5rem",
        overflow: "auto",
      }}
    >
      <span style={{ color: "#64748b" }}>{title}：</span>
      {lines.length === 0 ? (
        <span style={{ opacity: 0.6 }}>（暂无）</span>
      ) : (
        lines.map((l, i) => (
          <span key={`${i}-${l}`}>
            {i > 0 ? " → " : ""}
            <span style={{ color: "#e2e8f0" }}>{l}</span>
          </span>
        ))
      )}
    </div>
  );
}

export function PointerPlayground() {
  const [bubbleLog, setBubbleLog] = useState<string[]>([]);
  const [stopLog, setStopLog] = useState<string[]>([]);
  const [overlapLog, setOverlapLog] = useState<string[]>([]);
  const [textLog, setTextLog] = useState<string[]>([]);
  const [nestedTextLog, setNestedTextLog] = useState<string[]>([]);
  const [downUpLog, setDownUpLog] = useState<string[]>([]);

  const push =
    (setter: Dispatch<SetStateAction<string[]>>, label: string) =>
    (_e: CanvasSyntheticPointerEvent) => {
      setter((prev) => [...prev.slice(-12), label]);
    };

  const stopChild = useCallback((e: CanvasSyntheticPointerEvent) => {
    const tag = "子 stop";
    setStopLog((prev) => [...prev.slice(-12), tag]);
    e.stopPropagation();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        maxWidth: "min(100%, 32rem)",
      }}
    >
      <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
        单画布内多段示例：命中（AABB + 绘制顺序）、冒泡、
        <code style={{ color: "#e2e8f0" }}>stopPropagation</code>、 重叠兄弟、
        <code style={{ color: "#e2e8f0" }}>Text</code> 单行、
        <strong style={{ color: "#e2e8f0" }}>Text 嵌套 Text + 混排文字</strong>（重点）、
        <code style={{ color: "#e2e8f0" }}>pointerdown/up</code>。日志为画布内回调写入的 React
        state。
      </p>

      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) return <p>Failed to load runtime: {error.message}</p>;
          if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
          return (
            <Canvas width={W} height={H}>
              <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 10, gap: 0 }}>
                {/* 1 冒泡 */}
                <View style={{ height: 84, marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>① 冒泡</Text>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#1e293b",
                      borderRadius: 6,
                      padding: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onClick={push(setBubbleLog, "父")}
                  >
                    <View
                      style={{
                        width: 140,
                        height: 52,
                        backgroundColor: "#334155",
                        borderRadius: 4,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={push(setBubbleLog, "子")}
                    >
                      <Text style={{ fontSize: 13, color: "#f8fafc" }}>点内层</Text>
                    </View>
                  </View>
                </View>

                {/* 2 stopPropagation */}
                <View style={{ height: 84, marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>② stop</Text>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#1e293b",
                      borderRadius: 6,
                      padding: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onClick={push(setStopLog, "父")}
                  >
                    <View
                      style={{
                        width: 140,
                        height: 52,
                        backgroundColor: "#7c2d12",
                        borderRadius: 4,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={stopChild}
                    >
                      <Text style={{ fontSize: 12, color: "#fecaca" }}>子内 stop</Text>
                    </View>
                  </View>
                </View>

                {/* 3 重叠 */}
                <View style={{ height: 100, marginBottom: 6, position: "relative" as const }}>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    ③ 重叠（后声明在上）
                  </Text>
                  <View style={{ flex: 1, position: "relative" as const }}>
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        width: 120,
                        height: 56,
                        backgroundColor: "rgba(59, 130, 246, 0.85)",
                        borderRadius: 4,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={push(setOverlapLog, "下层")}
                    >
                      <Text style={{ fontSize: 11, color: "#fff" }}>先声明</Text>
                    </View>
                    <View
                      style={{
                        position: "absolute",
                        left: 40,
                        top: 20,
                        width: 120,
                        height: 56,
                        backgroundColor: "rgba(234, 179, 8, 0.9)",
                        borderRadius: 4,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={push(setOverlapLog, "上层")}
                    >
                      <Text style={{ fontSize: 11, color: "#422006" }}>后声明</Text>
                    </View>
                  </View>
                </View>

                {/* 4 Text 单行 */}
                <View style={{ height: 48, marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    ④ Text 单行
                  </Text>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#a5b4fc",
                        textAlign: "center" as const,
                      }}
                      onClick={push(setTextLog, "单行-click")}
                    >
                      点这段文字
                    </Text>
                  </View>
                </View>

                {/* 5 嵌套 Text + 文字 */}
                <View style={{ height: 112, marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    ⑤ 嵌套 Text + 混排（外层/内层均绑 onClick）
                  </Text>
                  <Text style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>
                    命中仅为最外一层 Text 的整框；内层 Text 无独立命中，内层 onClick 预期不会出现。
                  </Text>
                  <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#e2e8f0",
                        width: "100%",
                      }}
                      onClick={push(setNestedTextLog, "outer")}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#fbbf24",
                        }}
                        onClick={push(setNestedTextLog, "inner")}
                      >
                        嵌套加粗
                      </Text>{" "}
                      后面普通字
                    </Text>
                  </View>
                </View>

                {/* 6 pointer */}
                <View style={{ height: 44, justifyContent: "flex-end" }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#164e63",
                      borderRadius: 4,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onPointerDown={push(setDownUpLog, "down")}
                    onPointerUp={push(setDownUpLog, "up")}
                  >
                    <Text style={{ fontSize: 11, color: "#a5f3fc" }}>⑥ pointer</Text>
                  </View>
                </View>
              </View>
            </Canvas>
          );
        }}
      </CanvasProvider>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <LogPanel title="① 冒泡" lines={bubbleLog} />
        <LogPanel title="② stop" lines={stopLog} />
        <LogPanel title="③ 重叠" lines={overlapLog} />
        <LogPanel title="④ Text 单行" lines={textLog} />
        <LogPanel title="⑤ 嵌套 Text" lines={nestedTextLog} />
        <LogPanel title="⑥ pointer" lines={downUpLog} />
      </div>
    </div>
  );
}
