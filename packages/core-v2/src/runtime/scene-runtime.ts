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
import type { ImageObjectFit } from "../media/image-object-fit.ts";
import { getOrStartInflightDecode, normalizeUriKey } from "../media/image-uri-cache.ts";
import { parseSvgViewBox } from "../media/view-box.ts";
import { initCanvasKit } from "../render/canvaskit.ts";
import type { SceneNode, SceneNodeKind } from "../scene/scene-node.ts";
import type { TextFlatRun } from "../text/text-flat-run.ts";
import { joinTextFlatRuns } from "../text/text-flat-run.ts";
import { createNodeStore, type NodeStore } from "./node-store.ts";

const SCROLL_DRAG_THRESHOLD_PX = 5;

function stageBoundsContain(
  x: number,
  y: number,
  b: { left: number; top: number; width: number; height: number },
): boolean {
  return x >= b.left && x < b.left + b.width && y >= b.top && y < b.top + b.height;
}

/** 可滚动距离：首子内容高度减视口高度（Yoga 布局盒）。 */
export function maxScrollYForNode(store: NodeStore, scrollId: string): number {
  const sv = store.get(scrollId);
  if (!sv || (sv.kind ?? "view") !== "scrollView" || sv.children.length < 1) return 0;
  const inner = store.get(sv.children[0]!);
  if (!inner?.layout || !sv.layout) return 0;
  return Math.max(0, inner.layout.height - sv.layout.height);
}

function nodeDepthFromRoot(store: NodeStore, id: string, rootId: string): number {
  let d = 0;
  let cur: string | null = id;
  while (cur !== null && cur !== rootId) {
    d += 1;
    cur = store.get(cur)?.parentId ?? null;
  }
  return d;
}

/** 命中点下、可纵向滚动且 `maxScrollY>0` 的最深 `scrollView`（V1 无嵌套时唯一）。 */
function findDeepestScrollViewAtPoint(
  store: NodeStore,
  rootId: string,
  x: number,
  y: number,
): string | null {
  let best: string | null = null;
  let bestDepth = -1;
  for (const id of store.getIds()) {
    const n = store.get(id);
    if (!n || (n.kind ?? "view") !== "scrollView") continue;
    if (maxScrollYForNode(store, id) <= 0) continue;
    const b = absoluteBoundsFor(id, store);
    if (!b) continue;
    if (!stageBoundsContain(x, y, b)) continue;
    const depth = nodeDepthFromRoot(store, id, rootId);
    if (depth > bestDepth) {
      bestDepth = depth;
      best = id;
    }
  }
  return best;
}

/** 自叶向根，第一个可滚的 `scrollView` 祖先（最深包裹）；叶本身为可滚 `scrollView` 时返回其 id。 */
function deepestScrollAncestorOfLeaf(store: NodeStore, leafId: string | null): string | null {
  if (leafId === null) return null;
  const leaf = store.get(leafId);
  if (leaf && (leaf.kind ?? "view") === "scrollView" && maxScrollYForNode(store, leafId) > 0) {
    return leafId;
  }
  let id: string | null = leafId;
  while (id !== null) {
    const n = store.get(id);
    const pid = n?.parentId ?? null;
    if (pid === null) break;
    const p = store.get(pid);
    if (p && (p.kind ?? "view") === "scrollView" && maxScrollYForNode(store, pid) > 0) {
      return pid;
    }
    id = pid;
  }
  return null;
}

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

export type InsertImageOptions = {
  uri: string;
  objectFit?: ImageObjectFit;
  style: ViewStyle;
  onLoad?: () => void;
  onError?: (err: unknown) => void;
};

