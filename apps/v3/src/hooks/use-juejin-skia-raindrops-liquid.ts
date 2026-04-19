import { canvasBackingStoreSize } from "@react-canvas/core-v2";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { JUEJIN_RAIN_DEBUG_DEFAULT } from "../juejin/juejin-rain-debug-defaults.ts";
import { useJuejinRainDebugOptional } from "../juejin/juejin-rain-debug-context.tsx";
import { loadImages, random, RaindropsCtor as Raindrops, times } from "../rain-effect/index.ts";

const IMG_BASE = "/rain-effect/img";

type Loaded = Awaited<ReturnType<typeof loadImages>>;

const RAINDROPS_EXTRA_INDEX1 = {
  globalTimeScale: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95] as [number, number],
  dropFallMultiplier: 1,
  collisionBoost: 1,
  collisionBoostMultiplier: 0.05,
  raining: true,
} as const;

const RAINDROPS_EXTRA_INDEX2 = {
  globalTimeScale: 0.45,
  autoShrink: false,
  spawnArea: [-0.3, 0.3] as [number, number],
  dropFallMultiplier: 0.2,
  collisionBoost: 0.35,
  collisionBoostMultiplier: 0.025,
  raining: true,
} as const;

export type JuejinSkiaRainPreset = "index1" | "index2";

/**
 * Raindrops 参数可由 `JuejinRainDebugProvider` 浮层实时调整；无 Provider 时用 `JUEJIN_RAIN_DEBUG_DEFAULT`。
 * `preset` 决定 index1 / index2 的额外选项（时间缩放、spawn等）；`times(80)` 预置水珠仅 index2。
 */
export function useJuejinSkiaRaindropsLiquid(
  liquidCanvasRef: RefObject<HTMLCanvasElement | null>,
  vw: number,
  vh: number,
  enabled: boolean,
  preset: JuejinSkiaRainPreset,
): void {
  const vwRef = useRef(vw);
  const vhRef = useRef(vh);
  vwRef.current = vw;
  vhRef.current = vh;

  const debugCtx = useJuejinRainDebugOptional();
  const rd = debugCtx?.state.raindrops ?? JUEJIN_RAIN_DEBUG_DEFAULT.raindrops;

  useEffect(() => {
    if (!enabled) {
      liquidCanvasRef.current = null;
      return;
    }
    if (vwRef.current < 1 || vhRef.current < 1) return;

    let cancelled = false;
    let raindrops: InstanceType<typeof Raindrops> | null = null;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const { bw, bh, rootScale } = canvasBackingStoreSize(vwRef.current, vhRef.current, dpr);

    const start = (images: Loaded) => {
      if (cancelled) return;
      const dropColor = images.dropColor.img;
      const dropAlpha = images.dropAlpha.img;

      /** 与 Skia presenter 一致：`bw/rootScale` 等于布局逻辑宽，勿用裸 `dpr`（二者可能略有差异）。 */
      const extra = preset === "index1" ? RAINDROPS_EXTRA_INDEX1 : RAINDROPS_EXTRA_INDEX2;
      raindrops = new Raindrops(bw, bh, rootScale, dropAlpha, dropColor, {
        ...extra,
        minR: rd.minR,
        maxR: rd.maxR,
        collisionRadiusIncrease: rd.collisionRadiusIncrease,
        dropletsRate: rd.dropletsRate,
        dropletsSize: [rd.dropletsSizeMin, rd.dropletsSizeMax],
        dropletsCleaningRadiusMultiplier: rd.dropletsCleaningRadiusMultiplier,
        rainChance: rd.rainChance,
        rainLimit: rd.rainLimit,
        trailRate: rd.trailRate,
        trailScaleRange: [rd.trailScaleMin, rd.trailScaleMax],
        collisionRadius: rd.collisionRadius,
      });

      if (preset === "index2") {
        times(80, () => {
          if (!raindrops) return;
          const drop = raindrops.createDrop({
            x: random(bw / rootScale),
            y: random(bh / rootScale),
            r: random(10, 20),
          });
          if (drop) raindrops.addDrop(drop);
        });
      }

      liquidCanvasRef.current = raindrops.canvas;
    };

    void loadImages([
      { name: "dropAlpha", src: `${IMG_BASE}/drop-alpha.png` },
      { name: "dropColor", src: `${IMG_BASE}/drop-color.png` },
    ]).then((images) => {
      start(images);
    });

    return () => {
      cancelled = true;
      raindrops?.stop();
      raindrops = null;
      liquidCanvasRef.current = null;
    };
  }, [enabled, liquidCanvasRef, vw, vh, rd, preset]);
}
