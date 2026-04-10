"use client";

import {
  attachInspectorHandlers,
  attachViewportHandlers,
  InspectorHighlight,
  type InspectorState,
  useViewportState,
  type ViewportState,
} from "@/lib/mobile-app-lab-canvas-tools.ts";
import { Canvas, CanvasProvider, Image, ScrollView, Text, View } from "@react-canvas/react";
import { LiveContext, LiveError, LiveProvider } from "react-live";
import type { ComponentType, Dispatch, RefObject, SetStateAction } from "react";
import { FileCode2Icon, HandIcon, MoveIcon } from "lucide-react";
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import {
  MobileAppLabTsxContext,
  MobileAppLabTsxProvider,
} from "@/contexts/mobile-app-lab-tsx-context.tsx";
import { loadLabTsxFromStorage } from "@/lib/mobile-app-lab-tsx-storage.ts";
import { cn } from "@/lib/utils";

import { MobileAppLabChatOverlay } from "./MobileAppLabChatOverlay.tsx";
import { DEFAULT_LAB_TSX } from "./mobile-app-lab-default-source.ts";

/**
 * react-live 仅注入此处列出的标识符。历史草稿或示例若使用 &lt;LoginPage /&gt; 但未在 TSX 内声明，
 * 会报 ReferenceError；提供占位组件避免红条刷屏，仍应在源码中实现真实页面。
 */
function LoginPageScopePlaceholder() {
  return (
    <View style={{ padding: 12, borderRadius: 8, backgroundColor: "#fef2f2" }}>
      <Text style={{ fontSize: 12, color: "#991b1b", lineHeight: 18 }}>
        使用了 LoginPage 但未在同一 TSX 内编写 function LoginPage。请在 IIFE 内声明该组件，或从 JSX
        中移除 &lt;LoginPage /&gt;。
      </Text>
    </View>
  );
}

const liveScope = {
  React,
  View,
  Text,
  ScrollView,
  Image,
  LoginPage: LoginPageScopePlaceholder,
};

type MobileAppLabCanvasTool = "hand" | "move";

/** 是否允许切换到「移动」检视模式；当前暂时关闭。 */
const MOBILE_APP_LAB_MOVE_TOOL_ENABLED = false;

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
  canvasTool,
  viewport,
  setViewport,
}: {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasTool: MobileAppLabCanvasTool;
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

  useEffect(() => {
    if (canvasTool === "hand") {
      setInspector({ hoverNode: null, scopeStack: [] });
    }
  }, [canvasTool]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.style.cursor = canvasTool === "hand" ? "grab" : "";
    return () => {
      el.style.cursor = "";
    };
  }, [canvasRef, canvasTool]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handMode = canvasTool === "hand";
    const detachViewport = attachViewportHandlers(el, {
      logicalHeight: h,
      logicalWidth: w,
      primaryButtonPan: handMode,
      setState: setViewport,
      wheelPan: true,
    });
    const detachInspector = handMode
      ? () => {}
      : attachInspectorHandlers(el, {
          logicalHeight: h,
          logicalWidth: w,
          onStateChange: setInspector,
        });
    return () => {
      detachViewport();
      detachInspector();
    };
  }, [canvasRef, canvasTool, w, h, setViewport]);

  return (
    <>
      <Canvas width={w} height={h} canvasRef={canvasRef} camera={viewport}>
        <View style={{ flex: 1, backgroundColor: "#f1f5f9" }}>{Preview ? <Preview /> : null}</View>
      </Canvas>
      {canvasTool === "move" ? (
        <InspectorHighlight
          canvasRef={canvasRef}
          node={inspector.hoverNode}
          logicalWidth={w}
          logicalHeight={h}
          cameraRevision={viewport}
          className="z-[80] border-2 border-[var(--sl-color-accent)]"
        />
      ) : null}
    </>
  );
}

