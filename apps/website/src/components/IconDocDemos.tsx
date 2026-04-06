import type { CSSProperties, ReactNode } from "react";
import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { Icon } from "@react-canvas/ui";
import camera from "@lucide/icons/icons/camera";
import house from "@lucide/icons/icons/house";
import heart from "@lucide/icons/icons/heart";
import star from "@lucide/icons/icons/star";

const row: {
  flexDirection: "row";
  alignItems: "center";
  justifyContent: "center";
  gap: number;
  paddingVertical: number;
  paddingHorizontal: number;
  backgroundColor: string;
} = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: "#0f172a",
};

function IconDemoCanvas({
  width,
  height,
  children,
}: {
  width?: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) {
          return <p style={{ color: "#f87171", margin: 0 }}>加载失败：{error.message}</p>;
        }
        if (!isReady) {
          return <p style={{ color: "#94a3b8", margin: 0 }}>正在加载 Yoga + CanvasKit…</p>;
        }
        return (
          <Canvas width={width ?? 400} height={height}>
            <View style={{ ...row, flex: 1 }}>{children}</View>
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

const caption: CSSProperties = {
  margin: "0.75rem 0 0",
  fontSize: "0.8125rem",
  color: "#64748b",
};

/** 与「用法」/「基础」代码示例对应 */
export function IconDemoBasic() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={camera} size={48} color="#e2e8f0" strokeWidth={1.5} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「用 size 控制大小」代码示例对应 */
export function IconDemoSize() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={star} size={32} color="#fbbf24" strokeWidth={1.5} />
        <Icon icon={star} size={44} color="#fbbf24" strokeWidth={1.5} />
        <Icon icon={star} size={56} color="#fbbf24" strokeWidth={1.5} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「strokeWidth」代码示例对应 */
export function IconDemoStrokeWidth() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={house} size={48} color="#a78bfa" strokeWidth={1} />
        <Icon icon={house} size={48} color="#a78bfa" strokeWidth={2} />
        <Icon icon={house} size={48} color="#a78bfa" strokeWidth={3} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「color 与 stroke」代码示例对应 */
export function IconDemoColorStroke() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={camera} size={44} color="#64748b" strokeWidth={1.5} />
        <Icon icon={camera} size={44} color="#64748b" stroke="#f472b6" strokeWidth={1.5} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「style.width / style.height」代码示例对应 */
export function IconDemoStyleSize() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={camera} style={{ width: 40, height: 40 }} color="#34d399" strokeWidth={1.5} />
        <Icon icon={camera} style={{ width: 56, height: 56 }} color="#34d399" strokeWidth={1.5} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「fill」代码示例对应 */
export function IconDemoFill() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <IconDemoCanvas height={100}>
        <Icon icon={heart} size={40} stroke="#f43f5e" fill="#fda4af" strokeWidth={1.5} />
      </IconDemoCanvas>
    </div>
  );
}

/** 与「onError」代码示例对应：合法图标，回调仅在解析或 SvgPath 失败时触发 */
export function IconDemoOnError() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <p style={caption}>
        以下为正常图标；若传入无法解析的 <code style={{ color: "#94a3b8" }}>icon.node</code>
        ，将不绘制矢量并调用 <code style={{ color: "#94a3b8" }}>onError</code>。
      </p>
      <IconDemoCanvas height={100}>
        <Icon
          icon={camera}
          size={40}
          color="#e2e8f0"
          strokeWidth={1.5}
          onError={(err) => {
            console.error("[Icon]", err);
          }}
        />
      </IconDemoCanvas>
    </div>
  );
}
