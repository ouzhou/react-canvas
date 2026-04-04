import { createContext, version as reactVersion } from "react";
import type { Context } from "react";
import createReconciler from "react-reconciler";
import { DefaultEventPriority, NoEventPriority } from "react-reconciler/constants.js";
import * as Scheduler from "scheduler";
import { ViewNode, paintScene } from "@react-canvas/core";
import type { ViewProps } from "@react-canvas/core";

const VIEW = "View";

export type CanvasRoot = {
  canvas: HTMLCanvasElement;
  children: ViewNode[];
};

let currentUpdatePriority = NoEventPriority;

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  isPrimaryRenderer: true,

  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,
  scheduleCallback: Scheduler.unstable_scheduleCallback,
  cancelCallback: Scheduler.unstable_cancelCallback,
  shouldYield: Scheduler.unstable_shouldYield,
  now: Scheduler.unstable_now,

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  getRootHostContext: () => null,
  getChildHostContext: () => null,

  prepareForCommit: () => null,
  preparePortalMount: () => {},

  resetAfterCommit(rootContainer: CanvasRoot) {
    const { canvas, children } = rootContainer;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const backend = {
        clear(w: number, h: number) {
          ctx.clearRect(0, 0, w, h);
        },
        fillRect(x: number, y: number, w: number, h: number, color: string) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, w, h);
        },
      };
      paintScene(children, backend, canvas.width, canvas.height);
    }
  },

  shouldSetTextContent: () => false,

  createInstance(type: string, props: ViewProps): ViewNode {
    if (type !== VIEW) {
      throw new Error(`@react-canvas/react: unsupported host type "${type}"`);
    }
    return new ViewNode(props);
  },

  createTextInstance(): never {
    throw new Error("@react-canvas/react: text nodes are not supported yet");
  },

  resetTextContent: () => {},
  hideTextInstance: () => {},
  unhideTextInstance: () => {},

  getPublicInstance: (instance: ViewNode) => instance,

  hideInstance: () => {},
  unhideInstance: () => {},

  appendInitialChild(parent: ViewNode, child: ViewNode) {
    parent.appendChild(child);
  },
  appendChild(parent: ViewNode, child: ViewNode) {
    parent.appendChild(child);
  },
  insertBefore(parent: ViewNode, child: ViewNode, before: ViewNode) {
    parent.insertBefore(child, before);
  },

  finalizeInitialChildren: () => false,

  appendChildToContainer(container: CanvasRoot, child: ViewNode) {
    container.children.push(child);
  },

  insertInContainerBefore(container: CanvasRoot, child: ViewNode, before: ViewNode) {
    const i = container.children.indexOf(before);
    if (i === -1) {
      container.children.push(child);
    } else {
      container.children.splice(i, 0, child);
    }
  },

  removeChildFromContainer(container: CanvasRoot, child: ViewNode) {
    const i = container.children.indexOf(child);
    if (i !== -1) {
      container.children.splice(i, 1);
    }
  },

  commitUpdate(instance: ViewNode, _type: string, _old: ViewProps, newProps: ViewProps) {
    instance.props = { ...newProps };
  },

  commitTextUpdate: () => {},

  removeChild(parent: ViewNode, child: ViewNode) {
    parent.removeChild(child);
  },

  clearContainer(container: CanvasRoot) {
    container.children.length = 0;
  },

  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  detachDeletedInstance: () => {},
  getInstanceFromNode: () => null,
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,

  setCurrentUpdatePriority(p: number) {
    currentUpdatePriority = p;
  },
  getCurrentUpdatePriority: () => currentUpdatePriority,
  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) {
      return currentUpdatePriority;
    }
    return DefaultEventPriority;
  },

  maySuspendCommit: () => true,
  NotPendingTransition: undefined,
  HostTransitionContext: createContext(null) as unknown as Context<unknown>,
  resetFormInstance: () => {},
  requestPostPaintCallback: () => {},
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  preloadInstance: () => true,
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  waitForCommitToBeReady: () => null,

  rendererPackageName: "@react-canvas/react",
  rendererVersion: reactVersion,
};

export const CanvasReconciler = createReconciler(
  hostConfig as unknown as Parameters<typeof createReconciler>[0],
);
export { VIEW as viewElementType };