function MobileAppLabEditorSurface({
  w,
  h,
  canvasDomRef,
  viewport,
  setViewport,
}: {
  w: number;
  h: number;
  canvasDomRef: RefObject<HTMLCanvasElement | null>;
  viewport: ViewportState;
  setViewport: Dispatch<SetStateAction<ViewportState>>;
}) {
  const ctx = useContext(MobileAppLabTsxContext);
  if (!ctx) {
    return null;
  }
  const { draft, setDraft, appliedCode, setAppliedCode, persistError, resetLabTsx } = ctx;
  const [editorOpen, setEditorOpen] = useState(false);
  const [canvasTool, setCanvasTool] = useState<MobileAppLabCanvasTool>("hand");

  return (
    <LiveProvider code={appliedCode} language="tsx" enableTypeScript scope={liveScope}>
      <div className="relative h-full w-full">
        <div
          aria-label="画布工具"
          className="fixed left-3 top-1/2 z-[95] flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-[var(--sl-color-hairline)] bg-white/95 p-1 shadow-md"
          role="toolbar"
        >
          <Button
            aria-label="手型：平移视图"
            aria-pressed={canvasTool === "hand"}
            className={cn(
              "size-9 shrink-0",
              canvasTool === "hand"
                ? "border border-[var(--sl-color-accent)] bg-[color-mix(in_oklab,var(--sl-color-accent)_18%,transparent)] text-[var(--sl-color-accent)] shadow-sm ring-2 ring-[var(--sl-color-accent)]/35"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
            title="手型：拖拽平移画布，不选中对象"
            type="button"
            variant="ghost"
            onClick={() => {
              setCanvasTool("hand");
            }}
          >
            <HandIcon aria-hidden className="size-4" />
          </Button>
          <Button
            aria-label="移动：选择与检视"
            aria-pressed={canvasTool === "move"}
            className={cn(
              "size-9 shrink-0",
              MOBILE_APP_LAB_MOVE_TOOL_ENABLED &&
                canvasTool === "move" &&
                "border border-[var(--sl-color-accent)] bg-[color-mix(in_oklab,var(--sl-color-accent)_18%,transparent)] text-[var(--sl-color-accent)] shadow-sm ring-2 ring-[var(--sl-color-accent)]/35",
              MOBILE_APP_LAB_MOVE_TOOL_ENABLED &&
                canvasTool !== "move" &&
                "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              !MOBILE_APP_LAB_MOVE_TOOL_ENABLED && "text-muted-foreground",
            )}
            disabled={!MOBILE_APP_LAB_MOVE_TOOL_ENABLED}
            title={
              MOBILE_APP_LAB_MOVE_TOOL_ENABLED
                ? "移动：悬停高亮节点；平移需按住 Cmd/Ctrl 并拖拽"
                : "移动模式暂未开放"
            }
            type="button"
            variant="ghost"
            onClick={() => {
              if (MOBILE_APP_LAB_MOVE_TOOL_ENABLED) {
                setCanvasTool("move");
              }
            }}
          >
            <MoveIcon aria-hidden className="size-4" />
          </Button>
        </div>
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
                编辑后点击「应用」更新画布预览。通过右下角「AI
                对话」面板修改侧栏源码时，会在模型返回后**自动应用**到画布。可点击遮罩或右上角关闭侧栏。
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
              spellCheck={false}
              onChange={(e) => {
                setDraft(e.target.value);
              }}
            />
            {persistError ? (
              <p className="text-xs text-destructive" role="status">
                {persistError}
              </p>
            ) : null}
            <SheetFooter className="flex flex-wrap items-center justify-end gap-2 border-t-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm("确定将侧栏与画布源码恢复为默认并清除本地保存？此操作不可撤销。")
                  ) {
                    resetLabTsx();
                  }
                }}
              >
                重置为默认
              </Button>
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
            canvasRef={canvasDomRef}
            canvasTool={canvasTool}
            height={h}
            setViewport={setViewport}
            viewport={viewport}
            width={w}
          />
        </div>
      </div>
    </LiveProvider>
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
  const initialFromStorage = useMemo(
    () => (typeof window !== "undefined" ? loadLabTsxFromStorage() : null),
    [],
  );

  return (
    <div className="fixed inset-0 box-border overflow-hidden bg-slate-100 text-[var(--sl-color-text)]">
      <MobileAppLabTsxProvider
        defaultSource={DEFAULT_LAB_TSX}
        initialFromStorage={initialFromStorage}
      >
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
              <MobileAppLabEditorSurface
                canvasDomRef={canvasDomRef}
                h={h}
                setViewport={setViewport}
                viewport={viewport}
                w={w}
              />
            );
          }}
        </CanvasProvider>
      </MobileAppLabTsxProvider>
    </div>
  );
}
