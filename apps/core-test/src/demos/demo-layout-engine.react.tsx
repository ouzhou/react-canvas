import { Text, View } from "@react-canvas/react";

import { mountReactCanvasDemo, type ReactDemoSize } from "../lib/react-demo-root.tsx";

function LayoutScene({ width: _w, height: _h }: ReactDemoSize) {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        padding: 12,
        gap: 10,
        flexDirection: "column",
        backgroundColor: "#0c0a09",
      }}
    >
      <Text style={{ fontSize: 11, color: "#a8a29e" }}>
        §6 布局引擎 — calculateLayoutRoot / applyStylesToYoga；脏标记驱动 requestLayoutPaint（见
        §10）
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 10,
          backgroundColor: "#1c1917",
          borderRadius: 10,
        }}
      >
        {(["#7c3aed", "#6d28d9", "#5b21b6"] as const).map((c) => (
          <View key={c} style={{ flex: 1, height: 56, backgroundColor: c, borderRadius: 8 }} />
        ))}
      </View>

      <View
        style={{
          height: 120,
          backgroundColor: "#292524",
          borderRadius: 10,
          position: "relative",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 24,
            top: 20,
            width: 140,
            height: 72,
            backgroundColor: "#ea580c",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#fff7ed" }}>position:absolute</Text>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: "#78716c" }}>
        上：Flex+gap；下：绝对定位子节点（Yoga absolute）
      </Text>
    </View>
  );
}

export function mountLayoutEngineDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(mountReactCanvasDemo(container, { width: 400, height: 280 }, LayoutScene));
}
