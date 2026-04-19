/**
 * Codrops index2：全屏 WebGL `water.frag` + 液体层纹理，合并为单文件（无 glslify / 无 demo 静态资源目录）。
 */

const WATER_VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const WATER_FRAG = `precision mediump float;

uniform sampler2D u_waterMap;
uniform sampler2D u_textureShine;
uniform sampler2D u_textureFg;
uniform sampler2D u_textureBg;

uniform vec2 u_resolution;
uniform vec2 u_parallax;
uniform float u_parallaxFg;
uniform float u_parallaxBg;
uniform float u_textureRatio;
uniform int u_renderShine;
uniform int u_renderShadow;
uniform float u_minRefraction;
uniform float u_refractionDelta;
uniform float u_brightness;
uniform float u_alphaMultiply;
uniform float u_alphaSubtract;

vec4 blend(vec4 bg, vec4 fg) {
  vec3 bgm = bg.rgb * bg.a;
  vec3 fgm = fg.rgb * fg.a;
  float ia = 1.0 - fg.a;
  float a = fg.a + bg.a * ia;
  vec3 rgb;
  if (a != 0.0) {
    rgb = (fgm + bgm * ia) / a;
  } else {
    rgb = vec3(0.0, 0.0, 0.0);
  }
  return vec4(rgb, a);
}

vec2 pixel() {
  return vec2(1.0, 1.0) / u_resolution;
}

vec2 parallax(float v) {
  return u_parallax * pixel() * v;
}

vec2 texCoord() {
  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_resolution;
}

vec2 scaledTexCoord() {
  float ratio = u_resolution.x / u_resolution.y;
  vec2 scale = vec2(1.0, 1.0);
  vec2 offset = vec2(0.0, 0.0);
  float ratioDelta = ratio - u_textureRatio;
  if (ratioDelta >= 0.0) {
    scale.y = (1.0 + ratioDelta);
    offset.y = ratioDelta / 2.0;
  } else {
    scale.x = (1.0 - ratioDelta);
    offset.x = -ratioDelta / 2.0;
  }
  return (texCoord() + offset) / scale;
}

vec4 fgColor(float x, float y) {
  float p2 = u_parallaxFg * 2.0;
  vec2 scale = vec2(
    (u_resolution.x + p2) / u_resolution.x,
    (u_resolution.y + p2) / u_resolution.y
  );
  vec2 st = texCoord() / scale;
  vec2 off = vec2(
    (1.0 - (1.0 / scale.x)) / 2.0,
    (1.0 - (1.0 / scale.y)) / 2.0
  );
  return texture2D(
    u_waterMap,
    (st + off) + (pixel() * vec2(x, y)) + parallax(u_parallaxFg)
  );
}

void main() {
  vec4 bg = texture2D(u_textureBg, scaledTexCoord() + parallax(u_parallaxBg));
  vec4 cur = fgColor(0.0, 0.0);
  float d = cur.b;
  float x = cur.g;
  float y = cur.r;
  float a = clamp(cur.a * u_alphaMultiply - u_alphaSubtract, 0.0, 1.0);
  vec2 refraction = (vec2(x, y) - 0.5) * 2.0;
  vec2 refractionParallax = parallax(u_parallaxBg - u_parallaxFg);
  vec2 refractionPos = scaledTexCoord()
    + (pixel() * refraction * (u_minRefraction + (d * u_refractionDelta)))
    + refractionParallax;
  vec4 tex = texture2D(u_textureFg, refractionPos);
  if (u_renderShine != 0) {
    float maxShine = 490.0;
    float minShine = maxShine * 0.18;
    vec2 shinePos = vec2(0.5, 0.5)
      + ((1.0 / 512.0) * refraction) * -(minShine + ((maxShine - minShine) * d));
    vec4 shine = texture2D(u_textureShine, shinePos);
    tex = blend(tex, shine);
  }
  vec4 fg = vec4(tex.rgb * u_brightness, a);
  if (u_renderShadow != 0) {
    float borderAlpha = fgColor(0.0, 0.0 - (d * 6.0)).a;
    borderAlpha = borderAlpha * u_alphaMultiply - (u_alphaSubtract + 0.5);
    borderAlpha = clamp(borderAlpha, 0.0, 1.0) * 0.2;
    vec4 border = vec4(0.0, 0.0, 0.0, borderAlpha);
    fg = blend(border, fg);
  }
  gl_FragColor = blend(bg, fg);
}`;

function compileShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[codrops-index2-webgl] shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function linkWaterProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, WATER_VERT, gl.VERTEX_SHADER);
  const fs = compileShader(gl, WATER_FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error("[codrops-index2-webgl] program:", gl.getProgramInfoLog(p));
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function createTexFromSource(
  gl: WebGLRenderingContext,
  unit: number,
  source: TexImageSource,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return tex;
}

function allocLiquidTex(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function setFullscreenQuad(gl: WebGLRenderingContext, buf: WebGLBuffer): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
}

export type CodropsIndex2WaterOptions = {
  /** 无 shine 贴图用途时可关（index2 为 true） */
  renderShine?: boolean;
  renderShadow?: boolean;
  minRefraction?: number;
  maxRefraction?: number;
  brightness?: number;
  alphaMultiply?: number;
  alphaSubtract?: number;
  parallaxBg?: number;
  parallaxFg?: number;
};

/** 与 `RainEffect-master/src/index2.js` 传入 RainRenderer 的字段一致（brightness 用 rain-renderer 默认 1）。 */
export const INDEX2_WATER_DEFAULTS: Required<CodropsIndex2WaterOptions> = {
  renderShine: true,
  renderShadow: true,
  minRefraction: 150,
  maxRefraction: 512,
  brightness: 1,
  alphaMultiply: 7,
  alphaSubtract: 3,
  parallaxBg: 5,
  parallaxFg: 20,
};

export type CodropsIndex2WaterImages = {
  liquid: HTMLCanvasElement;
  textureFg: TexImageSource;
  textureBg: TexImageSource;
  textureShine: TexImageSource;
};

function texNaturalSize(src: TexImageSource): { w: number; h: number } {
  if (
    src instanceof HTMLImageElement ||
    src instanceof HTMLCanvasElement ||
    src instanceof ImageBitmap
  ) {
    return { w: src.width, h: src.height };
  }
  if (src instanceof HTMLVideoElement) {
    return { w: src.videoWidth || src.width, h: src.videoHeight || src.height };
  }
  return { w: 1, h: 1 };
}

export class CodropsIndex2WaterRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly images: CodropsIndex2WaterImages;
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly positionBuf: WebGLBuffer;
  private readonly positionLoc: number;
  private readonly liquidTex: WebGLTexture;
  private readonly staticTex: WebGLTexture[];
  private raf = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private readonly loc: {
    resolution: WebGLUniformLocation | null;
    parallax: WebGLUniformLocation | null;
    parallaxFg: WebGLUniformLocation | null;
    parallaxBg: WebGLUniformLocation | null;
    textureRatio: WebGLUniformLocation | null;
    renderShine: WebGLUniformLocation | null;
    renderShadow: WebGLUniformLocation | null;
    minRefraction: WebGLUniformLocation | null;
    refractionDelta: WebGLUniformLocation | null;
    brightness: WebGLUniformLocation | null;
    alphaMultiply: WebGLUniformLocation | null;
    alphaSubtract: WebGLUniformLocation | null;
    waterMap: WebGLUniformLocation | null;
    textureShine: WebGLUniformLocation | null;
    textureFg: WebGLUniformLocation | null;
    textureBg: WebGLUniformLocation | null;
  };

  constructor(
    canvas: HTMLCanvasElement,
    images: CodropsIndex2WaterImages,
    opt: CodropsIndex2WaterOptions = {},
  ) {
    this.canvas = canvas;
    this.images = images;
    const o = { ...INDEX2_WATER_DEFAULTS, ...opt };
    const gl = this.canvas.getContext("webgl", {
      alpha: false,
      premultipliedAlpha: false,
      antialias: false,
    }) as WebGLRenderingContext | null;
    if (!gl) {
      throw new Error("WebGL 不可用");
    }
    this.gl = gl;
    const program = linkWaterProgram(gl);
    if (!program) {
      throw new Error("water program 链接失败");
    }
    this.program = program;

    this.positionLoc = gl.getAttribLocation(program, "a_position");
    this.positionBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuf);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    setFullscreenQuad(gl, this.positionBuf);

    this.liquidTex = allocLiquidTex(gl);
    this.staticTex = [
      createTexFromSource(gl, 1, this.images.textureShine),
      createTexFromSource(gl, 2, this.images.textureFg),
      createTexFromSource(gl, 3, this.images.textureBg),
    ];

    const refDelta = o.maxRefraction - o.minRefraction;
    const { w: bw, h: bh } = texNaturalSize(this.images.textureBg);
    const texRatio = bw / Math.max(bh, 1);

    gl.useProgram(program);
    this.loc = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      parallax: gl.getUniformLocation(program, "u_parallax"),
      parallaxFg: gl.getUniformLocation(program, "u_parallaxFg"),
      parallaxBg: gl.getUniformLocation(program, "u_parallaxBg"),
      textureRatio: gl.getUniformLocation(program, "u_textureRatio"),
      renderShine: gl.getUniformLocation(program, "u_renderShine"),
      renderShadow: gl.getUniformLocation(program, "u_renderShadow"),
      minRefraction: gl.getUniformLocation(program, "u_minRefraction"),
      refractionDelta: gl.getUniformLocation(program, "u_refractionDelta"),
      brightness: gl.getUniformLocation(program, "u_brightness"),
      alphaMultiply: gl.getUniformLocation(program, "u_alphaMultiply"),
      alphaSubtract: gl.getUniformLocation(program, "u_alphaSubtract"),
      waterMap: gl.getUniformLocation(program, "u_waterMap"),
      textureShine: gl.getUniformLocation(program, "u_textureShine"),
      textureFg: gl.getUniformLocation(program, "u_textureFg"),
      textureBg: gl.getUniformLocation(program, "u_textureBg"),
    };

    gl.uniform1i(this.loc.waterMap, 0);
    gl.uniform1i(this.loc.textureShine, 1);
    gl.uniform1i(this.loc.textureFg, 2);
    gl.uniform1i(this.loc.textureBg, 3);
    gl.uniform1f(this.loc.textureRatio, texRatio);
    gl.uniform1i(this.loc.renderShine, o.renderShine ? 1 : 0);
    gl.uniform1i(this.loc.renderShadow, o.renderShadow ? 1 : 0);
    gl.uniform1f(this.loc.minRefraction, o.minRefraction);
    gl.uniform1f(this.loc.refractionDelta, refDelta);
    gl.uniform1f(this.loc.brightness, o.brightness);
    gl.uniform1f(this.loc.alphaMultiply, o.alphaMultiply);
    gl.uniform1f(this.loc.alphaSubtract, o.alphaSubtract);
    gl.uniform1f(this.loc.parallaxBg, o.parallaxBg);
    gl.uniform1f(this.loc.parallaxFg, o.parallaxFg);
  }

  setParallax(x: number, y: number): void {
    this.parallaxX = x;
    this.parallaxY = y;
  }

  private drawFrame = (): void => {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);

    gl.uniform2f(this.loc.resolution, w, h);
    gl.uniform2f(this.loc.parallax, this.parallaxX, this.parallaxY);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.liquidTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.images.liquid);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuf);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  start(): void {
    const loop = (): void => {
      this.drawFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose(): void {
    this.stop();
    const gl = this.gl;
    gl.deleteTexture(this.liquidTex);
    for (const t of this.staticTex) {
      gl.deleteTexture(t);
    }
    gl.deleteBuffer(this.positionBuf);
    gl.deleteProgram(this.program);
  }
}
