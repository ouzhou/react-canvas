import camera from "@lucide/icons/icons/camera";
import { Image, SvgPath, Text, View } from "@react-canvas/react-v2";
import type { ReactNode } from "react";
import { useMemo } from "react";
import heroPngUrl from "../../assets/hero.png";
import { type LucideIconTuple, lucideIconNodesToPathD } from "../lib/lucide-icon-to-d.ts";

export function MediaDemoScene(props: { W: number; H: number }): ReactNode {
  const { W, H } = props;
  const cameraD = useMemo(
    () => lucideIconNodesToPathD(camera.node as unknown as readonly LucideIconTuple[]),
    [],
  );

  return (
    <View
      style={{
        width: W,
        height: H,
        padding: 16,
        flexDirection: "column",
        gap: 14,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>
        Image（src/assets/hero.png）
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        Vite 打包后的 URL，运行时 fetch + CanvasKit 解码；contain / cover / fill 三列，盒
        100×100，灰底对照。
      </Text>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        {(
          [
            { label: "contain", fit: "contain" as const },
            { label: "cover", fit: "cover" as const },
            { label: "fill", fit: "fill" as const },
          ] as const
        ).map(({ label, fit }) => (
          <View
            key={label}
            style={{
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 11, color: "#64748b" }}>{label}</Text>
            <View
              style={{
                width: 100,
                height: 100,
                backgroundColor: "#e2e8f0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image uri={heroPngUrl} objectFit={fit} style={{ width: 88, height: 88 }} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: "#cbd5e1", marginTop: 4, marginBottom: 4 }} />

      <Text style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>
        SvgPath（Lucide camera）
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        import camera from &quot;@lucide/icons/icons/camera&quot; → node 转 `d`，viewBox 0 0 24 24。
      </Text>
      <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderWidth: 1,
            borderColor: "#cbd5e1",
            borderRadius: 10,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <SvgPath
            d={cameraD}
            viewBox="0 0 24 24"
            stroke="#0f172a"
            fill="none"
            strokeWidth={1.5}
            style={{ width: 72, height: 72 }}
          />
        </View>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 1,
            borderColor: "#94a3b8",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f1f5f9",
          }}
        >
          <SvgPath
            d={cameraD}
            viewBox="0 0 24 24"
            stroke="#2563eb"
            fill="none"
            strokeWidth={1.25}
            style={{ width: 56, height: 56 }}
          />
        </View>
      </View>
    </View>
  );
}
