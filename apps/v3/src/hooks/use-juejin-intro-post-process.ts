import {
  requestCanvasRepaint,
  type PostProcessOptions,
  type PostProcessUniformContext,
} from "@react-canvas/react-v2";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

const JUEJIN_INTRO_PLAYED_KEY = "v3-juejin-intro-played";
/** 全种类入场共用时长（uProgress 0→1） */
const JUEJIN_INTRO_DURATION_MS = 1500;
const JUEJIN_INTRO_HANDOFF_PROGRESS = 0.995;

export type JuejinIntroKind =
  | "noise"
  | "hex"
  | "pixelScan"
  /** Emerge：像素格 + 自左向右 reveal + 品牌色扫光（参考 uType==0） */
  | "emergePixel"
  /** Emerge：噪波 + 垂直侵染（参考 uType==1，需 uTime） */
  | "emergeChaos"
  /** Emerge：正弦幕布 + 像素混合（参考 uType==3） */
  | "emergeCurtain";

/** 云朵入场：程序噪声 + 中心扩张 reveal mask，`uProgress` 驱动浅灰屏 → `uScene`（贴近 #f4f5f5）。 */
const JUEJIN_INTRO_NOISE_SKSL = `uniform shader uScene;
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

    float2 fragPos = float2(
        p.x * 2.0 / R.x - 1.0,
        p.y * 2.0 / R.y - 1.0
    );
    fragPos.y *= R.y / R.x;

    float t = clamp(uProgress, 0.0, 1.0);
    float stage = pow(t, 1.9);
    float speed = 10.0;
    float time = stage * 25.0;
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
    // 片头强制全遮：噪声 mask 在 t 很小时局部仍可能偏高，乘 gate 避免漏出场景
    float openGate = smoothstep(0.0, 0.11, t);
    revealMix *= openGate;
    if (t >= 0.999) {
        revealMix = 1.0;
    }

    // 与掘金主背景 #f4f5f5 一致的浅灰（归一化 sRGB）
    half4 firstColor = half4(0.957, 0.961, 0.961, 1.0);
    half4 realColor = uScene.eval(p);
    return mix(firstColor, realColor, half(revealMix));
}
`;

/**
 * 蜂窝 tile reveal（改编自 CC0 Hex tile transition）：
 * `HEXTILE_SIZE=0.125`、`RANDOMNESS=0.75`；起始色为浅灰 #f4f5f5（与云朵入场一致）。
 */
const JUEJIN_INTRO_HEX_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;

const float kHexTileSize = 0.125;
const float kRandomness = 0.75;

float hash_hex(float2 co) {
    return fract(sin(dot(co, float2(12.9898, 58.233))) * 13758.5453);
}

