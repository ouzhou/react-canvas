import { canvasBackingStoreSize } from "@react-canvas/core-v2";
import { useEffect } from "react";
import { loadImages, RaindropsCtor as Raindrops, random, times } from "../rain-effect/index.ts";
import { CodropsIndex2WaterRenderer, INDEX2_WATER_DEFAULTS } from "./codrops-index2-webgl.ts";

const IMG = "/rain-effect/img";

/** `RainEffect-master/src/index2.js` 中 `new Raindrops` 选项。 */
const RAINDROPS_INDEX2 = {
  minR: 20,
  maxR: 60,
  rainChance: 0.3,
  rainLimit: 10,
  dropletsRate: 0,
  globalTimeScale: 0.45,
  trailRate: 1.1,
  dropFallMultiplier: 0.2,
  trailScaleRange: [0.2, 0.35] as [number, number],
  autoShrink: false,
  spawnArea: [-0.3, 0.3] as [number, number],
  collisionRadius: 0.45,
  collisionRadiusIncrease: 0,
  collisionBoost: 0.35,
  collisionBoostMultiplier: 0.025,
} as const;

/**
 * 全屏 WebGL 水面（`water.frag` + 2D liquid），固定 **index2** 配置；仅挂载/卸载 DOM。
 * 与 Skia 掘金页互斥使用：启用时由调用方关闭 Skia postProcess。
 */
export function useJuejinCodropsIndex2Webgl(enabled: boolean, vw: number, vh: number): void {
  useEffect(() => {
    if (!enabled || vw < 1 || vh < 1) {
      return;
    }

    let cancelled = false;
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;inset:0;z-index:99800;pointer-events:none;touch-action:none;background:#1a1a1a;mix-blend-mode:multiply;";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    container.appendChild(canvas);
    document.body.appendChild(container);

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const { bw, bh, rootScale } = canvasBackingStoreSize(vw, vh, dpr);
    canvas.width = bw;
    canvas.height = bh;

    let rain: InstanceType<typeof Raindrops> | null = null;
    let renderer: CodropsIndex2WaterRenderer | null = null;

    const onPtr = (e: PointerEvent): void => {
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      renderer?.setParallax(nx, ny);
    };
    window.addEventListener("pointermove", onPtr, { passive: true });

    void loadImages([
      { name: "dropShine", src: `${IMG}/drop-shine2.png` },
      { name: "dropAlpha", src: `${IMG}/drop-alpha.png` },
      { name: "dropColor", src: `${IMG}/drop-color.png` },
      { name: "textureFg", src: `${IMG}/water/texture-fg.png` },
      { name: "textureBg", src: `${IMG}/water/texture-bg.png` },
    ]).then((images) => {
      if (cancelled) return;

      rain = new Raindrops(bw, bh, rootScale, images.dropAlpha.img, images.dropColor.img, {
        ...RAINDROPS_INDEX2,
      });

      times(80, () => {
        if (!rain) return;
        const drop = rain.createDrop({
          x: random(bw / rootScale),
          y: random(bh / rootScale),
          r: random(10, 20),
        });
        if (drop) rain.addDrop(drop);
      });

      try {
        renderer = new CodropsIndex2WaterRenderer(
          canvas,
          {
            liquid: rain.canvas,
            textureFg: images.textureFg.img,
            textureBg: images.textureBg.img,
            textureShine: images.dropShine.img,
          },
          INDEX2_WATER_DEFAULTS,
        );
        renderer.start();
      } catch (err) {
        console.warn("[juejin] Codrops index2 WebGL 初始化失败:", err);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", onPtr);
      renderer?.dispose();
      rain?.stop();
      container.remove();
    };
  }, [enabled, vw, vh]);
}
