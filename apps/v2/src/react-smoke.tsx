import { Canvas, CanvasProvider, useSceneRuntime, View } from "@react-canvas/react-v2";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { DEMO_HOVER, DEMO_LAYOUT, DEMO_POINTER, DEMO_THROUGH } from "./demo-dimensions.ts";
import type { SmokeDemoId } from "./smoke-types.ts";

function PointerClickLog(props: { onHit: (label: string) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("hit-sm", "click", () => props.onHit("hit-sm（红，先插入）"));
    const o2 = rt.addListener("hit-lg", "click", () => props.onHit("hit-lg（绿，后插入）"));
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit]);
  return null;
}

function ThroughClickLog(props: { onHit: (label: string) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("through-back", "click", () =>
      props.onHit("through-back（绿，背后层）"),
    );
    const o2 = rt.addListener("through-front", "click", () =>
      props.onHit("错误：through-front（橙）不应收到 click"),
    );
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit]);
  return null;
}

function FlexDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="flex-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: "#eef2f6",
        padding: 12,
      }}
    >
      <View id="row-top" style={{ flex: 1, flexDirection: "row" }}>
        <View id="t1" style={{ flex: 1, backgroundColor: "#f97316" }} />
        <View id="t2" style={{ flex: 1, backgroundColor: "#fb923c" }} />
        <View id="t3" style={{ flex: 1, backgroundColor: "#fdba74" }} />
      </View>
      <View id="row-mid" style={{ flex: 1, flexDirection: "row" }}>
        <View id="m1" style={{ flex: 1, backgroundColor: "#22c55e" }} />
        <View id="m2" style={{ flex: 1, backgroundColor: "#4ade80" }} />
      </View>
      <View id="row-bot" style={{ flex: 1, flexDirection: "row" }}>
        <View id="b1" style={{ flex: 1, backgroundColor: "#3b82f6" }} />
        <View id="b2" style={{ flex: 1, backgroundColor: "#60a5fa" }} />
        <View id="b3" style={{ flex: 1, backgroundColor: "#93c5fd" }} />
        <View id="b4" style={{ flex: 1, backgroundColor: "#bfdbfe" }} />
      </View>
    </View>
  );
}

function PointerDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="demo-wrap"
      style={{
        width: W,
        height: H,
        position: "relative",
        backgroundColor: "#e2e8f0",
      }}
    >
      <View
        id="hit-sm"
        style={{
          position: "absolute",
          left: 40,
          top: 50,
          width: 120,
          height: 120,
          backgroundColor: "#ef4444",
        }}
      />
      <View
        id="hit-lg"
        style={{
          position: "absolute",
          left: 100,
          top: 90,
          width: 200,
          height: 160,
          backgroundColor: "#22c55e",
        }}
      />
    </View>
  );
}

function ThroughDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="through-wrap"
      style={{
        width: W,
        height: H,
        position: "relative",
        backgroundColor: "#e2e8f0",
      }}
    >
      <View
        id="through-back"
        style={{
          position: "absolute",
          left: 50,
          top: 60,
          width: 280,
          height: 180,
          backgroundColor: "#16a34a",
        }}
      />
      <View
        id="through-front"
        style={{
          position: "absolute",
          left: 50,
          top: 60,
          width: 280,
          height: 180,
          backgroundColor: "#fb923c",
          pointerEvents: "none",
        }}
      />
    </View>
  );
}

function HoverDemoScene() {
  return (
    <View
      id="hover-wrap"
      style={{
        width: DEMO_HOVER.w,
        height: DEMO_HOVER.h,
        position: "relative",
        backgroundColor: "#f1f5f9",
      }}
    >
      <View
        id="v-hover"
        style={({ hovered }) => ({
          width: 100,
          height: 60,
          position: "absolute" as const,
          left: 0,
          top: 0,
          backgroundColor: hovered ? "#ff0000" : "#0000ff",
        })}
      />
    </View>
  );
}

type ReactSmokeProps = { demo: SmokeDemoId };

/** `CanvasProvider` → `Canvas` + `View`，与 {@link CoreSmoke} 场景对齐。 */
export function ReactSmoke({ demo }: ReactSmokeProps) {
  const [lastClickTarget, setLastClickTarget] = useState<string | null>(null);
  const onPointerHit = useCallback((label: string) => setLastClickTarget(label), []);

  useEffect(() => {
    if (demo !== "pointer" && demo !== "through") setLastClickTarget(null);
  }, [demo]);

  const W =
    demo === "layout"
      ? DEMO_LAYOUT.w
      : demo === "pointer"
        ? DEMO_POINTER.w
        : demo === "through"
          ? DEMO_THROUGH.w
          : DEMO_HOVER.w;
  const H =
    demo === "layout"
      ? DEMO_LAYOUT.h
      : demo === "pointer"
        ? DEMO_POINTER.h
        : demo === "through"
          ? DEMO_THROUGH.h
          : DEMO_HOVER.h;

  const blurb =
    demo === "layout" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
        三行 flex：顶 3 格、中 2 格、底 4 格；画布内仅 <code>View</code>（{W}×{H}）。
      </p>
    ) : demo === "pointer" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
        与 Core 相同重叠块；点击重叠区应命中 <code>hit-lg</code>。
      </p>
    ) : demo === "through" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
        与 Core 相同：<code>through-front</code> 为 <code>pointerEvents: &quot;none&quot;</code>
        ，点击橙区应记为背后绿块。
      </p>
    ) : (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
        函数式 <code>style</code> 依赖 <code>pointerenter</code> / <code>pointerleave</code>{" "}
        切换颜色。
      </p>
    );

  return (
    <div>
      {blurb}
      <CanvasProvider>
        {({ isReady }) =>
          isReady && (
            <Canvas width={W} height={H}>
              {demo === "layout" ? (
                <FlexDemoScene W={W} H={H} />
              ) : demo === "pointer" ? (
                <>
                  <PointerDemoScene W={W} H={H} />
                  <PointerClickLog onHit={onPointerHit} />
                </>
              ) : demo === "through" ? (
                <>
                  <ThroughDemoScene W={W} H={H} />
                  <ThroughClickLog onHit={onPointerHit} />
                </>
              ) : (
                <HoverDemoScene />
              )}
            </Canvas>
          )
        }
      </CanvasProvider>
      {demo === "pointer" || demo === "through" ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
          上次 click 监听来自：<strong>{lastClickTarget ?? "（尚未点击）"}</strong>
        </p>
      ) : null}
    </div>
  );
}
