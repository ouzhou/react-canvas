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
import { FileCode2Icon } from "lucide-react";
import React, { useContext, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { MobileAppLabChatOverlay } from "./MobileAppLabChatOverlay.tsx";
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
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="fixed inset-0 box-border overflow-hidden bg-slate-100 text-[var(--sl-color-text)]">
      <a
        className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-sm text-[var(--sl-color-accent)] shadow-sm underline-offset-2 hover:underline"
        href="/"
      >
        文档首页
      </a>
      <p className="pointer-events-none absolute left-3 top-12 z-10 max-w-[min(100%,22rem)] text-xs leading-snug text-[var(--sl-color-gray-3)]">
        点击右上角「编辑 TSX」打开侧栏编辑源码，保存时点「应用」更新画布。按住
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
                <Sheet onOpenChange={setEditorOpen} open={editorOpen}>
                  <SheetTrigger asChild>
                    <Button
                      aria-expanded={editorOpen}
                      aria-label="打开 TSX 源码编辑侧栏"
                      className="fixed top-3 right-3 z-[100] gap-1.5 border border-[var(--sl-color-hairline)] bg-white/95 text-[var(--sl-color-text)] shadow-md hover:bg-white"
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <FileCode2Icon aria-hidden className="size-4" />
                      编辑 TSX
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="overflow-y-auto" side="right">
                    <SheetHeader>
                      <SheetTitle>TSX（完整源码）</SheetTitle>
                      <SheetDescription>
                        编辑后点击「应用」更新画布预览；可点击遮罩或右上角关闭侧栏。
                      </SheetDescription>
                    </SheetHeader>
                    <label className="sr-only" htmlFor="mobile-app-lab-tsx">
                      TSX 代码
                    </label>
                    <textarea
                      id="mobile-app-lab-tsx"
                      aria-label="TSX 代码"
                      className="min-h-[min(52vh,28rem)] w-full flex-1 resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      spellCheck={false}
                    />
                    <SheetFooter className="flex-row justify-end border-t-0 pt-0">
                      <Button
                        type="button"
                        onClick={() => {
                          setAppliedCode(draft.trim());
                          setEditorOpen(false);
                        }}
                      >
                        应用
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                <LiveError className="fixed bottom-4 left-4 z-[100] max-h-40 max-w-[min(100%,36rem)] overflow-auto rounded border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800" />
                <MobileAppLabChatOverlay />
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
