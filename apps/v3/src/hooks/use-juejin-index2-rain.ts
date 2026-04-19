import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import {
  loadImages,
  RaindropsCtor as Raindrops,
  RainRendererCtor as RainRenderer,
  times,
  random,
} from "../rain-effect/index.ts";

const IMG_BASE = "/rain-effect/img";

type Loaded = Awaited<ReturnType<typeof loadImages>>;

/**
 * Codrops RainEffect **index2** 管线（WebGL + 2D 水滴）全屏叠在掘金 Skia 之上，`pointer-events: none` 穿透交互。
 * 纹理强制使用 index2 同款：`water/texture-fg`、`water/texture-bg`、`drop-shine2` 等。
 */
export function useJuejinIndex2Rain(
  mountRef: RefObject<HTMLDivElement | null>,
  vw: number,
  vh: number,
  enabled: boolean,
): void {
  const vwRef = useRef(vw);
  const vhRef = useRef(vh);
  vwRef.current = vw;
  vhRef.current = vh;

  useEffect(() => {
    if (!enabled) return;
    const el = mountRef.current;
    if (!el || vwRef.current < 1 || vhRef.current < 1) return;

    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;
    let raindrops: InstanceType<typeof Raindrops> | null = null;
    let renderer: InstanceType<typeof RainRenderer> | null = null;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(1, Math.floor(vwRef.current * dpr));
    const h = Math.max(1, Math.floor(vhRef.current * dpr));

    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    el.appendChild(canvas);

    const start = (images: Loaded) => {
      if (cancelled || !canvas) return;

      const textureFgImage = images.textureFg.img;
      const textureBgImage = images.textureBg.img;
      const dropShine = images.dropShine.img;
      const dropColor = images.dropColor.img;
      const dropAlpha = images.dropAlpha.img;

      raindrops = new Raindrops(canvas.width, canvas.height, dpr, dropAlpha, dropColor, {
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
            x: random(canvas!.width),
            y: random(canvas!.height),
            r: random(10, 20),
          }),
        );
      });

      renderer = new RainRenderer(
        canvas,
        raindrops.canvas,
        textureFgImage,
        textureBgImage,
        dropShine,
        {
          renderShadow: true,
          minRefraction: 150,
          maxRefraction: 512,
          alphaMultiply: 7,
          alphaSubtract: 3,
        },
      );
    };

    void loadImages([
      { name: "dropShine", src: `${IMG_BASE}/drop-shine2.png` },
      { name: "dropAlpha", src: `${IMG_BASE}/drop-alpha.png` },
      { name: "dropColor", src: `${IMG_BASE}/drop-color.png` },
      { name: "textureFg", src: `${IMG_BASE}/water/texture-fg.png` },
      { name: "textureBg", src: `${IMG_BASE}/water/texture-bg.png` },
    ]).then((images) => {
      start(images);
    });

    return () => {
      cancelled = true;
      renderer?.stop();
      raindrops?.stop();
      canvas?.remove();
      canvas = null;
      raindrops = null;
      renderer = null;
    };
  }, [enabled, mountRef, vw, vh]);
}
