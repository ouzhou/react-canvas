import { Canvas, CanvasProvider, Modal, useSceneRuntime, View } from "@react-canvas/react-v2";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  DEMO_CURSOR,
  DEMO_HOVER,
  DEMO_LAYOUT,
  DEMO_MODAL,
  DEMO_POINTER,
  DEMO_THROUGH,
} from "./demo-dimensions.ts";
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

/** 默认张开手（grab），按下抓手（grabbing），在画布外松开也恢复 */
function DragCursorStrip({ W }: { W: number }) {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!pressed) return;
    const onUp = () => setPressed(false);
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [pressed]);

  return (
    <View
      id="c-drag-strip"
      style={{
        width: W - 16,
        height: 64,
        backgroundColor: pressed ? "#f9a8d4" : "#fce7f3",
        cursor: pressed ? "grabbing" : "grab",
      }}
      onPointerDown={() => setPressed(true)}
    />
  );
}

/** 光标：静态多类、父链继承与覆盖、hover 联动 cursor、穿透命中 */
function CursorDemoScene({ W, H }: { W: number; H: number }) {
  return (
    <View
      id="cursor-root"
      style={{
        width: W,
        height: H,
        flexDirection: "column",
        padding: 8,
        backgroundColor: "#f1f5f9",
      }}
    >
      <View id="cursor-row-static" style={{ flexDirection: "row", height: 74 }}>
        <View
          id="c-static-ptr"
          style={{ flex: 1, backgroundColor: "#fecaca", cursor: "pointer" }}
        />
        <View id="c-static-txt" style={{ flex: 1, backgroundColor: "#bbf7d0", cursor: "text" }} />
        <View
          id="c-static-cross"
          style={{ flex: 1, backgroundColor: "#dbeafe", cursor: "crosshair" }}
        />
      </View>

      <View id="cursor-gap-1" style={{ height: 8 }} />

      <View id="cursor-row-chain" style={{ flexDirection: "row", height: 92 }}>
        <View
          id="c-chain-parent-only"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#e9d5ff",
            cursor: "progress",
          }}
        >
          <View
            id="c-chain-inherit"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#c084fc",
            }}
          />
        </View>
        <View
          id="c-chain-child-wins"
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#fef3c7",
            cursor: "alias",
          }}
        >
          <View
            id="c-chain-zoom"
            style={{
              position: "absolute",
              left: 24,
              top: 16,
              width: 120,
              height: 48,
              backgroundColor: "#f59e0b",
              cursor: "zoom-in",
            }}
          />
        </View>
      </View>

      <View id="cursor-gap-2" style={{ height: 8 }} />

      <View
        id="c-hover-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#e2e8f0",
        }}
      >
        <View
          id="c-hover-fn"
          style={({ hovered }) => ({
            position: "absolute",
            left: 12,
            top: 8,
            width: W - 40,
            height: 54,
            backgroundColor: hovered ? "#0ea5e9" : "#94a3b8",
            cursor: hovered ? "grab" : "col-resize",
          })}
        />
      </View>

      <View id="cursor-gap-3" style={{ height: 8 }} />

      <View
        id="c-through-wrap"
        style={{
          height: 70,
          position: "relative",
          backgroundColor: "#cbd5e1",
        }}
      >
        <View
          id="c-through-back"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "#16a34a",
            cursor: "pointer",
          }}
        />
        <View
          id="c-through-front"
          style={{
            position: "absolute",
            left: 16,
            top: 8,
            width: 280,
            height: 54,
            backgroundColor: "rgba(251, 146, 60, 0.45)",
            pointerEvents: "none",
          }}
        />
      </View>

      <View id="cursor-gap-4" style={{ height: 8 }} />

      <DragCursorStrip W={W} />
    </View>
  );
}

type ReactSmokeProps = { demo: SmokeDemoId };

