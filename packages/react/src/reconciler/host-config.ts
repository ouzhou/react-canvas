import {
  type CanvasKit,
  type InteractionHandlers,
  ImageNode,
  isTextInstance,
  queueLayoutPaintFrame,
  registerPaintFrameRequester,
  unregisterPaintFrameRequester,
  type SceneNode,
  type Surface,
  SvgPathNode,
  type TextInstance,
  TextNode,
  type TextStyle,
  ScrollViewNode,
  ViewNode,
  type ViewStyle,
  type Yoga,
} from "@react-canvas/core";
import { createContext, type MutableRefObject } from "react";
import type { ImageProps } from "../hosts/image.ts";
import { Image } from "../hosts/image.ts";
import type { SvgPathProps } from "../hosts/svg-path.ts";
import { SvgPath } from "../hosts/svg-path.ts";
import { Text } from "../hosts/text.ts";
import { ScrollView } from "../hosts/scroll-view.ts";
import { View } from "../hosts/view.ts";

/** 由 `viewNodeRef` prop 写入，卸载时必须在 `destroy` 前清空。 */
const viewNodeRefs = new WeakMap<ViewNode, MutableRefObject<ViewNode | null>>();

function attachViewNodeRef(instance: ViewNode, props: Record<string, unknown>): void {
  const r = props.viewNodeRef as MutableRefObject<ViewNode | null> | undefined;
  if (!r) return;
  viewNodeRefs.set(instance, r);
  r.current = instance;
}

function updateViewNodeRef(
  instance: ViewNode,
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
): void {
  if (instance.type !== "View") return;
  const pr = prevProps.viewNodeRef as MutableRefObject<ViewNode | null> | undefined;
  const nr = nextProps.viewNodeRef as MutableRefObject<ViewNode | null> | undefined;
  if (pr === nr) return;
  if (pr) {
    pr.current = null;
    viewNodeRefs.delete(instance);
  }
  if (nr) {
    viewNodeRefs.set(instance, nr);
    nr.current = instance;
  }
}

function detachSubtreeViewNodeRefs(node: ViewNode): void {
  const r = viewNodeRefs.get(node);
  if (r) {
    r.current = null;
    viewNodeRefs.delete(node);
  }
  for (const c of node.children) {
    if (!isTextInstance(c)) detachSubtreeViewNodeRefs(c as ViewNode);
  }
  if (node.type === "Text") {
    const tn = node as TextNode;
    for (const s of tn.slots) {
      if (s.kind === "text") detachSubtreeViewNodeRefs(s.node);
    }
  }
}

/** Implicit Reconciler root: user content mounts under this Yoga node (phase-1-design §3). */
export type SceneContainer = {
  sceneRoot: ViewNode;
};

type TextHostContext = { isInText: boolean };

function pickInteraction(p: Record<string, unknown>): InteractionHandlers {
  const h: InteractionHandlers = {};
  if (typeof p.onPointerDown === "function") {
    h.onPointerDown = p.onPointerDown as InteractionHandlers["onPointerDown"];
  }
  if (typeof p.onPointerUp === "function") {
    h.onPointerUp = p.onPointerUp as InteractionHandlers["onPointerUp"];
  }
  if (typeof p.onPointerMove === "function") {
    h.onPointerMove = p.onPointerMove as InteractionHandlers["onPointerMove"];
  }
  if (typeof p.onPointerEnter === "function") {
    h.onPointerEnter = p.onPointerEnter as InteractionHandlers["onPointerEnter"];
  }
  if (typeof p.onPointerLeave === "function") {
    h.onPointerLeave = p.onPointerLeave as InteractionHandlers["onPointerLeave"];
  }
  if (typeof p.onClick === "function") {
    h.onClick = p.onClick as InteractionHandlers["onClick"];
  }
  return h;
}

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
  detachSubtreeViewNodeRefs(child as ViewNode);
  (child as ViewNode).destroy();
}