export type InsertSvgPathOptions = {
  d: string;
  viewBox?: string;
  style: ViewStyle;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  onError?: (err: unknown) => void;
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
    /** 四边相同边框宽（px），来自 Yoga 参与布局后的 `ViewStyle.borderWidth`；无或 0 时省略。 */
    borderWidth?: number;
    /** 边框颜色串；与 {@link ViewStyle.borderColor} 一致，无描边需求时省略。 */
    borderColor?: string;
    nodeKind?: SceneNodeKind;
    textContent?: string;
    textFontSize?: number;
    /** 文本节点外层 `style` 中的排版相关字段，供多 run 与 `textRuns` 合并绘制。 */
    textLayoutStyle?: TextLayoutStyleSnapshot;
    textRuns?: TextFlatRun[];
    /** 仅 `scrollView`；纵向滚动偏移（px）。 */
    scrollY?: number;
    /** `image` */
    imageUri?: string;
    imageObjectFit?: ImageObjectFit;
    /** `svgPath`（仅 viewBox 与 `d` 均有效时写入，供 Skia 绘制） */
    svgPathD?: string;
    svgPathViewBoxMinX?: number;
    svgPathViewBoxMinY?: number;
    svgPathViewBoxWidth?: number;
    svgPathViewBoxHeight?: number;
    svgStroke?: string;
    svgFill?: string;
    svgStrokeWidth?: number;
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
  dispatchPointerLike(ev: {
    type: PointerEventType;
    x: number;
    y: number;
    /** `pointermove` / `pointerdown` 等由 DOM 传入的 `buttons`（主键为 `1`）。 */
    buttons?: number;
  }): void;
  /** 滚轮（策略 B：`passive` 监听，不 `preventDefault`）。 */
  dispatchWheel(ev: { x: number; y: number; deltaY: number }): void;
  /**
   * 指针离开 `<canvas>` 命中区时由 input 层调用：对上一命中叶派发 `pointerleave` 并清空内部 hover 状态。
   */
  notifyPointerLeftStage(x: number, y: number): void;
  insertView(parentId: string, id: string, style: ViewStyle): void;
  /** 插入纵向滚动容器；`scrollY` 初值为 `0`，默认 `overflow: "hidden"` 与传入 `style` 合并。 */
  insertScrollView(parentId: string, id: string, style: ViewStyle): void;
  /** 增加纵向滚动偏移（px），钳制后 **不重跑 Yoga**，仅 `emitLayoutCommit`。 */
  addScrollY(id: string, deltaY: number): void;
  /** 设置纵向滚动绝对位置（px），钳制到 `[0, maxScrollY]`；不重跑 Yoga。 */
  setScrollY(id: string, y: number): void;
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
  insertImage(parentId: string, id: string, options: InsertImageOptions): void;
  insertSvgPath(parentId: string, id: string, options: InsertSvgPathOptions): void;
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
  /**
   * 注入像素级命中解析器（由 `attachSceneSkiaPresenter` 在 pick buffer 就绪后注入）。
   * 传入 `null` 时回退到 `hitTestAt`（CPU 布局盒命中）。
   */
  setHitResolver(fn: ((x: number, y: number) => string | null) | null): void;
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
  /** 取消「忽略异步解码结果」：`fetch` 仍可能完成，但不再 `onLoad` / `emitLayoutCommit`。 */
  const imageDecodeAbortByNode = new Map<string, AbortController>();

  function cancelImageDecode(nodeId: string): void {
    const ac = imageDecodeAbortByNode.get(nodeId);
    ac?.abort();
    imageDecodeAbortByNode.delete(nodeId);
  }

  function scheduleImageDecode(
    id: string,
    uri: string,
    onLoad?: () => void,
    onError?: (err: unknown) => void,
  ): void {
    cancelImageDecode(id);
    const ac = new AbortController();
    imageDecodeAbortByNode.set(id, ac);
    const key = normalizeUriKey(uri);
    void (async () => {
      try {
        const ck = await initCanvasKit();
        const img = await getOrStartInflightDecode(key, uri, ck, fetch);
        if (ac.signal.aborted) {
          return;
        }
        const node = store.get(id);
        if (!node || (node.kind ?? "view") !== "image" || node.imageUri !== uri) {
          return;
        }
        if (!img) {
          onError?.(new Error("[@react-canvas/core-v2] image decode returned null"));
          return;
        }
        onLoad?.();
        emitLayoutCommit();
      } catch (e) {
        if (!ac.signal.aborted) {
          onError?.(e);
        }
      }
    })();
  }

  /** 自上次 `calculateAndSyncLayout` 以来场景树或样式是否已变（干净路径下指针派发跳过 Yoga）。 */
  let layoutDirty = true;
  let hitResolver: ((x: number, y: number) => string | null) | null = null;
  /** 上一帧命中叶（内部 hover；不对外暴露 getter）。 */
  let lastHitTargetId: string | null = null;

  type ScrollDragState =
    | { kind: "idle" }
    | {
        kind: "track";
        scrollId: string;
        startX: number;
        startY: number;
        lastY: number;
      }
    | { kind: "dragging"; scrollId: string; lastY: number };

  let scrollDrag: ScrollDragState = { kind: "idle" };
  let suppressNextClick = false;

  let apiRef!: SceneRuntime;

  function applyScrollDelta(scrollId: string, deltaY: number): void {
    const n = store.get(scrollId);
    if (!n || (n.kind ?? "view") !== "scrollView") return;
    const maxY = maxScrollYForNode(store, scrollId);
    const cur = typeof n.scrollY === "number" && Number.isFinite(n.scrollY) ? n.scrollY : 0;
    const next = Math.min(maxY, Math.max(0, cur + deltaY));
    if (next === cur) return;
    n.scrollY = next;
    emitLayoutCommit();
  }

  function setScrollYPosition(scrollId: string, y: number): void {
    const n = store.get(scrollId);
    if (!n || (n.kind ?? "view") !== "scrollView") return;
    if (scrollDrag.kind !== "idle" && scrollDrag.scrollId === scrollId) {
      scrollDrag = { kind: "idle" };
    }
    const maxY = maxScrollYForNode(store, scrollId);
    const cur = typeof n.scrollY === "number" && Number.isFinite(n.scrollY) ? n.scrollY : 0;
    const next = Math.min(maxY, Math.max(0, y));
    if (next === cur) return;
    n.scrollY = next;
    emitLayoutCommit();
  }

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
      const bdw = n.viewStyle?.borderWidth;
      if (typeof bdw === "number" && Number.isFinite(bdw) && bdw > 0) {
        entry.borderWidth = bdw;
        const bc = n.viewStyle?.borderColor;
        if (bc !== undefined) entry.borderColor = bc;
      }
      const nk = n.kind ?? "view";
      entry.nodeKind = nk;
      if (nk === "scrollView") {
        entry.scrollY = typeof n.scrollY === "number" && Number.isFinite(n.scrollY) ? n.scrollY : 0;
      }
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
      if (nk === "image" && n.imageUri !== undefined) {
        entry.imageUri = n.imageUri;
        entry.imageObjectFit = n.imageObjectFit ?? "contain";
      }
      if (nk === "svgPath") {
        const d = n.svgPathD;
        const pr = parseSvgViewBox(n.svgViewBox);
        if (pr.ok && typeof d === "string" && d.length > 0) {
          entry.svgPathD = d;
          entry.svgPathViewBoxMinX = pr.minX;
          entry.svgPathViewBoxMinY = pr.minY;
          entry.svgPathViewBoxWidth = pr.width;
          entry.svgPathViewBoxHeight = pr.height;
          if (n.svgStroke !== undefined) {
            entry.svgStroke = n.svgStroke;
          }
          if (n.svgFill !== undefined) {
            entry.svgFill = n.svgFill;
          }
          if (typeof n.svgStrokeWidth === "number" && Number.isFinite(n.svgStrokeWidth)) {
            entry.svgStrokeWidth = n.svgStrokeWidth;
          }
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
  function dispatchPointerPipeline(ev: {
    type: PointerEventType;
    x: number;
    y: number;
    buttons?: number;
  }): void {
    if (layoutDirty) {
      runLayout();
    }
    dropHoverIfTargetMissing();

    const buttons = ev.buttons ?? 0;

    if (ev.type === "click" && suppressNextClick) {
      suppressNextClick = false;
      lastTrace = { hit: null, targetId: null, entries: [] };
      return;
    }

    if (ev.type === "pointermove" && scrollDrag.kind === "track" && (buttons & 1) === 1) {
      const d = scrollDrag;
      const dist = Math.hypot(ev.x - d.startX, ev.y - d.startY);
      if (dist > SCROLL_DRAG_THRESHOLD_PX) {
        scrollDrag = { kind: "dragging", scrollId: d.scrollId, lastY: d.lastY };
      }
    }

    if (ev.type === "pointermove" && scrollDrag.kind === "dragging") {
      const d = scrollDrag;
      applyScrollDelta(d.scrollId, ev.y - d.lastY);
      scrollDrag = { kind: "dragging", scrollId: d.scrollId, lastY: ev.y };
      lastHitTargetId = hitResolver
        ? hitResolver(ev.x, ev.y)
        : hitTestAt(ev.x, ev.y, rootId, store);
      applyResolvedCursor();
      lastTrace = { hit: null, targetId: null, entries: [] };
      return;
    }

    const nextLeaf = hitResolver ? hitResolver(ev.x, ev.y) : hitTestAt(ev.x, ev.y, rootId, store);
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

    if (ev.type === "pointerdown") {
      const s = deepestScrollAncestorOfLeaf(store, nextLeaf);
      if (s !== null && nextLeaf !== null) {
        scrollDrag = {
          kind: "track",
          scrollId: s,
          startX: ev.x,
          startY: ev.y,
          lastY: ev.y,
        };
      } else {
        scrollDrag = { kind: "idle" };
      }
    }

    if (ev.type === "pointerup") {
      if (scrollDrag.kind === "dragging") {
        suppressNextClick = true;
      }
      scrollDrag = { kind: "idle" };
    }

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

    insertScrollView(parentId, id, style) {
      layoutDirty = true;
      const existing = store.get(id);
      if (existing) {
        if ((existing.kind ?? "view") !== "scrollView") {
          throw new Error(`insertScrollView: node "${id}" exists but is not a scrollView`);
        }
        existing.viewStyle = { overflow: "hidden", ...style };
        rebuildYogaStyle(existing, store, yoga);
        runLayout();
        applyResolvedCursor();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.kind = "scrollView";
      n.scrollY = 0;
      n.viewStyle = { overflow: "hidden", ...style };
      applyStylesToYoga(n.yogaNode, n.viewStyle);
      runLayout();
      applyResolvedCursor();
    },

    addScrollY(id, deltaY) {
      if (layoutDirty) {
        runLayout();
      }
      applyScrollDelta(id, deltaY);
      applyResolvedCursor();
    },

    setScrollY(id, y) {
      if (layoutDirty) {
        runLayout();
      }
      setScrollYPosition(id, y);
      applyResolvedCursor();
    },

    dispatchWheel(ev) {
      if (layoutDirty) {
        runLayout();
      }
      const sid = findDeepestScrollViewAtPoint(store, rootId, ev.x, ev.y);
      if (sid === null) {
        return;
      }
      applyScrollDelta(sid, ev.deltaY);
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
        /**
         * 文本内在尺寸变化时，带 measure 的叶需失效测量缓存；否则父 flex 行可能仍按旧宽度分配空间
         *（如 i18n 切换后标签变长被挤压换行）。Yoga 3：仅 **仍挂有 measureFunc** 的叶可安全 `markDirty`；
         * 固定数字 `height` 的路径会 `unsetMeasureFunc`，对其 `markDirty` 会 wasm abort。
         */
        const fixedH = existing.viewStyle?.height;
        if (!(typeof fixedH === "number" && Number.isFinite(fixedH))) {
          existing.yogaNode.markDirty();
        }
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

    insertImage(parentId, id, options) {
      const { uri, objectFit = "contain", style, onLoad, onError } = options;
      layoutDirty = true;
      const existing = store.get(id);
      if (existing) {
        if (existing.kind !== "image") {
          throw new Error(`insertImage: node "${id}" exists but is not an image`);
        }
        const prevUri = existing.imageUri;
        existing.imageUri = uri;
        existing.imageObjectFit = objectFit;
        existing.viewStyle = { ...existing.viewStyle, ...style };
        rebuildYogaStyle(existing, store, yoga);
        runLayout();
        if (prevUri !== uri) {
          scheduleImageDecode(id, uri, onLoad, onError);
        }
        applyResolvedCursor();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.kind = "image";
      n.imageUri = uri;
      n.imageObjectFit = objectFit;
      n.viewStyle = { ...style };
      rebuildYogaStyle(n, store, yoga);
      runLayout();
      scheduleImageDecode(id, uri, onLoad, onError);
      applyResolvedCursor();
    },

    insertSvgPath(parentId, id, options) {
      const { d, viewBox, style, stroke, fill, strokeWidth, onError } = options;
      const parsed = parseSvgViewBox(viewBox);
      if (!parsed.ok) {
        onError?.(new Error("[@react-canvas/core-v2] invalid viewBox"));
      }
      layoutDirty = true;
      const existing = store.get(id);
      if (existing) {
        if (existing.kind !== "svgPath") {
          throw new Error(`insertSvgPath: node "${id}" exists but is not an svgPath`);
        }
        existing.svgPathD = d;
        existing.svgViewBox = viewBox;
        existing.svgStroke = stroke;
        existing.svgFill = fill;
        existing.svgStrokeWidth = strokeWidth;
        existing.viewStyle = { ...existing.viewStyle, ...style };
        rebuildYogaStyle(existing, store, yoga);
        runLayout();
        applyResolvedCursor();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.kind = "svgPath";
      n.svgPathD = d;
      n.svgViewBox = viewBox;
      n.svgStroke = stroke;
      n.svgFill = fill;
      n.svgStrokeWidth = strokeWidth;
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
      cancelImageDecode(id);
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

    setHitResolver(fn) {
      hitResolver = fn;
    },
  };

  return apiRef;
}
