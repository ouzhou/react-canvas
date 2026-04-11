import { hitTestAt } from "../hit/hit-test.ts";
import type { NodeStore } from "../runtime/node-store.ts";
import type { EventRegistry } from "./event-registry.ts";
import { ScenePointerEvent, type PointerEventType } from "./scene-event.ts";

export type DispatchTraceEntry = {
  phase: "capture" | "bubble";
  nodeId: string;
  type: PointerEventType;
  label: string;
};

export type DispatchTrace = {
  hit: string | null;
  targetId: string | null;
  entries: DispatchTraceEntry[];
};

const emptyTrace = (): DispatchTrace => ({ hit: null, targetId: null, entries: [] });

function pathRootToTarget(targetId: string, store: NodeStore): string[] {
  const rev: string[] = [];
  let id: string | null = targetId;
  while (id !== null) {
    rev.push(id);
    const n = store.get(id);
    id = n?.parentId ?? null;
  }
  return rev.reverse();
}

export type PropagateCtx = {
  store: NodeStore;
  registry: EventRegistry;
};

/**
 * 沿 root→target 路径派发单次指针事件（捕获→冒泡）。不调用 Yoga；调用方须保证 `node.layout` 已同步。
 */
export function propagateScenePointerEvent(
  type: PointerEventType,
  x: number,
  y: number,
  targetId: string,
  ctx: PropagateCtx,
): DispatchTrace {
  const { store, registry } = ctx;
  const entries: DispatchTraceEntry[] = [];
  const path = pathRootToTarget(targetId, store);
  const ev = new ScenePointerEvent(type, x, y, targetId);

  function runPhase(phase: "capture" | "bubble", order: string[]): void {
    for (const nodeId of order) {
      if (ev.getPropagationStopped()) return;
      ev.phase = phase;
      ev.currentTargetId = nodeId;
      const b = registry.getListeners(nodeId, type);
      const list = phase === "capture" ? b.capture : b.bubble;
      for (const { fn, label } of list) {
        if (ev.getPropagationStopped()) return;
        fn(ev);
        entries.push({ phase, nodeId, type, label });
      }
    }
  }

  runPhase("capture", path);
  runPhase("bubble", [...path].reverse());

  return { hit: targetId, targetId, entries };
}

/**
 * 命中一次并沿路径派发 **单个** 事件类型（无 enter/leave 合成、无 Yoga）。
 * 调用方须先 `calculateAndSyncLayout`（或经 `SceneRuntime` 保证布局已同步）。
 */
export function dispatchPointerLike(
  input: { type: PointerEventType; x: number; y: number },
  ctx: {
    store: NodeStore;
    rootId: string;
    registry: EventRegistry;
    viewportWidth: number;
    viewportHeight: number;
  },
): DispatchTrace {
  const { store, rootId } = ctx;
  const targetId = hitTestAt(input.x, input.y, rootId, store);
  if (targetId === null) {
    return emptyTrace();
  }
  return propagateScenePointerEvent(input.type, input.x, input.y, targetId, {
    store,
    registry: ctx.registry,
  });
}
