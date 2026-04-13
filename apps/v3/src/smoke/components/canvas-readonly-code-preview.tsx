import { ScrollView, Text } from "@react-canvas/react-v2";

export type CanvasReadonlyCodePreviewProps = {
  /** 展示的源码（只读，不可编辑） */
  code: string;
  width: number;
  height: number;
};

/**
 * 画布内只读「代码」区：{@link ScrollView} + {@link Text}，用于示例页对照源码（非 react-live 的 LiveEditor）。
 */
export function CanvasReadonlyCodePreview(props: CanvasReadonlyCodePreviewProps) {
  return (
    <ScrollView
      style={{
        width: props.width,
        height: props.height,
        borderRadius: 6,
        backgroundColor: "#0f172a",
      }}
    >
      <Text
        style={{
          fontSize: 10,
          lineHeight: 1.5,
          color: "#e2e8f0",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        {props.code}
      </Text>
    </ScrollView>
  );
}
