import { type PostProcessOptions, type PostProcessUniformContext } from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { JUEJIN_RAIN_DEBUG_DEFAULT } from "../juejin/juejin-rain-debug-defaults.ts";
import { useJuejinRainDebugOptional } from "../juejin/juejin-rain-debug-context.tsx";
import { JUEJIN_CODROPS_WATER_SKSL } from "../shaders/juejin-codrops-water.sksl.ts";

const IMG_BASE = "/rain-effect/img";
const WATER_TEXTURE_FG = `${IMG_BASE}/water/texture-fg.png`;

const WATER_IMAGE_URLS = [`${IMG_BASE}/drop-shine2.png`, WATER_TEXTURE_FG] as const;
const WATER_IMAGE_TILE_MODES = ["clamp", "repeat"] as const;

/**
 * 掘金：水面 SkSL；折射贴图仍为 shine + texture-fg。
 * **RainRenderer对齐 `index3.js`**：`brightness/alphaMultiply/alphaSubtract/parallaxFg` 与 `rain-renderer.js` 默认折射256～512；`imageShine == null` → `u_renderShine:0`。
 * **下雨强度**由 `use-juejin-skia-raindrops-liquid` 控制。
 */
export function useJuejinWaterRefractionPostProcess(
  liquidCanvasRef: RefObject<HTMLCanvasElement | null>,
): PostProcessOptions {
  const debugCtx = useJuejinRainDebugOptional();
  const waterRef = useRef(JUEJIN_RAIN_DEBUG_DEFAULT.water);
  waterRef.current = debugCtx?.state.water ?? JUEJIN_RAIN_DEBUG_DEFAULT.water;

  const [shineTexSize, setShineTexSize] = useState(() => Float32Array.of(128, 128));
  const [fgTexSize, setFgTexSize] = useState(() => Float32Array.of(64, 114));

  useEffect(() => {
    const sh = new Image();
    sh.onload = () => {
      setShineTexSize(Float32Array.of(Math.max(sh.naturalWidth, 1), Math.max(sh.naturalHeight, 1)));
    };
    sh.src = `${IMG_BASE}/drop-shine2.png`;
  }, []);

  useEffect(() => {
    const fg = new Image();
    fg.onload = () => {
      setFgTexSize(Float32Array.of(Math.max(fg.naturalWidth, 1), Math.max(fg.naturalHeight, 1)));
    };
    fg.src = WATER_TEXTURE_FG;
  }, []);

  return useMemo((): PostProcessOptions => {
    return {
      sksl: JUEJIN_CODROPS_WATER_SKSL,
      imageShaderUrls: WATER_IMAGE_URLS,
      imageShaderTileModes: WATER_IMAGE_TILE_MODES,
      getLiquidTextureCanvas: () => liquidCanvasRef.current,
      continuousRepaint: true,
      shouldContinueRepaint: (_ctx: PostProcessUniformContext) => true,
      getUniforms: (ctx: PostProcessUniformContext) => {
        const w = waterRef.current;
        const texRatio = ctx.width / Math.max(ctx.height, 1);
        return {
          uResolution: Float32Array.of(ctx.width, ctx.height),
          u_parallax: Float32Array.of(0, 0),
          u_shineTexSize: Float32Array.of(shineTexSize[0]!, shineTexSize[1]!),
          u_fgTexSize: Float32Array.of(fgTexSize[0]!, fgTexSize[1]!),
          u_textureRatio: texRatio,
          u_renderShine: w.u_renderShine,
          u_renderShadow: w.u_renderShadow,
          u_minRefraction: w.u_minRefraction,
          u_refractionDelta: w.u_refractionDelta,
          u_brightness: w.u_brightness,
          u_alphaMultiply: w.u_alphaMultiply,
          u_alphaSubtract: w.u_alphaSubtract,
          u_filmWeight: w.u_filmWeight,
          u_shineWeight: w.u_shineWeight,
          u_shadowRim: w.u_shadowRim,
          u_parallaxBg: w.u_parallaxBg,
          u_parallaxFg: w.u_parallaxFg,
        };
      },
    };
  }, [liquidCanvasRef, shineTexSize, fgTexSize]);
}
