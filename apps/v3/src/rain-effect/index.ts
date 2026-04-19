/**
 * Codrops Raindrops 2D 层（Canvas2D）；水面折射由 Skia RuntimeEffect 后处理完成，不再包含 WebGL。
 */

// —— 小工具 ——————————————————————————————————————————————————————————

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function random(
  from: number | null = null,
  to: number | null = null,
  interpolation: ((n: number) => number) | null = null,
): number {
  let f = from;
  let t = to;
  if (f == null) {
    f = 0;
    t = 1;
  } else if (f != null && t == null) {
    t = f;
    f = 0;
  }
  const delta = (t ?? 0) - (f ?? 0);
  const interp = interpolation ?? ((n: number) => n);
  return (f ?? 0) + interp(Math.random()) * delta;
}

export function chance(c: number): boolean {
  return random() <= c;
}

export function times(n: number, f: (this: unknown, i: number) => void, thisArg?: unknown): void {
  for (let i = 0; i < n; i++) {
    f.call(thisArg, i);
  }
}

type ImageEntry = { name: string; src: string; img?: HTMLImageElement };

export function loadImages(
  images: ImageEntry[],
): Promise<Record<string, { img: HTMLImageElement; src: string }>> {
  return new Promise((resolve) => {
    void Promise.all(
      images.map((src, i) => {
        return new Promise<ImageEntry & { img: HTMLImageElement }>((res) => {
          const entry = typeof src === "string" ? { name: `image${i}`, src } : { ...src };
          const img = new Image();
          entry.img = img;
          img.addEventListener("load", () => res(entry as ImageEntry & { img: HTMLImageElement }));
          img.src = entry.src;
        });
      }),
    ).then((loaded) => {
      const r: Record<string, { img: HTMLImageElement; src: string }> = {};
      loaded.forEach((cur) => {
        r[cur.name] = { img: cur.img!, src: cur.src };
      });
      resolve(r);
    });
  });
}

// —— Raindrops ————————————————————————————————————————————————————————

const dropSize = 64;
const Drop = {
  x: 0,
  y: 0,
  r: 0,
  spreadX: 0,
  spreadY: 0,
  momentum: 0,
  momentumX: 0,
  lastSpawn: 0,
  nextSpawn: 0,
  parent: null as unknown,
  isNew: true,
  killed: false,
  shrink: 0,
};

const raindropsDefaultOptions = {
  minR: 10,
  maxR: 40,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4] as [number, number],
  dropletsCleaningRadiusMultiplier: 0.43,
  raining: true,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95] as [number, number],
  trailScaleRange: [0.2, 0.5] as [number, number],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
};

function Raindrops(
  this: RaindropsInstance,
  width: number,
  height: number,
  scale: number,
  dropAlpha: CanvasImageSource,
  dropColor: CanvasImageSource,
  options: Partial<typeof raindropsDefaultOptions> = {},
) {
  this.width = width;
  this.height = height;
  this.scale = scale;
  this.dropAlpha = dropAlpha;
  this.dropColor = dropColor;
  this.options = Object.assign({}, raindropsDefaultOptions, options);
  this.init();
}

type RaindropsInstance = {
  width: number;
  height: number;
  scale: number;
  dropAlpha: CanvasImageSource;
  dropColor: CanvasImageSource;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  droplets: HTMLCanvasElement;
  dropletsCtx: CanvasRenderingContext2D;
  dropletsPixelDensity: number;
  dropletsCounter: number;
  drops: unknown[];
  dropsGfx: HTMLCanvasElement[];
  clearDropletsGfx: HTMLCanvasElement;
  textureCleaningIterations: number;
  lastRender: number | null;
  options: typeof raindropsDefaultOptions;
  rafId: number;
  stopped: boolean;
  init: () => void;
  update: () => void;
  stop: () => void;
  renderDropsGfx: () => void;
  drawDroplet: (x: number, y: number, r: number) => void;
  drawDrop: (ctx: CanvasRenderingContext2D, drop: Record<string, unknown>) => void;
  clearDroplets: (x: number, y: number, r?: number) => void;
  clearCanvas: () => void;
  createDrop: (options: Record<string, unknown>) => unknown;
  addDrop: (drop: unknown) => boolean;
  updateRain: (timeScale: number) => unknown[];
  clearDrops: () => void;
  clearTexture: () => void;
  updateDroplets: (timeScale: number) => void;
  updateDrops: (timeScale: number) => void;
  deltaR: () => number;
  area: () => number;
  areaMultiplier: () => number;
};

