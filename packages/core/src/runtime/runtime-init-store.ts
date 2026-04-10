import type { CanvasKit } from "canvaskit-wasm";

import { initCanvasKit } from "../render/canvaskit.ts";
import { initYoga } from "../layout/yoga.ts";
import type { Yoga } from "../layout/yoga.ts";
import { ensureDefaultParagraphFonts } from "../text/default-paragraph-font.ts";

import type { CanvasRuntime, InitCanvasRuntimeOptions } from "./runtime.ts";

export type CanvasRuntimeInitSnapshot =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; runtime: CanvasRuntime }
  | { status: "error"; error: Error };

/** 与 InitCanvasRuntimeOptions 中字体相关字段对应；用于 §4 冲突比较 */
export function getFontOptionsFingerprint(options?: InitCanvasRuntimeOptions): string {
  const load = options?.loadDefaultParagraphFonts !== false;
  const url = options?.defaultParagraphFontUrl ?? "";
  return `${load}:${url}`;
}

let yogaInitPromise: Promise<Yoga> | null = null;
let canvasKitInitPromise: Promise<CanvasKit> | null = null;

function getYogaSingleton(): Promise<Yoga> {
  yogaInitPromise ??= initYoga();
  return yogaInitPromise;
}

function getCanvasKitSingleton(): Promise<CanvasKit> {
  canvasKitInitPromise ??= initCanvasKit();
  return canvasKitInitPromise;
}

let snapshot: CanvasRuntimeInitSnapshot = { status: "idle" };
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

let initPromise: Promise<CanvasRuntime> | null = null;
/** 首次发起 `initCanvasRuntime` 时锁定（规格 §4） */
let committedFontFingerprint: string | null = null;
let didWarnFontConflict = false;

function isDevEnvironment(): boolean {
  const g = globalThis as typeof globalThis & {
    process?: { env?: { NODE_ENV?: string } };
  };
  if (g.process?.env?.NODE_ENV === "development") return true;
  const im = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return im.env?.DEV === true;
}

function warnFontConflictOnce(): void {
  if (!isDevEnvironment() || didWarnFontConflict) return;
  didWarnFontConflict = true;
  console.warn(
    "[react-canvas] Conflicting InitCanvasRuntimeOptions (font-related) after the first initCanvasRuntime call; " +
      "the first call's options remain in effect. See docs/superpowers/specs/2026-04-09-canvas-runtime-multi-provider-design.md §4.",
  );
}

export function subscribeCanvasRuntimeInit(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getCanvasRuntimeInitSnapshot(): CanvasRuntimeInitSnapshot {
  return snapshot;
}

export function getCanvasRuntimeInitServerSnapshot(): CanvasRuntimeInitSnapshot {
  return { status: "idle" };
}

/**
 * Parallel Yoga + CanvasKit + (by default) default paragraph font fetch for browser or any WASM host.
 * Applications do not need to call `fetch` for fonts unless they opt out here and register bytes themselves.
 *
 * Yoga 与 CanvasKit 在进程内只初始化一次并复用，避免多个 `<CanvasProvider>` 并发重复加载 WASM 导致部分实例失败。
 */
export function initCanvasRuntime(options?: InitCanvasRuntimeOptions): Promise<CanvasRuntime> {
  const fp = getFontOptionsFingerprint(options);

  if (initPromise === null) {
    committedFontFingerprint = fp;
    snapshot = { status: "loading" };
    emit();

    initPromise = (async () => {
      try {
        const [yoga, canvasKit] = await Promise.all([
          getYogaSingleton(),
          getCanvasKitSingleton(),
          options?.loadDefaultParagraphFonts === false
            ? Promise.resolve()
            : ensureDefaultParagraphFonts({ url: options?.defaultParagraphFontUrl }),
        ]);
        const runtime: CanvasRuntime = { yoga, canvasKit };
        snapshot = { status: "ready", runtime };
        emit();
        return runtime;
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        snapshot = { status: "error", error: err };
        emit();
        throw err;
      }
    })();

    return initPromise;
  }

  if (fp !== committedFontFingerprint) {
    if (snapshot.status === "ready" || snapshot.status === "loading") {
      warnFontConflictOnce();
    }
  }

  return initPromise;
}
