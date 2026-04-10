import { Canvas, CanvasProvider, ScrollView, Text, View } from "@react-canvas/react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

/**
 * 与 `demo-scroll-view.ts` 结构对齐；横向区使用 `horizontal` + `scrollbarHoverVisible`。
 */
function ScrollViewDemoApp() {
  const innerColors = ["#57534e", "#78716c", "#a8a29e"];
  const hPalette = ["#57534e", "#78716c", "#a8a29e", "#d6d3d1"];

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
          <Canvas width={400} height={400}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 10,
                gap: 6,
                flexDirection: "column",
                backgroundColor: "#1c1917",
              }}
            >
              <Text style={{ fontSize: 11, color: "#a8a29e" }}>
                §17 嵌套滚动 — 内外 ScrollView；到底后继续滚轮交给外层（scroll chaining）（React
                版）
              </Text>

              <ScrollView style={{ width: "100%", flex: 1, minHeight: 0 }} scrollbarHoverVisible>
                <View style={{ width: "100%", padding: 8, gap: 8, backgroundColor: "#292524" }}>
                  <View style={{ height: 36, backgroundColor: "#44403c", borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: "#d6d3d1", margin: 8 }}>
                      外层项 1（继续向下见内层滚动区）
                    </Text>
                  </View>

                  <ScrollView style={{ width: "100%", height: 140 }} scrollbarHoverVisible>
                    <View style={{ width: "100%", padding: 6, gap: 6, backgroundColor: "#1c1917" }}>
                      {Array.from({ length: 8 }, (_, i) => (
                        <View
                          key={i}
                          style={{
                            height: 36,
                            backgroundColor: innerColors[i % innerColors.length]!,
                            borderRadius: 4,
                          }}
                        />
                      ))}
                    </View>
                  </ScrollView>

                  <View style={{ height: 36, backgroundColor: "#44403c", borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: "#d6d3d1", margin: 8 }}>
                      外层项 2（内层滚到底后再滚轮会滚外层）
                    </Text>
                  </View>

                  {Array.from({ length: 6 }, (_, j) => (
                    <View
                      key={`tail-${j}`}
                      style={{ height: 32, backgroundColor: "#57534e", borderRadius: 4 }}
                    />
                  ))}
                </View>
              </ScrollView>

              <Text style={{ fontSize: 11, color: "#a8a29e" }}>
                横向 ScrollView：下方为一行色块，总宽大于视口；触控板左右滑或 Shift+纵滚试横向滚动。
              </Text>

              <ScrollView
                horizontal
                style={{
                  width: "100%",
                  height: 96,
                  backgroundColor: "#292524",
                  borderRadius: 8,
                }}
                scrollbarHoverVisible
              >
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 8 }}>
                  {Array.from({ length: 16 }, (_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 64,
                        height: 64,
                        backgroundColor: hPalette[i % hPalette.length]!,
                        borderRadius: 6,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#fafaf9" }}>{`${i + 1}`}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountScrollViewDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <ScrollViewDemoApp />));
}
