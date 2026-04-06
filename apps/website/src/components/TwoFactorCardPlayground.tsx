import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react";
import { Button, CanvasThemeProvider, useCanvasToken } from "@react-canvas/ui";
import type { CanvasThemeConfig, CanvasToken } from "@react-canvas/ui";
import { Component, type ErrorInfo, type ReactNode, useState } from "react";

const THEME: CanvasThemeConfig = {
  seed: { colorPrimary: "#65a30d", borderRadius: 10 },
};

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

function PlaygroundCanvasContent({ token }: { token: CanvasToken }) {
  const [computeEnv, setComputeEnv] = useState<ComputeEnv>("k8s");
  const primary = token.colorPrimary;

  return (
    <View style={{ flex: 1, flexDirection: "column", backgroundColor: token.colorBgLayout }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            alignSelf: "stretch",
            paddingHorizontal: 22,
            paddingVertical: 20,
            borderWidth: 1,
            borderColor: token.colorBorder,
            borderRadius: token.borderRadius,
            backgroundColor: "#ffffff",
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
      </View>

      <View style={{ padding: 16, paddingTop: 24, flexGrow: 1 }}>
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
              <Canvas width={640} height={500}>
                <View style={{ flex: 1 }}>
                  <PlaygroundCanvasContent token={token} />
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
        单块画布内上下两段：上为双因素卡片 +{" "}
        <code className="text-[var(--sl-color-text)]">Button</code>
        ；下为「计算环境」单选卡片组，点击卡片可在 Kubernetes 与 Virtual Machine
        之间切换选中态。主题 seed 绿色主色{" "}
        <code className="text-[var(--sl-color-text)]">#65a30d</code>。
      </p>
      <CanvasThemeProvider theme={THEME}>
        <TwoFactorCardInner />
      </CanvasThemeProvider>
    </div>
  );
}
