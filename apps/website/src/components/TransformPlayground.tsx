import type { CanvasSyntheticPointerEvent } from "@react-canvas/react";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { useCallback, useState } from "react";

const W = 420;
const H = 360;

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
    <label className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2 text-sm text-[var(--sl-color-text)]">
      <span className="text-[var(--sl-color-gray-3)]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <span className="text-right tabular-nums">{value}</span>
    </label>
  );
}

export function TransformPlayground() {
  const [rotateDeg, setRotateDeg] = useState(18);
  const [translateX, setTranslateX] = useState(24);
  const [translateY, setTranslateY] = useState(-8);
  const [scalePct, setScalePct] = useState(100);
  const [clickLog, setClickLog] = useState<string[]>([]);

  const pushLog = useCallback((label: string) => {
    setClickLog((prev) => [...prev.slice(-10), `${label} @ ${new Date().toLocaleTimeString()}`]);
  }, []);

  const onRotatedClick = useCallback(
    (_e: CanvasSyntheticPointerEvent) => {
      pushLog("可旋转块（滑条控制角度）");
    },
    [pushLog],
  );

  const onStaticClick = useCallback(
    (name: string) => (_e: CanvasSyntheticPointerEvent) => {
      pushLog(name);
    },
    [pushLog],
  );

  const scale = scalePct / 100;

  return (
    <div className="not-prose flex max-w-lg flex-col gap-4">
      <p className="m-0 text-sm leading-relaxed text-[var(--sl-color-gray-3)]">
        演示 <code className="text-[var(--sl-color-text)]">style.transform</code> 的绘制与命中（
        <code className="text-[var(--sl-color-text)]">rotate</code> /{" "}
        <code className="text-[var(--sl-color-text)]">translate</code> /{" "}
        <code className="text-[var(--sl-color-text)]">scale</code>
        ）。下方滑条驱动中间蓝色块；点击各块会在底部追加日志。
      </p>

      <div
        className="flex flex-col gap-2 rounded-lg border border-[var(--sl-color-hairline)] p-3"
        style={{ background: "var(--sl-color-gray-6)" }}
      >
        <span className="text-xs font-semibold text-[var(--sl-color-gray-2)]">驱动中间演示块</span>
        <RangeRow
          label="rotate（deg）"
          min={-45}
          max={45}
          value={rotateDeg}
          onChange={setRotateDeg}
        />
        <RangeRow
          label="translateX"
          min={-40}
          max={80}
          value={translateX}
          onChange={setTranslateX}
        />
        <RangeRow
          label="translateY"
          min={-40}
          max={80}
          value={translateY}
          onChange={setTranslateY}
        />
        <RangeRow
          label="scale（%）"
          min={50}
          max={150}
          value={scalePct}
          step={5}
          onChange={setScalePct}
        />
      </div>

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
                    padding: 10,
                    gap: 10,
                    backgroundColor: "#0f172a",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                    静态：左无变换 · 右旋转 22°（点击试命中）
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, height: 72 }}>
                    <View
                      style={{
                        width: 120,
                        height: 56,
                        backgroundColor: "#334155",
                        borderRadius: 6,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onClick={onStaticClick("灰块（无 transform）")}
                    >
                      <Text style={{ fontSize: 12, color: "#f8fafc" }}>无</Text>
                    </View>
                    <View
                      style={{
                        width: 120,
                        height: 56,
                        backgroundColor: "#7c3aed",
                        borderRadius: 6,
                        justifyContent: "center",
                        alignItems: "center",
                        transform: [{ rotate: "22deg" }],
                      }}
                      onClick={onStaticClick("紫块 rotate 22°")}
                    >
                      <Text style={{ fontSize: 12, color: "#f8fafc" }}>22°</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                    滑条：合成 transform（rotate + translate + scale）
                  </Text>
                  <View
                    style={{
                      height: 100,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 140,
                        height: 64,
                        backgroundColor: "#2563eb",
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                        transform: [
                          { translateX },
                          { translateY },
                          { scale },
                          { rotate: `${rotateDeg}deg` },
                        ],
                      }}
                      onClick={onRotatedClick}
                    >
                      <Text style={{ fontSize: 13, color: "#f8fafc" }}>点我</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 10, color: "#64748b" }}>
                    布局盒仍在 Yoga 轴对齐空间；绘制与命中使用同一套矩阵。
                  </Text>
                </View>
              </Canvas>
            </div>
          );
        }}
      </CanvasProvider>

      <div
        className="rounded-md border border-[var(--sl-color-hairline)] p-2 font-mono text-xs text-[var(--sl-color-gray-3)]"
        style={{ maxHeight: "5.5rem", overflow: "auto" }}
      >
        <span className="text-[var(--sl-color-gray-2)]">点击日志：</span>
        {clickLog.length === 0 ? (
          <span className="opacity-60">（暂无）</span>
        ) : (
          clickLog.map((l, i) => (
            <div key={`${i}-${l}`} className="text-[var(--sl-color-text)]">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