float tanh_approx(float x) {
    float x2 = x * x;
    return clamp(x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
}

float hex_sdf(float2 p, float r) {
    p = float2(p.y, p.x);
    float3 k = float3(-sqrt(0.75), 0.5, 1.0 / sqrt(3.0));
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= float2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

float2 hextile(inout float2 p) {
    float2 sz = float2(1.0, sqrt(3.0));
    float2 hsz = 0.5 * sz;
    float2 p1 = mod(p, sz) - hsz;
    float2 p2 = mod(p - hsz, sz) - hsz;
    float2 p3 = dot(p1, p1) < dot(p2, p2) ? p1 : p2;
    float2 n = (p3 - p + hsz) / sz;
    p = p3;
    n -= float2(0.5);
    return floor(n * 2.0 + 0.5) / 2.0;
}

float3 hex_transition(float2 p, float aa, float3 from, float3 to, float m) {
    m = clamp(m, 0.0, 1.0);
    float hz = kHexTileSize;
    float rz = kRandomness;
    float2 hp = p / hz;
    float2 hn_cell = hextile(hp);
    float2 hn = hn_cell * hz * float2(1.0, -sqrt(3.0));
    float r = hash_hex(hn + float2(123.4, 123.4));
    float off = 3.0;
    // 去掉片头 fi 缓入；用 mp 提前推进波前，避免 m 很小时长时间停在浅灰底
    float mp = clamp(m * 1.35 + 0.06, 0.0, 1.0);
    float fo = smoothstep(0.9, 1.0, m);
    float sz = 0.45 * (0.5 + 0.5 * tanh_approx((rz * r + hn.x + hn.y - off + mp * off * 2.0) * 2.0));
    float hd = (hex_sdf(hp, sz) - 0.1 * sz) * hz;
    float mm = smoothstep(-aa, aa, -hd);
    mm = mix(mm, 1.0, fo);
    return mix(from, to, mm);
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0, 1.0));
    float2 fragPos = float2(
        p.x * 2.0 / R.x - 1.0,
        p.y * 2.0 / R.y - 1.0
    );
    fragPos.y *= R.y / R.x;

    float t = clamp(uProgress, 0.0, 1.0);
    float aa = 2.0 / R.y;
    half4 scene = uScene.eval(p);
    if (t >= 0.999) {
        return scene;
    }
    float3 from = float3(0.957, 0.961, 0.961);
    float3 to = float3(scene.r, scene.g, scene.b);
    float3 col = hex_transition(fragPos, aa, from, to, t);
    return half4(half3(col), 1.0);
}
`;

/**
 * 像素扫描入场（改编自 VFX-JS / Smertimba Graphics 思路；SkSL 版）。
 * 与最初移植一致：未揭示区域为暗场（readTex * a1），三层 scale 平均。
 */
const JUEJIN_INTRO_PIXEL_SCAN_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;

const float kW = 0.2;
const int kMode = 0;
const float kDir = 1.0;

half4 readTex(float2 uv, float2 R) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return half4(0.0);
    }
    return uScene.eval(uv * R);
}

float hash_ps(float2 p) {
    return fract(sin(dot(p, float2(4859.0, 3985.0))) * 3984.0);
}

half3 hsv2rgb_ps(float3 c) {
    float4 K = float4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    float3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return half3(c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y));
}

float sdBox_ps(float2 p, float r) {
    float2 q = abs(p) - r;
    return min(length(q), max(q.y, q.x));
}

float toRangeT_ps(float2 pi, float scale, int mode, float dir) {
    float d;
    if (mode == 0) {
        d = pi.x / (scale * 2.0) + 0.5;
    } else if (mode == 1) {
        d = 1.0 - (pi.y / (scale * 2.0) + 0.5);
    } else {
        d = length(pi) / scale;
    }
    d = (dir > 0.0) ? d : (1.0 - d);
    return d;
}

half4 cell_ps(
    float2 p,
    float2 pi,
    float scale,
    float t,
    float edge,
    float2 R,
    int mode,
    float dir
) {
    float2 pc = pi + 0.5;
    float2 uvc = pc / scale;
    uvc.y /= R.y / R.x;
    uvc = uvc * 0.5 + 0.5;
    if (uvc.x < 0.0 || uvc.x > 1.0 || uvc.y < 0.0 || uvc.y > 1.0) {
        return half4(0.0);
    }
    half4 texS = uScene.eval(uvc * R);
    float alpha = smoothstep(0.0, 0.1, texS.a);
    float pyw = abs(pc.y) < 1e-5 ? (pc.x >= 0.0 ? 1e-5 : -1e-5) : pc.y;
    half4 color = half4(
        hsv2rgb_ps(float3((pc.x * 13.0 / pyw * 17.0) * 0.3, 1.0, 1.0)),
        1.0
    );
    float x = toRangeT_ps(pi, scale, mode, dir);
    float n = hash_ps(pi);
    float anim = smoothstep(kW * 2.0, 0.0, abs(x + n * kW - t));
    color *= half(anim);
    float edgeGlow = clamp(0.3 / abs(sdBox_ps(p - pc, 0.5)), 0.0, 10.0);
    color *= half(mix(1.0, edgeGlow, edge * pow(anim, 10.0)));
    return color * half(alpha);
}

half4 cellsColor_ps(float2 p, float scale, float t, float2 R, int mode, float dir) {
    float2 pi = floor(p);
    float2 d = float2(0.0, 1.0);
    half4 cc = half4(0.0);
    cc += cell_ps(p, pi, scale, t, 0.2, R, mode, dir) * 4.0;
    cc += cell_ps(p, pi + d.xy, scale, t, 0.9, R, mode, dir);
    cc += cell_ps(p, pi - d.xy, scale, t, 0.9, R, mode, dir);
    cc += cell_ps(p, pi + d.yx, scale, t, 0.9, R, mode, dir);
    cc += cell_ps(p, pi - d.yx, scale, t, 0.9, R, mode, dir);
    return cc / 8.0;
}

half4 draw_ps(float2 uv, float2 p, float t, float scale, float2 R, int mode, float dir) {
    half4 c = readTex(uv, R);
    float2 pi = floor(p * scale);
    float tm = t * (1.0 + kW * 4.0) - kW * 2.0;
    float n = hash_ps(pi);
    float x = toRangeT_ps(pi, scale, mode, dir);
    float a1 = smoothstep(tm, tm - kW, x + n * kW);
    c *= half(a1);
    c += cellsColor_ps(p * scale, scale, tm, R, mode, dir) * 1.5;
    return c;
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0, 1.0));
    if (uProgress >= 0.999) {
        return uScene.eval(p);
    }

    float2 uv = p / R;
    float2 fragPos = float2(p.x * 2.0 / R.x - 1.0, p.y * 2.0 / R.y - 1.0);
    fragPos.y *= R.y / R.x;

    float tRaw = clamp(uProgress, 0.0, 1.0);
    float t = (fract(tRaw * 0.99999) - 0.5) * kDir + 0.5;

    half4 outC = half4(0.0);
    outC += draw_ps(uv, fragPos, t, abs(cos(0.0) * 7.3 + 10.0), R, kMode, kDir);
    outC += draw_ps(uv, fragPos, t, abs(cos(1.0) * 7.3 + 10.0), R, kMode, kDir);
    outC += draw_ps(uv, fragPos, t, abs(cos(2.0) * 7.3 + 10.0), R, kMode, kDir);
    outC /= 3.0;
    outC *= half(smoothstep(0.0, 0.01, t));
    return half4(outC.rgb, 1.0);
}
`;

