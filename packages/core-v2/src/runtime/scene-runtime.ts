import {
  propagateScenePointerEvent,
  type DispatchTrace,
  type DispatchTraceEntry,
} from "../events/dispatch.ts";
import { createEventRegistry } from "../events/event-registry.ts";
import type { ScenePointerEvent } from "../events/scene-event.ts";
import type { PointerEventType } from "../events/scene-event.ts";
import { hitTestAt } from "../hit/hit-test.ts";
import { resolveCursorFromHitLeaf } from "../input/resolve-cursor.ts";
import { resolveBorderRadiusRxRy } from "../layout/border-radius-resolve.ts";
import { absoluteBoundsFor, calculateAndSyncLayout } from "../layout/layout-sync.ts";
import {
  applyStylesToYoga,
  clearYogaLayoutStyle,
  clampOpacityForSnapshot,
  type TextLayoutStyleSnapshot,
  type ViewStyle,
} from "../layout/style-map.ts";
import { bindTextNodeMeasure } from "../layout/text-yoga-measure.ts";
import { loadYoga } from "../layout/yoga.ts";
import type { Yoga } from "yoga-layout/load";
import type { SceneNode, SceneNodeKind } from "../scene/scene-node.ts";
import type { TextFlatRun } from "../text/text-flat-run.ts";
import { joinTextFlatRuns } from "../text/text-flat-run.ts";
import { createNodeStore, type NodeStore } from "./node-store.ts";

const cursorTargetByRuntime = new WeakMap<object, HTMLCanvasElement | null>();

/** 主界面 reconciler 默认挂载点（`root` 的第一子节点）。 */
export const SCENE_CONTENT_ID = "scene-content";
/** 弹窗层挂载点（`root` 的第二子节点；无 Modal 时 `pointerEvents: 'none'` 以免挡住 content）。 */
export const SCENE_MODAL_ID = "scene-modal";

/**
 * 由 `attachCanvasStagePointer` 在挂载/卸载时调用，将画布与 runtime 关联以便写入 `cursor`。
 * 不暴露在对外 {@link SceneRuntime} 类型中。
 */
export function bindSceneRuntimeCursorTarget(
  runtime: SceneRuntime,
  el: HTMLCanvasElement | null,
): void {
  cursorTargetByRuntime.set(runtime as object, el);
}

export type CreateSceneRuntimeOptions = {
  width: number;
  height: number;
};

export type SceneGraphSnapshot = {
  rootId: string;
  nodes: Record<string, { parentId: string | null; children: string[]; label?: string }>;
};

export type LayoutSnapshot = Record<
  string,
  {
    left: number;
    top: number;
    width: number;
    height: number;
    absLeft: number;
    absTop: number;
    backgroundColor?: string;
    /** 组透明；省略时视为 `1`。 */
    opacity?: number;
    /** 与 `ViewStyle.overflow` 一致；省略时绘制侧视为 `visible`。 */
    overflow?: "visible" | "hidden" | "scroll";
    /** 已收缩的圆角半径（px），供 Skia；无圆角时省略。 */
    borderRadiusRx?: number;
    borderRadiusRy?: number;
    nodeKind?: SceneNodeKind;
    textContent?: string;
    textFontSize?: number;
    /** 文本节点外层 `style` 中的排版相关字段，供多 run 与 `textRuns` 合并绘制。 */
    textLayoutStyle?: TextLayoutStyleSnapshot;
    textRuns?: TextFlatRun[];
  }
>;

/** 一次布局提交后的只读快照（供 DOM 调试层等消费）。 */
export type LayoutCommitPayload = {
  viewport: { width: number; height: number };
  rootId: string;
  scene: SceneGraphSnapshot;
  layout: LayoutSnapshot;
};

