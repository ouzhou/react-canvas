import {
  type CanvasKit,
  isTextInstance,
  queueLayoutPaintFrame,
  type SceneNode,
  type Surface,
  type TextInstance,
  TextNode,
  type TextStyle,
  ViewNode,
  type ViewStyle,
  type Yoga,
} from "@react-canvas/core";
import { createContext } from "react";
import { Text } from "./text.ts";
import { View } from "./view.ts";

/** Implicit Reconciler root: user content mounts under this Yoga node (phase-1-design §3). */
export type SceneContainer = {
  sceneRoot: ViewNode;
};

type TextHostContext = { isInText: boolean };

function asHostContext(ctx: object): TextHostContext {
  return "isInText" in ctx && typeof (ctx as TextHostContext).isInText === "boolean"
    ? (ctx as TextHostContext)
    : { isInText: false };
}

function appendChildImpl(
  parent: ViewNode | TextNode,
  child: ViewNode | TextNode | TextInstance,
): void {
  if (isTextInstance(child)) {
    if (!(parent instanceof TextNode)) {
      throw new Error("[react-canvas] R-HOST-4: Raw text must be inside <Text>.");
    }
    parent.appendTextSlot(child);
    return;
  }
  parent.appendChild(child as SceneNode);
}

function insertBeforeImpl(
  parent: ViewNode | TextNode,
  child: ViewNode | TextNode | TextInstance,
  beforeChild: ViewNode | TextNode | TextInstance | null,
): void {
  if (isTextInstance(child)) {
    if (!(parent instanceof TextNode)) {
      throw new Error("[react-canvas] R-HOST-4: Raw text must be inside <Text>.");
    }
    if (beforeChild == null) {
      parent.appendTextSlot(child);
      return;
    }
    if (!isTextInstance(beforeChild)) {
      throw new Error("[react-canvas] Text instance insertBefore: expected TextInstance before.");
    }
    parent.insertTextBefore(child, beforeChild);
    return;
  }
  if (beforeChild == null) {
    parent.appendChild(child as SceneNode);
    return;
  }
  if (parent instanceof TextNode) {
    parent.insertBefore(child as SceneNode, beforeChild as SceneNode | TextInstance);
  } else {
    parent.insertBefore(child as SceneNode, beforeChild as SceneNode);
  }
}

function removeChildImpl(
  parent: ViewNode | TextNode,
  child: ViewNode | TextNode | TextInstance,
): void {
  if (isTextInstance(child)) {
    if (!(parent instanceof TextNode)) {
      throw new Error("[react-canvas] removeChild: TextInstance not under Text.");
    }
    parent.removeChild(child);
    return;
  }
  parent.removeChild(child as SceneNode);
  (child as ViewNode).destroy();
}

export type PaintFrameRef = {
  surface: Surface | null;
  canvasKit: CanvasKit | null;
  width: number;
  height: number;
  dpr: number;
};

const ROOT_HOST_CONTEXT: TextHostContext = { isInText: false };

let currentUpdatePriority = 0;

export const HostTransitionContext = createContext<unknown>(null);
export const NotPendingTransition = null;

