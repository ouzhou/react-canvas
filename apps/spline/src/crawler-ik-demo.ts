import p5 from "p5";

type Vec2 = { x: number; y: number };

type Frame = {
  center: Vec2;
  tangent: Vec2;
  normal: Vec2;
  width: number;
};

export const SCHOOL_CONFIG = {
  fishCount: 15,
  background: [36, 40, 44] as const,
  gridColor: [60, 65, 70] as const,
  bodyStroke: [230, 248, 255] as const,
  eyeFill: [255, 255, 255] as const,
} as const;

export const BASE_FISH = {
  segmentCount: 22,
  segmentLength: 14,
  cruiseSpeed: 90, // base px / sec
  swimHz: 1.8,
  waveTravel: 0.8,
  headSwayAmp: 2,
  bodySwayAmp: 18,
  headWidth: 32,
  bodyMaxWidth: 48,
  tailStemWidth: 4,
  pectoralAnchor: 0.25,
  pectoralLength: 26,
  pectoralWidth: 14,
  pelvicAnchor: 0.65,
  pelvicLength: 16,
  pelvicWidth: 10,
} as const;

function normalize(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: x / len, y: y / len };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function projectChild(prev: Vec2, cur: Vec2, length: number): Vec2 {
  const d = sub(prev, cur);
  const m = Math.hypot(d.x, d.y);
  if (m < 1e-6) {
    return { x: prev.x - length, y: prev.y };
  }
  return {
    x: prev.x - (d.x / m) * length,
    y: prev.y - (d.y / m) * length,
  };
}

function sampleFrame(frames: readonly Frame[], t: number): Frame {
  const n = frames.length;
  const ft = Math.max(0, Math.min(0.9999, t)) * (n - 1);
  const i0 = Math.floor(ft);
  const i1 = Math.min(n - 1, i0 + 1);
  const u = ft - i0;

  const c = {
    x: lerp(frames[i0].center.x, frames[i1].center.x, u),
    y: lerp(frames[i0].center.y, frames[i1].center.y, u),
  };
  const tan = normalize(
    lerp(frames[i0].tangent.x, frames[i1].tangent.x, u),
    lerp(frames[i0].tangent.y, frames[i1].tangent.y, u),
  );
  const normal = { x: -tan.y, y: tan.x };
  const width = lerp(frames[i0].width, frames[i1].width, u);

  return { center: c, tangent: tan, normal, width };
}

function drawSideFin(
  p: p5,
  root: Vec2,
  dir: Vec2,
  length: number,
  width: number,
  fillColors: number[],
): void {
  const angle = Math.atan2(dir.y, dir.x);
  p.push();
  p.translate(root.x, root.y);
  p.rotate(angle);
  p.stroke(SCHOOL_CONFIG.bodyStroke[0], SCHOOL_CONFIG.bodyStroke[1], SCHOOL_CONFIG.bodyStroke[2]);
  p.strokeWeight(4);
  p.strokeJoin(p.ROUND);
  p.fill(fillColors[0], fillColors[1], fillColors[2]);
  p.ellipse(length * 0.4, 0, length, width);
  p.pop();
}

class Fish {
  spine: Vec2[] = [];
  frames: Frame[] = [];
  leftContour: Vec2[] = [];
  rightContour: Vec2[] = [];

  headLeader: Vec2;
  travelDir: Vec2;
  swimClock: number = 0;
  wanderAngle: number;

  sizeScale: number;
  speedScale: number;
  fatness: number;
  bellyDist: number;
  tailType: "sharp" | "round" | "fork";
  idOffset: number;
  dartMultiplier: number = 1.0;

  bodyFill: [number, number, number];
  finFill: [number, number, number];

