import type { CanvasKit } from "canvaskit-wasm";

function multiply3x3(a: number[], b: number[]): number[] {
  const r = Array.from({ length: 9 }, () => 0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
      }
    }
  }
  return r;
}

/** 3×3 代数余子式求逆（与 Skia 列主序/内存布局一致，供测试与 CanvasKit 行为对齐）。 */
function invert3x3(m: number[]): number[] | null {
  const a = m[0]!;
  const b = m[1]!;
  const c = m[2]!;
  const d = m[3]!;
  const e = m[4]!;
  const f = m[5]!;
  const g = m[6]!;
  const h = m[7]!;
  const i = m[8]!;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

function mapPointsImpl(m: number[], pts: number[]): void {
  for (let k = 0; k < pts.length; k += 2) {
    const x = pts[k]!;
    const y = pts[k + 1]!;
    const nx = m[0]! * x + m[1]! * y + m[2]!;
    const ny = m[3]! * x + m[4]! * y + m[5]!;
    const w = m[6]! * x + m[7]! * y + m[8]!;
    if (Math.abs(w - 1) > 1e-6 && w !== 0) {
      pts[k] = nx / w;
      pts[k + 1] = ny / w;
    } else {
      pts[k] = nx;
      pts[k + 1] = ny;
    }
  }
}

/**
 * 无 WASM 的 CanvasKit 子集，仅实现 {@link buildLocalTransformMatrix} / hit-test 所需的 3×3 Matrix。
 */
export function createMatrixMockCanvasKit(): CanvasKit {
  const Matrix = {
    identity: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    translated: (dx: number, dy: number) => [1, 0, dx, 0, 1, dy, 0, 0, 1],
    multiply: (...parts: number[][]) => {
      if (parts.length === 0) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
      return parts.reduce((acc, p) => multiply3x3(acc, p));
    },
    rotated: (rad: number, px = 0, py = 0) => {
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const T1 = [1, 0, px, 0, 1, py, 0, 0, 1];
      const R = [c, -s, 0, s, c, 0, 0, 0, 1];
      const T2 = [1, 0, -px, 0, 1, -py, 0, 0, 1];
      return multiply3x3(multiply3x3(T1, R), T2);
    },
    scaled: (sx: number, sy: number, px = 0, py = 0) => {
      const T1 = [1, 0, px, 0, 1, py, 0, 0, 1];
      const S = [sx, 0, 0, 0, sy, 0, 0, 0, 1];
      const T2 = [1, 0, -px, 0, 1, -py, 0, 0, 1];
      return multiply3x3(multiply3x3(T1, S), T2);
    },
    skewed: (kx: number, ky: number, px = 0, py = 0) => {
      const T1 = [1, 0, px, 0, 1, py, 0, 0, 1];
      const K = [1, kx, 0, ky, 1, 0, 0, 0, 1];
      const T2 = [1, 0, -px, 0, 1, -py, 0, 0, 1];
      return multiply3x3(multiply3x3(T1, K), T2);
    },
    invert: (m: number[]) => invert3x3(m),
    mapPoints: (m: number[], pts: number[]) => mapPointsImpl(m, pts),
  };
  return { Matrix } as unknown as CanvasKit;
}