/** Emerge uType 0 移植：像素化、网格线、左缘扫入、填充色带，末尾 gamma。 */
const JUEJIN_INTRO_EMERGE_PIXEL_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;
uniform float3 uFillColor;

float map_em(float value, float min1, float max1, float min2, float max2) {
    float val = min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    return clamp(val, min2, max2);
}
float quadraticOut_em(float t) { return -t * (t - 2.0); }
float cubicInOut_em(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}
float cubicOut_em(float t) { float f = t - 1.0; return f * f * f + 1.0; }

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0));
    float2 uv = p / R;
    float uAspect = R.x / R.y;

    float dp = clamp(uProgress, 0.0, 1.0);
    float discardProgress = map_em(dp, 0.0, 0.8, 0.0, 1.0);
    float slideEdge = cubicOut_em(discardProgress);
    if (uv.x > slideEdge) {
        return half4(1.0, 1.0, 1.0, 1.0);
    }

    half4 defaultColor = uScene.eval(p);

    float pixelateProgress = map_em(dp, 0.3, 1.0, 0.0, 1.0);
    pixelateProgress = floor(pixelateProgress * 12.0) / 12.0;
    float s = floor(mix(11.0, 50.0, quadraticOut_em(pixelateProgress)));
    float2 gridSize = float2(s, max(floor(s / uAspect), 1.0));

    float2 newUV = floor(uv * gridSize) / gridSize + 0.5 / gridSize;
    half4 color = uScene.eval(newUV * R);
    float finalProgress = map_em(dp, 0.75, 1.0, 0.0, 1.0);
    color = mix(color, defaultColor, half(finalProgress));

    float2 gridUV = abs(fract(uv * gridSize) * 2.0 - 1.0);
    float lineW = 0.2 * (1.0 - dp);
    float lines = smoothstep(lineW + 0.02, lineW, gridUV.x) * smoothstep(lineW + 0.02, lineW, gridUV.y);

    float fillGradWidth = mix(0.4, 0.2, dp);
    float customProg = map_em(cubicInOut_em(dp), 0.0, 1.0, -fillGradWidth, 1.0 - fillGradWidth);
    float fillGradient = smoothstep(customProg, customProg + fillGradWidth, uv.x);

    float3 lineTint = float3(1.0 - lines);
    half3 mixed = mix(lineTint, color.rgb, 0.9);
    mixed = mix(mixed, float3(uFillColor), fillGradient);
    mixed = mix(mixed, defaultColor.rgb, finalProgress);

    float3 rgb = pow(mixed, float3(1.0 / 2.2));
    return half4(half3(rgb), 1.0);
}
`;

/** Emerge uType 1 移植：闪动 hash、简噪声、竖直 mask、UV 挤压。 */
const JUEJIN_INTRO_EMERGE_CHAOS_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;
uniform float3 uFillColor;
uniform float uTime;

float hashwithout12(float2 p) {
    float3 p3 = fract(float3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float parabola_ec(float x, float k) {
    return pow(4.0 * x * (1.0 - x), k);
}
float cubicInOut_ec(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}
float vnoise2_ec(float2 x) {
    float2 i = floor(x);
    float2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hashwithout12(i);
    float b = hashwithout12(i + float2(1.0, 0.0));
    float c = hashwithout12(i + float2(0.0, 1.0));
    float d = hashwithout12(i + float2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0));
    float2 uv = p / R;
    if (uProgress >= 0.999) {
        return uScene.eval(p);
    }

    float2 vUv = uv;
    float hc1 = hashwithout12(vUv * 1000.0 + floor(uTime * 3.0) * 0.1);
    float hc2 = hashwithout12(vUv * 1000.0 + 10.0 + floor(uTime * 3.0) * 0.1);
    float hc3 = hashwithout12(vUv * 1000.0 + 20.0 + floor(uTime * 3.0) * 0.1);
    float3 fillColor = float3(uFillColor) + (float3(hc1, hc2, hc3) - float3(0.5)) * 0.2;

    float n = (vnoise2_ec(vUv * float2(35.0, 1.0)) * 2.0 - 1.0 + 1.0) * 0.5;
    float t = clamp(uProgress, 0.0, 1.0);
    float dt = parabola_ec(cubicInOut_ec(t), 1.0);
    float2 distUV = uv;
    distUV.y = 1.0 - (1.0 - uv.y) * (1.0 - dt * 0.3);
    float2 distP = distUV * R;
    half4 defaultColor = uScene.eval(distP);

    float w = dt;
    float maskvalue = smoothstep(1.0 - w, 1.0, vUv.y + mix(-w * 0.5, 1.0 - w * 0.5, cubicInOut_ec(t)));
    float mask = maskvalue + maskvalue * n;
    float finalC = smoothstep(1.0, 1.01, mask);
    float final1 = smoothstep(1.0, 1.01, mask + 0.5);
    if (final1 <= 0.0001) {
        return half4(1.0, 1.0, 1.0, 1.0);
    }

    float3 finalColor = mix(fillColor, float3(defaultColor.rgb), finalC);

    float3 rgb = pow(finalColor, float3(1.0 / 2.2));
    return half4(half3(rgb), 1.0);
}
`;

