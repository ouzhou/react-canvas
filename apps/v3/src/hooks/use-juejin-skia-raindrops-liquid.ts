import { canvasBackingStoreSize } from "@react-canvas/core-v2";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { loadImages, RaindropsCtor as Raindrops, times, random } from "../rain-effect/index.ts";

const IMG_BASE = "/rain-effect/img";

type Loaded = Awaited<ReturnType<typeof loadImages>>;

/**
 * 仅运行 Codrops 2D Raindrops，输出与 Skia backing 同尺寸的液体层 Canvas，供后处理每帧采样。
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
        maxR: 60,
        rainChance: 0.3,
        rainLimit: 10,
        dropletsRate: 0,
        globalTimeScale: 0.45,
        trailRate: 1.1,
        dropFallMultiplier: 0.2,
        trailScaleRange: [0.2, 0.35],
        autoShrink: false,
        spawnArea: [-0.3, 0.3],
        collisionRadius: 0.45,
        collisionRadiusIncrease: 0,
        collisionBoost: 0.35,
        collisionBoostMultiplier: 0.025,
      });

      times(80, () => {
        raindrops!.addDrop(
          raindrops!.createDrop({
            x: random(bw),
            y: random(bh),
            r: random(10, 20),
          }),
        );
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
