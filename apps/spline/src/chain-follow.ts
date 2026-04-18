import p5 from "p5";

/** 可调参数：节点数量与相邻节点目标间距（像素） */
export const CHAIN_CONFIG = {
  nodeCount: 20,
  segmentLength: 30,
  /** 节点实心圆直径（像素） */
  nodeDiameter: 14,
  background: [14, 14, 20] as const,
  lineColor: 255,
  nodeFill: [230, 230, 240] as const,
} as const;

type Vec2 = { x: number; y: number };

function projectChildOntoCircle(
  prev: Vec2,
  cur: Vec2,
  segmentLength: number,
  fallbackDir: Vec2,
): Vec2 {
  const dx = prev.x - cur.x;
  const dy = prev.y - cur.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) {
    const t = Math.hypot(fallbackDir.x, fallbackDir.y);
    const fx = t < 1e-6 ? 1 : fallbackDir.x / t;
    const fy = t < 1e-6 ? 0 : fallbackDir.y / t;
    return {
      x: prev.x - fx * segmentLength,
      y: prev.y - fy * segmentLength,
    };
  }
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x: prev.x - ux * segmentLength,
    y: prev.y - uy * segmentLength,
  };
}

/**
 * 在指定容器内挂载 p5 实例模式画布：头节点跟随鼠标，后续节点每帧约束在前驱为圆心、固定距离为半径的圆上（方向为当前子节点指向前驱）。
 */
export function createChainFollowSketch(container: HTMLElement): p5 {
  const { nodeCount, segmentLength, nodeDiameter, background, lineColor, nodeFill } = CHAIN_CONFIG;

  const sketch = (p: p5) => {
    const nodes: Vec2[] = [];

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);
      const cx = p.width / 2;
      const cy = p.height / 2;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({ x: cx + i * 2, y: cy });
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      p.background(background[0], background[1], background[2]);

      nodes[0].x = p.mouseX;
      nodes[0].y = p.mouseY;

      for (let i = 1; i < nodeCount; i++) {
        const prev = nodes[i - 1];
        const cur = nodes[i];
        const fallback: Vec2 =
          i >= 2 ? { x: prev.x - nodes[i - 2].x, y: prev.y - nodes[i - 2].y } : { x: 1, y: 0 };
        const next = projectChildOntoCircle(prev, cur, segmentLength, fallback);
        cur.x = next.x;
        cur.y = next.y;
      }

      p.stroke(lineColor);
      p.strokeWeight(2);
      for (let i = 0; i < nodeCount - 1; i++) {
        p.line(nodes[i].x, nodes[i].y, nodes[i + 1].x, nodes[i + 1].y);
      }

      p.noStroke();
      p.fill(nodeFill[0], nodeFill[1], nodeFill[2]);
      for (const n of nodes) {
        p.circle(n.x, n.y, nodeDiameter);
      }
    };
  };

  return new p5(sketch, container);
}
