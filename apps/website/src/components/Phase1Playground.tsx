import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { useState } from "react";

function RangeRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, onChange } = props;
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "9rem 1fr 3rem",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.8125rem",
        color: "#e2e8f0",
      }}
    >
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </label>
  );
}

export function Phase1Playground() {
  const [canvasW, setCanvasW] = useState(420);
  const [canvasH, setCanvasH] = useState(300);
  const [rootPadding, setRootPadding] = useState(10);
  const [rootGap, setRootGap] = useState(10);
  const [topBarH, setTopBarH] = useState(44);
  const [sidebarW, setSidebarW] = useState(72);
  const [row3Gap, setRow3Gap] = useState(8);
  const [flexL, setFlexL] = useState(1);
  const [flexM, setFlexM] = useState(2);
  const [flexR, setFlexR] = useState(1);
  const [bottomBarH, setBottomBarH] = useState(48);
  const [dotSize, setDotSize] = useState(30);

  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) return <p>Failed to load runtime: {error.message}</p>;
        if (!isReady) return <p>Loading Yoga + CanvasKit…</p>;
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxWidth: "36rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                Props（拖动以触发 Canvas 内 View 更新）
              </span>
              <RangeRow
                label="Canvas 宽"
                value={canvasW}
                min={280}
                max={560}
                onChange={setCanvasW}
              />
              <RangeRow
                label="Canvas 高"
                value={canvasH}
                min={200}
                max={480}
                onChange={setCanvasH}
              />
              <RangeRow
                label="根 padding"
                value={rootPadding}
                min={0}
                max={32}
                onChange={setRootPadding}
              />
              <RangeRow label="根 gap" value={rootGap} min={0} max={28} onChange={setRootGap} />
              <RangeRow
                label="顶栏 height"
                value={topBarH}
                min={28}
                max={72}
                onChange={setTopBarH}
              />
              <RangeRow
                label="侧栏 width"
                value={sidebarW}
                min={40}
                max={140}
                onChange={setSidebarW}
              />
              <RangeRow label="三列 gap" value={row3Gap} min={0} max={24} onChange={setRow3Gap} />
              <RangeRow label="左列 flex" value={flexL} min={0} max={4} onChange={setFlexL} />
              <RangeRow label="中列 flex" value={flexM} min={1} max={6} onChange={setFlexM} />
              <RangeRow label="右列 flex" value={flexR} min={0} max={4} onChange={setFlexR} />
              <RangeRow
                label="底栏 height"
                value={bottomBarH}
                min={32}
                max={88}
                onChange={setBottomBarH}
              />
              <RangeRow
                label="底栏圆点 size"
                value={dotSize}
                min={16}
                max={44}
                onChange={setDotSize}
              />
            </div>

            <Canvas width={canvasW} height={canvasH}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "column",
                  backgroundColor: "#0f172a",
                  padding: rootPadding,
                  gap: rootGap,
                }}
              >
                {/* 顶栏：space-between + 中间 flex:1 伸缩条 */}
                <View
                  style={{
                    flexDirection: "row",
                    height: topBarH,
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    paddingHorizontal: 10,
                    backgroundColor: "#1e293b",
                    borderRadius: 8,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 26,
                      backgroundColor: "#38bdf8",
                      borderRadius: 6,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: 10,
                      backgroundColor: "#334155",
                      borderRadius: 5,
                    }}
                  />
                  <View
                    style={{
                      width: 60,
                      height: 26,
                      backgroundColor: "#a78bfa",
                      borderRadius: 6,
                    }}
                  />
                </View>

                {/* 主体：左侧固定宽 + 右侧 column */}
                <View style={{ flex: 1, flexDirection: "row", gap: 10, minHeight: 0 }}>
                  <View
                    style={{
                      width: sidebarW,
                      backgroundColor: "#22c55e",
                      borderRadius: 8,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "column",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    {/* flex 1 : 2 : 1 三列 */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        gap: row3Gap,
                        alignItems: "stretch",
                        minHeight: 0,
                      }}
                    >
                      <View
                        style={{
                          flex: flexL,
                          backgroundColor: "#f97316",
                          borderRadius: 8,
                        }}
                      />
                      <View
                        style={{
                          flex: flexM,
                          backgroundColor: "#fb923c",
                          borderRadius: 8,
                        }}
                      />
                      <View
                        style={{
                          flex: flexR,
                          backgroundColor: "#fdba74",
                          borderRadius: 8,
                        }}
                      />
                    </View>

                    {/* space-around 底栏 */}
                    <View
                      style={{
                        flexDirection: "row",
                        height: bottomBarH,
                        justifyContent: "space-around",
                        alignItems: "center",
                        backgroundColor: "#1e293b",
                        borderRadius: 8,
                      }}
                    >
                      <View
                        style={{
                          width: dotSize,
                          height: dotSize,
                          backgroundColor: "#ec4899",
                          borderRadius: dotSize / 2,
                        }}
                      />
                      <View
                        style={{
                          width: dotSize,
                          height: dotSize,
                          backgroundColor: "#eab308",
                          borderRadius: dotSize / 2,
                        }}
                      />
                      <View
                        style={{
                          width: dotSize,
                          height: dotSize,
                          backgroundColor: "#14b8a6",
                          borderRadius: dotSize / 2,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </Canvas>
          </div>
        );
      }}
    </CanvasProvider>
  );
}