  constructor(p: p5, x: number, y: number, id: number) {
    this.sizeScale = p.random(0.3, 1.0);
    this.fatness = p.random(0.5, 1.8); // 0.5 is very thin, 1.8 is very fat overall
    this.bellyDist = p.random(0.0, 1.5); // 0.0 is uniform thickness, >1.0 makes it look pot-bellied at the middle

    const tv = p.random();
    this.tailType = tv < 0.33 ? "sharp" : tv < 0.66 ? "round" : "fork";

    this.speedScale = p.random(0.8, 1.2) / Math.sqrt(this.sizeScale); // smaller = faster perceived movement
    this.idOffset = id * 1000;

    // Randomize colors for a wide variety of vibrant hues
    const high = p.random(180, 255);
    const mid = p.random(80, 200);
    const low = p.random(0, 60);
    const colorMix = [
      [high, mid, low],
      [high, low, mid],
      [mid, high, low],
      [mid, low, high],
      [low, high, mid],
      [low, mid, high],
    ];
    const pickedHue = p.random(colorMix);
    const r = pickedHue[0];
    const g = pickedHue[1];
    const b = pickedHue[2];

    this.bodyFill = [r, g, b];
    this.finFill = [Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40)];

    this.headLeader = { x, y };
    this.wanderAngle = p.random(Math.PI * 2);
    this.travelDir = { x: Math.cos(this.wanderAngle), y: Math.sin(this.wanderAngle) };

