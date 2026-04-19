/**
 * Codrops RainEffect（index2 管线）单文件打包：WebGL + 2D 水滴 + 纹理加载。
 */

// —— shaders（原 simple.vert / water.frag）—————————————————————————

const VERT_SHADER = `precision mediump float;

attribute vec2 a_position;

void main() {
   gl_Position = vec4(a_position,0.0,1.0);
}
`;

const FRAG_SHADER = `precision mediump float;

uniform sampler2D u_waterMap;
uniform sampler2D u_textureShine;
uniform sampler2D u_textureFg;
uniform sampler2D u_textureBg;

varying vec2 v_texCoord;
uniform vec2 u_resolution;
uniform vec2 u_parallax;
uniform float u_parallaxFg;
uniform float u_parallaxBg;
uniform float u_textureRatio;
uniform bool u_renderShine;
uniform bool u_renderShadow;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_brightness;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;

vec4 blend(vec4 bg,vec4 fg){
  vec3 bgm=bg.rgb*bg.a;
  vec3 fgm=fg.rgb*fg.a;
  float ia=1.0-fg.a;
  float a=(fg.a + bg.a * ia);
  vec3 rgb;
  if(a!=0.0){
    rgb=(fgm + bgm * ia) / a;
  }else{
    rgb=vec3(0.0,0.0,0.0);
  }
  return vec4(rgb,a);
}

vec2 pixel(){
  return vec2(1.0,1.0)/u_resolution;
}

vec2 parallax(float v){
  return u_parallax*pixel()*v;
}

vec2 texCoord(){
  return vec2(gl_FragCoord.x, u_resolution.y-gl_FragCoord.y)/u_resolution;
}

vec2 scaledTexCoord(){
  float ratio=u_resolution.x/u_resolution.y;
  vec2 scale=vec2(1.0,1.0);
  vec2 offset=vec2(0.0,0.0);
  float ratioDelta=ratio-u_textureRatio;
  if(ratioDelta>=0.0){
    scale.y=(1.0+ratioDelta);
    offset.y=ratioDelta/2.0;
  }else{
    scale.x=(1.0-ratioDelta);
    offset.x=-ratioDelta/2.0;
  }
  return (texCoord()+offset)/scale;
}

vec4 fgColor(float x, float y){
  float p2=u_parallaxFg*2.0;
  vec2 scale=vec2(
    (u_resolution.x+p2)/u_resolution.x,
    (u_resolution.y+p2)/u_resolution.y
  );

  vec2 scaledTexCoord=texCoord()/scale;
  vec2 offset=vec2(
    (1.0-(1.0/scale.x))/2.0,
    (1.0-(1.0/scale.y))/2.0
  );

  return texture2D(u_waterMap,
    (scaledTexCoord+offset)+(pixel()*vec2(x,y))+parallax(u_parallaxFg)
  );
}

void main() {
  vec4 bg=texture2D(u_textureBg,scaledTexCoord()+parallax(u_parallaxBg));

  vec4 cur = fgColor(0.0,0.0);

  float d=cur.b;
  float x=cur.g;
  float y=cur.r;

  float a=clamp(cur.a*u_alphaMultiply-u_alphaSubtract, 0.0,1.0);

  vec2 refraction = (vec2(x,y)-0.5)*2.0;
  vec2 refractionParallax=parallax(u_parallaxBg-u_parallaxFg);
  vec2 refractionPos = scaledTexCoord()
    + (pixel()*refraction*(u_minRefraction+(d*u_refractionDelta)))
    + refractionParallax;

  vec4 tex=texture2D(u_textureFg,refractionPos);

  if(u_renderShine){
    float maxShine=490.0;
    float minShine=maxShine*0.18;
    vec2 shinePos=vec2(0.5,0.5) + ((1.0/512.0)*refraction)* -(minShine+((maxShine-minShine)*d));
    vec4 shine=texture2D(u_textureShine,shinePos);
    tex=blend(tex,shine);
  }

  vec4 fg=vec4(tex.rgb*u_brightness,a);

  if(u_renderShadow){
    float borderAlpha = fgColor(0.,0.-(d*6.0)).a;
    borderAlpha=borderAlpha*u_alphaMultiply-(u_alphaSubtract+0.5);
    borderAlpha=clamp(borderAlpha,0.,1.);
    borderAlpha*=0.2;
    vec4 border=vec4(0.,0.,0.,borderAlpha);
    fg=blend(border,fg);
  }

  gl_FragColor = blend(bg,fg);
}
`;

// —— WebGL 工具 ————————————————————————————————————————————————————

