/**
 * 基于 Codrops `water.frag`，针对**浅色 UI** 做了观感调整：
 * - 水滴 RGB：`mix(折射后的场景, texture-fg)`，避免整张贴图叠上去像磨砂/发白。
 * - 高光强度：`u_shineWeight` 缩放 shine alpha。
 * - 阴影：仍可用 `u_renderShadow`，但在网页上易显脏；默认在 hook 里关闭。
 */
export const JUEJIN_CODROPS_WATER_SKSL = `uniform shader uScene;
uniform shader u_textureShine;
uniform shader uWaterFg;
uniform shader uLiquid;

uniform float2 uResolution;
uniform float2 u_parallax;
uniform float2 u_shineTexSize;
uniform float2 u_fgTexSize;
uniform float u_textureRatio;
uniform float u_renderShine;
uniform float u_renderShadow;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_brightness;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;
uniform float u_parallaxBg;
uniform float u_parallaxFg;
/** 0=仅水膜贴图（index2 照片 demo）；约 0.25–0.35=以折射场景为主，更像玻璃雨 */
uniform float u_filmWeight;
/** 缩放高光不透明度，减轻「糊白」 */
uniform float u_shineWeight;
/** 阴影边缘强度系数（原 GLSL 固定 0.2） */
uniform float u_shadowRim;

float2 pxUnit(float2 R) {
    return float2(1.0, 1.0) / max(R, float2(1.0));
}

float2 toUv(float2 p, float2 R) {
    return float2(p.x / R.x, 1.0 - p.y / R.y);
}

float2 uvToP(float2 uv, float2 R) {
    return float2(uv.x * R.x, (1.0 - uv.y) * R.y);
}

float2 scaledTexCoord(float2 p, float2 R, float texRatio) {
    float ratio = R.x / R.y;
    float2 scale = float2(1.0, 1.0);
    float2 offset = float2(0.0, 0.0);
    float ratioDelta = ratio - texRatio;
    if (ratioDelta >= 0.0) {
        scale.y = 1.0 + ratioDelta;
        offset.y = ratioDelta / 2.0;
    } else {
        scale.x = 1.0 - ratioDelta;
        offset.x = -ratioDelta / 2.0;
    }
    return (toUv(p, R) + offset) / scale;
}

float2 fgColorUv(float2 p, float2 R, float2 par, float parFg, float x, float y) {
    float p2 = parFg * 2.0;
    float2 sc = float2((R.x + p2) / R.x, (R.y + p2) / R.y);
    float2 t = toUv(p, R) / sc;
    float2 off = float2((1.0 - 1.0 / sc.x) / 2.0, (1.0 - 1.0 / sc.y) / 2.0);
    float2 pu = pxUnit(R);
    return t + off + pu * float2(x, y) + par * pu * parFg;
}

half4 blendPorterDuff(half4 bg, half4 fg) {
    half3 bgm = bg.rgb * bg.a;
    half3 fgm = fg.rgb * fg.a;
    half ia = 1.0 - fg.a;
    half a = fg.a + bg.a * ia;
    if (a < 0.0001) {
        return half4(0.0, 0.0, 0.0, 0.0);
    }
    half3 rgb = (fgm + bgm * ia) / a;
    return half4(rgb, a);
}

half4 main(float2 p) {
    float2 R = max(uResolution, float2(1.0));
    float2 pu = pxUnit(R);

    float2 liqUv0 = fgColorUv(p, R, u_parallax, u_parallaxFg, 0.0, 0.0);
    half4 cur = uLiquid.eval(clamp(uvToP(liqUv0, R), float2(0.0), R - float2(1.0)));

    float d = float(cur.b);
    float x = float(cur.g);
    float y = float(cur.r);
    float a = clamp(float(cur.a) * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);

    float2 refraction = (float2(x, y) - float2(0.5)) * 2.0;
    float2 stc = scaledTexCoord(p, R, u_textureRatio);
    float2 refractionParallax = u_parallax * pu * (u_parallaxBg - u_parallaxFg);
    float2 refractionPos = stc + pu * refraction * (u_minRefraction + d * u_refractionDelta) + refractionParallax;

    float2 fgSample = refractionPos * max(u_fgTexSize, float2(1.0));
    half4 filmS = uWaterFg.eval(fgSample);
    float2 refrPx = clamp(uvToP(refractionPos, R), float2(0.0), R - float2(1.0));
    half4 sceneRefract = uScene.eval(refrPx);
    float w = clamp(u_filmWeight, 0.0, 1.0);
    half3 texRgb = mix(sceneRefract.rgb, filmS.rgb * u_brightness, w);

    half4 tex = half4(texRgb, 1.0);
    if (u_renderShine > 0.5) {
        float maxShine = 490.0;
        float minShine = maxShine * 0.18;
        float2 shineUv = float2(0.5, 0.5) +
            ((1.0 / max(u_shineTexSize.x, 1.0)) * refraction) * -(minShine + (maxShine - minShine) * d);
        float2 shinePx = float2(shineUv.x, 1.0 - shineUv.y) * u_shineTexSize;
        shinePx = clamp(shinePx, float2(0.0), u_shineTexSize - float2(1.0));
        half4 shine = u_textureShine.eval(shinePx);
        float sw = max(u_shineWeight, 0.0);
        shine = half4(shine.rgb, shine.a * half(sw));
        tex = blendPorterDuff(tex, shine);
    }

    half4 fg = half4(tex.rgb, half(a));

    if (u_renderShadow > 0.5) {
        float2 liqUvShadow = fgColorUv(p, R, u_parallax, u_parallaxFg, 0.0, d * 6.0);
        half4 borderSamp = uLiquid.eval(clamp(uvToP(liqUvShadow, R), float2(0.0), R - float2(1.0)));
        float borderAlpha = float(borderSamp.a);
        borderAlpha = borderAlpha * u_alphaMultiply - (u_alphaSubtract + 0.5);
        float rim = max(u_shadowRim, 0.0);
        borderAlpha = clamp(borderAlpha, 0.0, 1.0) * rim;
        half4 border = half4(0.0, 0.0, 0.0, half(borderAlpha));
        fg = blendPorterDuff(border, fg);
    }

    float2 bgUv = stc + u_parallax * pu * u_parallaxBg;
    float2 bgPx = clamp(uvToP(bgUv, R), float2(0.0), R - float2(1.0));
    half4 bg = uScene.eval(bgPx);

    return blendPorterDuff(bg, fg);
}
`;
