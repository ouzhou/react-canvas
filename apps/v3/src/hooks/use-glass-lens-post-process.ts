import { GLASS_LENS_SKSL, type PostProcessOptions } from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";

export type UseGlassLensPostProcessOptions = {
  /** 透镜半径（backing 像素），默认 100 */
  radius?: number;
  /** 指针与透镜中心插值 0–1，默认 0.15 */
  lerp?: number;
};

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
    const rafRef = { current: 0 };
    const tick = (): void => {
      lensRef.current.x += (targetRef.current.x - lensRef.current.x) * lerp;
      lensRef.current.y += (targetRef.current.y - lensRef.current.y) * lerp;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [lerp]);

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
      targetRef.current.x = (e.clientX - rect.left) * sx;
      targetRef.current.y = (e.clientY - rect.top) * sy;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, [containerRef]);

  return useMemo(
    () => ({
      sksl: GLASS_LENS_SKSL,
      continuousRepaint: true,
      getUniforms: (ctx) => {
        if (!initedRef.current && ctx.width > 2 && ctx.height > 2) {
          initedRef.current = true;
          const cx = ctx.width * 0.5;
          const cy = ctx.height * 0.5;
          lensRef.current = { x: cx, y: cy };
          targetRef.current = { x: cx, y: cy };
        }
        return {
          uResolution: Float32Array.of(ctx.width, ctx.height),
          uLensPos: Float32Array.of(lensRef.current.x, lensRef.current.y),
          uRadius: radius,
        };
      },
    }),
    [radius],
  );
}
