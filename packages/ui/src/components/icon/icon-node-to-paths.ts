/**
 * Lucide `IconNode`: tuples of [tagName, attrs] (see `@lucide/icons`).
 */
export type LucideIconNode = [string, Record<string, string | number>][];

export type LucideIconData = {
  name: string;
  node: LucideIconNode;
  size?: number;
};

export type PathPayload = { d: string };

function num(v: string | number | undefined): number | null {
  if (v === undefined) {
    return null;
  }
  if (typeof v === "number" && !Number.isNaN(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

/** Full circle as two 180° arcs (valid SVG path). */
export function circleToPath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
}

/**
 * Turn Lucide `icon.node` into one or more `d` strings (then typically joined for one `<SvgPath>`).
 */
export function iconNodeToPathPayloads(data: LucideIconData): PathPayload[] {
  const out: PathPayload[] = [];
  for (const [tag, attrs] of data.node) {
    if (tag === "path") {
      const d = attrs.d;
      if (typeof d === "string" && d.length > 0) {
        out.push({ d });
      }
    } else if (tag === "circle") {
      const cx = num(attrs.cx);
      const cy = num(attrs.cy);
      const r = num(attrs.r);
      if (cx !== null && cy !== null && r !== null && r > 0) {
        out.push({ d: circleToPath(cx, cy, r) });
      }
    }
  }
  return out;
}

export function mergePathDs(payloads: PathPayload[]): string {
  return payloads
    .map((p) => p.d.trim())
    .filter(Boolean)
    .join(" ");
}
