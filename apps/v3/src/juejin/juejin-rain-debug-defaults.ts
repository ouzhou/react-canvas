export type JuejinRainDebugRaindrops = {
  minR: number;
  maxR: number;
  collisionRadiusIncrease: number;
  dropletsRate: number;
  dropletsSizeMin: number;
  dropletsSizeMax: number;
  dropletsCleaningRadiusMultiplier: number;
  rainChance: number;
  rainLimit: number;
  trailRate: number;
  trailScaleMin: number;
  trailScaleMax: number;
  collisionRadius: number;
};

export type JuejinRainDebugWater = {
  u_renderShine: number;
  u_renderShadow: number;
  u_minRefraction: number;
  u_refractionDelta: number;
  u_brightness: number;
  u_alphaMultiply: number;
  u_alphaSubtract: number;
  u_filmWeight: number;
  u_shineWeight: number;
  u_shadowRim: number;
  u_parallaxBg: number;
  u_parallaxFg: number;
};

export type JuejinRainDebugState = {
  raindrops: JuejinRainDebugRaindrops;
  water: JuejinRainDebugWater;
};

/** Skia 调试默认值 =小雨（`RainEffect-master/src/index2.js` 水面 + Raindrops 可映射字段）。 */
export const JUEJIN_RAIN_DEBUG_DEFAULT: JuejinRainDebugState = {
  raindrops: {
    minR: 20,
    maxR: 60,
    collisionRadiusIncrease: 0,
    dropletsRate: 0,
    dropletsSizeMin: 2,
    dropletsSizeMax: 4,
    dropletsCleaningRadiusMultiplier: 0.43,
    rainChance: 0.3,
    rainLimit: 10,
    trailRate: 1.1,
    trailScaleMin: 0.2,
    trailScaleMax: 0.35,
    collisionRadius: 0.45,
  },
  water: {
    u_renderShine: 1,
    u_renderShadow: 1,
    u_minRefraction: 150,
    u_refractionDelta: 362,
    u_brightness: 1,
    u_alphaMultiply: 7,
    u_alphaSubtract: 3,
    u_filmWeight: 0.28,
    u_shineWeight: 0.5,
    u_shadowRim: 0.12,
    u_parallaxBg: 5,
    u_parallaxFg: 20,
  },
};

/** 大雨：Raindrops / RainRenderer 可对齐字段参考 `index.js` 的 `weather.rain` + 构造选项。 */
export function juejinRainDebugPresetIndex1(): JuejinRainDebugState {
  return {
    raindrops: {
      minR: 20,
      maxR: 50,
      collisionRadiusIncrease: 0.0002,
      dropletsRate: 50,
      dropletsSizeMin: 3,
      dropletsSizeMax: 5.5,
      dropletsCleaningRadiusMultiplier: 0.28,
      rainChance: 0.35,
      rainLimit: 6,
      trailRate: 1,
      trailScaleMin: 0.25,
      trailScaleMax: 0.35,
      collisionRadius: 0.45,
    },
    water: {
      u_renderShine: 0,
      u_renderShadow: 0,
      u_minRefraction: 256,
      u_refractionDelta: 256,
      u_brightness: 1.04,
      u_alphaMultiply: 6,
      u_alphaSubtract: 3,
      u_filmWeight: 0.28,
      u_shineWeight: 0.5,
      u_shadowRim: 0.12,
      u_parallaxBg: 5,
      u_parallaxFg: 20,
    },
  };
}

export function cloneJuejinRainDebugDefault(): JuejinRainDebugState {
  return {
    raindrops: { ...JUEJIN_RAIN_DEBUG_DEFAULT.raindrops },
    water: { ...JUEJIN_RAIN_DEBUG_DEFAULT.water },
  };
}