    const segmentLength = BASE_FISH.segmentLength * this.sizeScale;
    for (let i = 0; i < BASE_FISH.segmentCount; i++) {
      this.spine.push({
        x: this.headLeader.x - i * segmentLength * this.travelDir.x,
        y: this.headLeader.y - i * segmentLength * this.travelDir.y,
      });
    }
  }

  widthAt(t: number): number {
    let w;
    if (t < 0.1) {
      w = lerp(BASE_FISH.headWidth, BASE_FISH.bodyMaxWidth, Math.sin((t / 0.1) * (Math.PI / 2)));
    } else {
      w = lerp(BASE_FISH.bodyMaxWidth, BASE_FISH.tailStemWidth, Math.pow((t - 0.1) / 0.9, 1.2));
    }
    // Add belly bulge in the middle sections of the body based on this.bellyDist
    const bellyBulge = Math.sin(t * Math.PI) * BASE_FISH.bodyMaxWidth * this.bellyDist * 0.5;
    return (w + bellyBulge) * this.sizeScale * this.fatness;
  }

  update(p: p5, dt: number) {
    // Smoothly decay darting multiplier back to 1.0
    this.dartMultiplier += (1.0 - this.dartMultiplier) * dt * 2.0;

    // Fast swim clock so tail beats faster when darting
    this.swimClock += dt * this.speedScale * this.dartMultiplier;

    // Autonomous wandering using Perlin noise
    this.wanderAngle += (p.noise(this.swimClock * 0.1, this.idOffset) - 0.5) * 0.04;
    let desiredDir = { x: Math.cos(this.wanderAngle), y: Math.sin(this.wanderAngle) };

    // Soft boundary reflection
    const margin = 200 * this.sizeScale;
    let avoid = { x: 0, y: 0 };
    if (this.headLeader.x < margin) avoid.x = 1;
    else if (this.headLeader.x > p.width - margin) avoid.x = -1;
    if (this.headLeader.y < margin) avoid.y = 1;
    else if (this.headLeader.y > p.height - margin) avoid.y = -1;

    // Mouse / Touch interaction (Dart away)
    const dx = this.headLeader.x - p.mouseX;
    const dy = this.headLeader.y - p.mouseY;
    const distSq = dx * dx + dy * dy;
    const repelRadius = 150 * this.sizeScale; // Larger fish have larger personal space

    // Only react if mouse is within bounds and fish is near the cursor
    if (
      p.mouseX > 0 &&
      p.mouseX < p.width &&
      p.mouseY > 0 &&
      p.mouseY < p.height &&
      distSq < repelRadius * repelRadius
    ) {
      const dist = Math.sqrt(distSq);
      // Flee directly away from the mouse
      const fleeDir = { x: dx / dist, y: dy / dist };

      // Override typical movement vectors aggressively
      desiredDir.x += fleeDir.x * 5.0;
      desiredDir.y += fleeDir.y * 5.0;

      // Trigger a sudden burst of speed depending on how close the mouse got
      if (this.dartMultiplier < 2.0) {
        this.dartMultiplier = 5.0; // suddenly 5x faster
      }
    } else if (avoid.x !== 0 || avoid.y !== 0) {
      desiredDir.x += avoid.x * 2.0;
      desiredDir.y += avoid.y * 2.0;
    }

    desiredDir = normalize(desiredDir.x, desiredDir.y);
    this.wanderAngle = Math.atan2(desiredDir.y, desiredDir.x);

    // Depending on darting status, turning rate can be a bit faster
    const turnLerp = this.dartMultiplier > 1.5 ? 0.08 : 0.015;
    this.travelDir.x = lerp(this.travelDir.x, desiredDir.x, turnLerp);
    this.travelDir.y = lerp(this.travelDir.y, desiredDir.y, turnLerp);
    this.travelDir = normalize(this.travelDir.x, this.travelDir.y);

    const speed =
      BASE_FISH.cruiseSpeed * this.speedScale * this.sizeScale * dt * this.dartMultiplier;
    this.headLeader.x += this.travelDir.x * speed;
    this.headLeader.y += this.travelDir.y * speed;

    const side = { x: -this.travelDir.y, y: this.travelDir.x };
    const phase = this.swimClock * Math.PI * 2 * BASE_FISH.swimHz;

    const headSway = Math.sin(phase) * BASE_FISH.headSwayAmp * this.sizeScale;
    this.spine[0].x = this.headLeader.x + side.x * headSway;
    this.spine[0].y = this.headLeader.y + side.y * headSway;

    for (let i = 1; i < this.spine.length; i++) {
      const t = i / (this.spine.length - 1);
      const localAmp = BASE_FISH.bodySwayAmp * this.sizeScale * t * t;
      const segPhase = phase - t * Math.PI * 2 * BASE_FISH.waveTravel;
      const wave = Math.sin(segPhase) * localAmp;

      const desired = {
        x: this.spine[i].x + side.x * wave * 0.08,
        y: this.spine[i].y + side.y * wave * 0.08,
      };
      const next = projectChild(
        this.spine[i - 1],
        desired,
        BASE_FISH.segmentLength * this.sizeScale,
      );
      this.spine[i].x = next.x;
      this.spine[i].y = next.y;
    }
  }

  rebuildSkin() {
    this.frames.length = 0;
    this.leftContour.length = 0;
    this.rightContour.length = 0;

    for (let i = 0; i < this.spine.length; i++) {
      const prev = this.spine[Math.max(0, i - 1)];
      const next = this.spine[Math.min(this.spine.length - 1, i + 1)];
      const tangent = normalize(next.x - prev.x, next.y - prev.y);
      const normal = { x: -tangent.y, y: tangent.x };
      const t = i / (this.spine.length - 1);
      const w = this.widthAt(t);
      const c = this.spine[i];

      this.frames.push({ center: c, tangent, normal, width: w });
      this.leftContour.push(add(c, scale(normal, w * 0.5)));
      this.rightContour.push(add(c, scale(normal, -w * 0.5)));
    }
  }

  drawFins(p: p5) {
    const pectoral = sampleFrame(this.frames, BASE_FISH.pectoralAnchor);
    const pecLength = BASE_FISH.pectoralLength * this.sizeScale * this.fatness;
    const pecWidth = BASE_FISH.pectoralWidth * this.sizeScale * this.fatness;
    const pecLeftDir = normalize(
      pectoral.tangent.x * 0.7 + pectoral.normal.x,
      pectoral.tangent.y * 0.7 + pectoral.normal.y,
    );
    const pecRightDir = normalize(
      pectoral.tangent.x * 0.7 - pectoral.normal.x,
      pectoral.tangent.y * 0.7 - pectoral.normal.y,
    );

    drawSideFin(
      p,
      add(pectoral.center, scale(pectoral.normal, pectoral.width * 0.25)),
      pecLeftDir,
      pecLength,
      pecWidth,
      this.finFill,
    );
    drawSideFin(
      p,
      add(pectoral.center, scale(pectoral.normal, -pectoral.width * 0.25)),
      pecRightDir,
      pecLength,
      pecWidth,
      this.finFill,
    );

    const pelvic = sampleFrame(this.frames, BASE_FISH.pelvicAnchor);
    const pelLength = BASE_FISH.pelvicLength * this.sizeScale * this.fatness;
    const pelWidth = BASE_FISH.pelvicWidth * this.sizeScale * this.fatness;
    const pelLeftDir = normalize(
      pelvic.tangent.x * 0.9 + pelvic.normal.x,
      pelvic.tangent.y * 0.9 + pelvic.normal.y,
    );
    const pelRightDir = normalize(
      pelvic.tangent.x * 0.9 - pelvic.normal.x,
      pelvic.tangent.y * 0.9 - pelvic.normal.y,
    );

    drawSideFin(
      p,
      add(pelvic.center, scale(pelvic.normal, pelvic.width * 0.25)),
      pelLeftDir,
      pelLength,
      pelWidth,
      this.finFill,
    );
    drawSideFin(
      p,
      add(pelvic.center, scale(pelvic.normal, -pelvic.width * 0.25)),
      pelRightDir,
      pelLength,
      pelWidth,
      this.finFill,
    );
  }

  _addTailVertices(p: p5) {
    const tailFrame = this.frames[this.frames.length - 1];
    const tailFwd = { x: tailFrame.tangent.x, y: tailFrame.tangent.y }; // points backwards actually
    const leftTail = this.leftContour[this.leftContour.length - 1];
    const rightTail = this.rightContour[this.rightContour.length - 1];

    // Tail length parameter scaled by fish size
    const tailLen = BASE_FISH.tailStemWidth * 4 * this.sizeScale;
    const tailW = tailFrame.width * 2;

    if (this.tailType === "sharp") {
      // Original pointy tail
      p.vertex(tailFrame.center.x + tailFwd.x * tailLen, tailFrame.center.y + tailFwd.y * tailLen);
    } else if (this.tailType === "round") {
      // Rounded lobe tail
      const lCp = add(leftTail, scale(tailFwd, tailLen * 0.8));
      const rCp = add(rightTail, scale(tailFwd, tailLen * 0.8));
      const endPt = add(tailFrame.center, scale(tailFwd, tailLen * 1.5));
      p.vertex(lCp.x, lCp.y);
      p.vertex(endPt.x, endPt.y);
      p.vertex(rCp.x, rCp.y);
    } else if (this.tailType === "fork") {
      // Forked tail like a tuna
      const fl = add(leftTail, add(scale(tailFwd, tailLen * 1.5), scale(tailFrame.normal, tailW)));
      const fr = add(
        rightTail,
        add(scale(tailFwd, tailLen * 1.5), scale(tailFrame.normal, -tailW)),
      );
      const mid = add(tailFrame.center, scale(tailFwd, tailLen * 0.5));
      p.vertex(fl.x, fl.y);
      p.vertex(mid.x, mid.y);
      p.vertex(fr.x, fr.y);
    }
  }

  drawBody(p: p5) {
    const headFrame = this.frames[0];
    const headFwd = { x: -headFrame.tangent.x, y: -headFrame.tangent.y };
    // cpDist can be adjusted to make the head more blunt or pointy. 0.5 ~ 0.65 is usually good for a round cap.
    const cpDist = headFrame.width * 0.55;
    const rightPoint = this.rightContour[0];
    const leftPoint = this.leftContour[0];
    const rightCp = add(rightPoint, scale(headFwd, cpDist));
    const leftCp = add(leftPoint, scale(headFwd, cpDist));

    // Fill
    p.noStroke();
    p.fill(this.bodyFill[0], this.bodyFill[1], this.bodyFill[2]);
    p.beginShape();
    for (const v of this.leftContour) p.vertex(v.x, v.y);
    this._addTailVertices(p);
    for (let i = this.rightContour.length - 1; i >= 0; i--)
      p.vertex(this.rightContour[i].x, this.rightContour[i].y);

    // Draw rounded head manually using cubic Bezier points to strictly avoid p5's internal `bezierVertex` typing and rendering exceptions
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const bx = p.bezierPoint(rightPoint.x, rightCp.x, leftCp.x, leftPoint.x, t);
      const by = p.bezierPoint(rightPoint.y, rightCp.y, leftCp.y, leftPoint.y, t);
      p.vertex(bx, by);
    }
    p.endShape();

    // Stroke
    p.stroke(SCHOOL_CONFIG.bodyStroke[0], SCHOOL_CONFIG.bodyStroke[1], SCHOOL_CONFIG.bodyStroke[2]);
    p.strokeWeight(4 * this.sizeScale);
    p.strokeJoin(p.ROUND);
    p.noFill();
    p.beginShape();
    for (const v of this.leftContour) p.vertex(v.x, v.y);
    this._addTailVertices(p);
    for (let i = this.rightContour.length - 1; i >= 0; i--)
      p.vertex(this.rightContour[i].x, this.rightContour[i].y);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const bx = p.bezierPoint(rightPoint.x, rightCp.x, leftCp.x, leftPoint.x, t);
      const by = p.bezierPoint(rightPoint.y, rightCp.y, leftCp.y, leftPoint.y, t);
      p.vertex(bx, by);
    }
    p.endShape();

    // Dorsal line
    p.noFill();
    p.strokeWeight(4 * this.sizeScale);
    p.strokeCap(p.ROUND);
    p.beginShape();
    const startIdx = Math.floor(this.frames.length * 0.4);
    const endIdx = Math.floor(this.frames.length * 0.85);
    for (let i = startIdx; i <= endIdx; i++) {
      p.vertex(this.frames[i].center.x, this.frames[i].center.y);
    }
    p.endShape();
  }

  drawFace(p: p5) {
    const head = sampleFrame(this.frames, 0.05);
    const eyePosLeft = add(head.center, scale(head.normal, head.width * 0.35));
    const eyePosRight = add(head.center, scale(head.normal, -head.width * 0.35));

    p.noStroke();
    p.fill(SCHOOL_CONFIG.eyeFill[0], SCHOOL_CONFIG.eyeFill[1], SCHOOL_CONFIG.eyeFill[2]);
    const eyeSize = 8 * this.sizeScale;
    p.circle(eyePosLeft.x, eyePosLeft.y, eyeSize);
    p.circle(eyePosRight.x, eyePosRight.y, eyeSize);
  }

  draw(p: p5) {
    this.drawFins(p);
    this.drawBody(p);
    this.drawFace(p);
  }
}

