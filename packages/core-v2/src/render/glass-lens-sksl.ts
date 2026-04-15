/**
 * 液态玻璃圆形放大镜（由 `glassLens.ts` regl 版迁移）。
 * 坐标：与 Canvas 设备像素一致，左上原点，y 向下；`uLensPos` 为透镜中心像素。
 *
 * 子 shader 绑定场景颜色；位移色差方向用径向 `normalize(px - uLensPos)` 近似原 disp 纹理。
 */
export const GLASS_LENS_SKSL = `uniform shader uScene;
uniform float2 uResolution;
uniform float2 uLensPos;
uniform float uRadius;

half4 main(float2 p) {
    float2 res = uResolution;
    float2 px = float2(p.x, p.y);

    half4 bgColor = uScene.eval(p);

    float shadowOffset = 8.0;
    float2 shadowPos = uLensPos + float2(0.0, shadowOffset);
    float shadowDist = length(px - shadowPos) - uRadius;
    float shadow = smoothstep(25.0, -5.0, shadowDist);
    shadow *= 0.6;
    float shadowMul = 1.0 - shadow * 0.2;
    bgColor = bgColor * half4(shadowMul, shadowMul, shadowMul, 1.0);

    half4 color = bgColor;
    float dist = length(px - uLensPos) - uRadius;
    float edgeSoftness = 1.8;
    float mask = smoothstep(edgeSoftness, -edgeSoftness, dist);

    float zoomFactor = 1.2;
    float2 vUv = float2(px.x / res.x, 1.0 - px.y / res.y);
    float2 lensUvCenter = float2(uLensPos.x / res.x, 1.0 - uLensPos.y / res.y);
    float2 zoomedVuv = (vUv - lensUvCenter) / zoomFactor + lensUvCenter;

    float distFromCenter = length(px - uLensPos);
    float t = clamp(distFromCenter / uRadius, 0.0, 1.0);
    // 仅在外圈约 20% 启用扭曲（0.8 -> 1.0）；内部保持基本不变形
    float rim = smoothstep(0.8, 1.0, t);
    float edgeWarp = pow(rim, 1.25);

    // 中心保持放大（zoomedVuv），但扭曲只在边缘 rim 生效
    float2 q = zoomedVuv - lensUvCenter;
    float r2 = dot(q, q);
    float barrel = 1.0 + 0.28 * r2 * edgeWarp;
    float2 bentVuv = lensUvCenter + q * barrel;
    float2 wobble = float2(
        sin(0.02 * px.x + 0.03 * px.y),
        cos(0.021 * px.x - 0.017 * px.y)
    ) * 0.0015 * edgeWarp;
    float2 bentVuvW = bentVuv + wobble;

    float2 dirPix = px - uLensPos;
    float2 direction = length(dirPix) > 1e-4 ? normalize(dirPix) : float2(1.0, 0.0);
    float ch = 28.0;
    float2 offsetR = direction * float2(ch / res.x, ch / res.y) * edgeWarp;
    float2 offsetG = direction * float2((ch - 2.0) / res.x, (ch - 2.0) / res.y) * edgeWarp;
    float2 offsetB = direction * float2((ch - 4.0) / res.x, (ch - 4.0) / res.y) * edgeWarp;

    float2 uvR = clamp(bentVuvW + offsetR, float2(0.0), float2(1.0));
    float2 uvG = clamp(bentVuvW + offsetG, float2(0.0), float2(1.0));
    float2 uvB = clamp(bentVuvW + offsetB, float2(0.0), float2(1.0));
    float2 pxR = float2(uvR.x * res.x, (1.0 - uvR.y) * res.y);
    float2 pxG = float2(uvG.x * res.x, (1.0 - uvG.y) * res.y);
    float2 pxB = float2(uvB.x * res.x, (1.0 - uvB.y) * res.y);

    half r = uScene.eval(pxR).r;
    half g = uScene.eval(pxG).g;
    half b = uScene.eval(pxB).b;
    half3 lensRgb = half3(r, g, b);

    half3 outRgb = mix(color.rgb, lensRgb, half(mask));

    float border = smoothstep(4.0, 0.0, abs(dist));
    outRgb = outRgb + half3(border * 0.14);

    return half4(outRgb, color.a);
}
`;
