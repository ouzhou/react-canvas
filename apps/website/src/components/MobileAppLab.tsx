import {
  attachInspectorHandlers,
  InspectorHighlight,
  type InspectorState,
} from "@react-canvas/plugin-inspector";
import {
  attachViewportHandlers,
  useViewportState,
  type ViewportState,
} from "@react-canvas/plugin-viewport";
import { Canvas, CanvasProvider, Image, ScrollView, Text, View } from "@react-canvas/react";
import { LiveContext, LiveError, LiveProvider } from "react-live";
import type { ComponentType, Dispatch, RefObject, SetStateAction } from "react";
import React, { useContext, useLayoutEffect, useRef, useState } from "react";

import { DEFAULT_LAB_TSX } from "./mobile-app-lab-default-source.ts";

const liveScope = {
  React,
  View,
  Text,
  ScrollView,
  Image,
};

function useViewportSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  }));

  useLayoutEffect(() => {
    const onResize = (): void => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

function LabLiveCanvas({
  width,
  height,
  canvasRef,
  viewport,
  setViewport,
}: {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewport: ViewportState;
  setViewport: Dispatch<SetStateAction<ViewportState>>;
}) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const [inspector, setInspector] = useState<InspectorState>({
    hoverNode: null,
    scopeStack: [],
  });
  const live = useContext(LiveContext);
  const Preview = live.element as ComponentType | null | undefined;

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const detachViewport = attachViewportHandlers(el, {
      logicalWidth: w,
      logicalHeight: h,
      setState: setViewport,
    });
    const detachInspector = attachInspectorHandlers(el, {
      logicalWidth: w,
      logicalHeight: h,
      onStateChange: setInspector,
    });
    return () => {
      detachViewport();
      detachInspector();
    };
  }, [canvasRef, w, h, setViewport]);

  return (
    <>
      <Canvas width={w} height={h} canvasRef={canvasRef} camera={viewport}>
        <View style={{ flex: 1, backgroundColor: "#f1f5f9" }}>{Preview ? <Preview /> : null}</View>
      </Canvas>
      <InspectorHighlight
        canvasRef={canvasRef}
        node={inspector.hoverNode}
        logicalWidth={w}
        logicalHeight={h}
        cameraRevision={viewport}
        className="z-[80] border-2 border-[var(--sl-color-accent)]"
      />
    </>
  );
}

/**
 * 全屏 Canvas + react-live：右上编辑 TSX，应用后即时预览。
 * 路由：`/mobile-app-lab`（无 Starlight 文档壳）。
 */
export function MobileAppLab() {
  const { w, h } = useViewportSize();
  const [viewport, setViewport] = useViewportState();
  const canvasDomRef = useRef<HTMLCanvasElement | null>(null);
  const [draft, setDraft] = useState(DEFAULT_LAB_TSX);
  const [appliedCode, setAppliedCode] = useState(DEFAULT_LAB_TSX);

  return (
    <div className="fixed inset-0 box-border overflow-hidden bg-slate-100 text-[var(--sl-color-text)]">
      <a
        className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-sm text-[var(--sl-color-accent)] shadow-sm underline-offset-2 hover:underline"
        href="/"
      >
        文档首页
      </a>
      <p className="pointer-events-none absolute left-3 top-12 z-10 max-w-[min(100%,22rem)] text-xs leading-snug text-[var(--sl-color-gray-3)]">
        右侧为完整默认 TSX 源码，编辑后点「应用」更新画布。按住
        Cmd（Windows：Ctrl）可滚轮缩放或左键拖拽平移；悬停显示节点描边。
      </p>
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--sl-color-red)]">
                画布加载失败：{error.message}
              </div>
            );
          }
          if (!isReady) {
            return (
              <div className="flex h-full items-center justify-center text-sm text-[var(--sl-color-gray-3)]">
                正在加载 Yoga + CanvasKit…
              </div>
            );
          }
          return (
            <LiveProvider code={appliedCode} language="tsx" enableTypeScript scope={liveScope}>
              <div className="relative h-full w-full">
                <div className="fixed right-3 top-3 z-[100] flex max-h-[min(85vh,900px)] w-[min(100vw-1.5rem,42rem)] flex-col gap-2 overflow-hidden rounded-lg border border-[var(--sl-color-hairline)] bg-white/95 p-2 shadow-md">
                  <label
                    className="text-xs font-medium text-[var(--sl-color-gray-3)]"
                    htmlFor="mobile-app-lab-tsx"
                  >
                    TSX（完整源码）
                  </label>
                  <textarea
                    id="mobile-app-lab-tsx"
                    aria-label="TSX 代码"
                    className="min-h-[min(50vh,28rem)] w-full flex-1 resize-y rounded border border-[var(--sl-color-hairline)] bg-white px-2 py-1 font-mono text-[11px] leading-relaxed text-[var(--sl-color-text)]"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="rounded-md bg-[var(--sl-color-accent)] px-3 py-1.5 text-sm font-medium text-white"
                    aria-label="应用代码并更新预览"
                    onClick={() => setAppliedCode(draft.trim())}
                  >
                    应用
                  </button>
                </div>
                <LiveError className="fixed bottom-4 left-4 z-[100] max-h-40 max-w-[min(100%,36rem)] overflow-auto rounded border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800" />
                <div className="[&_canvas]:block h-full w-full [&_canvas]:h-full [&_canvas]:w-full">
                  <LabLiveCanvas
                    width={w}
                    height={h}
                    canvasRef={canvasDomRef}
                    viewport={viewport}
                    setViewport={setViewport}
                  />
                </div>
              </div>
            </LiveProvider>
          );
        }}
      </CanvasProvider>
    </div>
  );
}
