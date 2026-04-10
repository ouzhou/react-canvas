import { calculateAndSyncLayout } from "../layout/layout-sync.ts";
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
  const { store, rootId, registry, viewportWidth, viewportHeight } = ctx;
  calculateAndSyncLayout(store, rootId, viewportWidth, viewportHeight);

  const targetId = hitTestAt(input.x, input.y, rootId, store);
  const entries: DispatchTraceEntry[] = [];

  if (targetId === null) {
    return { hit: null, targetId: null, entries: [] };
  }

  const path = pathRootToTarget(targetId, store);
  const ev = new ScenePointerEvent(input.type, input.x, input.y, targetId);

  function runPhase(phase: "capture" | "bubble", order: string[]): void {
    for (const nodeId of order) {
      if (ev.getPropagationStopped()) return;
      ev.phase = phase;
      ev.currentTargetId = nodeId;
      const b = registry.getListeners(nodeId, input.type);
      const list = phase === "capture" ? b.capture : b.bubble;
      for (const { fn, label } of list) {
        if (ev.getPropagationStopped()) return;
        fn(ev);
        entries.push({ phase, nodeId, type: input.type, label });
      }
    }
  }

  runPhase("capture", path);
  runPhase("bubble", [...path].reverse());

  return { hit: targetId, targetId, entries };
}