/** Modal：`scene-modal` 槽 + 全屏背板；打开后点主界面红块区域应落到背板 `onRequestClose`。 */
function ModalDemoRoot() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const W = DEMO_MODAL.w;
  const H = DEMO_MODAL.h;
  return (
    <>
      <CanvasProvider>
        {({ isReady }) =>
          isReady && (
            <Canvas width={W} height={H}>
              <View
                id="modal-page"
                style={{
                  width: W,
                  height: H,
                  position: "relative",
                  backgroundColor: "#e8eef5",
                }}
              >
                <View
                  id="modal-open-btn"
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 16,
                    width: 140,
                    height: 44,
                    backgroundColor: "#3b82f6",
                  }}
                  onClick={() => {
                    setOpen(true);
                    setLog("已打开 Modal");
                  }}
                />
                <View
                  id="modal-main-block"
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 80,
                    width: 280,
                    height: 100,
                    backgroundColor: "#fca5a5",
                  }}
                  onClick={() => setLog("主界面红块收到点击（仅 Modal 关闭时）")}
                />
              </View>
              <Modal
                visible={open}
                onRequestClose={() => {
                  setOpen(false);
                  setLog("onRequestClose（点背板关闭）");
                }}
              >
                <View
                  id="modal-card"
                  style={{
                    position: "absolute",
                    left: 70,
                    top: 90,
                    width: 260,
                    height: 140,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <View
                    id="modal-inner-strip"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      width: 220,
                      height: 36,
                      backgroundColor: "#86efac",
                    }}
                    onClick={() => setLog("弹窗内绿条（不关闭 Modal）")}
                  />
                </View>
              </Modal>
            </Canvas>
          )
        }
      </CanvasProvider>
      <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "var(--text-h)" }}>
        操作日志：<strong>{log ?? "（尚未点击）"}</strong>
      </p>
    </>
  );
}

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
          : demo === "cursor"
            ? DEMO_CURSOR.w
            : demo === "modal"
              ? DEMO_MODAL.w
              : DEMO_HOVER.w;
  const H =
    demo === "layout"
      ? DEMO_LAYOUT.h
      : demo === "pointer"
        ? DEMO_POINTER.h
        : demo === "through"
          ? DEMO_THROUGH.h
          : demo === "cursor"
            ? DEMO_CURSOR.h
            : demo === "modal"
              ? DEMO_MODAL.h
              : DEMO_HOVER.h;

  const blurb =
    demo === "modal" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 640 }}>
        <code>Modal</code> 挂在 <code>scene-modal</code>{" "}
        槽；打开后全屏背板在上层。请先点蓝块打开，再点红块区域：应走 <code>onRequestClose</code>
        （背板），主界面红块不应收到 click。点弹窗内绿条仅记日志，不关闭。
      </p>
    ) : demo === "layout" ? (
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
    ) : demo === "cursor" ? (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)", maxWidth: 640 }}>
        <strong>①</strong> 三列：<code>pointer</code> / <code>text</code> / <code>crosshair</code>。
        <strong>②</strong> 左：仅父有 <code>progress</code>，子无 cursor → 悬停子块仍为
        progress；右：子 <code>zoom-in</code> 覆盖父 <code>alias</code>。<strong>③</strong> 函数式
        style：未悬停 <code>col-resize</code>，悬停 <code>grab</code> + 变色。
        <strong>④</strong> 橙层 <code>pointer-events: none</code>，光标应为绿块 <code>pointer</code>
        。<strong>⑤</strong> 拖拽条：常态 <code>grab</code>，按下 <code>grabbing</code>
        ，松手（含画布外）恢复。
      </p>
    ) : (
      <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
        函数式 <code>style</code> 依赖 <code>pointerenter</code> / <code>pointerleave</code>{" "}
        切换颜色。
      </p>
    );

  if (demo === "modal") {
    return (
      <div>
        {blurb}
        <ModalDemoRoot />
      </div>
    );
  }

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
              ) : demo === "cursor" ? (
                <CursorDemoScene W={W} H={H} />
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
