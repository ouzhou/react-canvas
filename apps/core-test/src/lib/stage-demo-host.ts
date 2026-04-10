import { initCanvasRuntime, Stage, type CanvasRuntime, type ViewNode } from "@react-canvas/core";

export type StageDemoHost = {
  runtime: CanvasRuntime;
  stage: Stage;
  /** 等价于 `stage.defaultLayer.root`，挂载场景子节点。 */
  sceneRoot: ViewNode;
  canvas: HTMLCanvasElement;
  /** 调度整 Stage 多层绘制（省略单根时与 `core-design.md` §3 一致）。 */
  requestFrame: () => void;
  dispose: () => void;
};

/**
 * 使用 `initCanvasRuntime` + {@link Stage}，与 `docs/core-design.md` 独立使用路径对齐。
 */
export async function createStageDemoHost(
  container: HTMLElement,
  logicalWidth: number,
  logicalHeight: number,
): Promise<StageDemoHost> {
  const runtime = await initCanvasRuntime();
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  container.appendChild(canvas);

  const lw = Math.max(1, Math.round(logicalWidth));
  const lh = Math.max(1, Math.round(logicalHeight));

  const stage = new Stage(runtime, {
    canvas,
    width: lw,
    height: lh,
  });

  const requestFrame = (): void => {
    stage.requestLayoutPaint();
  };

  const dispose = (): void => {
    stage.destroy();
  };

  return {
    runtime,
    stage,
    sceneRoot: stage.defaultLayer.root,
    canvas,
    requestFrame,
    dispose,
  };
}
