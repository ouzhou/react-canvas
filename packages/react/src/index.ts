import "./jsx-runtime-augment.ts";

export { render, type RenderHandle } from "./render.ts";
export { ViewNode } from "@react-canvas/core";
export type { ViewProps, ViewStyle } from "@react-canvas/core";

export const View = "View" as const;
