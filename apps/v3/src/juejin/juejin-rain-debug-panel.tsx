import { useCallback, useState } from "react";
import {
  cloneJuejinRainDebugDefault,
  type JuejinRainDebugState,
} from "./juejin-rain-debug-defaults.ts";
import { useJuejinRainDebug } from "./juejin-rain-debug-context.tsx";

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
};

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "112px 1fr 52px",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "#1d2129",
        marginBottom: 6,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {step >= 1 ? value : Number(value.toFixed(step >= 0.1 ? 2 : 3))}
      </span>
    </label>
  );
}

function sectionTitle(text: string) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#4e5969",
        marginTop: 10,
        marginBottom: 6,
        borderBottom: "1px solid #e5e6eb",
        paddingBottom: 4,
      }}
    >
      {text}
    </div>
  );
}

export function JuejinRainDebugPanel() {
  const { state, setState } = useJuejinRainDebug();
  const [open, setOpen] = useState(false);

  const patchRain = useCallback(
    (patch: Partial<JuejinRainDebugState["raindrops"]>) => {
      setState((s) => ({ ...s, raindrops: { ...s.raindrops, ...patch } }));
    },
    [setState],
  );

  const patchWater = useCallback(
    (patch: Partial<JuejinRainDebugState["water"]>) => {
      setState((s) => ({ ...s, water: { ...s.water, ...patch } }));
    },
    [setState],
  );

  const reset = useCallback(() => {
    setState(cloneJuejinRainDebugDefault());
  }, [setState]);

  const { raindrops: r, water: w } = state;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 100000,
        fontFamily: "system-ui, sans-serif",
        maxWidth: open ? 320 : "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #c9cdd4",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          cursor: "pointer",
          fontSize: 12,
          color: "#1d2129",
        }}
      >
        {open ? "关闭调试" : "雨效调试"}
      </button>
      {open ? (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #c9cdd4",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            maxHeight: "min(72vh, 560px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1d2129" }}>掘金雨效</span>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid #e5e6eb",
                background: "#f7f8fa",
                cursor: "pointer",
              }}
            >
              复位默认
            </button>
          </div>

          {sectionTitle("Raindrops")}
          <Slider
            label="minR"
            min={5}
            max={80}
            step={1}
            value={r.minR}
            onChange={(v) => patchRain({ minR: v })}
          />
          <Slider
            label="maxR"
            min={10}
            max={120}
            step={1}
            value={r.maxR}
            onChange={(v) => patchRain({ maxR: v })}
          />
          <Slider
            label="dropletsRate"
            min={0}
            max={120}
            step={1}
            value={r.dropletsRate}
            onChange={(v) => patchRain({ dropletsRate: v })}
          />
          <Slider
            label="dropletsSizeMin"
            min={0.5}
            max={20}
            step={0.5}
            value={r.dropletsSizeMin}
            onChange={(v) => patchRain({ dropletsSizeMin: v })}
          />
          <Slider
            label="dropletsSizeMax"
            min={0.5}
            max={24}
            step={0.5}
            value={r.dropletsSizeMax}
            onChange={(v) => patchRain({ dropletsSizeMax: v })}
          />
          <Slider
            label="dropletsClean×"
            min={0.05}
            max={1}
            step={0.01}
            value={r.dropletsCleaningRadiusMultiplier}
            onChange={(v) => patchRain({ dropletsCleaningRadiusMultiplier: v })}
          />
          <Slider
            label="collisionΔ"
            min={0}
            max={0.02}
            step={0.0001}
            value={r.collisionRadiusIncrease}
            onChange={(v) => patchRain({ collisionRadiusIncrease: v })}
          />
          <Slider
            label="rainChance"
            min={0}
            max={1}
            step={0.01}
            value={r.rainChance}
            onChange={(v) => patchRain({ rainChance: v })}
          />
          <Slider
            label="rainLimit"
            min={1}
            max={30}
            step={1}
            value={r.rainLimit}
            onChange={(v) => patchRain({ rainLimit: v })}
          />
          <Slider
            label="trailRate"
            min={0}
            max={3}
            step={0.05}
            value={r.trailRate}
            onChange={(v) => patchRain({ trailRate: v })}
          />
          <Slider
            label="trailScaleMin"
            min={0.05}
            max={0.8}
            step={0.01}
            value={r.trailScaleMin}
            onChange={(v) => patchRain({ trailScaleMin: v })}
          />
          <Slider
            label="trailScaleMax"
            min={0.05}
            max={0.9}
            step={0.01}
            value={r.trailScaleMax}
            onChange={(v) => patchRain({ trailScaleMax: v })}
          />
          <Slider
            label="collisionR"
            min={0.2}
            max={1}
            step={0.01}
            value={r.collisionRadius}
            onChange={(v) => patchRain({ collisionRadius: v })}
          />

          {sectionTitle("水面 SkSL")}
          <Slider
            label="renderShine"
            min={0}
            max={1}
            step={1}
            value={w.u_renderShine}
            onChange={(v) => patchWater({ u_renderShine: v })}
          />
          <Slider
            label="renderShadow"
            min={0}
            max={1}
            step={1}
            value={w.u_renderShadow}
            onChange={(v) => patchWater({ u_renderShadow: v })}
          />
          <Slider
            label="minRefract"
            min={50}
            max={400}
            step={1}
            value={w.u_minRefraction}
            onChange={(v) => patchWater({ u_minRefraction: v })}
          />
          <Slider
            label="refractΔ"
            min={50}
            max={500}
            step={1}
            value={w.u_refractionDelta}
            onChange={(v) => patchWater({ u_refractionDelta: v })}
          />
          <Slider
            label="brightness"
            min={0.5}
            max={1.5}
            step={0.01}
            value={w.u_brightness}
            onChange={(v) => patchWater({ u_brightness: v })}
          />
          <Slider
            label="alpha×"
            min={1}
            max={30}
            step={0.1}
            value={w.u_alphaMultiply}
            onChange={(v) => patchWater({ u_alphaMultiply: v })}
          />
          <Slider
            label="alpha−"
            min={0}
            max={10}
            step={0.05}
            value={w.u_alphaSubtract}
            onChange={(v) => patchWater({ u_alphaSubtract: v })}
          />
          <Slider
            label="filmWeight"
            min={0}
            max={1}
            step={0.01}
            value={w.u_filmWeight}
            onChange={(v) => patchWater({ u_filmWeight: v })}
          />
          <Slider
            label="shineWeight"
            min={0}
            max={1.5}
            step={0.01}
            value={w.u_shineWeight}
            onChange={(v) => patchWater({ u_shineWeight: v })}
          />
          <Slider
            label="shadowRim"
            min={0}
            max={0.5}
            step={0.01}
            value={w.u_shadowRim}
            onChange={(v) => patchWater({ u_shadowRim: v })}
          />
          <Slider
            label="parallaxBg"
            min={0}
            max={80}
            step={1}
            value={w.u_parallaxBg}
            onChange={(v) => patchWater({ u_parallaxBg: v })}
          />
          <Slider
            label="parallaxFg"
            min={0}
            max={80}
            step={1}
            value={w.u_parallaxFg}
            onChange={(v) => patchWater({ u_parallaxFg: v })}
          />
        </div>
      ) : null}
    </div>
  );
}
