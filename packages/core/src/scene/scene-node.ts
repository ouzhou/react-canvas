/** Union of host scene nodes (no runtime import cycle — use `import()` types only). */
export type SceneNode = import("./view-node.ts").ViewNode | import("./text-node.ts").TextNode;
