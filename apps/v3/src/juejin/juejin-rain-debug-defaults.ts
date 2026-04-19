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

export const JUEJIN_RAIN_DEBUG_DEFAULT: JuejinRainDebugState = {
  raindrops: {
    minR: 30,
    maxR: 60,
    collisionRadiusIncrease: 0.002,
    dropletsRate: 35,
    dropletsSizeMin: 3,
    dropletsSizeMax: 7.5,
    dropletsCleaningRadiusMultiplier: 0.3,
    rainChance: 0.3,
    rainLimit: 3,
    trailRate: 1,
    trailScaleMin: 0.2,
    trailScaleMax: 0.5,
    collisionRadius: 0.65,
  },
  water: {
    u_renderShine: 0,
    u_renderShadow: 0,
    u_minRefraction: 256,
    u_refractionDelta: 256,
    u_brightness: 1.1,
    u_alphaMultiply: 6,
    u_alphaSubtract: 3,
    u_filmWeight: 0.28,
    u_shineWeight: 0.5,
    u_shadowRim: 0.12,
    u_parallaxBg: 5,
    u_parallaxFg: 40,
  },
};

export function cloneJuejinRainDebugDefault(): JuejinRainDebugState {
  return {
    raindrops: { ...JUEJIN_RAIN_DEBUG_DEFAULT.raindrops },
    water: { ...JUEJIN_RAIN_DEBUG_DEFAULT.water },
  };
}
