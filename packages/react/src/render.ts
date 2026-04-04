import type { ReactNode } from "react";
import { ConcurrentRoot } from "react-reconciler/constants.js";
import { CanvasReconciler } from "./reconciler-config.ts";
import type { CanvasRoot } from "./reconciler-config.ts";
import { syncCanvasBackingStore } from "./canvas-size.ts";

const defaultOnUncaught = (error: Error) => {
  console.error("[@react-canvas/react]", error);
};

const noop = () => {};

export type RenderHandle = {
  unmount: () => void;
};

export function render(element: ReactNode, canvas: HTMLCanvasElement): RenderHandle {
  syncCanvasBackingStore(canvas);

  const root: CanvasRoot = {
    canvas,
    children: [],
  };

  const fiberRoot = CanvasReconciler.createContainer(
    root,
    ConcurrentRoot,
    null,
    false,
    false,
    "",
    defaultOnUncaught,
    noop,
    noop,
    noop,
  );

  CanvasReconciler.updateContainer(element, fiberRoot, null, noop);

  return {
    unmount() {
      CanvasReconciler.updateContainer(null, fiberRoot, null, noop);
    },
  };
}