export type SceneRuntime = {
  getRootId(): string;
  /** 主内容槽位 id，与 {@link SCENE_CONTENT_ID} 相同。 */
  getContentRootId(): string;
  /** 弹窗槽位 id，与 {@link SCENE_MODAL_ID} 相同。 */
  getModalRootId(): string;
  getViewport(): { width: number; height: number };
  dispatchPointerLike(ev: { type: PointerEventType; x: number; y: number }): void;
  /**
   * 指针离开 `<canvas>` 命中区时由 input 层调用：对上一命中叶派发 `pointerleave` 并清空内部 hover 状态。
   */
  notifyPointerLeftStage(x: number, y: number): void;
  insertView(parentId: string, id: string, style: ViewStyle): void;
  /**
   * 插入或更新文本叶节点。`content` 为字符串时与 M1/M2 一致；为 run 数组时走 M3 多样式 Paragraph。
   * 未设置固定 `height`（数字）时由 Yoga `measureFunc` 测量高度。
   */
  insertText(
    parentId: string,
    id: string,
    content: string | readonly TextFlatRun[],
    style: ViewStyle,
  ): void;
  removeView(id: string): void;
  updateStyle(id: string, style: ViewStyle): void;
  /** 局部合并样式（merge）：仅覆盖传入的字段，未传入字段保持原值。命令式场景（如 hover 切换单属性）使用。 */
  patchStyle(id: string, patch: Partial<ViewStyle>): void;
  addListener(
    nodeId: string,
    type: PointerEventType,
    fn: (e: ScenePointerEvent) => void,
    options?: { capture?: boolean; label?: string },
  ): () => void;
  getSceneGraphSnapshot(): SceneGraphSnapshot;
  getLayoutSnapshot(): LayoutSnapshot;
  getLastDispatchTrace(): DispatchTrace;
  /** 场景树中是否已有该 id（供 React 等按序挂载时等待父节点先注册）。 */
  hasSceneNode(id: string): boolean;
  /** 每次内部布局同步完成后调用；注册时立即派发当前一帧。 */
  subscribeAfterLayout(listener: (payload: LayoutCommitPayload) => void): () => void;
};

function normalizeInsertTextContent(content: string | readonly TextFlatRun[]): {
  textContent: string;
  textRuns: TextFlatRun[] | undefined;
} {
  if (typeof content === "string") {
    return { textContent: content, textRuns: undefined };
  }
  const arr = [...content];
  if (arr.length === 0) {
    return { textContent: "", textRuns: undefined };
  }
  return { textContent: joinTextFlatRuns(arr), textRuns: arr };
}

function rebuildYogaStyle(node: SceneNode, store: NodeStore, yoga: Yoga): void {
  // clearYogaLayoutStyle で全プロパティをデフォルトに戻してから再適用する。
  clearYogaLayoutStyle(node.yogaNode);
  if (node.viewStyle) {
    applyStylesToYoga(node.yogaNode, node.viewStyle);
  }
  if ((node.kind ?? "view") === "text") {
    bindTextNodeMeasure(store, yoga, node.id);
  }
}

