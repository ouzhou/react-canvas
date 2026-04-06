import { Text, View } from "@react-canvas/react";
import { Button } from "@react-canvas/ui";
import type { CanvasToken } from "@react-canvas/ui";
import { useState } from "react";
import { UiDemoCanvas } from "./UiControlDocDemos.tsx";

/** `variant`：primary / ghost，`size`：sm / md */
export function ButtonDocDemoVariants() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={150}>
        {(token) => (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Button token={token} variant="primary" size="md">
              <Text style={{ fontSize: token.fontSizeMD, fontWeight: "600", color: "#ffffff" }}>
                Primary md
              </Text>
            </Button>
            <Button token={token} variant="primary" size="sm">
              <Text style={{ fontSize: token.fontSizeSM, fontWeight: "600", color: "#ffffff" }}>
                Primary sm
              </Text>
            </Button>
            <Button token={token} variant="ghost" size="md">
              <Text style={{ fontSize: token.fontSizeMD, color: token.colorText }}>Ghost md</Text>
            </Button>
            <Button token={token} variant="ghost" size="sm">
              <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>Ghost sm</Text>
            </Button>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `disabled` */
export function ButtonDocDemoDisabled() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={110}>
        {(token) => (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Button token={token} variant="primary" size="md" disabled>
              <Text style={{ fontSize: token.fontSizeMD, fontWeight: "600", color: "#ffffff" }}>
                Primary 禁用
              </Text>
            </Button>
            <Button token={token} variant="ghost" size="md" disabled>
              <Text style={{ fontSize: token.fontSizeMD, color: token.colorText }}>Ghost 禁用</Text>
            </Button>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `onClick`（画布合成指针事件） */
export function ButtonDocDemoClick() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={120}>{(token) => <ButtonClickRow token={token} />}</UiDemoCanvas>
    </div>
  );
}

function ButtonClickRow({ token }: { token: CanvasToken }) {
  const [clicks, setClicks] = useState(0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <Button token={token} variant="primary" size="md" onClick={() => setClicks((c) => c + 1)}>
        <Text style={{ fontSize: token.fontSizeMD, fontWeight: "600", color: "#ffffff" }}>
          点击计数
        </Text>
      </Button>
      <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>次数：{clicks}</Text>
    </View>
  );
}