function glLogError(msg: string): void {
  console.error(msg);
}

export function getContext(
  canvas: HTMLCanvasElement,
  options: WebGLContextAttributes = {},
): WebGLRenderingContext | null {
  const names: ("webgl" | "experimental-webgl")[] = ["webgl", "experimental-webgl"];
  let context: WebGLRenderingContext | null = null;
  names.some((name) => {
    try {
      context = canvas.getContext(name, options) as WebGLRenderingContext | null;
    } catch {
      /* ignore */
    }
    return context != null;
  });
  if (context == null) {
    document.body.classList.add("no-webgl");
  }
  return context;
}

export function createShader(
  gl: WebGLRenderingContext,
  script: string,
  type: number,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, script);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    glLogError(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexScript: string,
  fragScript: string,
): WebGLProgram | null {
  const vs = createShader(gl, vertexScript, gl.VERTEX_SHADER);
  const fs = createShader(gl, fragScript, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    glLogError(`Error in program linking: ${gl.getProgramInfoLog(program)}`);
    gl.deleteProgram(program);
    return null;
  }
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  return program;
}

export function createTexture(
  gl: WebGLRenderingContext,
  source: TexImageSource | null,
  i: number,
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  activeTexture(gl, i);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (source != null) {
    updateTexture(gl, source);
  }
  return texture;
}

export function createUniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  type: string,
  name: string,
  ...args: unknown[]
): void {
  const location = gl.getUniformLocation(program, `u_${name}`);
  const key = `uniform${type}` as keyof WebGLRenderingContext;
  const fn = gl[key] as (...a: unknown[]) => void;
  fn.call(gl, location, ...args);
}

export function activeTexture(gl: WebGLRenderingContext, i: number): void {
  gl.activeTexture(gl.TEXTURE0 + i);
}

export function updateTexture(gl: WebGLRenderingContext, source: TexImageSource): void {
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as HTMLImageElement);
}

export function setRectangle(
  gl: WebGLRenderingContext,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW,
  );
}

// —— GL 封装 ——————————————————————————————————————————————————————————

type GLInstance = {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram | null;
  width: number;
  height: number;
  init: (
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes,
    vert: string,
    frag: string,
  ) => void;
  createProgram: (vert: string, frag: string) => WebGLProgram | null;
  useProgram: (program: WebGLProgram | null) => void;
  createTexture: (source: TexImageSource | null, i: number) => WebGLTexture | null;
  createUniform: (type: string, name: string, ...v: unknown[]) => void;
  activeTexture: (i: number) => void;
  updateTexture: (source: TexImageSource) => void;
  draw: () => void;
};

function GL(
  this: GLInstance,
  canvas: HTMLCanvasElement,
  options: WebGLContextAttributes,
  vert: string,
  frag: string,
) {
  this.init(canvas, options, vert, frag);
}

GL.prototype = {
  canvas: null!,
  gl: null!,
  program: null,
  width: 0,
  height: 0,
  init(
    this: GLInstance,
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes,
    vert: string,
    frag: string,
  ) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    const gl = getContext(canvas, options);
    if (!gl) throw new Error("[rain-effect] WebGL unavailable");
    this.gl = gl;
    this.program = this.createProgram(vert, frag);
    this.useProgram(this.program);
  },
  createProgram(this: GLInstance, vert: string, frag: string) {
    return createProgram(this.gl, vert, frag);
  },
  useProgram(this: GLInstance, program: WebGLProgram | null) {
    this.program = program;
    if (program) this.gl.useProgram(program);
  },
  createTexture(this: GLInstance, source: TexImageSource | null, i: number) {
    return createTexture(this.gl, source, i);
  },
  createUniform(this: GLInstance, type: string, name: string, ...v: unknown[]) {
    if (this.program) createUniform(this.gl, this.program, type, name, ...v);
  },
  activeTexture(this: GLInstance, i: number) {
    activeTexture(this.gl, i);
  },
  updateTexture(this: GLInstance, source: TexImageSource) {
    updateTexture(this.gl, source);
  },
  draw(this: GLInstance) {
    setRectangle(this.gl, -1, -1, 2, 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  },
};

const GLCtor = GL as unknown as {
  new (
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes,
    vert: string,
    frag: string,
  ): GLInstance;
};

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

// —— RainRenderer —————————————————————————————————————————————————————

const rendererDefaultOptions = {
  renderShadow: false,
  minRefraction: 256,
  maxRefraction: 512,
  brightness: 1,
  alphaMultiply: 20,
  alphaSubtract: 5,
  parallaxBg: 5,
  parallaxFg: 20,
};

