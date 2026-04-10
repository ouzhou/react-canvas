import { dispatchPointerLike, type DispatchTrace } from "../events/dispatch.ts";
import { createEventRegistry } from "../events/event-registry.ts";
import type { ScenePointerEvent } from "../events/scene-event.ts";
import type { PointerEventType } from "../events/scene-event.ts";
import { absoluteBoundsFor, calculateAndSyncLayout } from "../layout/layout-sync.ts";
import { applyStylesToYoga, type ViewStyle } from "../layout/style-map.ts";
import { loadYoga } from "../layout/yoga.ts";
import type { SceneNode } from "../scene/scene-node.ts";
import { applyRNLayoutDefaults, createNodeStore, type NodeStore } from "./node-store.ts";

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
  { left: number; top: number; width: number; height: number; absLeft: number; absTop: number }
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
  getViewport(): { width: number; height: number };
  dispatchPointerLike(ev: { type: PointerEventType; x: number; y: number }): void;
  insertView(parentId: string, id: string, style: ViewStyle): void;
  removeView(id: string): void;
  updateStyle(id: string, patch: Partial<ViewStyle>): void;
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

function rebuildYogaStyle(node: SceneNode): void {
  node.yogaNode.reset();
  applyRNLayoutDefaults(node.yogaNode);
  if (node.viewStyle) {
    applyStylesToYoga(node.yogaNode, node.viewStyle);
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
      out[id] = {
        left: l.left,
        top: l.top,
        width: l.width,
        height: l.height,
        absLeft: abs.left,
        absTop: abs.top,
      };
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
    emitLayoutCommit();
  }

  runLayout();

  return {
    getRootId: () => rootId,
    getViewport: () => ({ width: options.width, height: options.height }),

    dispatchPointerLike(ev) {
      lastTrace = dispatchPointerLike(ev, {
        store,
        rootId,
        registry,
        viewportWidth: options.width,
        viewportHeight: options.height,
      });
    },

    insertView(parentId, id, style) {
      const existing = store.get(id);
      if (existing) {
        existing.viewStyle = { ...existing.viewStyle, ...style };
        rebuildYogaStyle(existing);
        runLayout();
        return;
      }
      const n = store.createChildAt(parentId, id);
      n.viewStyle = { ...style };
      applyStylesToYoga(n.yogaNode, n.viewStyle);
      runLayout();
    },

    removeView(id) {
      if (id === rootId) {
        throw new Error("removeView: cannot remove root");
      }
      store.removeNode(id);
      runLayout();
    },

    updateStyle(id, patch) {
      const n = store.get(id);
      if (!n) return;
      n.viewStyle = { ...n.viewStyle, ...patch };
      rebuildYogaStyle(n);
      runLayout();
    },

    addListener(nodeId, type, fn, opts) {
      return registry.addListener(nodeId, type, fn, opts);
    },

    getSceneGraphSnapshot(): SceneGraphSnapshot {
      return buildSceneGraphSnapshot();
    },

    getLayoutSnapshot(): LayoutSnapshot {
      runLayout();
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
}
