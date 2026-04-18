/** 二维向量，用于髋 / 膝 / 足等关节位置 */
export type Vec2 = { readonly x: number; readonly y: number };

export type TwoBoneIkParams = {
  /** 近端关节（髋 / 肩）世界坐标 */
  hip: Vec2;
  /** 希望足端 / 手端到达的位置（会先被约束到可达环形区域内） */
  target: Vec2;
  /** 第一段骨长（大腿 / 上臂） */
  upperLength: number;
  /** 第二段骨长（小腿 / 前臂） */
  lowerLength: number;
  /**
   * 膝盖弯向哪一侧：`1` 与 `-1` 对应 φ±γ 两种解，按屏幕坐标选「向前」或「向后」弯折。
   * 爬行动物常一侧腿用 `1`、另一侧用 `-1` 避免膝交叉到身体另一侧。
   */
  bendSign: 1 | -1;
};

export type TwoBoneIkResult = {
  knee: Vec2;
  /** 与求解使用的目标一致（已做可达性裁剪） */
  foot: Vec2;
  /** 原始 target 是否在无裁剪下可达（在 [ |L1-L2|, L1+L2 ] 内） */
  reachableWithoutClamp: boolean;
};

function clamp01(t: number): number {
  return Math.max(-1, Math.min(1, t));
}

/**
 * 将目标约束在以 hip 为圆心、[ |a-b|+ε, a+b-ε ] 为半径范围的可达圆环上，
 * 用于完全伸直、折叠等边界情况前的稳定数值。
 */
export function clampTargetToReachableAnnulus(
  hip: Vec2,
  target: Vec2,
  upperLength: number,
  lowerLength: number,
): Vec2 {
  const a = upperLength;
  const b = lowerLength;
  const dx = target.x - hip.x;
  const dy = target.y - hip.y;
  const d = Math.hypot(dx, dy);
  const eps = 1e-5;
  const maxReach = a + b - eps;
  const minReach = Math.abs(a - b) + eps;

  if (d < 1e-9) {
    return { x: hip.x + maxReach, y: hip.y };
  }

  let nd = d;
  if (d > maxReach) nd = maxReach;
  else if (d < minReach) nd = minReach;

  const ux = dx / d;
  const uy = dy / d;
  return {
    x: hip.x + ux * nd,
    y: hip.y + uy * nd,
  };
}

/** 点相对脊椎切线在关节处的左右侧（符号），用于选「膝在体外」的 IK 解 */
function sideOfSpineTangent(spineJoint: Vec2, spineTangent: Vec2, point: Vec2): number {
  return spineTangent.x * (point.y - spineJoint.y) - spineTangent.y * (point.x - spineJoint.x);
}

/**
 * 在 φ±γ 两解中选 `bendSign`，使膝关节与髋关节落在脊椎切线的同一侧（膝朝外、不穿过躯干）。
 * 前腿向前、后腿向后时足端相对髋的方位变化大，不能再用「左=-1 右=1」一刀切。
 */
