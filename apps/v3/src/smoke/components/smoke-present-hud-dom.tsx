import { useLingui } from "@lingui/react/macro";
import type { ReactElement } from "react";

export type SmokePresentHudDomProps = {
  redrawsPerSec: number;
  isRedrawingNow: boolean;
};

/**
 * 画布性能指示（DOM），避免在 Canvas 内更新文字导致额外 Skia 重绘。
 */
export function SmokePresentHudDom(props: SmokePresentHudDomProps): ReactElement {
  const { redrawsPerSec, isRedrawingNow } = props;
  const { t } = useLingui();

  return (
    <div
      className="smoke-present-hud-dom"
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 20,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 5,
        maxWidth: "min(200px, calc(100vw - 20px))",
        padding: "5px 8px",
        borderRadius: 5,
        backgroundColor: isRedrawingNow ? "rgba(20, 83, 45, 0.92)" : "rgba(30, 41, 59, 0.92)",
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginTop: 2,
          flexShrink: 0,
          backgroundColor: isRedrawingNow ? "#4ade80" : "#94a3b8",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.98)",
            lineHeight: 1.25,
          }}
        >
          {t`FPS: ${redrawsPerSec}`}
        </div>
        <div style={{ fontSize: 10, color: "rgba(241, 245, 249, 0.95)", lineHeight: 1.3 }}>
          {isRedrawingNow ? t`正在渲染：是` : t`正在渲染：否`}
        </div>
      </div>
    </div>
  );
}