export async function createSceneRuntime(
  options: CreateSceneRuntimeOptions,
): Promise<SceneRuntime> {
  const yoga = await loadYoga();
  const store: NodeStore = createNodeStore(yoga);
  const registry = createEventRegistry();
  const root = store.createRootNode(options.width, options.height);
  const rootId = root.id;
  let lastTrace: DispatchTrace = { hit: null, targetId: null, entries: [] };
  const layoutListeners = new Set<(payload: LayoutCommitPayload) => void>();

  /** 自上次 `calculateAndSyncLayout` 以来场景树或样式是否已变（干净路径下指针派发跳过 Yoga）。 */
  let layoutDirty = true;
  /** 上一帧命中叶（内部 hover；不对外暴露 getter）。 */
  let lastHitTargetId: string | null = null;

  let apiRef!: SceneRuntime;

  function applyResolvedCursor(): void {
    const canvas = cursorTargetByRuntime.get(apiRef as object) ?? null;
    if (!canvas) {
      return;
    }
    const resolved = resolveCursorFromHitLeaf(lastHitTargetId, store);
    if (canvas.style.cursor !== resolved) {
      canvas.style.cursor = resolved;
    }
  }

  const propagateCtx = { store, registry };

  function buildSceneGraphSnapshot(): SceneGraphSnapshot {
    const nodes: SceneGraphSnapshot["nodes"] = {};
    for (const id of store.getIds()) {
      const n = store.get(id)!;
      const entry: SceneGraphSnapshot["nodes"][string] = {
        parentId: n.parentId,
        children: [...n.children],
      };
      if (n.label !== undefined) entry.label = n.label;
      nodes[id] = entry;
    }
    return { rootId, nodes };
  }

  function buildLayoutSnapshotWithoutRun(): LayoutSnapshot {
    const out: LayoutSnapshot = {};
    for (const id of store.getIds()) {
      const n = store.get(id)!;
      const l = n.layout;
      const abs = absoluteBoundsFor(id, store);
      if (!l || !abs) continue;
      const entry: LayoutSnapshot[string] = {
        left: l.left,
        top: l.top,
        width: l.width,
        height: l.height,
        absLeft: abs.left,
        absTop: abs.top,
      };
      const bg = n.viewStyle?.backgroundColor;
      if (bg !== undefined) entry.backgroundColor = bg;
      const o = clampOpacityForSnapshot(n.viewStyle?.opacity);
      if (o !== undefined) entry.opacity = o;
      const ov = n.viewStyle?.overflow;
      if (ov !== undefined) entry.overflow = ov;
      const br = n.viewStyle?.borderRadius;
      if (br !== undefined) {
        const { rx, ry } = resolveBorderRadiusRxRy(br, l.width, l.height);
        if (rx > 0 || ry > 0) {
          entry.borderRadiusRx = rx;
          entry.borderRadiusRy = ry;
        }
      }
      const nk = n.kind ?? "view";
      entry.nodeKind = nk;
      if (nk === "text" && n.textContent !== undefined) {
        entry.textContent = n.textContent;
        const fs = n.viewStyle?.fontSize;
        if (typeof fs === "number") entry.textFontSize = fs;
        const vs = n.viewStyle;
        if (vs) {
          const tls: Partial<TextLayoutStyleSnapshot> = {};
          if (vs.color !== undefined) tls.color = vs.color;
          if (vs.fontSize !== undefined) tls.fontSize = vs.fontSize;
          if (vs.fontFamily !== undefined) tls.fontFamily = vs.fontFamily;
          if (vs.fontWeight !== undefined) tls.fontWeight = vs.fontWeight;
          if (vs.lineHeight !== undefined) tls.lineHeight = vs.lineHeight;
          if (vs.fontFamilies !== undefined) tls.fontFamilies = vs.fontFamilies;
          if (vs.textAlign !== undefined) tls.textAlign = vs.textAlign;
          if (vs.textDecorationLine !== undefined) tls.textDecorationLine = vs.textDecorationLine;
          if (vs.textDecorationStyle !== undefined)
            tls.textDecorationStyle = vs.textDecorationStyle;
          if (vs.textDecorationThickness !== undefined) {
            tls.textDecorationThickness = vs.textDecorationThickness;
          }
          if (vs.textDecorationColor !== undefined)
            tls.textDecorationColor = vs.textDecorationColor;
          if (vs.letterSpacing !== undefined) tls.letterSpacing = vs.letterSpacing;
          if (vs.wordSpacing !== undefined) tls.wordSpacing = vs.wordSpacing;
          if (vs.fontStyle !== undefined) tls.fontStyle = vs.fontStyle;
          if (Object.keys(tls).length > 0) entry.textLayoutStyle = tls as TextLayoutStyleSnapshot;
        }
        if (n.textRuns !== undefined && n.textRuns.length > 0) {
          entry.textRuns = [...n.textRuns];
        }
      }
      out[id] = entry;
    }
    return out;
  }

  function emitLayoutCommit(): void {
    const payload: LayoutCommitPayload = {
      viewport: { width: options.width, height: options.height },
      rootId,
      scene: buildSceneGraphSnapshot(),
      layout: buildLayoutSnapshotWithoutRun(),
    };
    for (const fn of layoutListeners) {
      fn(payload);
    }
  }

  function runLayout(): void {
    calculateAndSyncLayout(store, rootId, options.width, options.height);
    layoutDirty = false;
    emitLayoutCommit();
  }

  function mergeEntries(a: DispatchTraceEntry[], b: DispatchTraceEntry[]): DispatchTraceEntry[] {
    return [...a, ...b];
  }

  /** 上一命中叶已从树中删除时（例如 React 先 remove 再 insert 同 id）丢弃内部 hover，避免指向悬空 id。 */
  function dropHoverIfTargetMissing(): void {
    if (lastHitTargetId !== null && store.get(lastHitTargetId) === undefined) {
      lastHitTargetId = null;
    }
  }

  /**
   * 命中 + 方案 A 合成 enter/leave + 主事件。顺序：leave → enter → 主类型（同一次调用内）。
   */
  function dispatchPointerPipeline(ev: { type: PointerEventType; x: number; y: number }): void {
    if (layoutDirty) {
      runLayout();
    }
    dropHoverIfTargetMissing();

    const nextLeaf = hitTestAt(ev.x, ev.y, rootId, store);
    const prev = lastHitTargetId;
    let merged: DispatchTraceEntry[] = [];

    if (prev !== nextLeaf) {
      if (prev !== null) {
        const t = propagateScenePointerEvent("pointerleave", ev.x, ev.y, prev, propagateCtx);
        merged = mergeEntries(merged, t.entries);
      }
      if (nextLeaf !== null) {
        const t = propagateScenePointerEvent("pointerenter", ev.x, ev.y, nextLeaf, propagateCtx);
        merged = mergeEntries(merged, t.entries);
      }
      lastHitTargetId = nextLeaf;
    }

    applyResolvedCursor();

    if (ev.type === "pointermove" && nextLeaf === null) {
      lastTrace = { hit: null, targetId: null, entries: merged };
      return;
    }

    if (nextLeaf === null) {
      lastTrace = { hit: null, targetId: null, entries: merged };
      return;
    }

    const main = propagateScenePointerEvent(ev.type, ev.x, ev.y, nextLeaf, propagateCtx);
    lastTrace = {
      hit: nextLeaf,
      targetId: nextLeaf,
      entries: mergeEntries(merged, main.entries),
    };
    /** 主事件内可能 `patchStyle` / 监听器改 cursor，须在回写 `lastTrace` 后再刷一次 DOM。 */
    applyResolvedCursor();
  }

  function installDefaultSceneSlots(): void {
    layoutDirty = true;
    const content = store.createChildAt(rootId, SCENE_CONTENT_ID);
    content.viewStyle = { flex: 1 };
    applyStylesToYoga(content.yogaNode, content.viewStyle);
    const modal = store.createChildAt(rootId, SCENE_MODAL_ID);
    modal.viewStyle = {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      /** 无子节点时若不设为 `none`，全屏槽会挡住 `scene-content` 的命中（见 `hitTestAt`）。Modal 打开时由 React 侧 `patchStyle` 改回 `auto`。 */
      pointerEvents: "none",
    };
    applyStylesToYoga(modal.yogaNode, modal.viewStyle);
    runLayout();
  }

  installDefaultSceneSlots();

  apiRef = {
    getRootId: () => rootId,
    getContentRootId: () => SCENE_CONTENT_ID,
    getModalRootId: () => SCENE_MODAL_ID,
    getViewport: () => ({ width: options.width, height: options.height }),

    dispatchPointerLike(ev) {
      dispatchPointerPipeline(ev);
    },

    notifyPointerLeftStage(x, y) {
      if (layoutDirty) {
        runLayout();
      }
      dropHoverIfTargetMissing();
      if (lastHitTargetId === null) {
        return;
      }
      const prev = lastHitTargetId;
      lastHitTargetId = null;
      lastTrace = propagateScenePointerEvent("pointerleave", x, y, prev, propagateCtx);
      applyResolvedCursor();
    },

    insertView(parentId, id, style) {
      layoutDirty = true;
      const existing = store.get(id);
      if (existing) {
        existing.viewStyle = { ...existing.viewStyle, ...style };
        rebuildYogaStyle(existing, store, yoga);
        runLayout();
        applyResolvedCursor();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.viewStyle = { ...style };
      applyStylesToYoga(n.yogaNode, n.viewStyle);
      runLayout();
      applyResolvedCursor();
    },

    insertText(parentId, id, content, style) {
      layoutDirty = true;
      const { textContent, textRuns } = normalizeInsertTextContent(content);
      const existing = store.get(id);
      if (existing) {
        if (existing.kind !== "text") {
          throw new Error(`insertText: node "${id}" exists but is not a text node`);
        }
        existing.textContent = textContent;
        existing.textRuns = textRuns;
        existing.viewStyle = { ...existing.viewStyle, ...style };
        rebuildYogaStyle(existing, store, yoga);
        runLayout();
        applyResolvedCursor();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.kind = "text";
      n.textContent = textContent;
      n.textRuns = textRuns;
      n.viewStyle = { ...style };
      rebuildYogaStyle(n, store, yoga);
      runLayout();
      applyResolvedCursor();
    },

    removeView(id) {
      if (id === rootId) {
        throw new Error("removeView: cannot remove root");
      }
      if (id === SCENE_CONTENT_ID || id === SCENE_MODAL_ID) {
        throw new Error(`removeView: cannot remove scene slot "${id}"`);
      }
      layoutDirty = true;
      store.removeNode(id);
      runLayout();
      applyResolvedCursor();
    },

    updateStyle(id, style) {
      const n = store.get(id);
      if (!n) return;
      layoutDirty = true;
      n.viewStyle = { ...style };
      rebuildYogaStyle(n, store, yoga);
      runLayout();
      applyResolvedCursor();
    },

    patchStyle(id, patch) {
      const n = store.get(id);
      if (!n) return;
      layoutDirty = true;
      n.viewStyle = { ...n.viewStyle, ...patch };
      rebuildYogaStyle(n, store, yoga);
      runLayout();
      applyResolvedCursor();
    },

    addListener(nodeId, type, fn, opts) {
      return registry.addListener(nodeId, type, fn, opts);
    },

    getSceneGraphSnapshot(): SceneGraphSnapshot {
      return buildSceneGraphSnapshot();
    },

    getLayoutSnapshot(): LayoutSnapshot {
      if (layoutDirty) {
        runLayout();
      }
      return buildLayoutSnapshotWithoutRun();
    },

    getLastDispatchTrace() {
      return lastTrace;
    },

    hasSceneNode(id) {
      return store.get(id) !== undefined;
    },

    subscribeAfterLayout(listener) {
      layoutListeners.add(listener);
      emitLayoutCommit();
      return () => {
        layoutListeners.delete(listener);
      };
    },
  };

  return apiRef;
}