export function pickBendSignKneeOutsideBody(
  hip: Vec2,
  target: Vec2,
  upperLength: number,
  lowerLength: number,
  spineJoint: Vec2,
  spineTangent: Vec2,
): 1 | -1 {
  const a = upperLength;
  const b = lowerLength;
  const foot = clampTargetToReachableAnnulus(hip, target, a, b);
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = Math.hypot(dx, dy);
  const straightEps = 1e-4;
  if (d < 1e-6 || d >= a + b - straightEps) {
    return 1;
  }

  const phi = Math.atan2(dy, dx);
  const cosGamma = (a * a + d * d - b * b) / (2 * a * d);
  const gamma = Math.acos(clamp01(cosGamma));

  const kneePlus: Vec2 = {
    x: hip.x + Math.cos(phi + gamma) * a,
    y: hip.y + Math.sin(phi + gamma) * a,
  };
  const kneeMinus: Vec2 = {
    x: hip.x + Math.cos(phi - gamma) * a,
    y: hip.y + Math.sin(phi - gamma) * a,
  };

  const hipSide = sideOfSpineTangent(spineJoint, spineTangent, hip);
  const sidePlus = sideOfSpineTangent(spineJoint, spineTangent, kneePlus);
  const sideMinus = sideOfSpineTangent(spineJoint, spineTangent, kneeMinus);
  const hSign = hipSide >= 0 ? 1 : -1;
  const matchPlus = (sidePlus >= 0 ? 1 : -1) === hSign;
  const matchMinus = (sideMinus >= 0 ? 1 : -1) === hSign;

  if (matchPlus && !matchMinus) return 1;
  if (matchMinus && !matchPlus) return -1;

  const ox = hip.x - spineJoint.x;
  const oy = hip.y - spineJoint.y;
  const olen = Math.hypot(ox, oy);
  const oux = olen > 1e-6 ? ox / olen : 1;
  const ouy = olen > 1e-6 ? oy / olen : 0;
  const scorePlus = (kneePlus.x - hip.x) * oux + (kneePlus.y - hip.y) * ouy;
  const scoreMinus = (kneeMinus.x - hip.x) * oux + (kneeMinus.y - hip.y) * ouy;
  return scorePlus >= scoreMinus ? 1 : -1;
}

/**
 * 平面两关节闭式 IK：已知髋位置与目标点、两段骨长，求膝关节（肘）与足端位置。
 * 几何：在三角形「髋—膝—足」中，`|髋膝| = upperLength`，`|膝足| = lowerLength`，`|髋足|` 由目标决定（裁剪后）。
 *
 * 算法：令 φ 为髋指向目标方位角，γ 为髋处「髋→膝」与「髋→足」夹角，
 * `cos(γ) = (L1² + d² - L2²) / (2·L1·d)`，大腿方位角 `θ = φ + bendSign·γ`，膝点 = 髋 + L1·(cos θ, sin θ)。
 */
export function solveTwoBoneIk2D(params: TwoBoneIkParams): TwoBoneIkResult {
  const { hip, upperLength: a, lowerLength: b, bendSign } = params;
  const rawDx = params.target.x - hip.x;
  const rawDy = params.target.y - hip.y;
  const rawD = Math.hypot(rawDx, rawDy);
  const maxReach = a + b;
  const minReach = Math.abs(a - b);
  const reachableWithoutClamp = rawD <= maxReach - 1e-4 && rawD >= minReach + 1e-4 && rawD > 1e-6;

  const foot = clampTargetToReachableAnnulus(hip, params.target, a, b);
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);

  const straightEps = 1e-4;
  if (d >= a + b - straightEps) {
    const ux = dx / d;
    const uy = dy / d;
    return {
      knee: { x: hip.x + ux * a, y: hip.y + uy * a },
      foot,
      reachableWithoutClamp,
    };
  }

  const cosGamma = (a * a + d * d - b * b) / (2 * a * d);
  const gamma = Math.acos(clamp01(cosGamma));
  const thighAngle = phi + bendSign * gamma;

  const knee: Vec2 = {
    x: hip.x + Math.cos(thighAngle) * a,
    y: hip.y + Math.sin(thighAngle) * a,
  };

  return { knee, foot, reachableWithoutClamp };
}

/** 髋关节相对 X 轴的世界角（弧度），以及膝关节相对大腿的局部角（弧度），便于接骨骼动画或旋转精灵 */
export function twoBoneIkAngles(
  hip: Vec2,
  knee: Vec2,
  foot: Vec2,
): { hipWorldRadians: number; kneeLocalRadians: number } {
  const hipWorldRadians = Math.atan2(knee.y - hip.y, knee.x - hip.x);
  const shin = Math.atan2(foot.y - knee.y, foot.x - knee.x);
  return {
    hipWorldRadians,
    kneeLocalRadians: shin - hipWorldRadians,
  };
}
