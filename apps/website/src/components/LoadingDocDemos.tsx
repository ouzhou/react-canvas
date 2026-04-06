import { Text, View } from "@react-canvas/react";
import { Loading } from "@react-canvas/ui";
import type { CanvasToken } from "@react-canvas/ui";
import { useState } from "react";
import { UiDemoCanvas } from "./UiControlDocDemos.tsx";

/** `size`：sm / md / lg */
export function LoadingDocDemoSizes() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={200}>
        {(token) => (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 28,
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <Loading token={token} size="sm" description="小号" />
            <Loading token={token} size="md" description="默认" />
            <Loading token={token} size="lg" description="大号" />
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `description`：默认 / 自定义 / 不显示 */
export function LoadingDocDemoDescription() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={180}>
        {(token) => (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
            <Loading token={token} size="md" />
            <Loading token={token} size="md" description="请稍候…" />
            <Loading token={token} size="md" description={null} />
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `spinning`：旋转 / 静止 */
export function LoadingDocDemoSpinning() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={140}>{(token) => <LoadingSpinningRow token={token} />}</UiDemoCanvas>
    </div>
  );
}

function LoadingSpinningRow({ token }: { token: CanvasToken }) {
  const [spinning, setSpinning] = useState(true);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <Loading
        token={token}
        size="md"
        description={spinning ? "旋转中" : "已暂停"}
        spinning={spinning}
      />
      <Text
        style={{ fontSize: token.fontSizeSM, color: token.colorPrimary, fontWeight: "600" }}
        onClick={() => setSpinning((s) => !s)}
      >
        {spinning ? "点击暂停" : "点击继续"}
      </Text>
    </View>
  );
}
