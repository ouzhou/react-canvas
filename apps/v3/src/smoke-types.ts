/** 与 URL `demo=` 同步的示例 id */
export type SmokeDemoId =
  | "layout"
  | "pointer"
  | "through"
  | "hover"
  | "cursor"
  | "modal"
  | "text"
  | "style";

export function readDemoSearch(): { demo: SmokeDemoId } {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("demo");
  const demo: SmokeDemoId =
    raw === "pointer"
      ? "pointer"
      : raw === "through"
        ? "through"
        : raw === "hover"
          ? "hover"
          : raw === "cursor"
            ? "cursor"
            : raw === "modal"
              ? "modal"
              : raw === "text"
                ? "text"
                : raw === "style"
                  ? "style"
                  : "layout";
  return { demo };
}

export const SMOKE_DEMO_LIST: ReadonlyArray<{ id: SmokeDemoId; label: string }> = [
  { id: "layout", label: "布局测试" },
  { id: "pointer", label: "pointer 事件测试" },
  { id: "through", label: "穿透命中（pointer-events: none）" },
  { id: "hover", label: "hover 测试" },
  { id: "cursor", label: "cursor（多场景 + hover）" },
  { id: "modal", label: "Modal（scene-modal + 背板）" },
  { id: "text", label: "文字（Paragraph M1）" },
  { id: "style", label: "样式（Yoga 扩展）" },
];
