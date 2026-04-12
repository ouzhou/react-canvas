import { Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";

import { AD_TEXT, AD_TEXT_SECONDARY } from "../constants.ts";

/**
 * 示例五：抓手光标仅出现在粉区；标题/说明为 default，避免整行 Text 布局盒在字侧空白处继承手型。
 * 按下抓取的状态与 global pointerup 仍由粉条持有。
 */
export function CursorDragGrabSection() {
  const { t } = useLingui();
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!pressed) return;
    const onUp = () => setPressed(false);
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [pressed]);

  return (
    <View id="c-drag-section" style={{ flexDirection: "column" }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: AD_TEXT,
          lineHeight: 1.35,
          cursor: "default",
        }}
      >
        {t`示例五：按下抓取`}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: AD_TEXT_SECONDARY,
          lineHeight: 1.4,
          marginBottom: 6,
          cursor: "default",
        }}
      >
        {t`在粉区内按下拖动为抓取；移出粉区后光标随当前命中节点变化（粉区为 grab / grabbing）。`}
      </Text>
      <View
        id="c-drag-strip"
        style={{
          alignSelf: "stretch",
          height: 64,
          backgroundColor: pressed ? "#f9a8d4" : "#fce7f3",
          cursor: pressed ? "grabbing" : "grab",
        }}
        onPointerDown={() => setPressed(true)}
      />
    </View>
  );
}