export function createCanvasHostConfig(
  yoga: Yoga,
  frameRef: PaintFrameRef,
): Record<string, unknown> {
  return {
    rendererVersion: "0.33.0",
    rendererPackageName: "@react-canvas/react",
    extraDevToolsConfig: null,

    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,

    supportsResources: false,
    isHostHoistableType: () => false,
    getHoistableRoot: () => null,
    getResource: () => null,
    acquireResource: () => null,
    releaseResource: () => {},
    hydrateHoistable: () => null,
    mountHoistable: () => {},
    unmountHoistable: () => {},
    createHoistableInstance: () => null,
    prepareToCommitHoistables: () => {},
    mayResourceSuspendCommit: () => false,
    preloadResource: () => true,
    suspendResource: () => {},

    supportsSingletons: false,
    resolveSingletonInstance: () => null,
    acquireSingletonInstance: () => false,
    releaseSingletonInstance: () => {},
    isHostSingletonType: () => false,
    isSingletonScope: () => false,

    supportsTestSelectors: false,
    findFiberRoot: () => null,
    getBoundingRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    getTextContent: () => "",
    isHiddenSubtree: () => false,
    matchAccessibilityRole: () => false,
    setFocusIfFocusable: () => false,
    setupIntersectionObserver: () => ({ disconnect: () => {} }),

    supportsMicrotasks: true,
    scheduleMicrotask:
      typeof queueMicrotask === "function"
        ? (fn: () => unknown) => {
            queueMicrotask(() => {
              fn();
            });
          }
        : undefined,

    getInstanceFromNode: () => null,
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    preparePortalMount: () => {},
    prepareScopeUpdate: () => {},
    getInstanceFromScope: () => null,
    detachDeletedInstance: () => {},

    setCurrentUpdatePriority: (p: number) => {
      currentUpdatePriority = p;
    },
    getCurrentUpdatePriority: () => currentUpdatePriority,
    resolveUpdatePriority: () => currentUpdatePriority || 16,
    trackSchedulerEvent: () => {},
    resolveEventType: () => null,
    resolveEventTimeStamp: () => -1.1,
    shouldAttemptEagerTransition: () => false,

    requestPostPaintCallback: () => {},

    maySuspendCommit: () => false,
    maySuspendCommitOnUpdate: () => false,
    maySuspendCommitInSyncRender: () => false,
    preloadInstance: () => true,
    startSuspendingCommit: () => null,
    suspendInstance: () => {},
    suspendOnActiveViewTransition: () => {},
    waitForCommitToBeReady: () => null,
    getSuspendedCommitReason: () => null,
    NotPendingTransition,
    HostTransitionContext,
    resetFormInstance: () => {},
    bindToConsole: undefined,

    isPrimaryRenderer: false,
    warnsIfNotActing: false,

    scheduleTimeout: (fn: (...args: unknown[]) => unknown, delay?: number) =>
      setTimeout(fn, delay ?? 0) as unknown,
    cancelTimeout: (id: unknown) => clearTimeout(id as number),
    noTimeout: -1,

    getPublicInstance: (instance: ViewNode | TextInstance) => instance,

    getRootHostContext: () => ROOT_HOST_CONTEXT,
    getChildHostContext: (parentHostContext: object, type: string) => {
      const parent = asHostContext(parentHostContext);
      if (type === Text) return { isInText: true };
      if (parent.isInText) return { isInText: true };
      return { isInText: false };
    },

    prepareForCommit: () => null,
    resetAfterCommit: (containerInfo: SceneContainer) => {
      const r = frameRef;
      if (!r.surface || !r.canvasKit) return;
      queueLayoutPaintFrame(
        r.surface,
        r.canvasKit,
        containerInfo.sceneRoot,
        r.width,
        r.height,
        r.dpr,
      );
    },

    createInstance: (
      type: string,
      props: { style?: ViewStyle | TextStyle },
      _rootContainer: SceneContainer,
      hostContext: object,
    ) => {
      const ctx = asHostContext(hostContext);
      if (type === View) {
        if (ctx.isInText) {
          throw new Error("[react-canvas] R-HOST-2: <View> cannot be inside <Text>.");
        }
        const node = new ViewNode(yoga, "View");
        node.setStyle(props.style ?? {});
        return node;
      }
      if (type === Text) {
        const node = new TextNode(yoga);
        node.setStyle((props.style ?? {}) as TextStyle);
        return node;
      }
      throw new Error(`[react-canvas] Unsupported host type "${String(type)}".`);
    },

    createTextInstance: (
      text: string,
      _root: SceneContainer,
      hostContext: object,
    ): TextInstance => {
      if (!asHostContext(hostContext).isInText) {
        throw new Error("[react-canvas] R-HOST-4: Raw text must be inside <Text>.");
      }
      return { nodeValue: text };
    },

    cloneMutableInstance: (instance: ViewNode) => instance,
    cloneMutableTextInstance: (instance: TextInstance) => instance,

    appendInitialChild: (
      parent: ViewNode | TextNode,
      child: ViewNode | TextNode | TextInstance,
    ) => {
      appendChildImpl(parent, child);
    },

    finalizeInitialChildren: () => false,

    shouldSetTextContent: () => false,

    appendChild: (parent: ViewNode | TextNode, child: ViewNode | TextNode | TextInstance) => {
      appendChildImpl(parent, child);
    },

    appendChildToContainer: (container: SceneContainer, child: ViewNode) => {
      container.sceneRoot.appendChild(child);
    },

    insertBefore: (
      parent: ViewNode | TextNode,
      child: ViewNode | TextNode | TextInstance,
      beforeChild: ViewNode | TextNode | TextInstance | null,
    ) => {
      insertBeforeImpl(parent, child, beforeChild);
    },

    insertInContainerBefore: (
      container: SceneContainer,
      child: ViewNode | TextNode,
      beforeChild: ViewNode | TextNode | null,
    ) => {
      insertBeforeImpl(container.sceneRoot, child, beforeChild);
    },

    removeChild: (parent: ViewNode | TextNode, child: ViewNode | TextNode | TextInstance) => {
      removeChildImpl(parent, child);
    },

    removeChildFromContainer: (container: SceneContainer, child: ViewNode) => {
      container.sceneRoot.removeChild(child);
      child.destroy();
    },

    clearContainer: (container: SceneContainer) => {
      const copy = [...container.sceneRoot.children];
      for (const c of copy) {
        container.sceneRoot.removeChild(c);
        c.destroy();
      }
    },

    commitTextUpdate: (textInstance: TextInstance, _oldText: string, newText: string) => {
      textInstance.nodeValue = newText;
    },
    commitMount: () => {},
    commitUpdate: (
      instance: ViewNode,
      _type: string,
      prevProps: { style?: ViewStyle | TextStyle },
      nextProps: { style?: ViewStyle | TextStyle },
    ) => {
      if (instance.type === "Text") {
        (instance as TextNode).updateStyle(
          (prevProps.style ?? {}) as TextStyle,
          (nextProps.style ?? {}) as TextStyle,
        );
      } else {
        instance.updateStyle(prevProps.style ?? {}, nextProps.style ?? {});
      }
    },

    resetTextContent: () => {},

    hideInstance: () => {},
    hideTextInstance: () => {},
    unhideInstance: () => {},
    unhideTextInstance: () => {},

    applyViewTransitionName: () => {},
    restoreViewTransitionName: () => {},
    cancelViewTransitionName: () => {},
    cancelRootViewTransitionName: () => {},
    restoreRootViewTransitionName: () => {},
    cloneRootViewTransitionContainer: () => {
      throw new Error("[react-canvas] View transitions are not supported.");
    },
    removeRootViewTransitionClone: () => {},
    measureInstance: () => null,
    measureClonedInstance: () => null,
    wasInstanceInViewport: () => true,
    hasInstanceChanged: () => false,
    hasInstanceAffectedParent: () => false,
    startViewTransition: () => null,
    startGestureTransition: () => null,
    stopViewTransition: () => {},
    addViewTransitionFinishedListener: () => () => {},
    getCurrentGestureOffset: () => {
      throw new Error("[react-canvas] Gesture transitions are not supported.");
    },
    createViewTransitionInstance: () => null,

    createFragmentInstance: () => null,
    updateFragmentInstanceFiber: () => {},
    commitNewChildToFragmentInstance: () => {},
    deleteChildFromFragmentInstance: () => {},

    isSuspenseInstancePending: () => false,
    isSuspenseInstanceFallback: () => false,
    getSuspenseInstanceFallbackErrorDetails: () => null,
    registerSuspenseInstanceRetry: () => {},
    canHydrateFormStateMarker: () => false,
    isFormStateMarkerMatching: () => false,
    getNextHydratableSibling: () => null,
    getNextHydratableSiblingAfterSingleton: () => null,
    getFirstHydratableChild: () => null,
    getFirstHydratableChildWithinContainer: () => null,
    getFirstHydratableChildWithinActivityInstance: () => null,
    getFirstHydratableChildWithinSuspenseInstance: () => null,
    getFirstHydratableChildWithinSingleton: () => null,
    canHydrateInstance: () => null,
    canHydrateTextInstance: () => null,
    canHydrateActivityInstance: () => null,
    canHydrateSuspenseInstance: () => null,
    hydrateInstance: () => null,
    hydrateTextInstance: () => false,
    hydrateActivityInstance: () => {},
    hydrateSuspenseInstance: () => {},
    getNextHydratableInstanceAfterActivityInstance: () => null,
    getNextHydratableInstanceAfterSuspenseInstance: () => null,
    commitHydratedInstance: () => {},
    commitHydratedContainer: () => {},
    commitHydratedActivityInstance: () => {},
    commitHydratedSuspenseInstance: () => {},
    finalizeHydratedChildren: () => {},
    flushHydrationEvents: () => {},
    clearActivityBoundary: () => {},
    clearSuspenseBoundary: () => {},
    clearActivityBoundaryFromContainer: () => {},
    clearSuspenseBoundaryFromContainer: () => {},
    hideDehydratedBoundary: () => {},
    unhideDehydratedBoundary: () => {},
    shouldDeleteUnhydratedTailInstances: () => false,
    diffHydratedPropsForDevWarnings: () => false,
    diffHydratedTextForDevWarnings: () => false,
    describeHydratableInstanceForDevWarnings: () => "",
    validateHydratableInstance: () => ({ type: "none" }),
    validateHydratableTextInstance: () => ({ type: "none" }),

    cloneInstance: () => {
      throw new Error("[react-canvas] Persistence mode is not supported.");
    },
    createContainerChildSet: () => ({}),
    appendChildToContainerChildSet: () => {},
    finalizeContainerChildren: () => {},
    replaceContainerChildren: () => {},
    cloneHiddenInstance: () => {
      throw new Error("[react-canvas] Persistence mode is not supported.");
    },
    cloneHiddenTextInstance: () => {
      throw new Error("[react-canvas] Persistence mode is not supported.");
    },
  };
}
