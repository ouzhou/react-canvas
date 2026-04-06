/** 与 Ant Design Spin 尺寸 token 对齐：小号 / 默认 / 大号指示器。 */
export type LoadingSize = "sm" | "md" | "lg";

export function getLoadingMetrics(size: LoadingSize): {
  iconSize: number;
  descriptionFontSize: number;
  gap: number;
} {
  switch (size) {
    case "sm":
      return { iconSize: 14, descriptionFontSize: 12, gap: 6 };
    case "lg":
      return { iconSize: 32, descriptionFontSize: 16, gap: 12 };
    default:
      return { iconSize: 20, descriptionFontSize: 14, gap: 8 };
  }
}
