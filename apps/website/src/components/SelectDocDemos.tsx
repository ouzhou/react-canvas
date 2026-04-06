import { Text, View } from "@react-canvas/react";
import { Select } from "@react-canvas/ui";
import type { CanvasToken } from "@react-canvas/ui";
import { useState } from "react";
import { UiDemoCanvas } from "./UiControlDocDemos.tsx";

/** 受控：选项 + 占位 */
export function SelectDocDemoBasic() {
  return (
    <div className="max-w-[min(100%,40rem)]">
      <UiDemoCanvas height={220}>{(token) => <SelectBasicRow token={token} />}</UiDemoCanvas>
    </div>
  );
}

function SelectBasicRow({ token }: { token: CanvasToken }) {
  const [value, setValue] = useState<string | undefined>("b");
  return (
    <View style={{ flex: 1, alignSelf: "stretch", gap: token.paddingMD }}>
      <Select
        token={token}
        value={value}
        onChange={(v: string) => setValue(v)}
        placeholder="选一项"
        options={[
          { value: "a", label: "选项 A" },
          { value: "b", label: "选项 B" },
          { value: "c", label: "选项 C" },
        ]}
      />
      <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>
        当前值：{value ?? "（空）"}
      </Text>
    </View>
  );
}

/** `size`：sm / md */
export function SelectDocDemoSizes() {
  return (
    <div className="max-w-[min(100%,40rem)]">
      <UiDemoCanvas height={200}>
        {(token) => (
          <View style={{ flex: 1, alignSelf: "stretch", gap: token.paddingMD }}>
            <Select
              token={token}
              size="sm"
              defaultValue="x"
              options={[
                { value: "x", label: "小号 (sm)" },
                { value: "y", label: "另一项" },
              ]}
            />
            <Select
              token={token}
              size="md"
              defaultValue="x"
              options={[
                { value: "x", label: "默认 (md)" },
                { value: "y", label: "另一项" },
              ]}
            />
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `disabled` */
export function SelectDocDemoDisabled() {
  return (
    <div className="max-w-[min(100%,40rem)]">
      <UiDemoCanvas height={120}>
        {(token) => (
          <View style={{ flex: 1, alignSelf: "stretch" }}>
            <Select
              token={token}
              disabled
              defaultValue="one"
              options={[{ value: "one", label: "不可点" }]}
            />
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}
