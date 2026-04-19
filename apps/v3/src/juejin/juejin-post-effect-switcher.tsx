import type { CSSProperties } from "react";
import type { JuejinIntroKind } from "../hooks/use-juejin-intro-post-process.ts";

export type JuejinPostEffectId =
  | "off"
  | "rain-index1"
  | "rain-index2"
  | "glass-magnify"
  | "webgl-index2";

/** 供 `useGlassLensPostProcess`；仅放大镜模式使用真实参数，其余为占位。 */
export function juejinGlassLensOpts(
  effect: JuejinPostEffectId,
  vw: number,
): { radius: number; lerp: number } {
  const rw = Math.max(320, vw);
  if (effect === "glass-magnify") {
    return { radius: Math.min(260, rw * 0.2), lerp: 0.07 };
  }
  return { radius: 120, lerp: 0.15 };
}

type Props = {
  value: JuejinPostEffectId;
  onChange: (id: JuejinPostEffectId) => void;
  /** 云朵入场（程序噪声 + 扩张 reveal） */
  onReplayIntroNoise?: () => void;
  /** 蜂窝 hex tile 入场 */
  onReplayIntroHex?: () => void;
  /** 像素扫描入场（VFX-JS 思路的 SkSL 版） */
  onReplayIntroPixelScan?: () => void;
  /** Emerge：像素滑入（uType 0） */
  onReplayIntroEmergePixel?: () => void;
  /** Emerge：噪波侵染（uType 1） */
  onReplayIntroEmergeChaos?: () => void;
  /** Emerge：幕布卷帘（uType 3） */
  onReplayIntroEmergeCurtain?: () => void;
  introActive?: boolean;
  /** 当前正在播的入场种类（用于按钮文案） */
  introKind?: JuejinIntroKind;
};

const ITEMS: { id: JuejinPostEffectId; label: string; hint?: string }[] = [
  { id: "off", label: "原画", hint: "关闭后处理" },
  {
    id: "rain-index1",
    label: "雨滴 · 大雨",
    hint: "Skia：Raindrops / 水面参考 index1",
  },
  {
    id: "rain-index2",
    label: "雨滴 · 小雨",
    hint: "Skia：Raindrops / 水面参考 index2",
  },
  {
    id: "glass-magnify",
    label: "液态玻璃 · 放大镜",
    hint: "跟随指针 · 大半径",
  },
  {
    id: "webgl-index2",
    label: "WebGL · index2",
    hint: "全屏 water.frag，固定 index2 配置",
  },
];

function introBtnStyle(introActive: boolean, playingThis: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: introActive ? "1px solid #e5e6eb" : "1px solid #86909c",
    background: introActive ? "rgba(245,246,247,0.95)" : "rgba(255,255,255,0.94)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    cursor: introActive ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: introActive ? "#86909c" : "#1d2129",
    textAlign: "left",
    lineHeight: 1.25,
    opacity: introActive && !playingThis ? 0.72 : 1,
  };
}

export function JuejinPostEffectSwitcher({
  value,
  onChange,
  onReplayIntroNoise,
  onReplayIntroHex,
  onReplayIntroPixelScan,
  onReplayIntroEmergePixel,
  onReplayIntroEmergeChaos,
  onReplayIntroEmergeCurtain,
  introActive = false,
  introKind = "noise",
}: Props) {
  const hasIntro = Boolean(
    onReplayIntroNoise ??
    onReplayIntroHex ??
    onReplayIntroPixelScan ??
    onReplayIntroEmergePixel ??
    onReplayIntroEmergeChaos ??
    onReplayIntroEmergeCurtain,
  );
  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 100100,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 132,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {hasIntro ? (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#4e5969",
              letterSpacing: 0.3,
              marginBottom: 2,
            }}
          >
            入场
          </div>
          {onReplayIntroNoise ? (
            <button
              type="button"
              onClick={onReplayIntroNoise}
              disabled={introActive}
              title="云朵状噪声 + 中心扩张 reveal，约 1.5s"
              style={introBtnStyle(introActive, introActive && introKind === "noise")}
            >
              {introActive && introKind === "noise" ? "云朵入场播放中…" : "云朵入场"}
            </button>
          ) : null}
          {onReplayIntroHex ? (
            <button
              type="button"
              onClick={onReplayIntroHex}
              disabled={introActive}
              title="蜂窝 hex tile 揭示，约 1.5s"
              style={introBtnStyle(introActive, introActive && introKind === "hex")}
            >
              {introActive && introKind === "hex" ? "蜂窝入场播放中…" : "蜂窝入场"}
            </button>
          ) : null}
          {onReplayIntroPixelScan ? (
            <button
              type="button"
              onClick={onReplayIntroPixelScan}
              disabled={introActive}
              title="参考 VFX-JS Pixel Scan：分块扫描 + 彩色边缘，约 1.5s"
              style={introBtnStyle(introActive, introActive && introKind === "pixelScan")}
            >
              {introActive && introKind === "pixelScan" ? "像素扫描播放中…" : "像素扫描入场"}
            </button>
          ) : null}
          {onReplayIntroEmergePixel ? (
            <button
              type="button"
              onClick={onReplayIntroEmergePixel}
              disabled={introActive}
              title="Emerge uType0：像素格 + 左缘揭示 + #f60 扫光"
              style={introBtnStyle(introActive, introActive && introKind === "emergePixel")}
            >
              {introActive && introKind === "emergePixel" ? "像素滑入播放中…" : "像素滑入"}
            </button>
          ) : null}
          {onReplayIntroEmergeChaos ? (
            <button
              type="button"
              onClick={onReplayIntroEmergeChaos}
              disabled={introActive}
              title="Emerge uType1：hash 闪动 + 竖直侵染"
              style={introBtnStyle(introActive, introActive && introKind === "emergeChaos")}
            >
              {introActive && introKind === "emergeChaos" ? "噪波侵染播放中…" : "噪波侵染"}
            </button>
          ) : null}
          {onReplayIntroEmergeCurtain ? (
            <button
              type="button"
              onClick={onReplayIntroEmergeCurtain}
              disabled={introActive}
              title="Emerge uType3：正弦幕布 + 像素混合"
              style={introBtnStyle(introActive, introActive && introKind === "emergeCurtain")}
            >
              {introActive && introKind === "emergeCurtain" ? "幕布卷帘播放中…" : "幕布卷帘"}
            </button>
          ) : null}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#4e5969",
              letterSpacing: 0.3,
              marginTop: 12,
              marginBottom: 2,
              paddingTop: 12,
              borderTop: "1px solid #e5e6eb",
            }}
          >
            后处理
          </div>
        </>
      ) : (
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
      )}
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
