import type { ViewStyle } from "@react-canvas/core";

/**
 * 展平参数（含嵌套数组），后者覆盖前者。为 **浅合并**；与 RN `StyleSheet.flatten` 的常见用法类似，**不**对嵌套对象（如 transform 数组）做特殊归并。
 */
export function mergeViewStyles(...styles: Array<ViewStyle | undefined | ViewStyle[]>): ViewStyle {
  const flat: ViewStyle[] = [];
  for (const s of styles) {
    if (s === undefined) {
      continue;
    }
    if (Array.isArray(s)) {
      for (const item of s) {
        if (item !== undefined) {
          flat.push(item);
        }
      }
    } else {
      flat.push(s);
    }
  }
  return Object.assign({}, ...flat);
}
