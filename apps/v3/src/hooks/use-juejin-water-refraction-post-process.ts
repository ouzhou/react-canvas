import { type PostProcessOptions, type PostProcessUniformContext } from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { JUEJIN_CODROPS_WATER_SKSL } from "../shaders/juejin-codrops-water.sksl.ts";

const IMG_BASE = "/rain-effect/img";
const WATER_TEXTURE_FG = `${IMG_BASE}/water/texture-fg.png`;

const WATER_IMAGE_URLS = [`${IMG_BASE}/drop-shine2.png`, WATER_TEXTURE_FG] as const;
const WATER_IMAGE_TILE_MODES = ["clamp", "repeat"] as const;

/**
 * 掘金：Codrops 水面 SkSL。`u_textureRatio` 使用**当前 backing 宽高比**，使 `scaledTexCoord` 与整页一致；
 * 若固定为 index2 的 texture-bg 比例，全屏 UI 会被错误缩放/裁切。
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
          /** 浅色网页上黑色描边会像污渍；需要 index2 式描边时可改 1 并设 `u_shadowRim` */
          u_renderShadow: 0,
          u_minRefraction: 150,
          u_refractionDelta: 512 - 150,
          u_brightness: 0.95,
          /** 略收边，减少「糊一层」 */
          u_alphaMultiply: 5.5,
          u_alphaSubtract: 3.15,
          /** 水膜贴图占比：低=更透、更像雨；高=更接近原 demo 磨砂感 */
          u_filmWeight: 0.28,
          u_shineWeight: 0.5,
          /** 与 `u_renderShadow` 配合；原 water.frag 等价约 0.2 */
          u_shadowRim: 0.12,
          u_parallaxBg: 5,
          u_parallaxFg: 20,
        };
      },
    };
  }, [liquidCanvasRef, shineTexSize, fgTexSize]);
}
