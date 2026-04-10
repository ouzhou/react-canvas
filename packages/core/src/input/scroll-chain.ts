import type { ScrollViewNode } from "../scene/scroll-view-node.ts";
import type { ViewNode } from "../scene/view-node.ts";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 自叶向根收集 `ScrollView` 祖先，**内层在前**（与 `core-design.md` §17.4 一致）。 */
export function buildScrollViewChainFromHit(hit: ViewNode | null): ScrollViewNode[] {
  const chain: ScrollViewNode[] = [];
  let n: ViewNode | null = hit;
  while (n) {
    if (n.type === "ScrollView") {
      chain.push(n as ScrollViewNode);
    }
    n = n.parent;
  }
  return chain;
}

function scrollMetrics(sv: ScrollViewNode): { maxX: number; maxY: number } {
  const first = sv.children[0] as ViewNode | undefined;
  const contentW = first ? first.layout.width : 0;
  const contentH = first ? first.layout.height : 0;
  const vpW = sv.layout.width;
  const vpH = sv.layout.height;
  return {
    maxX: Math.max(0, contentW - vpW),
    maxY: Math.max(0, contentH - vpH),
  };
}

/**
 * 尝试在单个 `ScrollView` 上消费滚轮增量；与 `core-design.md` §17.3、§17.6 一致。
 * - 垂直：只动 `scrollY`，`deltaX` 原样剩余。
 * - `horizontal`：只动 `scrollX`，`deltaY` 原样剩余。
 */
export function consumeScroll(
  sv: ScrollViewNode,
  deltaX: number,
  deltaY: number,
): { remainX: number; remainY: number } {
  const { maxX, maxY } = scrollMetrics(sv);
  const sx0 = sv.scrollX;
  const sy0 = sv.scrollY;

  if (sv.horizontal) {
    sv.scrollX = clamp(sx0 + deltaX, 0, maxX);
  } else {
    sv.scrollY = clamp(sy0 + deltaY, 0, maxY);
  }
  sv.clampScrollOffsetsAfterLayout();

  return {
    remainX: deltaX - (sv.scrollX - sx0),
    remainY: deltaY - (sv.scrollY - sy0),
  };
}

export type WheelScrollChainResult = {
  /** 命中点处于某 `ScrollView` 子树内（用于 `preventDefault`） */
  inScrollView: boolean;
  /** 是否改变了任一祖先的 `scrollX`/`scrollY` */
  didScroll: boolean;
};

/**
 * 自内向外链式消费滚轮；`overscrollBehavior` 为 `contain`/`none` 时在边界处停止向上传递（§17.5）。
 */
export function applyWheelToScrollViewChain(
  hit: ViewNode | null,
  deltaX: number,
  deltaY: number,
): WheelScrollChainResult {
  const chain = buildScrollViewChainFromHit(hit);
  if (chain.length === 0) {
    return { inScrollView: false, didScroll: false };
  }

  let remain = { remainX: deltaX, remainY: deltaY };
  let didScroll = false;

  for (const sv of chain) {
    if (remain.remainX === 0 && remain.remainY === 0) break;

    const rx0 = remain.remainX;
    const ry0 = remain.remainY;
    const sx = sv.scrollX;
    const sy = sv.scrollY;

    remain = consumeScroll(sv, remain.remainX, remain.remainY);

    if (sv.scrollX !== sx || sv.scrollY !== sy) {
      didScroll = true;
    }

    const ob = sv.overscrollBehavior ?? "auto";
    if (ob !== "auto") {
      const intentOnAxis = sv.horizontal ? rx0 !== 0 : ry0 !== 0;
      const consumedOnAxis = sv.horizontal
        ? rx0 - remain.remainX !== 0
        : ry0 - remain.remainY !== 0;
      if (intentOnAxis && !consumedOnAxis) {
        break;
      }
    }
  }

  return { inScrollView: true, didScroll };
}