/** Emerge uType 3 移植：正弦帘 + 与像素格混合。 */
const JUEJIN_INTRO_EMERGE_CURTAIN_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float uProgress;
uniform float3 uFillColor;

float quadraticInOut_eu(float t) {
    float p = 2.0 * t * t;
    return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0));
    float2 uv = p / R;
    float imageAspect = R.x / R.y;
    float tp = clamp(uProgress, 0.0, 1.0);
    if (tp >= 0.999) {
        return uScene.eval(p);
    }

    float progress = quadraticInOut_eu(1.0 - tp);
    float s = 50.0;
    float2 gridSize = float2(s, max(floor(s / imageAspect), 1.0));

    float pv = progress;
    float v = smoothstep(
        0.0,
        1.0,
        uv.y + sin(uv.x * 4.0 + pv * 6.0) * mix(0.3, 0.1, abs(0.5 - uv.x)) * 0.5 * smoothstep(0.0, 0.2, pv)
            + (1.0 - pv * 2.0)
    );
    float mixnewUV = (uv.x * 3.0 + (1.0 - v) * 50.0) * pv;
    float2 subUv = mix(uv, floor(uv * gridSize) / gridSize, mixnewUV);

    half4 color = uScene.eval(subUv * R);
    color.a = pow(v, 1.0);
    color.rgb = mix(
        color.rgb,
        float3(uFillColor),
        smoothstep(0.5, 0.0, abs(0.5 - color.a)) * pv
    );

    float3 rgb = pow(float3(color.r, color.g, color.b), float3(1.0 / 2.2));
    return half4(half3(rgb), 1.0);
}
`;

/** 与参考 EmergeMaterial 默认 uFillColor（#f60）一致，线性近似 */
const JUEJIN_EMERGE_FILL_LINEAR = Float32Array.of(1, 0.4, 0);

function easeInOutCubic(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

export function useJuejinIntroPostProcess(containerRef: RefObject<HTMLElement | null>): {
  postProcess: PostProcessOptions;
  replayIntro: (kind: JuejinIntroKind) => void;
  introActive: boolean;
  introKind: JuejinIntroKind;
} {
  const progressRef = useRef(1);
  const playingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  /** 当前这一段 rAF 正在播的入场类型（蜂窝用线性 uProgress，避免 ease-in 片头） */
  const playingKindRef = useRef<JuejinIntroKind>("noise");
  /** emergeChaos：`uTime`（秒），每帧更新 */
  const emergeTimeRef = useRef(0);
  const [introActive, setIntroActive] = useState(false);
  const [introKind, setIntroKind] = useState<JuejinIntroKind>("noise");

  const triggerRepaint = useCallback(() => {
    const root = containerRef.current;
    const canvas = root?.querySelector(
      "canvas[data-react-canvas='skia']",
    ) as HTMLCanvasElement | null;
    if (canvas) requestCanvasRepaint(canvas);
  }, [containerRef]);

  const replayIntro = useCallback(
    (kind: JuejinIntroKind) => {
      if (typeof window === "undefined") return;
      playingKindRef.current = kind;
      flushSync(() => {
        setIntroKind(kind);
      });
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      progressRef.current = 0;
      playingRef.current = true;
      setIntroActive(true);
      const startedAt = performance.now();
      const tick = (now: number) => {
        emergeTimeRef.current = (now - startedAt) * 0.001;
        const t = Math.min(1, (now - startedAt) / JUEJIN_INTRO_DURATION_MS);
        progressRef.current =
          playingKindRef.current === "hex" || playingKindRef.current === "pixelScan"
            ? t
            : easeInOutCubic(t);

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
        triggerRepaint();
      };
      rafIdRef.current = window.requestAnimationFrame(tick);
      triggerRepaint();
    },
    [triggerRepaint],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      progressRef.current = 1;
      playingRef.current = false;
      setIntroActive(false);
      return;
    }
    const played = window.sessionStorage.getItem(JUEJIN_INTRO_PLAYED_KEY) === "1";
    if (!played) {
      replayIntro("noise");
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

  const postProcess = useMemo((): PostProcessOptions => {
    const sksl =
      introKind === "hex"
        ? JUEJIN_INTRO_HEX_SKSL
        : introKind === "pixelScan"
          ? JUEJIN_INTRO_PIXEL_SCAN_SKSL
          : introKind === "emergePixel"
            ? JUEJIN_INTRO_EMERGE_PIXEL_SKSL
            : introKind === "emergeChaos"
              ? JUEJIN_INTRO_EMERGE_CHAOS_SKSL
              : introKind === "emergeCurtain"
                ? JUEJIN_INTRO_EMERGE_CURTAIN_SKSL
                : JUEJIN_INTRO_NOISE_SKSL;
    return {
      sksl,
      continuousRepaint: true,
      shouldContinueRepaint: (_ctx: PostProcessUniformContext) => playingRef.current,
      getUniforms: (ctx: PostProcessUniformContext) => {
        const base = {
          uResolution: Float32Array.of(ctx.width, ctx.height),
          uProgress: progressRef.current,
        };
        if (
          introKind === "emergePixel" ||
          introKind === "emergeChaos" ||
          introKind === "emergeCurtain"
        ) {
          if (introKind === "emergeChaos") {
            return { ...base, uFillColor: JUEJIN_EMERGE_FILL_LINEAR, uTime: emergeTimeRef.current };
          }
          return { ...base, uFillColor: JUEJIN_EMERGE_FILL_LINEAR };
        }
        return base;
      },
    };
  }, [introKind]);

  return { postProcess, replayIntro, introActive, introKind };
}
