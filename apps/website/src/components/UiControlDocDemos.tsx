import userIcon from "@lucide/icons/icons/user";
import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import {
  Avatar,
  AvatarGroup,
  CanvasThemeProvider,
  Checkbox,
  Switch,
  useCanvasToken,
} from "@react-canvas/ui";
import type { CanvasThemeConfig, CanvasToken } from "@react-canvas/ui";
import type { ReactNode } from "react";
import { useState } from "react";

const docTheme: CanvasThemeConfig = {
  appearance: "light",
  density: "default",
  seed: { colorPrimary: "#1677ff" },
};

/** 文档站画布演示外壳：`CanvasThemeProvider` + `CanvasProvider` + `Canvas`。 */
export function UiDemoCanvas({
  height,
  children,
}: {
  height: number;
  children: (token: CanvasToken) => ReactNode;
}) {
  return (
    <CanvasThemeProvider theme={docTheme}>
      <UiDemoCanvasInner height={height}>{children}</UiDemoCanvasInner>
    </CanvasThemeProvider>
  );
}

function UiDemoCanvasInner({
  height,
  children,
}: {
  height: number;
  children: (token: CanvasToken) => ReactNode;
}) {
  const token = useCanvasToken();
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) {
          return (
            <p
              style={{
                margin: 0,
                fontSize: "0.8125rem",
                color: "var(--sl-color-red, #f87171)",
              }}
            >
              加载失败：{error.message}
            </p>
          );
        }
        if (!isReady) {
          return (
            <p
              style={{
                margin: 0,
                fontSize: "0.8125rem",
                color: "var(--sl-color-gray-3, #94a3b8)",
              }}
            >
              正在加载 Yoga + CanvasKit…
            </p>
          );
        }
        return (
          <div className="not-prose [&_canvas]:block">
            <Canvas width={420} height={height}>
              <View
                style={{
                  flex: 1,
                  padding: 16,
                  flexDirection: "column",
                  gap: 14,
                  backgroundColor: token.colorBgLayout,
                }}
              >
                {children(token)}
              </View>
            </Canvas>
          </div>
        );
      }}
    </CanvasProvider>
  );
}

/** 受控：`checked` + `onChange` */
export function CheckboxDocDemoControlled() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={130}>{(token) => <CheckboxControlledRow token={token} />}</UiDemoCanvas>
    </div>
  );
}

function CheckboxControlledRow({ token }: { token: CanvasToken }) {
  const [checked, setChecked] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Checkbox token={token} checked={checked} onChange={setChecked}>
        <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>
          {checked ? "已勾选" : "未勾选"}
        </Text>
      </Checkbox>
    </View>
  );
}

/** 非受控：`defaultChecked` */
export function CheckboxDocDemoUncontrolled() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={110}>
        {(token) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Checkbox token={token} defaultChecked>
              <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>默认选中</Text>
            </Checkbox>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `indeterminate`：点击后父级清除第三态并更新 `checked` */
export function CheckboxDocDemoIndeterminate() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={130}>
        {(token) => <CheckboxIndeterminateRow token={token} />}
      </UiDemoCanvas>
    </div>
  );
}

function CheckboxIndeterminateRow({ token }: { token: CanvasToken }) {
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(true);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Checkbox
        token={token}
        indeterminate={indeterminate}
        checked={checked}
        onChange={(v: boolean) => {
          setIndeterminate(false);
          setChecked(v);
        }}
      >
        <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>
          {indeterminate ? "半选" : checked ? "已选" : "未选"}
        </Text>
      </Checkbox>
    </View>
  );
}

/** 受控 Switch */
export function SwitchDocDemoControlled() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={130}>{(token) => <SwitchControlledRow token={token} />}</UiDemoCanvas>
    </div>
  );
}

function SwitchControlledRow({ token }: { token: CanvasToken }) {
  const [on, setOn] = useState(true);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <Switch token={token} size="md" checked={on} onChange={setOn} />
      <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>{on ? "开" : "关"}</Text>
      <Switch token={token} size="sm" checked={on} onChange={setOn} />
      <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>同上状态（sm）</Text>
    </View>
  );
}

/** `disabled` */
export function SwitchDocDemoDisabled() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={110}>
        {(token) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Switch token={token} checked disabled />
            <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>禁用（开）</Text>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `icon` 与 `children`（文字） */
export function AvatarDocDemoIconAndText() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={120}>
        {(token) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Avatar token={token} icon={userIcon} size="md" />
            <Avatar token={token} size="md">
              <Text
                style={{ fontSize: token.fontSizeMD, color: token.colorText, fontWeight: "600" }}
              >
                A
              </Text>
            </Avatar>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `size`：`sm` / `md` / `lg` */
export function AvatarDocDemoSizes() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={140}>
        {(token) => (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <Avatar token={token} icon={userIcon} size="sm" />
            <Avatar token={token} icon={userIcon} size="md" />
            <Avatar token={token} icon={userIcon} size="lg" />
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `AvatarGroup`：横向重叠 + 组内头像描边 */
export function AvatarDocDemoGroup() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={120}>
        {(token) => (
          <AvatarGroup overlap={10}>
            <Avatar
              token={token}
              size="md"
              source={{ uri: "https://picsum.photos/seed/rc-group-1/96/96" }}
              icon={userIcon}
            />
            <Avatar
              token={token}
              size="md"
              source={{ uri: "https://picsum.photos/seed/rc-group-2/96/96" }}
              icon={userIcon}
            />
            <Avatar token={token} size="md" icon={userIcon} />
          </AvatarGroup>
        )}
      </UiDemoCanvas>
    </div>
  );
}

/** `source`：远程图（失败时回退到 icon / children，由组件处理） */
export function AvatarDocDemoSource() {
  return (
    <div style={{ maxWidth: "min(100%, 40rem)" }}>
      <UiDemoCanvas height={120}>
        {(token) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Avatar
              token={token}
              size="md"
              source={{ uri: "https://picsum.photos/seed/react-canvas-doc/96/96" }}
              icon={userIcon}
            />
            <Text style={{ fontSize: token.fontSizeSM, color: token.colorText, maxWidth: 200 }}>
              网络图 + icon 作加载占位
            </Text>
          </View>
        )}
      </UiDemoCanvas>
    </div>
  );
}
