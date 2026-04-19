import { type PostProcessOptions, type PostProcessUniformContext } from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { JUEJIN_CODROPS_WATER_SKSL } from "../shaders/juejin-codrops-water.sksl.ts";

const IMG_BASE = "/rain-effect/img";
const WATER_TEXTURE_FG = `${IMG_BASE}/water/texture-fg.png`;

const WATER_IMAGE_URLS = [`${IMG_BASE}/drop-shine2.png`, WATER_TEXTURE_FG] as const;
const WATER_IMAGE_TILE_MODES = ["clamp", "repeat"] as const;

/**
 * 掘金：水面 SkSL + index2 同款 **shine / water texture-fg**；`u_textureRatio` 用当前 backing 宽高比。
 * **下雨强度**仅由 `use-juejin-skia-raindrops-liquid`（可对齐 index1）控制，本 hook 不改编译后处理贴图与 uniform。
 */
export function useJuejinWaterRefractionPostProcess(
  liquidCanvasRef: RefObject<HTMLCanvasElement | null>,
): PostProcessOptions {
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
        const texRatio = ctx.width / Math.max(ctx.height, 1);
        return {
          uResolution: Float32Array.of(ctx.width, ctx.height),
          u_parallax: Float32Array.of(0, 0),
          u_shineTexSize: Float32Array.of(shineTexSize[0]!, shineTexSize[1]!),
          u_fgTexSize: Float32Array.of(fgTexSize[0]!, fgTexSize[1]!),
          u_textureRatio: texRatio,
          u_renderShine: 1,
          u_renderShadow: 0,
          u_minRefraction: 150,
          u_refractionDelta: 512 - 150,
          u_brightness: 0.95,
          u_alphaMultiply: 5.5,
          u_alphaSubtract: 3.15,
          u_filmWeight: 0.28,
          u_shineWeight: 0.5,
          u_shadowRim: 0.12,
          u_parallaxBg: 5,
          u_parallaxFg: 20,
        };
      },
    };
  }, [liquidCanvasRef, shineTexSize, fgTexSize]);
}