export function createCrawlerIkSketch(container: HTMLElement): p5 {
  const sketch = (p: p5) => {
    const fishes: Fish[] = [];
    let bgImg: any;
    let overlayImg: any;

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);

      p.loadImage("/pond_background.jpg", (img) => {
        bgImg = img;
      });
      p.loadImage("/wave_overlay.png", (img) => {
        overlayImg = img;
      });

      for (let i = 0; i < SCHOOL_CONFIG.fishCount; i++) {
        fishes.push(new Fish(p, p.random(p.width), p.random(p.height), i));
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      if (bgImg && bgImg.width > 1) {
        p.imageMode(p.CORNER);
        p.image(bgImg, 0, 0, p.width, p.height);
      } else {
        p.background(
          SCHOOL_CONFIG.background[0],
          SCHOOL_CONFIG.background[1],
          SCHOOL_CONFIG.background[2],
        );
      }

      const dt = Math.min(0.05, p.deltaTime / 1000);

      for (const fish of fishes) {
        fish.update(p, dt);
        fish.rebuildSkin();
        fish.draw(p);
      }

      if (overlayImg && overlayImg.width > 1) {
        const time = p.millis() * 0.001; // current time in seconds

        // p.SCREEN or p.ADD is much better for water ripple transparency (white caustics on black/transparent background)
        p.blendMode(p.SCREEN);
        p.imageMode(p.CORNER);

        // Extra margin to cover the screen completely while moving
        const margin = 200;

        // First wave layer: moves smoothly with sine wave
        const alpha1 = 120 + Math.sin(time * 0.5) * 50;
        const ox1 = Math.sin(time * 0.2) * (margin / 2) - margin / 2;
        const oy1 = Math.cos(time * 0.3) * (margin / 2) - margin / 2;
        p.tint(255, alpha1);
        p.image(overlayImg, ox1, oy1, p.width + margin, p.height + margin);

        // Second wave layer: moves faster in the opposing direction for parallax interference
        const alpha2 = 80 + Math.sin(time * 0.7 + Math.PI) * 40;
        const ox2 = Math.sin(time * 0.4 + 2) * (margin / 2) - margin / 2;
        const oy2 = Math.cos(time * 0.35 + 1) * (margin / 2) - margin / 2;
        p.tint(255, alpha2);
        p.image(overlayImg, ox2, oy2, p.width + margin, p.height + margin);

        p.blendMode(p.BLEND);
        p.noTint();
      }
    };
  };

  return new p5(sketch, container);
}
