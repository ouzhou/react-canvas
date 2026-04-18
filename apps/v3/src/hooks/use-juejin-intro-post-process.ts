import {
  requestCanvasRepaint,
  type PostProcessOptions,
  type PostProcessUniformContext,
} from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const JUEJIN_INTRO_PLAYED_KEY = "v3-juejin-intro-played";
const JUEJIN_INTRO_DURATION_MS = 4000;
const JUEJIN_INTRO_HANDOFF_PROGRESS = 0.995;

/**
 * 参考用户给出的「白屏 -> 真实页面」Shadertoy 思路改写：
 * - 以程序噪声 + 中心扩张控制 reveal mask
 * - `uProgress` 从 0 -> 1 推进
 * - 结束态严格等于 `uScene`
 */
const JUEJIN_INTRO_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;

float hash12(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(float3 x) {
    float3 p = floor(x);
    float3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash12(p.xy + float2(37.0, 17.0) * p.z);
    float n100 = hash12((p.xy + float2(1.0, 0.0)) + float2(37.0, 17.0) * p.z);
    float n010 = hash12((p.xy + float2(0.0, 1.0)) + float2(37.0, 17.0) * p.z);
    float n110 = hash12((p.xy + float2(1.0, 1.0)) + float2(37.0, 17.0) * p.z);

    float n001 = hash12(p.xy + float2(37.0, 17.0) * (p.z + 1.0));
    float n101 = hash12((p.xy + float2(1.0, 0.0)) + float2(37.0, 17.0) * (p.z + 1.0));
    float n011 = hash12((p.xy + float2(0.0, 1.0)) + float2(37.0, 17.0) * (p.z + 1.0));
    float n111 = hash12((p.xy + float2(1.0, 1.0)) + float2(37.0, 17.0) * (p.z + 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0, 1.0));
    float2 uv = p / R;

    float2 fragPos = float2(
        p.x * 2.0 / R.x - 1.0,
        p.y * 2.0 / R.y - 1.0
    );
    fragPos.y *= R.y / R.x;

    float t = clamp(uProgress, 0.0, 1.0);
    // 将视觉进度后置：避免前半段过快"看起来提前结束"。
    float stage = pow(t, 1.9);
    float speed = 10.0;
    float time = stage * 25.0; // 使用后置进度驱动噪声演化
    float z = time * 0.00001 * speed;

    float3 scaledPos = float3(fragPos * 8.0, z * 8.0);
    float noiseVal = 0.0;
    float ampl = 1.0;
    float maxValue = 0.0;
    for (int i = 0; i < 6; i++) {
        noiseVal += valueNoise(scaledPos) * ampl;
        scaledPos *= 2.0;
        maxValue += ampl;
        ampl *= 0.5;
    }
    noiseVal /= max(maxValue, 1e-4);
    noiseVal = pow(noiseVal, 5.0);

    float expansion = 1.0 - dot(fragPos, fragPos);
    expansion += time * time * speed * 0.0005 - 0.6;
    expansion = min(expansion, 1.0);

    float reveal = (1.0 + expansion * time);
    reveal = pow(max(reveal, 0.0), 8.0) * noiseVal;
    reveal = smoothstep(0.08, 0.98, reveal);
    float revealMix = clamp(mix(reveal, stage, 0.35), 0.0, 1.0);
    if (t >= 0.999) {
        revealMix = 1.0;
    }

    half4 firstColor = half4(1.0, 1.0, 1.0, 1.0); // 白屏
    half4 realColor = uScene.eval(p);              // 真实页面
    return mix(firstColor, realColor, half(revealMix));
}
`;

function easeInOutCubic(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

export function useJuejinIntroPostProcess(containerRef: RefObject<HTMLElement | null>): {
  postProcess: PostProcessOptions;
  replayIntro: () => void;
  introActive: boolean;
} {
  const progressRef = useRef(1);
  const playingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const [introActive, setIntroActive] = useState(false);

  const triggerRepaint = useCallback(() => {
    const root = containerRef.current;
    const canvas = root?.querySelector(
      "canvas[data-react-canvas='skia']",
    ) as HTMLCanvasElement | null;
    if (canvas) requestCanvasRepaint(canvas);
  }, [containerRef]);

  const replayIntro = useCallback(() => {
    if (typeof window === "undefined") return;
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    progressRef.current = 0;
    playingRef.current = true;
    setIntroActive(true);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / JUEJIN_INTRO_DURATION_MS);
      progressRef.current = easeInOutCubic(t);

      // 在动画尾段提前交接给 glass lens，减少视觉上的"尾巴拖延"。
      if (t >= JUEJIN_INTRO_HANDOFF_PROGRESS) {
        progressRef.current = 1;
        playingRef.current = false;
        setIntroActive(false);
        rafIdRef.current = null;
        window.sessionStorage.setItem(JUEJIN_INTRO_PLAYED_KEY, "1");
        triggerRepaint();
        return;
      }

      triggerRepaint();
      if (t < 1) {
        rafIdRef.current = window.requestAnimationFrame(tick);
        return;
      }
      playingRef.current = false;
      setIntroActive(false);
      rafIdRef.current = null;
      window.sessionStorage.setItem(JUEJIN_INTRO_PLAYED_KEY, "1");
      // 结束后立刻触发一帧，确保后处理切换到 glass lens 时无可见延迟。
      triggerRepaint();
    };
    rafIdRef.current = window.requestAnimationFrame(tick);
    triggerRepaint();
  }, [triggerRepaint]);

  useEffect(() => {
    if (typeof window === "undefined") {
      progressRef.current = 1;
      playingRef.current = false;
      setIntroActive(false);
      return;
    }
    const played = window.sessionStorage.getItem(JUEJIN_INTRO_PLAYED_KEY) === "1";
    if (!played) {
      replayIntro();
    } else {
      setIntroActive(false);
    }
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [replayIntro]);

  const postProcess = useMemo(
    (): PostProcessOptions => ({
      sksl: JUEJIN_INTRO_SKSL,
      continuousRepaint: true,
      shouldContinueRepaint: (_ctx: PostProcessUniformContext) => {
        return playingRef.current;
      },
      getUniforms: (ctx: PostProcessUniformContext) => ({
        uResolution: Float32Array.of(ctx.width, ctx.height),
        uProgress: progressRef.current,
      }),
    }),
    [],
  );

  return { postProcess, replayIntro, introActive };
}
