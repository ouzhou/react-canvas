import { Text, View } from "@react-canvas/react";

import { mountReactCanvasDemo, type ReactDemoSize } from "../lib/react-demo-root.tsx";

const BULLETS = [
  "§13 待决问题（摘录 core-design.md）",
  "13.1 多 Layer 时 Reconciler 根：每 Layer 独立 vs 单根。",
  "13.2 Portal → modalLayer：Context 传 Stage 还是传 Layer。",
  "13.3 跨 Layer 锚点：getNodeWorldRect + overlay 绝对定位。",
  "13.4 ScrollView 水平滚动：deltaX、horizontal API 待定。",
  "13.5 PointerCapture：节点稳定 id（symbol）建议。",
  "13.6 首帧文字抖动：等字体 vs 接受跳动。",
  "13.7 currentStyle 缓存：命令式 updateStyle 易用性。",
] as const;

function PendingScene({ width: _w, height: _h }: ReactDemoSize) {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        padding: 12,
        gap: 5,
        flexDirection: "column",
        backgroundColor: "#18181b",
      }}
    >
      {BULLETS.map((line) => (
        <Text key={line} style={{ fontSize: 11, color: "#d4d4d8", lineHeight: 1.35 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function mountPendingIssuesDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(
    mountReactCanvasDemo(container, { width: 400, height: 300 }, PendingScene),
  );
}
