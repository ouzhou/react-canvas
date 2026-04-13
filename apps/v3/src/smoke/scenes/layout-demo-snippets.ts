/** 与 {@link layout-demo-scene} 中画布预览一致，供 react-live 内联校验与只读代码区展示。 */
export const LAYOUT_SNIPPET_FLEX_GRID = `
<View
  style={{
    flex: 1,
    minHeight: 120,
    flexDirection: "column",
    backgroundColor: "#eef2f6",
    padding: 10,
    borderRadius: 8,
  }}
>
  <View style={{ flex: 1, flexDirection: "row" }}>
    <View style={{ flex: 1, backgroundColor: "#f97316" }} />
    <View style={{ flex: 1, backgroundColor: "#fb923c" }} />
    <View style={{ flex: 1, backgroundColor: "#fdba74" }} />
  </View>
  <View style={{ flex: 1, flexDirection: "row" }}>
    <View style={{ flex: 1, backgroundColor: "#22c55e" }} />
    <View style={{ flex: 1, backgroundColor: "#4ade80" }} />
  </View>
  <View style={{ flex: 1, flexDirection: "row" }}>
    <View style={{ flex: 1, backgroundColor: "#3b82f6" }} />
    <View style={{ flex: 1, backgroundColor: "#60a5fa" }} />
    <View style={{ flex: 1, backgroundColor: "#93c5fd" }} />
    <View style={{ flex: 1, backgroundColor: "#bfdbfe" }} />
  </View>
</View>
`.trim();

export const LAYOUT_SNIPPET_ROW_THREE = `
<View
  style={{
    height: 72,
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    padding: 8,
    borderRadius: 8,
  }}
>
  <View style={{ flex: 1, backgroundColor: "#c084fc" }} />
  <View style={{ flex: 1, backgroundColor: "#a78bfa" }} />
  <View style={{ flex: 1, backgroundColor: "#818cf8" }} />
</View>
`.trim();
