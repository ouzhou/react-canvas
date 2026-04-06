export type AvatarLoadState = "loading" | "loaded" | "error";

export type AvatarVisibleLayer = "image" | "icon" | "text" | "empty";

/**
 * 决定当前应展示的层（与 Avatar 组件内状态机一致，便于单测）。
 */
export function resolveAvatarVisibleLayer(input: {
  source?: unknown;
  loadState: AvatarLoadState;
  hasIcon: boolean;
  hasChildren: boolean;
}): AvatarVisibleLayer {
  if (input.source && input.loadState === "loaded") return "image";
  if (input.source && input.loadState === "loading") {
    if (input.hasIcon) return "icon";
    if (input.hasChildren) return "text";
    return "empty";
  }
  if (input.source && input.loadState === "error") {
    if (input.hasIcon) return "icon";
    if (input.hasChildren) return "text";
    return "empty";
  }
  if (input.hasIcon) return "icon";
  if (input.hasChildren) return "text";
  return "empty";
}
