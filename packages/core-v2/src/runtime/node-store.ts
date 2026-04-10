import { Align, FlexDirection } from "yoga-layout/load";
import type { Node as YogaNode } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import type { SceneNode } from "../scene/scene-node.ts";

function applyRNLayoutDefaults(node: YogaNode): void {
  node.setFlexDirection(FlexDirection.Column);
  node.setFlexShrink(0);
  node.setAlignContent(Align.FlexStart);
}

export type NodeStore = {
  readonly yoga: Yoga;
  createRootNode(width: number, height: number): SceneNode;
  createNode(label?: string): SceneNode;
  appendChild(parentId: string, childId: string): void;
  removeNode(id: string): void;
  get(id: string): SceneNode | undefined;
};

export function createNodeStore(yoga: Yoga): NodeStore {
  const nodes = new Map<string, SceneNode>();
  let seq = 0;

  function nextId(prefix: string): string {
    seq += 1;
    return `${prefix}-${seq}`;
  }

  function get(id: string): SceneNode | undefined {
    return nodes.get(id);
  }

  function detachFromParent(child: SceneNode): void {
    if (child.parentId === null) return;
    const parent = nodes.get(child.parentId);
    if (!parent) {
      child.parentId = null;
      return;
    }
    const i = parent.children.indexOf(child.id);
    if (i !== -1) {
      parent.children.splice(i, 1);
      parent.yogaNode.removeChild(child.yogaNode);
    }
    child.parentId = null;
  }

  function removeNode(id: string): void {
    const node = nodes.get(id);
    if (!node) return;
    for (const cid of node.children.slice()) {
      removeNode(cid);
    }
    detachFromParent(node);
    node.yogaNode.free();
    nodes.delete(id);
  }

  function createRootNode(width: number, height: number): SceneNode {
    const id = nextId("root");
    const yogaNode = yoga.Node.create();
    applyRNLayoutDefaults(yogaNode);
    yogaNode.setWidth(width);
    yogaNode.setHeight(height);
    const node: SceneNode = {
      id,
      parentId: null,
      children: [],
      yogaNode,
      layout: null,
    };
    nodes.set(id, node);
    return node;
  }

  function createNode(label?: string): SceneNode {
    const id = nextId(label ?? "node");
    const yogaNode = yoga.Node.create();
    applyRNLayoutDefaults(yogaNode);
    const node: SceneNode = {
      id,
      parentId: null,
      children: [],
      yogaNode,
      label,
      layout: null,
    };
    nodes.set(id, node);
    return node;
  }

  function appendChild(parentId: string, childId: string): void {
    const parent = nodes.get(parentId);
    const child = nodes.get(childId);
    if (!parent || !child) {
      throw new Error("appendChild: parent or child not found");
    }
    detachFromParent(child);
    parent.children.push(child.id);
    child.parentId = parent.id;
    parent.yogaNode.insertChild(child.yogaNode, parent.children.length - 1);
  }

  return {
    yoga,
    createRootNode,
    createNode,
    appendChild,
    removeNode,
    get,
  };
}
