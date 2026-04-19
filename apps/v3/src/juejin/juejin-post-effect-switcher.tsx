export type JuejinPostEffectId = "rain" | "glass" | "glass-magnify" | "glass-light" | "off";

/** 供 `useGlassLensPostProcess`；非玻璃模式时仍传入占位参数（不用于绘制）。 */
export function juejinGlassLensOpts(
  effect: JuejinPostEffectId,
  vw: number,
): { radius: number; lerp: number } {
  const rw = Math.max(320, vw);
  if (effect === "glass-magnify") {
    return { radius: Math.min(260, rw * 0.2), lerp: 0.07 };
  }
  if (effect === "glass-light") {
    return { radius: Math.min(88, rw * 0.065), lerp: 0.22 };
  }
  if (effect === "glass") {
    return { radius: Math.min(130, rw * 0.1), lerp: 0.14 };
  }
  return { radius: 120, lerp: 0.15 };
}

type Props = {
  value: JuejinPostEffectId;
  onChange: (id: JuejinPostEffectId) => void;
};

const ITEMS: { id: JuejinPostEffectId; label: string; hint?: string }[] = [
  { id: "rain", label: "雨滴水面", hint: "Codrops 折射 + liquid" },
  { id: "glass", label: "液态玻璃", hint: "跟随指针 · 标准" },
  { id: "glass-magnify", label: "玻璃 · 放大镜", hint: "大半径 · 更柔" },
  { id: "glass-light", label: "玻璃 · 轻量", hint: "小透镜 · 更跟手" },
  { id: "off", label: "原画", hint: "关闭后处理" },
];

export function JuejinPostEffectSwitcher({ value, onChange }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 132,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4e5969",
          letterSpacing: 0.3,
          marginBottom: 2,
        }}
      >
        后处理
      </div>
      {ITEMS.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={ITEMS.find((i) => i.id === id)?.hint}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: active ? "1px solid #1e80ff" : "1px solid #e5e6eb",
              background: active ? "rgba(30,128,255,0.12)" : "rgba(255,255,255,0.94)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              color: active ? "#1e80ff" : "#1d2129",
              textAlign: "left",
              lineHeight: 1.25,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