export type PaintFrameRef = {
  surface: Surface | null;
  canvasKit: CanvasKit | null;
  /** Set by `<Canvas>` — used for async image redraw + layout/paint queue. */
  sceneRoot: ViewNode | null;
  width: number;
  height: number;
  /**
   * Uniform scale from logical layout pixels → backing-store pixels (SkCanvas root `scale`).
   * Usually ≈ `devicePixelRatio`, but chosen so integer `canvas.width` / `canvas.height` matches
   * logical `width` / `height` exactly (see `canvasBackingStoreSize` + gcd) so `bw/lw === bh/lh`
   * and a single `scale(dpr)` is not anisotropic.
   */
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
  let paintRequesterRegistered = false;
  /** Stable ref for {@link unregisterPaintFrameRequester} on clearContainer / unmount. */
  let paintFrameRequestFn: (() => void) | null = null;
  const pendingImageLoads: ImageNode[] = [];

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
      if (!paintRequesterRegistered) {
        paintFrameRequestFn = () => {
          if (!frameRef.surface || !frameRef.canvasKit || !frameRef.sceneRoot) return;
          queueLayoutPaintFrame(
            frameRef.surface,
            frameRef.canvasKit,
            frameRef.sceneRoot,
            frameRef.width,
            frameRef.height,
            frameRef.dpr,
          );
        };
        registerPaintFrameRequester(paintFrameRequestFn);
        paintRequesterRegistered = true;
      }
      for (const n of pendingImageLoads) {
        n.beginLoad(r.canvasKit);
      }
      pendingImageLoads.length = 0;
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
      props: { style?: ViewStyle | TextStyle } & InteractionHandlers,
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
        node.interactionHandlers = pickInteraction(props as Record<string, unknown>);
        return node;
      }
      if (type === ScrollView) {
        if (ctx.isInText) {
          throw new Error("[react-canvas] R-HOST-2: <ScrollView> cannot be inside <Text>.");
        }
        const node = new ScrollViewNode(yoga);
        node.setStyle(props.style ?? {});
        node.interactionHandlers = pickInteraction(props as Record<string, unknown>);
        return node;
      }
      if (type === Text) {
        const node = new TextNode(yoga);
        node.setStyle((props.style ?? {}) as TextStyle);
        node.interactionHandlers = pickInteraction(props as Record<string, unknown>);
        return node;
      }
      if (type === Image) {
        if (ctx.isInText) {
          throw new Error("[react-canvas] R-HOST-2: <Image> cannot be inside <Text>.");
        }
        const node = new ImageNode(yoga);
        const p = props as ImageProps;
        node.setImageProps(p.style, {
          source: p.source,
          resizeMode: p.resizeMode,
          onLoad: p.onLoad,
          onError: p.onError,
        });
        node.interactionHandlers = pickInteraction(props as Record<string, unknown>);
        pendingImageLoads.push(node);
        return node;
      }
      if (type === SvgPath) {
        if (ctx.isInText) {
          throw new Error("[react-canvas] R-HOST-2: <SvgPath> cannot be inside <Text>.");
        }
        const node = new SvgPathNode(yoga);
        const p = props as SvgPathProps;
        node.setSvgPathProps(p.style, {
          d: p.d,
          viewBox: p.viewBox,
          size: p.size,
          color: p.color,
          stroke: p.stroke,
          fill: p.fill,
          strokeWidth: p.strokeWidth,
          strokeLinecap: p.strokeLinecap,
          strokeLinejoin: p.strokeLinejoin,
          onError: p.onError,
        });
        node.interactionHandlers = pickInteraction(props as Record<string, unknown>);
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

    finalizeInitialChildren: (
      instance: ViewNode | TextInstance,
      type: string,
      props: { style?: ViewStyle | TextStyle } & InteractionHandlers,
    ) => {
      if (type === View && (props as Record<string, unknown>).viewNodeRef) {
        attachViewNodeRef(instance as ViewNode, props as Record<string, unknown>);
      }
      return false;
    },

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
      detachSubtreeViewNodeRefs(child);
      child.destroy();
    },

    clearContainer: (container: SceneContainer) => {
      if (paintFrameRequestFn) {
        unregisterPaintFrameRequester(paintFrameRequestFn);
        paintFrameRequestFn = null;
      }
      paintRequesterRegistered = false;
      const copy = [...container.sceneRoot.children];
      for (const c of copy) {
        container.sceneRoot.removeChild(c);
        detachSubtreeViewNodeRefs(c);
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
      prevProps: { style?: ViewStyle | TextStyle } & InteractionHandlers,
      nextProps: { style?: ViewStyle | TextStyle } & InteractionHandlers,
    ) => {
      if (instance.type === "Text") {
        (instance as TextNode).updateStyle(
          (prevProps.style ?? {}) as TextStyle,
          (nextProps.style ?? {}) as TextStyle,
        );
      } else if (instance.type === "Image") {
        (instance as ImageNode).updateImageProps(prevProps as ImageProps, nextProps as ImageProps);
        const img = instance as ImageNode;
        if (img.loadState === "idle" && img.sourceUri) {
          const ck = frameRef.canvasKit;
          if (ck) img.beginLoad(ck);
        }
      } else if (instance.type === "SvgPath") {
        (instance as SvgPathNode).updateSvgPathProps(
          prevProps as SvgPathProps,
          nextProps as SvgPathProps,
        );
      } else if (instance.type === "ScrollView") {
        updateViewNodeRef(
          instance,
          prevProps as Record<string, unknown>,
          nextProps as Record<string, unknown>,
        );
        (instance as ScrollViewNode).updateStyle(prevProps.style ?? {}, nextProps.style ?? {});
      } else {
        updateViewNodeRef(
          instance,
          prevProps as Record<string, unknown>,
          nextProps as Record<string, unknown>,
        );
        instance.updateStyle(prevProps.style ?? {}, nextProps.style ?? {});
      }
      instance.interactionHandlers = pickInteraction(nextProps as Record<string, unknown>);
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
