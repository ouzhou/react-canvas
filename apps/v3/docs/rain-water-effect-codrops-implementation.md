# Codrops 雨滴/积水 WebGL 效果：实现说明

本文说明 [Codrops 文章「Rain & Water Effect Experiments」](https://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/)（作者 Lucas Bebber）中的思路，如何对应到仓库内 `apps/RainEffect-master` 源码的实现。文章偏概念与教学，本仓库代码是其可运行的工程化版本（含天气切换、纹理资源等扩展）。

---

## 1. 总体思路（文章 ↔ 代码）

| 文章要点                                 | 实现方式                                     | 主要代码位置                                                              |
| ---------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| 观察真实水滴：折射、合并、变大后下滑留痕 | 2D 粒子水滴 + 碰撞合并 + 动量/轨迹           | `src/raindrops.js`                                                        |
| 用 WebGL 做最终折射与合成                | 全屏四边形 + 片段着色器采样背景/前景         | `src/rain-renderer.js`、`src/shaders/water.frag`                          |
| 小滴大量、大滴可动；大滴擦掉小滴         | 独立 `droplets` canvas + `destination-out`   | `src/raindrops.js`（`updateDroplets`、`clearDroplets`）                   |
| 背景虚焦用小纹理拉伸                     | 低分辨率 `textureBg` + 高细节 `textureFg`    | `src/index.js` 中 `textureFgSize` / `textureBgSize` 与 `generateTextures` |
| 水滴形状与「黏连」                       | alpha 贴图 + screen 等合成预生成多级水滴精灵 | `src/raindrops.js` `renderDropsGfx` + `demo/img/drop-*.png`               |

---

## 2. 渲染管线（一帧里发生什么）

1. **`Raindrops`** 在 2D canvas 上更新「液体高度图」：先画极大量静态小滴层（`droplets`），再画可交互、可合并、可下落的大滴，并把结果写到 `raindrops.canvas`。
2. **`RainRenderer`** 把该 canvas 作为 `u_waterMap`（以及前景/背景纹理）传入 WebGL，在 `water.frag` 里按水滴的法线式偏移去折射采样背景与前景，输出到屏幕 WebGL canvas。

入口组装见 `src/index.js`：`Raindrops` 构造、`generateTextures` 填充前景/背景离屏图、`new RainRenderer(...)`。

---

## 3. WebGL 层：折射与混合

`rain-renderer.js` 用 glslify 载入 `simple.vert` 与 `water.frag`，并把亮度、折射范围、alpha 对比度等作为 uniform 传入。默认可调参数见：

```10:19:apps/RainEffect-master/src/rain-renderer.js
const defaultOptions={
  renderShadow:false,
  minRefraction:256,
  maxRefraction:512,
  brightness:1,
  alphaMultiply:20,
  alphaSubtract:5,
  parallaxBg:5,
  parallaxFg:20
}
```

片段着色器核心逻辑与文章一致：**用「水滴图」的通道编码折射方向**，其中实现里用 **蓝色通道表示厚度**，**绿/红通道表示偏移**，再按厚度在 `minRefraction`～`maxRefraction` 之间插值，去偏移 UV 采样前景纹理：

```86:124:apps/RainEffect-master/src/shaders/water.frag
void main() {
  vec4 bg=texture2D(u_textureBg,scaledTexCoord()+parallax(u_parallaxBg));

  vec4 cur = fgColor(0.0,0.0);

  float d=cur.b; // "thickness"
  float x=cur.g;
  float y=cur.r;

  float a=clamp(cur.a*u_alphaMultiply-u_alphaSubtract, 0.0,1.0);

  vec2 refraction = (vec2(x,y)-0.5)*2.0;
  vec2 refractionParallax=parallax(u_parallaxBg-u_parallaxFg);
  vec2 refractionPos = scaledTexCoord()
    + (pixel()*refraction*(u_minRefraction+(d*u_refractionDelta)))
    + refractionParallax;

  vec4 tex=texture2D(u_textureFg,refractionPos);
  // ...
  vec4 fg=vec4(tex.rgb*u_brightness,a);
  // ...
  gl_FragColor = blend(bg,fg);
}
```

`scaledTexCoord` 负责让背景纹理按视口比例铺满（文章提到的「小纹理拉伸」的视觉基础）。

---

## 4. 2D 模拟层：雨滴、小滴、擦除与合并

### 4.1 水滴外观（类法线 / 深度）

`renderDropsGfx` 为 0～254 的「深度」预渲染一组长宽一致的离屏水滴贴图：先叠 `dropColor`，再用 `screen` 叠蓝色得到厚度感，最后用 `source-in` 与 `dropAlpha` 合成。运行时 `drawDrop` 按水滴半径映射到某一档贴图，实现文章说的用颜色信息驱动折射。

```104:129:apps/RainEffect-master/src/raindrops.js
  renderDropsGfx(){
    let dropBuffer=createCanvas(dropSize,dropSize);
    let dropBufferCtx=dropBuffer.getContext('2d');
    this.dropsGfx=Array.apply(null,Array(255))
      .map((cur,i)=>{
        let drop=createCanvas(dropSize,dropSize);
        let dropCtx=drop.getContext('2d');

        dropBufferCtx.clearRect(0,0,dropSize,dropSize);

        // color
        dropBufferCtx.globalCompositeOperation="source-over";
        dropBufferCtx.drawImage(this.dropColor,0,0,dropSize,dropSize);

        // blue overlay, for depth
        dropBufferCtx.globalCompositeOperation="screen";
        dropBufferCtx.fillStyle="rgba(0,0,"+i+",1)";
        dropBufferCtx.fillRect(0,0,dropSize,dropSize);

        // alpha
        dropCtx.globalCompositeOperation="source-over";
        dropCtx.drawImage(this.dropAlpha,0,0,dropSize,dropSize);

        dropCtx.globalCompositeOperation="source-in";
        dropCtx.drawImage(dropBuffer,0,0,dropSize,dropSize);
        return drop;
    });
```

### 4.2 小滴层与「被大滴擦掉」

小滴画在单独的 `this.droplets` canvas 上；大滴移动时调用 `clearDroplets`，用圆形笔刷以 **`globalCompositeOperation = 'destination-out'`** 从小滴层抠洞，对应文章「用 destination-out 清理」的描述：

```167:177:apps/RainEffect-master/src/raindrops.js
  clearDroplets(x,y,r=30){
    let ctx=this.dropletsCtx;
    ctx.globalCompositeOperation="destination-out";
    ctx.drawImage(
      this.clearDropletsGfx,
      (x-r)*this.dropletsPixelDensity*this.scale,
      (y-r)*this.dropletsPixelDensity*this.scale,
      (r*2)*this.dropletsPixelDensity*this.scale,
      (r*2)*this.dropletsPixelDensity*this.scale*1.5
    )
  },
```

在 `updateDrops` 末尾，大滴若发生位移且 `dropletsRate > 0`，会对应当前位置做一次清理：

```360:364:apps/RainEffect-master/src/raindrops.js
        if(!drop.killed){
          newDrops.push(drop);
          if(moved && this.options.dropletsRate>0) this.clearDroplets(drop.x,drop.y,drop.r*this.options.dropletsCleaningRadiusMultiplier);
          this.drawDrop(this.ctx, drop);
        }
```

小滴持续生成与整层合成到主 ctx 的逻辑在 `updateDroplets`：每帧随机撒点 `drawDroplet`，再把 `droplets` 画回主画布。

```228:249:apps/RainEffect-master/src/raindrops.js
  updateDroplets(timeScale){
    if(this.textureCleaningIterations>0){
      this.textureCleaningIterations-=1*timeScale;
      this.dropletsCtx.globalCompositeOperation="destination-out";
      this.dropletsCtx.fillStyle="rgba(0,0,0,"+(0.05*timeScale)+")";
      this.dropletsCtx.fillRect(0,0,
        this.width*this.dropletsPixelDensity,this.height*this.dropletsPixelDensity);
    }
    if(this.options.raining){
      this.dropletsCounter+=this.options.dropletsRate*timeScale*this.areaMultiplier;
      times(this.dropletsCounter,(i)=>{
        this.dropletsCounter--;
        this.drawDroplet(
          random(this.width/this.scale),
          random(this.height/this.scale),
          random(...this.options.dropletsSize,(n)=>{
            return n*n;
          })
        )
      });
    }
    this.ctx.drawImage(this.droplets,0,0,this.width,this.height);
```

### 4.3 合并、轨迹与天气

- **合并**：`updateDrops` 中对邻近大滴做圆距检测，按面积近似合并半径，小滴标记 `killed`（见 `raindrops.js` 中 collision 一段）。
- **轨迹**：`trailRate` / `trailScaleRange` 控制沿大滴运动方向.spawn 更小水滴。
- **天气**：`src/index.js` 里 `weatherData`（rain / storm / drizzle 等）切换前景/背景天气贴图与 `raindrops` 的参数，并驱动 `generateTextures` 把天气图铺进离屏 `textureFg` / `textureBg`。

---

## 5. 如何本地查看 Demo

源码自带浏览器 demo（旧式 gulp 构建，亦可直接打开静态页配合打包后的 `demo/js`）：

- 静态资源与页面：`apps/RainEffect-master/demo/`
- 主逻辑入口：`apps/RainEffect-master/src/index.js`（与 `demo/index.html` 引用的打包脚本对应关系以该项目的 `gulpfile.js` / README 为准）

若仅做阅读，从 **`src/raindrops.js`、`src/rain-renderer.js`、`src/shaders/water.frag`、`src/index.js`** 四条线顺一遍即可完整对照 Codrops 原文结构。

---

## 6. 小结

该实现把文章里的问题拆成两块：**Canvas 2D 负责高密度、可擦除的「水面高度 + 水滴形状」纹理；WebGL 负责按物理直觉做折射与与背景的最终合成**。理解这一点后，改参数应优先区分：动效与粒子行为在 `Raindrops` 的 `defaultOptions`，画面反差与折射强度在 `RainRenderer` / `water.frag` 的 uniform 与 `alphaMultiply` / `alphaSubtract` 等。
