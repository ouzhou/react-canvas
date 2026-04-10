import { Text, View } from "@react-canvas/react";
import { mountReactCanvasDemo, type ReactDemoSize } from "../lib/react-demo-root.tsx";

const LINES = [
  "§1 整体架构 · 分层（core-design.md §1.1）",
  "用户代码：View / Text / Image / ScrollView（RN 风格）",
  "  → @react-canvas/ui → @react-canvas/react",
  "  → @react-canvas/core（Stage / Layer / 布局 / 渲染 / 事件）",
  "  → yoga-layout（WASM）+ canvaskit-wasm（Skia）",
  "本页以下各 tab 按目录 §2–§18 逐项验收。",
] as const;

function ArchitectureScene({ width: _w, height: _h }: ReactDemoSize) {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        padding: 14,
        gap: 6,
        flexDirection: "column",
        backgroundColor: "#0f172a",
        justifyContent: "flex-start",
      }}
    >
      {LINES.map((line) => (
        <Text key={line} style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.35 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function mountArchitectureDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(
    mountReactCanvasDemo(container, { width: 400, height: 260 }, ArchitectureScene),
  );
}
