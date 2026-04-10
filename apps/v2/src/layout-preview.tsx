import type { SceneRuntime } from "@react-canvas/core-v2";
import { useEffect, useReducer } from "react";

function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export type LayoutPreviewProps = {
  runtime: SceneRuntime;
  width: number;
  height: number;
  /** 轮询刷新布局叠层（ms），冒烟用；默认 250 */
  pollMs?: number;
};

/**
 * 用绝对定位 div 叠在视口上，展示 `getLayoutSnapshot()` 的盒（与 Yoga 一致，非像素绘制）。
 * `pointer-events: none` 不挡后续若接 DOM 指针实验。
 */
export function LayoutPreview(props: LayoutPreviewProps) {
  const { runtime, pollMs = 250 } = props;
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setInterval(() => tick(), pollMs);
    return () => clearInterval(id);
  }, [runtime, pollMs]);

  const layout = runtime.getLayoutSnapshot();
  const entries = Object.entries(layout).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden
    >
      {entries.map(([id, box], i) => {
        const hue = hueForId(id);
        return (
          <div
            key={id}
            title={id}
            style={{
              position: "absolute",
              left: box.absLeft,
              top: box.absTop,
              width: box.width,
              height: box.height,
              boxSizing: "border-box",
              border: `2px solid hsla(${hue}, 65%, 42%, 0.9)`,
              background: `hsla(${hue}, 70%, 55%, 0.12)`,
              zIndex: i + 1,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              fontSize: 10,
              lineHeight: 1.2,
              color: "#0f172a",
            }}
          >
            <span
              style={{
                background: "rgba(255,255,255,0.88)",
                padding: "1px 4px",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
