import type { PointerEventType, ScenePointerEvent } from "./scene-event.ts";

type Bucket = {
  capture: Array<{ fn: (e: ScenePointerEvent) => void; label: string }>;
  bubble: Array<{ fn: (e: ScenePointerEvent) => void; label: string }>;
};

export type EventRegistry = {
  addListener(
    nodeId: string,
    type: PointerEventType,
    fn: (e: ScenePointerEvent) => void,
    options?: { capture?: boolean; label?: string },
  ): () => void;
  /** @internal */
  getListeners(nodeId: string, type: PointerEventType): Bucket;
};

export function createEventRegistry(): EventRegistry {
  const map = new Map<string, Map<PointerEventType, Bucket>>();

  function bucketFor(nodeId: string, type: PointerEventType): Bucket {
    let n = map.get(nodeId);
    if (!n) {
      n = new Map();
      map.set(nodeId, n);
    }
    let b = n.get(type);
    if (!b) {
      b = { capture: [], bubble: [] };
      n.set(type, b);
    }
    return b;
  }

  return {
    addListener(nodeId, type, fn, options) {
      const capture = options?.capture === true;
      const label = options?.label ?? (fn.name || "anonymous");
      const b = bucketFor(nodeId, type);
      const arr = capture ? b.capture : b.bubble;
      const entry = { fn, label };
      arr.push(entry);
      return () => {
        const i = arr.indexOf(entry);
        if (i !== -1) arr.splice(i, 1);
      };
    },
    getListeners(nodeId, type) {
      const b = map.get(nodeId)?.get(type);
      return b ?? { capture: [], bubble: [] };
    },
  };
}
