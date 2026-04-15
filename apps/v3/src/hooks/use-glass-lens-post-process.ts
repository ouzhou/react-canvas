import {
  GLASS_LENS_SKSL,
  requestCanvasRepaint,
  type PostProcessOptions,
  type PostProcessUniformContext,
} from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";

export type UseGlassLensPostProcessOptions = {
  /** 透镜半径（backing 像素），默认 100 */
  radius?: number;
  /** 指针与透镜中心插值 0–1，默认 0.15 */
  lerp?: number;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * 液态玻璃透镜后处理（SkSL），需挂在含 `SceneSkiaCanvas` 的容器 ref 上以便换算指针坐标。
 */
export function useGlassLensPostProcess(
  containerRef: RefObject<HTMLElement | null>,
  opts: UseGlassLensPostProcessOptions = {},
): PostProcessOptions {
  const radius = opts.radius ?? 100;
  const lerp = opts.lerp ?? 0.15;

  const lensRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const initedRef = useRef(false);

  useEffect(() => {
    const onPointer = (e: PointerEvent): void => {
      const root = containerRef.current;
      const canvas = root?.querySelector(
        "canvas[data-react-canvas='skia']",
      ) as HTMLCanvasElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / Math.max(rect.width, 1);
      const sy = canvas.height / Math.max(rect.height, 1);
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!inside) {
        return;
      }

      const x = clamp((e.clientX - rect.left) * sx, 0, canvas.width);
      const y = clamp((e.clientY - rect.top) * sy, 0, canvas.height);
      targetRef.current.x = x;
      targetRef.current.y = y;
      requestCanvasRepaint(canvas);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, [containerRef]);

  return useMemo(
    () => ({
      sksl: GLASS_LENS_SKSL,
      continuousRepaint: true,
      shouldContinueRepaint: (_ctx: PostProcessUniformContext) => {
        const dx = targetRef.current.x - lensRef.current.x;
        const dy = targetRef.current.y - lensRef.current.y;
        return dx * dx + dy * dy > 0.25;
      },
      getUniforms: (ctx) => {
        if (!initedRef.current && ctx.width > 2 && ctx.height > 2) {
          initedRef.current = true;
          const cx = ctx.width * 0.5;
          const cy = ctx.height * 0.5;
          lensRef.current = { x: cx, y: cy };
          targetRef.current = { x: cx, y: cy };
        }
        lensRef.current.x += (targetRef.current.x - lensRef.current.x) * lerp;
        lensRef.current.y += (targetRef.current.y - lensRef.current.y) * lerp;
        return {
          uResolution: Float32Array.of(ctx.width, ctx.height),
          uLensPos: Float32Array.of(lensRef.current.x, lensRef.current.y),
          uRadius: radius,
        };
      },
    }),
    [radius, lerp],
  );
}
