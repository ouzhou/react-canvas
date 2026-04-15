export { attachCanvasStagePointer } from "./input/canvas-stage-pointer.ts";
export { resolveCursorFromHitLeaf } from "./input/resolve-cursor.ts";
export { clientXYToStageLocal, type StageViewportOrigin } from "./input/stage-client-coords.ts";
export { canvasBackingStoreSize, gcd } from "./geometry/canvas-backing-store.ts";
export { initCanvasKit } from "./render/canvaskit.ts";
export {
  attachSceneSkiaPresenter,
  type AttachSceneSkiaOptions,
  type PresentFrameInfo,
} from "./render/scene-skia-presenter.ts";
export type {
  BackgroundLinearGradient,
  BackgroundRadialGradient,
  FontStyleCss,
  TextAlignStyle,
  TextDecorationLineKeyword,
  TextDecorationLineStyle,
  TextDecorationStyleCss,
  TextLayoutStyleSnapshot,
  TextRunStylePatch,
  TransformOp,
  ViewStyle,
  YogaLength,
} from "./layout/style-map.ts";
export type { ImageObjectFit } from "./media/image-object-fit.ts";
export { computeImageDestSrcRects } from "./media/image-object-fit.ts";
export type { TextFlatRun } from "./text/text-flat-run.ts";
export {
  applyStylesToYoga,
  clampOpacityForSnapshot,
  isPaintOnlyStylePatch,
} from "./layout/style-map.ts";
export { hitTestAt } from "./hit/hit-test.ts";
export { PickBuffer } from "./hit/pick-buffer.ts";
export { PICK_ID_EMPTY, pickIdToRgba, rgbaToPickId } from "./hit/pick-id-codec.ts";
export { absoluteBoundsFor, calculateAndSyncLayout } from "./layout/layout-sync.ts";
export type { DispatchTrace, DispatchTraceEntry } from "./events/dispatch.ts";
export { dispatchPointerLike } from "./events/dispatch.ts";
export { createEventRegistry } from "./events/event-registry.ts";
export type { EventRegistry } from "./events/event-registry.ts";
export { ScenePointerEvent } from "./events/scene-event.ts";
export type { PointerEventType } from "./events/scene-event.ts";
export { loadYoga } from "./layout/yoga.ts";
export type { Yoga } from "./layout/yoga.ts";
export { createNodeStore } from "./runtime/node-store.ts";
export type { NodeStore } from "./runtime/node-store.ts";
export type { SceneNode, SceneNodeKind } from "./scene/scene-node.ts";
export type { TypefaceFontProvider } from "canvaskit-wasm";
export { BUILTIN_PARAGRAPH_FONT_URL } from "./fonts/builtin.ts";
export {
  DEFAULT_PARAGRAPH_FONT_FAMILY,
  loadDefaultParagraphFont,
  type LoadedParagraphFont,
} from "./fonts/load-default-paragraph-font.ts";
export {
  bindSceneRuntimeCursorTarget,
  createSceneRuntime,
  maxScrollYForNode,
  SCENE_CONTENT_ID,
  SCENE_MODAL_ID,
  type Camera,
  type CreateSceneRuntimeOptions,
  type InsertImageOptions,
  type InsertSvgPathOptions,
  type LayoutCommitPayload,
  type LayoutSnapshot,
  type SceneGraphSnapshot,
  type SceneRuntime,
} from "./runtime/scene-runtime.ts";
export {
  getRuntimeServerSnapshot,
  getRuntimeSnapshot,
  initRuntime,
  resetRuntimeInitForTests,
  subscribeRuntimeInit,
  type Runtime,
  type RuntimeInitSnapshot,
  type RuntimeOptions,
} from "./runtime/init-runtime.ts";
