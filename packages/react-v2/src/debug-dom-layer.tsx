import type { LayoutCommitPayload, SceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";

function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export type DebugDomLayerProps = {
  runtime: SceneRuntime;
};

/**
 * 绝对定位 div 叠层，展示最近一次布局提交的盒（与 Yoga 一致，非像素绘制）。
 * `pointer-events: none` 不挡后续若接 DOM 指针实验。
 */
export function DebugDomLayer(props: DebugDomLayerProps): ReactNode {
  const { runtime } = props;
  const [payload, setPayload] = useState<LayoutCommitPayload | null>(null);

  useLayoutEffect(() => {
    return runtime.subscribeAfterLayout(setPayload);
  }, [runtime]);

  const layout = payload?.layout ?? {};
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
