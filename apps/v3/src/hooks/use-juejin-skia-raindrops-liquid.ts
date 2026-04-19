import { canvasBackingStoreSize } from "@react-canvas/core-v2";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { loadImages, RaindropsCtor as Raindrops } from "../rain-effect/index.ts";

const IMG_BASE = "/rain-effect/img";

type Loaded = Awaited<ReturnType<typeof loadImages>>;

/**
 * Codrops **index1**（`src/index.js`，Weather `rain`）的 Raindrops 参数：无开局随机水珠，靠 `rainChance`/`dropletsRate` 下雨。
 */
export function useJuejinSkiaRaindropsLiquid(
  liquidCanvasRef: RefObject<HTMLCanvasElement | null>,
  vw: number,
  vh: number,
  enabled: boolean,
): void {
  const vwRef = useRef(vw);
  const vhRef = useRef(vh);
  vwRef.current = vw;
  vhRef.current = vh;

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
      raindrops = new Raindrops(bw, bh, rootScale, dropAlpha, dropColor, {
        minR: 20,
        maxR: 50,
        rainChance: 0.35,
        rainLimit: 6,
        dropletsRate: 50,
        dropletsSize: [3, 5.5],
        trailRate: 1,
        trailScaleRange: [0.25, 0.35],
        collisionRadius: 0.45,
        collisionRadiusIncrease: 0.0002,
        dropletsCleaningRadiusMultiplier: 0.28,
      });

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
  }, [enabled, liquidCanvasRef, vw, vh]);
}