type RainRendererInstance = {
  canvas: HTMLCanvasElement;
  canvasLiquid: HTMLCanvasElement;
  imageShine: TexImageSource | null;
  imageFg: TexImageSource;
  imageBg: TexImageSource;
  options: typeof rendererDefaultOptions;
  gl: GLInstance;
  programWater: WebGLProgram | null;
  textures: { name: string; img: TexImageSource }[];
  parallaxX: number;
  parallaxY: number;
  width: number;
  height: number;
  rafId: number;
  stopped: boolean;
  init: () => void;
  draw: () => void;
  stop: () => void;
  updateTextures: () => void;
  updateTexture: () => void;
};

function RainRenderer(
  this: RainRendererInstance,
  canvas: HTMLCanvasElement,
  canvasLiquid: HTMLCanvasElement,
  imageFg: TexImageSource,
  imageBg: TexImageSource,
  imageShine: TexImageSource | null = null,
  options: Partial<typeof rendererDefaultOptions> = {},
) {
  this.canvas = canvas;
  this.canvasLiquid = canvasLiquid;
  this.imageShine = imageShine;
  this.imageFg = imageFg;
  this.imageBg = imageBg;
  this.options = Object.assign({}, rendererDefaultOptions, options);
  this.rafId = 0;
  this.stopped = false;
  this.init();
}

RainRenderer.prototype = {
  canvas: null!,
  gl: null!,
  canvasLiquid: null!,
  width: 0,
  height: 0,
  imageShine: null,
  imageFg: null!,
  imageBg: null!,
  textures: null!,
  programWater: null,
  parallaxX: 0,
  parallaxY: 0,
  options: null!,
  rafId: 0,
  stopped: false,

  init(this: RainRendererInstance) {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.gl = new GLCtor(this.canvas, { alpha: false }, VERT_SHADER, FRAG_SHADER);
    const gl = this.gl;
    this.programWater = gl.program;
    const bgImg = this.imageBg as HTMLImageElement;
    gl.createUniform("2f", "resolution", this.width, this.height);
    gl.createUniform("1f", "textureRatio", bgImg.width / bgImg.height);
    gl.createUniform("1i", "renderShine", this.imageShine == null ? 0 : 1);
    gl.createUniform("1i", "renderShadow", this.options.renderShadow ? 1 : 0);
    gl.createUniform("1f", "minRefraction", this.options.minRefraction);
    gl.createUniform(
      "1f",
      "refractionDelta",
      this.options.maxRefraction - this.options.minRefraction,
    );
    gl.createUniform("1f", "brightness", this.options.brightness);
    gl.createUniform("1f", "alphaMultiply", this.options.alphaMultiply);
    gl.createUniform("1f", "alphaSubtract", this.options.alphaSubtract);
    gl.createUniform("1f", "parallaxBg", this.options.parallaxBg);
    gl.createUniform("1f", "parallaxFg", this.options.parallaxFg);
    gl.createTexture(null, 0);
    this.textures = [
      { name: "textureShine", img: this.imageShine == null ? createCanvas(2, 2) : this.imageShine },
      { name: "textureFg", img: this.imageFg },
      { name: "textureBg", img: this.imageBg },
    ];
    this.textures.forEach((texture, i) => {
      gl.createTexture(texture.img, i + 1);
      gl.createUniform("1i", texture.name, i + 1);
    });
    this.draw();
  },

  draw(this: RainRendererInstance) {
    if (this.stopped) return;
    this.gl.useProgram(this.programWater);
    this.gl.createUniform("2f", "parallax", this.parallaxX, this.parallaxY);
    this.updateTexture();
    this.gl.draw();
    this.rafId = requestAnimationFrame(() => {
      this.draw();
    }) as unknown as number;
  },

  stop(this: RainRendererInstance) {
    this.stopped = true;
    cancelAnimationFrame(this.rafId);
  },

  updateTextures(this: RainRendererInstance) {
    this.textures.forEach((texture, i) => {
      this.gl.activeTexture(i + 1);
      this.gl.updateTexture(texture.img);
    });
  },

  updateTexture(this: RainRendererInstance) {
    this.gl.activeTexture(0);
    this.gl.updateTexture(this.canvasLiquid);
  },
};

export const RainRendererCtor = RainRenderer as unknown as new (
  canvas: HTMLCanvasElement,
  canvasLiquid: HTMLCanvasElement,
  imageFg: TexImageSource,
  imageBg: TexImageSource,
  imageShine?: TexImageSource | null,
  options?: Partial<typeof rendererDefaultOptions>,
) => RainRendererInstance;
