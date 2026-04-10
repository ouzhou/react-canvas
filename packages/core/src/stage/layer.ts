import type { SceneNode } from "../scene/scene-node.ts";
import { ViewNode } from "../scene/view-node.ts";
import type { Stage } from "./stage.ts";

export type LayerOptions = {
  zIndex?: number;
  /** true：此层命中后停止向低层传递事件（Modal 语义）；完整命中链路由 EventDispatcher 扩展。 */
  captureEvents?: boolean;
  visible?: boolean;
};

/**
 * 一层一个全屏 flex 根节点；与 `core-design.md` §4 对齐。
 */
export class Layer {
  readonly stage: Stage;
  /** 全屏根（width/height 100%），子内容挂在其下。 */
  readonly root: ViewNode;
  zIndex: number;
  captureEvents: boolean;
  visible: boolean;

  constructor(stage: Stage, options?: LayerOptions) {
    this.stage = stage;
    this.zIndex = options?.zIndex ?? 0;
    this.captureEvents = options?.captureEvents ?? false;
    this.visible = options?.visible ?? true;
    this.root = new ViewNode(stage.runtime.yoga, "View");
    this.root.setStyle({ width: "100%", height: "100%" });
  }

  add(node: SceneNode): this {
    this.root.appendChild(node);
    return this;
  }

  remove(node: SceneNode): this {
    this.root.removeChild(node);
    return this;
  }
}
