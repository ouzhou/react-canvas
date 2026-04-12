/**
 * 将 `@lucide/icons` 单图标的 `node` 数组转为单条 SVG path `d`（path 拼接 + circle 近似为弧）。
 * 与 Lucide 规格一致：多段合并为一条 `SvgPath` 的 `d`。
 */
export type LucideIconTuple = readonly [string, Record<string, string | number | undefined>];

function circleToD(cx: number, cy: number, r: number): string {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) {
    return "";
  }
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
}

function walk(nodes: readonly LucideIconTuple[]): string[] {
  const parts: string[] = [];
  for (const [tag, attrs] of nodes) {
    if (tag === "path" && typeof attrs.d === "string" && attrs.d.length > 0) {
      parts.push(attrs.d);
    } else if (tag === "circle") {
      const cx = Number(attrs.cx);
      const cy = Number(attrs.cy);
      const r = Number(attrs.r);
      const d = circleToD(cx, cy, r);
      if (d) {
        parts.push(d);
      }
    }
  }
  return parts;
}

export function lucideIconNodesToPathD(nodes: readonly LucideIconTuple[]): string {
  return walk(nodes).join(" ");
}
