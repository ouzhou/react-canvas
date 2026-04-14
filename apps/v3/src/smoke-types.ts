/** 与 URL `demo=` 同步的示例 id */
export type SmokeDemoId =
  | "intro"
  | "layout"
  | "pointer"
  | "through"
  | "hover"
  | "cursor"
  | "modal"
  | "popover"
  | "text"
  | "style"
  | "border"
  | "media"
  | "scroll-demo";

export function readDemoSearch(): { demo: SmokeDemoId } {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("demo");
  const demo: SmokeDemoId =
    raw === "intro"
      ? "intro"
      : raw === "scroll-demo"
        ? "scroll-demo"
        : raw === "media"
          ? "media"
          : raw === "layout"
            ? "layout"
            : raw === "pointer"
              ? "pointer"
              : raw === "through"
                ? "through"
                : raw === "hover"
                  ? "hover"
                  : raw === "cursor"
                    ? "cursor"
                    : raw === "modal"
                      ? "modal"
                      : raw === "popover"
                        ? "popover"
                        : raw === "text"
                          ? "text"
                          : raw === "style"
                            ? "style"
                            : raw === "border"
                              ? "border"
                              : "intro";
  return { demo };
}
