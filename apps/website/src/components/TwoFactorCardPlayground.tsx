import userIcon from "@lucide/icons/icons/user";
import loaderCircle from "@lucide/icons/icons/loader-circle";
import { Canvas, CanvasProvider, ScrollView, Text, View } from "@react-canvas/react";
import {
  Avatar,
  AvatarGroup,
  Button,
  CanvasThemeProvider,
  Checkbox,
  Divider,
  Icon,
  Switch,
  useCanvasToken,
} from "@react-canvas/ui";
import type { CanvasThemeConfig, CanvasToken } from "@react-canvas/ui";
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";

const THEME: CanvasThemeConfig = {
  seed: { colorPrimary: "#65a30d", borderRadius: 10 },
};

/** 固定视口高度；长内容在 `ScrollView` 内滚动。 */
const CANVAS_W = 640;
const CANVAS_H = 560;

type ComputeEnv = "k8s" | "vm";

/** 选中态：实心主色圆 + 白点 */
function RadioSelected({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#ffffff",
        }}
      />
    </View>
  );
}

function RadioUnselected() {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#d1d5db",
        backgroundColor: "#ffffff",
      }}
    />
  );
}

type StatusPillVariant = "dark" | "light" | "outline";

/** 横向药丸：左侧旋转 loader + 文案（与 {@link Loading} 同速旋转逻辑）。 */
function StatusPill({ label, variant }: { label: string; variant: StatusPillVariant }) {
  const [rotationDeg, setRotationDeg] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let last = performance.now();
    const degPerSec = 320;
    const tick = (now: number) => {
      if (cancelled) return;
      const dt = (now - last) / 1000;
      last = now;
      setRotationDeg((r) => (r + degPerSec * dt) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const iconSize = 16;
  const fg = variant === "dark" ? "#ffffff" : "#111827";
  const bg = variant === "dark" ? "#1f2937" : variant === "light" ? "#f3f4f6" : "#ffffff";
  const border =
    variant === "outline" ? { borderWidth: 1 as const, borderColor: "#e5e7eb" as const } : {};

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: bg,
        ...border,
      }}
    >
      <View
        style={{
          width: iconSize,
          height: iconSize,
          transform: [{ rotate: `${rotationDeg}deg` }],
        }}
      >
        <Icon icon={loaderCircle} size={iconSize} stroke={fg} strokeWidth={2} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: "500", color: fg }}>{label}</Text>
    </View>
  );
}

function PlaygroundCanvasContent({ token }: { token: CanvasToken }) {
  const [computeEnv, setComputeEnv] = useState<ComputeEnv>("k8s");
  const [wallpaperTinting, setWallpaperTinting] = useState(true);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const primary = token.colorPrimary;

  return (
    <View
      style={{
        flexDirection: "column",
        width: "100%",
        backgroundColor: token.colorBgLayout,
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "column",
            alignSelf: "stretch",
            borderWidth: 1,
            borderColor: token.colorBorder,
            borderRadius: token.borderRadius,
            backgroundColor: "#ffffff",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 22,
              paddingVertical: 20,
            }}
          >
            <View style={{ flexDirection: "column", flex: 1, gap: 4, marginRight: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: token.colorText }}>
                Two-factor authentication
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "400", color: "#6b7280" }}>
                Verify via email or phone number.
              </Text>
            </View>
            <Button token={token} variant="primary" size="md">
              <Text style={{ fontSize: token.fontSizeMD, fontWeight: "600", color: "#ffffff" }}>
                Enable
              </Text>
            </Button>
          </View>

          <View style={{ height: 1, backgroundColor: token.colorBorder, alignSelf: "stretch" }} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 22,
              paddingVertical: 16,
            }}
          >
            <View style={{ flexDirection: "column", flex: 1, gap: 4, marginRight: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: token.colorText }}>
                Wallpaper Tinting
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "400", color: "#6b7280" }}>
                Allow the wallpaper to be tinted.
              </Text>
            </View>
            <Switch token={token} checked={wallpaperTinting} onChange={setWallpaperTinting} />
          </View>
        </View>

        <View
          style={{
            marginTop: 12,
            alignSelf: "stretch",
            borderWidth: 1,
            borderColor: token.colorBorder,
            borderRadius: token.borderRadius,
            backgroundColor: "#ffffff",
          }}
        >
          <View style={{ height: 1, backgroundColor: token.colorBorder, alignSelf: "stretch" }} />
          <View style={{ paddingHorizontal: 22, paddingVertical: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: token.colorText }}>
              Billing Address
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 15,
                fontWeight: "400",
                color: "#6b7280",
              }}
            >
              The billing address associated with your payment method
            </Text>
            <View style={{ marginTop: 14, alignSelf: "flex-start" }}>
              <Checkbox token={token} checked={sameAsShipping} onChange={setSameAsShipping}>
                <Text style={{ fontSize: 16, fontWeight: "400", color: token.colorText }}>
                  Same as shipping address
                </Text>
              </Checkbox>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: token.colorBorder, alignSelf: "stretch" }} />
        </View>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            alignSelf: "stretch",
          }}
        >
          <StatusPill label="Syncing" variant="dark" />
          <StatusPill label="Updating" variant="light" />
          <StatusPill label="Loading" variant="outline" />
        </View>

        <View
          style={{
            marginTop: 12,
            alignSelf: "stretch",
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: token.borderRadius + 4,
            backgroundColor: "#ffffff",
            paddingHorizontal: 24,
            paddingVertical: 28,
            alignItems: "center",
          }}
        >
          <AvatarGroup overlap={10}>
            <Avatar
              token={token}
              size="md"
              source={{ uri: "https://picsum.photos/seed/rc-empty-a/96/96?grayscale" }}
              icon={userIcon}
            />
            <Avatar
              token={token}
              size="md"
              source={{ uri: "https://picsum.photos/seed/rc-empty-b/96/96?grayscale" }}
              icon={userIcon}
            />
            <Avatar token={token} size="md" style={{ backgroundColor: "#000000" }}>
              <Text style={{ fontSize: token.fontSizeMD, color: "#ffffff", fontWeight: "600" }}>
                🐰
              </Text>
            </Avatar>
          </AvatarGroup>
          <Text
            style={{
              marginTop: 18,
              fontSize: 18,
              fontWeight: "700",
              color: token.colorText,
              textAlign: "center",
            }}
          >
            No Team Members
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 15,
              fontWeight: "400",
              color: "#6b7280",
              textAlign: "center",
              maxWidth: 280,
            }}
          >
            {"Invite your team to \ncollaborate on this project."}
          </Text>
          <View
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "#000000",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>
              + Invite Members
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 16, paddingTop: 24 }}>
        <View style={{ marginBottom: 16, alignSelf: "stretch" }}>
          <Divider token={token} orientation="horizontal">
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#6b7280" }}>
              Appearance Settings
            </Text>
          </Divider>
        </View>
        <View style={{ flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: token.colorText }}>
            Compute Environment
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "400", color: "#6b7280" }}>
            Select the compute environment for your cluster.
          </Text>
        </View>

        <View style={{ flexDirection: "column", gap: 12, alignSelf: "stretch" }}>
          <View
            onClick={() => setComputeEnv("k8s")}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderWidth: 1,
              borderRadius: token.borderRadius,
              borderColor: computeEnv === "k8s" ? "#86efac" : "#e5e7eb",
              backgroundColor: computeEnv === "k8s" ? "#f0fdf4" : "#ffffff",
            }}
          >
            <View style={{ flex: 1, flexDirection: "column", gap: 4, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: token.colorText }}>
                Kubernetes
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "400", color: "#6b7280" }}>
                Run GPU workloads on a K8s configured cluster. This is the default.
              </Text>
            </View>
            {computeEnv === "k8s" ? <RadioSelected color={primary} /> : <RadioUnselected />}
          </View>

          <View
            onClick={() => setComputeEnv("vm")}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderWidth: 1,
              borderRadius: token.borderRadius,
              borderColor: computeEnv === "vm" ? "#86efac" : "#e5e7eb",
              backgroundColor: computeEnv === "vm" ? "#f0fdf4" : "#ffffff",
            }}
          >
            <View style={{ flex: 1, flexDirection: "column", gap: 4, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: token.colorText }}>
                Virtual Machine
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "400", color: "#6b7280" }}>
                Access a VM configured cluster to run workloads. (Coming soon)
              </Text>
            </View>
            {computeEnv === "vm" ? <RadioSelected color={primary} /> : <RadioUnselected />}
          </View>
        </View>
      </View>
    </View>
  );
}

class TwoFactorCardErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[TwoFactorCardPlayground canvas]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <p role="alert" className="m-0 max-w-md text-sm text-[var(--sl-color-red)]">
          {this.state.error.message}
        </p>
      );
    }
    return this.props.children;
  }
}

function TwoFactorCardInner() {
  const token = useCanvasToken();
  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error)
          return (
            <p className="m-0 text-[var(--sl-color-text)]">
              Failed to load runtime: {error.message}
            </p>
          );
        if (!isReady)
          return <p className="m-0 text-[var(--sl-color-text)]">Loading Yoga + CanvasKit…</p>;
        return (
          <TwoFactorCardErrorBoundary>
            <div className="[&_canvas]:block">
              <Canvas width={CANVAS_W} height={CANVAS_H}>
                <View style={{ width: "100%", height: "100%" }}>
                  <ScrollView
                    style={{
                      width: "100%",
                      height: CANVAS_H,
                      backgroundColor: token.colorBgLayout,
                    }}
                  >
                    <View style={{ width: "100%" }}>
                      <PlaygroundCanvasContent token={token} />
                    </View>
                  </ScrollView>
                </View>
              </Canvas>
            </div>
          </TwoFactorCardErrorBoundary>
        );
      }}
    </CanvasProvider>
  );
}

export function TwoFactorCardPlayground() {
  return (
    <div className="not-prose flex max-w-3xl flex-col gap-4">
      <p className="m-0 text-sm text-[var(--sl-color-gray-3)]">
        画布固定 {CANVAS_W}×{CANVAS_H}，整块内容在{" "}
        <code className="text-[var(--sl-color-text)]">ScrollView</code>{" "}
        内纵向滚动。顶部白卡片含双因素行 + 分隔线 +「Wallpaper Tinting」
        <code className="text-[var(--sl-color-text)]">Switch</code>
        ；其下为「Billing Address」区块（顶底分隔线 +{" "}
        <code className="text-[var(--sl-color-text)]">Checkbox</code>
        ）；其下为一行三种药丸状态 +「空状态」卡片（
        <code className="text-[var(--sl-color-text)]">AvatarGroup</code>
        、文案、黑底「+ Invite Members」）；下半区顶部为居中标题 + 两侧横线的{" "}
        <code className="text-[var(--sl-color-text)]">Divider</code>
        （Appearance Settings）；其下为「计算环境」单选卡片组，点击卡片可在 Kubernetes 与 Virtual
        Machine 之间切换选中态。主题 seed 绿色主色{" "}
        <code className="text-[var(--sl-color-text)]">#65a30d</code>。
      </p>
      <CanvasThemeProvider theme={THEME}>
        <TwoFactorCardInner />
      </CanvasThemeProvider>
    </div>
  );
}
