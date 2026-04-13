/**
 * Lucide `IconNode`: [tagName, attrs] tuples from `@lucide/icons`.
 */
export type LucideIconTuple = readonly [string, Record<string, string | number | undefined>];

export type LucideIconData = {
  readonly name: string;
  readonly size?: number;
  readonly node: readonly LucideIconTuple[];
};

export type LucidePathPayload = { d: string };

function toNumber(v: string | number | undefined): number | null {
  if (v === undefined) {
    return null;
  }
  if (typeof v === "number" && !Number.isNaN(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

/** Full circle rendered as two 180deg arcs. */
export function circleToPath(cx: number, cy: number, r: number): string {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) {
    return "";
  }
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
}

function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string {
  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(rx) ||
    !Number.isFinite(ry) ||
    rx <= 0 ||
    ry <= 0
  ) {
    return "";
  }
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;
}

function lineToPath(x1: number, y1: number, x2: number, y2: number): string {
  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    return "";
  }
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function rectToPath(x: number, y: number, width: number, height: number): string {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return "";
  }
  const x2 = x + width;
  const y2 = y + height;
  return `M ${x} ${y} L ${x2} ${y} L ${x2} ${y2} L ${x} ${y2} Z`;
}

function pointsAttrToPath(points: string, close: boolean): string {
  const nums = points
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => Number.parseFloat(token));
  if (nums.length < 4 || nums.length % 2 !== 0 || nums.some((n) => !Number.isFinite(n))) {
    return "";
  }
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i < nums.length; i += 2) {
    d += ` L ${nums[i]} ${nums[i + 1]}`;
  }
  if (close) {
    d += " Z";
  }
  return d;
}

/**
 * Convert Lucide icon data into one or more drawable path payloads.
 * Supported tags: `path`, `circle`, `ellipse`, `line`, `rect`, `polyline`, `polygon`.
 */
export function iconNodeToPathPayloads(icon: LucideIconData): LucidePathPayload[] {
  const out: LucidePathPayload[] = [];
  for (const [tag, attrs] of icon.node) {
    if (tag === "path") {
      const d = attrs.d;
      if (typeof d === "string" && d.trim().length > 0) {
        out.push({ d });
      }
      continue;
    }
    if (tag === "circle") {
      const cx = toNumber(attrs.cx);
      const cy = toNumber(attrs.cy);
      const r = toNumber(attrs.r);
      if (cx !== null && cy !== null && r !== null) {
        const d = circleToPath(cx, cy, r);
        if (d) {
          out.push({ d });
        }
      }
      continue;
    }
    if (tag === "ellipse") {
      const cx = toNumber(attrs.cx);
      const cy = toNumber(attrs.cy);
      const rx = toNumber(attrs.rx);
      const ry = toNumber(attrs.ry);
      if (cx !== null && cy !== null && rx !== null && ry !== null) {
        const d = ellipseToPath(cx, cy, rx, ry);
        if (d) {
          out.push({ d });
        }
      }
      continue;
    }
    if (tag === "line") {
      const x1 = toNumber(attrs.x1);
      const y1 = toNumber(attrs.y1);
      const x2 = toNumber(attrs.x2);
      const y2 = toNumber(attrs.y2);
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const d = lineToPath(x1, y1, x2, y2);
        if (d) {
          out.push({ d });
        }
      }
      continue;
    }
    if (tag === "rect") {
      const x = toNumber(attrs.x) ?? 0;
      const y = toNumber(attrs.y) ?? 0;
      const width = toNumber(attrs.width);
      const height = toNumber(attrs.height);
      if (width !== null && height !== null) {
        const d = rectToPath(x, y, width, height);
        if (d) {
          out.push({ d });
        }
      }
      continue;
    }
    if (tag === "polyline" || tag === "polygon") {
      const points = attrs.points;
      if (typeof points === "string") {
        const d = pointsAttrToPath(points, tag === "polygon");
        if (d) {
          out.push({ d });
        }
      }
    }
  }
  return out;
}

export function mergePathDs(payloads: readonly LucidePathPayload[]): string {
  return payloads
    .map((p) => p.d.trim())
    .filter(Boolean)
    .join(" ");
}

export function lucideIconNodesToPathD(nodes: readonly LucideIconTuple[]): string {
  return mergePathDs(iconNodeToPathPayloads({ name: "lucide", node: nodes }));
}
