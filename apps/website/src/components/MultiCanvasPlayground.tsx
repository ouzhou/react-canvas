import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";

const CANVAS_W = 112;
const CANVAS_H = 72;

function slotBackground(index: number): string {
  const hue = (index * 47) % 360;
  return `hsl(${hue} 45% 22%)`;
}

function SlotCanvas({ index }: { index: number }) {
  const bg = slotBackground(index);
  return (
    <Canvas width={CANVAS_W} height={CANVAS_H}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#e2e8f0" }}>#{index}</Text>
      </View>
    </Canvas>
  );
}

/**
 * 固定画布占位尺寸，避免某一格（尤其首格）因加载态 / flex 行高与基线参与计算而高度不一致。
 * 与 {@link CANVAS_W} / {@link CANVAS_H} 一致。
 */
function CanvasSlotShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="box-border overflow-hidden leading-none"
      style={{ width: CANVAS_W, height: CANVAS_H }}
    >
      {children}
    </div>
  );
}

function ProviderSlot({ index, loadFonts }: { index: number; loadFonts: boolean }) {
  return (
    <div className="box-border w-fit max-w-full shrink-0 rounded-lg border border-[var(--sl-color-hairline)] p-2">
      <CanvasProvider
        runtimeOptions={{
          loadDefaultParagraphFonts: loadFonts,
        }}
      >
        {({ isReady, error }) => {
          if (error) {
            return (
              <p className="m-0 max-w-[128px] text-xs text-[var(--sl-color-red)]">
                #{index} 错误：{error.message}
              </p>
            );
          }
          if (!isReady) {
            return (
              <CanvasSlotShell>
                <div className="flex size-full items-center justify-center text-xs text-[var(--sl-color-gray-3)]">
                  #{index} 加载中…
                </div>
              </CanvasSlotShell>
            );
          }
          return (
            <CanvasSlotShell>
              <SlotCanvas index={index} />
            </CanvasSlotShell>
          );
        }}
      </CanvasProvider>
    </div>
  );
}

/** 同一运行时：一个 CanvasProvider，多个 Canvas 子树 */
function SingleProviderGrid({ count, loadFonts }: { count: number; loadFonts: boolean }) {
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <CanvasProvider
      runtimeOptions={{
        loadDefaultParagraphFonts: loadFonts,
      }}
    >
      {({ isReady, error }) => {
        if (error) {
          return <p className="m-0 text-[var(--sl-color-red)]">运行时错误：{error.message}</p>;
        }
        if (!isReady) {
          return <p className="m-0 text-[var(--sl-color-gray-3)]">正在加载 Yoga + CanvasKit…</p>;
        }
        return (
          <div className="flex flex-wrap items-start gap-3">
            {indices.map((i) => (
              <div
                key={i}
                className="box-border w-fit shrink-0 rounded-lg border border-[var(--sl-color-hairline)] p-2"
              >
                <CanvasSlotShell>
                  <SlotCanvas index={i} />
                </CanvasSlotShell>
              </div>
            ))}
          </div>
        );
      }}
    </CanvasProvider>
  );
}

/** 多运行时：每个画布各自 CanvasProvider */
function MultiProviderGrid({ count, loadFonts }: { count: number; loadFonts: boolean }) {
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <div className="flex flex-wrap items-start gap-3">
      {indices.map((i) => (
        <ProviderSlot key={i} index={i} loadFonts={loadFonts} />
      ))}
    </div>
  );
}

/**
 * 画布 DOM 外壳使用 Tailwind；画布内 View/Text 仍用 style（与 @react-canvas/react 一致）。
 * 版式说明与 Starlight 组件放在 `multi-canvas.mdx`。
 */
export function MultiCanvasPlayground() {
  const [count, setCount] = useState(8);
  const [loadFonts, setLoadFonts] = useState(true);

  return (
    <div className="flex max-w-4xl flex-col gap-6 text-[var(--sl-color-text)]">
      <fieldset className="m-0 rounded-lg border border-[var(--sl-color-hairline)] px-4 py-3">
        <legend className="px-2 text-xs text-[var(--sl-color-gray-3)]">参数</legend>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-wrap items-center gap-3">
            <span className="min-w-24 text-[var(--sl-color-gray-3)]">画布数量</span>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="min-w-[12rem] accent-[var(--sl-color-accent)]"
            />
            <code className="text-[var(--sl-color-text-accent)]">{count}</code>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={loadFonts}
              onChange={(e) => setLoadFonts(e.target.checked)}
              className="accent-[var(--sl-color-accent)]"
            />
            <span>加载默认段落字体（关闭后仅加载 Yoga + CanvasKit，便于排除网络因素）</span>
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <h4 className="m-0 text-base font-semibold text-[var(--sl-color-text)]">
          A. 多个 CanvasProvider（每格独立初始化运行时）
        </h4>
        <p className="m-0 mb-3 text-sm text-[var(--sl-color-gray-3)]">
          与文档页连续嵌入多段独立 demo 时的结构类似。Yoga / CanvasKit 在 core
          内单例初始化；若仍有个别画布空白，可对比下方 B 并检查浏览器 WebGL 上下文数量限制（与
          Provider 个数无简单对应）。
        </p>
        <MultiProviderGrid count={count} loadFonts={loadFonts} />
      </div>

      <div className="space-y-2">
        <h4 className="m-0 text-base font-semibold text-[var(--sl-color-text)]">
          B. 单个 CanvasProvider + 多个 Canvas
        </h4>
        <p className="m-0 mb-3 text-sm text-[var(--sl-color-gray-3)]">
          同一运行时上挂多块 Canvas，每个画布仍各自创建 surface（及 WebGL
          上下文，若可用）。在需要同屏大量画布时，可考虑此结构以减少重复订阅与便于对照 WebGL 占用。
        </p>
        <SingleProviderGrid count={count} loadFonts={loadFonts} />
      </div>
    </div>
  );
}
