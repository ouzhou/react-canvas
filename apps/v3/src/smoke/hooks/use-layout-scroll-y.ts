import type { SceneRuntime } from "@react-canvas/core-v2";
import { useLayoutEffect, useRef, useState } from "react";

import { useSceneRuntime } from "@react-canvas/react-v2";

/**
 * 订阅布局提交（含 ScrollView 的 `scrollY` 变化），返回该滚动容器的当前 `scrollY`（px）。
 *
 * core-v2 暂无 `onScroll` 回调；滚动通过 `emitLayoutCommit` 反映到 {@link SceneRuntime.getLayoutSnapshot}。
 */
export function useLayoutScrollY(scrollNodeId: string): number {
  const rt = useSceneRuntime();
  const [y, setY] = useState(0);
  const prevRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    prevRef.current = null;
    const update = () => {
      const next = readScrollY(rt, scrollNodeId);
      if (prevRef.current !== next) {
        prevRef.current = next;
        setY(next);
      }
    };
    update();
    return rt.subscribeAfterLayout(update);
  }, [rt, scrollNodeId]);

  return y;
}

function readScrollY(rt: SceneRuntime, scrollNodeId: string): number {
  const snap = rt.getLayoutSnapshot();
  const raw = snap[scrollNodeId]?.scrollY;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}
