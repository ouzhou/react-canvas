import { Text, View } from "@react-canvas/react";
import { Divider } from "@react-canvas/ui";
import { UiDemoCanvas } from "./UiControlDocDemos.tsx";

/** 横线、带文案横线（与 [Divider](/ui/divider/) 页一致） */
export function DividerDocPreview() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={160}>
        {(token) => (
          <View style={{ flex: 1, gap: 16, justifyContent: "center" }}>
            <Divider token={token} orientation="horizontal" />
            <Divider token={token} orientation="horizontal">
              <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>标签</Text>
            </Divider>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}
