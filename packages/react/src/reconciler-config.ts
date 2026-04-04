import {
  type CanvasKit,
  type Surface,
  ViewNode,
  type ViewStyle,
  type Yoga,
} from "@react-canvas/core";
import { createContext } from "react";
import { View } from "./view.ts";
import { queueLayoutPaintFrame } from "./queue-layout-paint-frame.ts";

/** Implicit Reconciler root: user content mounts under this Yoga node (phase-1-design §3). */
export type SceneContainer = {
  sceneRoot: ViewNode;
};

export type PaintFrameRef = {
  surface: Surface | null;
  canvasKit: CanvasKit | null;
  width: number;
  height: number;
  dpr: number;
};

const NO_CONTEXT = {};

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

    getPublicInstance: (instance: ViewNode) => instance,

    getRootHostContext: () => NO_CONTEXT,
    getChildHostContext: (parentHostContext: object) => parentHostContext,

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
      props: { style?: ViewStyle },
      _rootContainer: SceneContainer,
      _hostContext: object,
    ) => {
      if (type !== View) {
        throw new Error(`[react-canvas] Unsupported host type "${String(type)}".`);
      }
      const node = new ViewNode(yoga, "View");
      node.setStyle(props.style ?? {});
      return node;
    },

    createTextInstance: () => {
      throw new Error(
        "[react-canvas] R-HOST-5: Raw text is not allowed under <View>; use a future <Text> host when available.",
      );
    },

    cloneMutableInstance: (instance: ViewNode) => instance,
    cloneMutableTextInstance: (t: string) => t,

    appendInitialChild: (parent: ViewNode, child: ViewNode) => {
      parent.appendChild(child);
    },

    finalizeInitialChildren: () => false,

    shouldSetTextContent: () => false,

    appendChild: (parent: ViewNode, child: ViewNode) => {
      parent.appendChild(child);
    },

    appendChildToContainer: (container: SceneContainer, child: ViewNode) => {
      container.sceneRoot.appendChild(child);
    },

    insertBefore: (parent: ViewNode, child: ViewNode, beforeChild: ViewNode) => {
      parent.insertBefore(child, beforeChild);
    },

    insertInContainerBefore: (
      container: SceneContainer,
      child: ViewNode,
      beforeChild: ViewNode,
    ) => {
      container.sceneRoot.insertBefore(child, beforeChild);
    },

    removeChild: (parent: ViewNode, child: ViewNode) => {
      parent.removeChild(child);
      child.destroy();
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

    commitTextUpdate: () => {},
    commitMount: () => {},
    commitUpdate: (
      instance: ViewNode,
      _type: string,
      prevProps: { style?: ViewStyle },
      nextProps: { style?: ViewStyle },
    ) => {
      instance.updateStyle(prevProps.style ?? {}, nextProps.style ?? {});
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