Raindrops.prototype = {
  dropColor: null!,
  dropAlpha: null!,
  canvas: null!,
  ctx: null!,
  width: 0,
  height: 0,
  scale: 0,
  dropletsPixelDensity: 1,
  droplets: null!,
  dropletsCtx: null!,
  dropletsCounter: 0,
  drops: null!,
  dropsGfx: null!,
  clearDropletsGfx: null!,
  textureCleaningIterations: 0,
  lastRender: null,
  options: null!,
  rafId: 0,
  stopped: false,

  init(this: RaindropsInstance) {
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d")!;
    this.droplets = createCanvas(
      this.width * this.dropletsPixelDensity,
      this.height * this.dropletsPixelDensity,
    );
    this.dropletsCtx = this.droplets.getContext("2d")!;
    this.drops = [];
    this.dropsGfx = [];
    this.renderDropsGfx();
    this.update();
  },

  deltaR(this: RaindropsInstance): number {
    return this.options.maxR - this.options.minR;
  },
  area(this: RaindropsInstance): number {
    return (this.width * this.height) / this.scale;
  },
  areaMultiplier(this: RaindropsInstance): number {
    return Math.sqrt(this.area() / (1024 * 768));
  },

  drawDroplet(this: RaindropsInstance, x: number, y: number, r: number) {
    this.drawDrop(
      this.dropletsCtx,
      Object.assign(Object.create(Drop), {
        x: x * this.dropletsPixelDensity,
        y: y * this.dropletsPixelDensity,
        r: r * this.dropletsPixelDensity,
      }) as Record<string, unknown>,
    );
  },

  renderDropsGfx(this: RaindropsInstance) {
    const dropBuffer = createCanvas(dropSize, dropSize);
    const dropBufferCtx = dropBuffer.getContext("2d")!;
    this.dropsGfx = Array.apply(null, Array(255) as unknown[]).map((_cur, i) => {
      const drop = createCanvas(dropSize, dropSize);
      const dropCtx = drop.getContext("2d")!;
      dropBufferCtx.clearRect(0, 0, dropSize, dropSize);
      dropBufferCtx.globalCompositeOperation = "source-over";
      dropBufferCtx.drawImage(this.dropColor as CanvasImageSource, 0, 0, dropSize, dropSize);
      dropBufferCtx.globalCompositeOperation = "screen";
      dropBufferCtx.fillStyle = `rgba(0,0,${i},1)`;
      dropBufferCtx.fillRect(0, 0, dropSize, dropSize);
      dropCtx.globalCompositeOperation = "source-over";
      dropCtx.drawImage(this.dropAlpha as CanvasImageSource, 0, 0, dropSize, dropSize);
      dropCtx.globalCompositeOperation = "source-in";
      dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);
      return drop;
    });
    this.clearDropletsGfx = createCanvas(128, 128);
    const clearDropletsCtx = this.clearDropletsGfx.getContext("2d")!;
    clearDropletsCtx.fillStyle = "#000";
    clearDropletsCtx.beginPath();
    clearDropletsCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearDropletsCtx.fill();
  },

  drawDrop(this: RaindropsInstance, ctx: CanvasRenderingContext2D, drop: Record<string, unknown>) {
    if (this.dropsGfx.length > 0) {
      const x = drop.x as number;
      const y = drop.y as number;
      const r = drop.r as number;
      const spreadX = drop.spreadX as number;
      const spreadY = drop.spreadY as number;
      const scaleX = 1;
      const scaleY = 1.5;
      let d = Math.max(0, Math.min(1, ((r - this.options.minR) / this.deltaR()) * 0.9));
      d *= 1 / ((spreadX + spreadY) * 0.5 + 1);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      d = Math.floor(d * (this.dropsGfx.length - 1));
      ctx.drawImage(
        this.dropsGfx[d]!,
        (x - r * scaleX * (spreadX + 1)) * this.scale,
        (y - r * scaleY * (spreadY + 1)) * this.scale,
        r * 2 * scaleX * (spreadX + 1) * this.scale,
        r * 2 * scaleY * (spreadY + 1) * this.scale,
      );
    }
  },

  clearDroplets(this: RaindropsInstance, x: number, y: number, r = 30) {
    const ctx = this.dropletsCtx;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(
      this.clearDropletsGfx,
      (x - r) * this.dropletsPixelDensity * this.scale,
      (y - r) * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale * 1.5,
    );
  },

  clearCanvas(this: RaindropsInstance) {
    this.ctx.clearRect(0, 0, this.width, this.height);
  },

  createDrop(this: RaindropsInstance, options: Record<string, unknown>) {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier()) return null;
    return Object.assign(Object.create(Drop), options);
  },

  addDrop(this: RaindropsInstance, drop: unknown) {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier() || drop == null)
      return false;
    this.drops.push(drop);
    return true;
  },

  updateRain(this: RaindropsInstance, timeScale: number) {
    const rainDrops: unknown[] = [];
    if (this.options.raining) {
      const limit = this.options.rainLimit * timeScale * this.areaMultiplier();
      let count = 0;
      while (chance(this.options.rainChance * timeScale * this.areaMultiplier()) && count < limit) {
        count++;
        const r = random(this.options.minR, this.options.maxR, (n) => Math.pow(n, 3));
        const rainDrop = this.createDrop({
          x: random(this.width / this.scale),
          y: random(
            (this.height / this.scale) * this.options.spawnArea[0],
            (this.height / this.scale) * this.options.spawnArea[1],
          ),
          r,
          momentum: 1 + (r - this.options.minR) * 0.1 + random(2),
          spreadX: 1.5,
          spreadY: 1.5,
        });
        if (rainDrop != null) rainDrops.push(rainDrop);
      }
    }
    return rainDrops;
  },

  clearDrops(this: RaindropsInstance) {
    this.drops.forEach((drop) => {
      setTimeout(() => {
        (drop as { shrink: number }).shrink = 0.1 + random(0.5);
      }, random(1200));
    });
    this.clearTexture();
  },

  clearTexture(this: RaindropsInstance) {
    this.textureCleaningIterations = 50;
  },

  updateDroplets(this: RaindropsInstance, timeScale: number) {
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= 1 * timeScale;
      this.dropletsCtx.globalCompositeOperation = "destination-out";
      this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
      this.dropletsCtx.fillRect(
        0,
        0,
        this.width * this.dropletsPixelDensity,
        this.height * this.dropletsPixelDensity,
      );
    }
    if (this.options.raining) {
      this.dropletsCounter += this.options.dropletsRate * timeScale * this.areaMultiplier();
      times(this.dropletsCounter, () => {
        this.dropletsCounter--;
        this.drawDroplet(
          random(this.width / this.scale),
          random(this.height / this.scale),
          random(...this.options.dropletsSize, (n) => n * n),
        );
      });
    }
    this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
  },

  updateDrops(this: RaindropsInstance, timeScale: number) {
    let newDrops: unknown[] = [];
    this.updateDroplets(timeScale);
    const rainDrops = this.updateRain(timeScale);
    newDrops = newDrops.concat(rainDrops);

    this.drops.sort((a, b) => {
      const va =
        (a as { y: number; x: number }).y * (this.width / this.scale) + (a as { x: number }).x;
      const vb =
        (b as { y: number; x: number }).y * (this.width / this.scale) + (b as { x: number }).x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    this.drops.forEach((dropRaw, i) => {
      const drop = dropRaw as Record<string, unknown>;
      if (!drop.killed) {
        if (
          chance(
            ((drop.r as number) - this.options.minR * this.options.dropFallMultiplier) *
              (0.1 / this.deltaR()) *
              timeScale,
          )
        ) {
          drop.momentum =
            (drop.momentum as number) + random(((drop.r as number) / this.options.maxR) * 4);
        }
        if (
          this.options.autoShrink &&
          (drop.r as number) <= this.options.minR &&
          chance(0.05 * timeScale)
        ) {
          drop.shrink = (drop.shrink as number) + 0.01;
        }
        drop.r = (drop.r as number) - (drop.shrink as number) * timeScale;
        if ((drop.r as number) <= 0) drop.killed = true;

        if (this.options.raining) {
          drop.lastSpawn =
            (drop.lastSpawn as number) +
            (drop.momentum as number) * timeScale * this.options.trailRate;
          if ((drop.lastSpawn as number) > (drop.nextSpawn as number)) {
            const trailDrop = this.createDrop({
              x: (drop.x as number) + random(-(drop.r as number), drop.r as number) * 0.1,
              y: (drop.y as number) - (drop.r as number) * 0.01,
              r: (drop.r as number) * random(...this.options.trailScaleRange),
              spreadY: (drop.momentum as number) * 0.1,
              parent: drop,
            });
            if (trailDrop != null) {
              newDrops.push(trailDrop);
              drop.r = (drop.r as number) * Math.pow(0.97, timeScale);
              drop.lastSpawn = 0;
              drop.nextSpawn =
                random(this.options.minR, this.options.maxR) -
                (drop.momentum as number) * 2 * this.options.trailRate +
                (this.options.maxR - (drop.r as number));
            }
          }
        }

        drop.spreadX = (drop.spreadX as number) * Math.pow(0.4, timeScale);
        drop.spreadY = (drop.spreadY as number) * Math.pow(0.7, timeScale);

        const moved = (drop.momentum as number) > 0;
        if (moved && !drop.killed) {
          drop.y = (drop.y as number) + (drop.momentum as number) * this.options.globalTimeScale;
          drop.x = (drop.x as number) + (drop.momentumX as number) * this.options.globalTimeScale;
          if ((drop.y as number) > this.height / this.scale + (drop.r as number)) {
            drop.killed = true;
          }
        }

        const checkCollision = (moved || drop.isNew) && !drop.killed;
        drop.isNew = false;

        if (checkCollision) {
          this.drops.slice(i + 1, i + 70).forEach((drop2raw) => {
            const drop2 = drop2raw as Record<string, unknown>;
            if (
              drop !== drop2 &&
              (drop.r as number) > (drop2.r as number) &&
              drop.parent !== drop2 &&
              drop2.parent !== drop &&
              !drop2.killed
            ) {
              const dx = (drop2.x as number) - (drop.x as number);
              const dy = (drop2.y as number) - (drop.y as number);
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (
                dist <
                ((drop.r as number) + (drop2.r as number)) *
                  (this.options.collisionRadius +
                    (drop.momentum as number) * this.options.collisionRadiusIncrease * timeScale)
              ) {
                const pi = Math.PI;
                const r1 = drop.r as number;
                const r2 = drop2.r as number;
                const a1 = pi * (r1 * r1);
                const a2 = pi * (r2 * r2);
                let targetR = Math.sqrt((a1 + a2 * 0.8) / pi);
                const maxR = this.options.maxR;
                if (targetR > maxR) targetR = maxR;
                drop.r = targetR;
                drop.momentumX = (drop.momentumX as number) + dx * 0.1;
                drop.spreadX = 0;
                drop.spreadY = 0;
                drop2.killed = true;
                drop.momentum = Math.max(
                  drop2.momentum as number,
                  Math.min(
                    40,
                    (drop.momentum as number) +
                      targetR * this.options.collisionBoostMultiplier +
                      this.options.collisionBoost,
                  ),
                );
              }
            }
          });
        }

        drop.momentum =
          (drop.momentum as number) -
          Math.max(1, this.options.minR * 0.5 - (drop.momentum as number)) * 0.1 * timeScale;
        if ((drop.momentum as number) < 0) drop.momentum = 0;
        drop.momentumX = (drop.momentumX as number) * Math.pow(0.7, timeScale);

        if (!drop.killed) {
          newDrops.push(drop);
          if (moved && this.options.dropletsRate > 0)
            this.clearDroplets(
              drop.x as number,
              drop.y as number,
              (drop.r as number) * this.options.dropletsCleaningRadiusMultiplier,
            );
          this.drawDrop(this.ctx, drop);
        }
      }
    });

    this.drops = newDrops;
  },

  update(this: RaindropsInstance) {
    if (this.stopped) return;
    this.clearCanvas();
    const now = Date.now();
    if (this.lastRender == null) this.lastRender = now;
    let timeScale = (now - this.lastRender) / ((1 / 60) * 1000);
    if (timeScale > 1.1) timeScale = 1.1;
    timeScale *= this.options.globalTimeScale;
    this.lastRender = now;
    this.updateDrops(timeScale);
    this.rafId = requestAnimationFrame(this.update.bind(this)) as unknown as number;
  },

  stop(this: RaindropsInstance) {
    this.stopped = true;
    cancelAnimationFrame(this.rafId);
  },
};

export const RaindropsCtor = Raindrops as unknown as new (
  width: number,
  height: number,
  scale: number,
  dropAlpha: CanvasImageSource,
  dropColor: CanvasImageSource,
  options?: Partial<typeof raindropsDefaultOptions>,
) => RaindropsInstance;
