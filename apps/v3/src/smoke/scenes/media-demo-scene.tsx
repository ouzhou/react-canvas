import { Image, Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { useState } from "react";
import alarmClock from "@lucide/icons/icons/alarm-clock";
import anchor from "@lucide/icons/icons/anchor";
import archive from "@lucide/icons/icons/archive";
import badgeCheck from "@lucide/icons/icons/badge-check";
import battery from "@lucide/icons/icons/battery";
import bell from "@lucide/icons/icons/bell";
import bookOpen from "@lucide/icons/icons/book-open";
import bookmark from "@lucide/icons/icons/bookmark";
import calendar from "@lucide/icons/icons/calendar";
import camera from "@lucide/icons/icons/camera";
import cloud from "@lucide/icons/icons/cloud";
import compass from "@lucide/icons/icons/compass";
import cpu from "@lucide/icons/icons/cpu";
import database from "@lucide/icons/icons/database";
import flame from "@lucide/icons/icons/flame";
import folder from "@lucide/icons/icons/folder";
import gift from "@lucide/icons/icons/gift";
import globe from "@lucide/icons/icons/globe";
import headphones from "@lucide/icons/icons/headphones";
import heart from "@lucide/icons/icons/heart";
import house from "@lucide/icons/icons/house";
import imageIcon from "@lucide/icons/icons/image";
import keyRound from "@lucide/icons/icons/key-round";
import leaf from "@lucide/icons/icons/leaf";
import lock from "@lucide/icons/icons/lock";
import mapPin from "@lucide/icons/icons/map-pin";
import moon from "@lucide/icons/icons/moon";
import rocket from "@lucide/icons/icons/rocket";
import search from "@lucide/icons/icons/search";
import shield from "@lucide/icons/icons/shield";
import star from "@lucide/icons/icons/star";
import sun from "@lucide/icons/icons/sun";
import thumbsUp from "@lucide/icons/icons/thumbs-up";
import trash2 from "@lucide/icons/icons/trash-2";
import userRound from "@lucide/icons/icons/user-round";
import wifi from "@lucide/icons/icons/wifi";
import heroPngUrl from "../../assets/hero.png";
import { LucideIcon } from "../components/lucide-icon.tsx";
import type { LucideIconData } from "../lib/lucide-icon-to-d.ts";

export function MediaDemoScene(props: { W: number; H: number }): ReactNode {
  const { t } = useLingui();
  const { W } = props;
  const [sizeOffset, setSizeOffset] = useState(0);
  const [strokeOffset, setStrokeOffset] = useState(0);
  const [activeColor, setActiveColor] = useState("#0f172a");
  const iconByName: Record<string, LucideIconData> = {
    camera,
    image: imageIcon,
    folder,
    bell,
    heart,
    star,
    "alarm-clock": alarmClock,
    anchor,
    archive,
    "badge-check": badgeCheck,
    battery,
    "book-open": bookOpen,
    bookmark,
    calendar,
    cloud,
    compass,
    cpu,
    database,
    flame,
    gift,
    globe,
    headphones,
    home: house,
    "key-round": keyRound,
    leaf,
    lock,
    "map-pin": mapPin,
    moon,
    rocket,
    search,
    shield,
    sun,
    "thumbs-up": thumbsUp,
    "trash-2": trash2,
    "user-round": userRound,
    wifi,
  };
  const mainCamera = camera;

  const iconShowcase = [
    { name: "camera", size: 40, color: "#0f172a", strokeWidth: 1.5 },
    { name: "image", size: 28, color: "#2563eb", strokeWidth: 1.75 },
    { name: "folder", size: 52, color: "#0ea5e9", strokeWidth: 1.5 },
    { name: "bell", size: 36, color: "#f97316", strokeWidth: 2 },
    { name: "heart", size: 44, color: "#e11d48", strokeWidth: 1.75 },
    { name: "star", size: 32, color: "#a855f7", strokeWidth: 2 },
    { name: "alarm-clock", size: 34, color: "#0f172a", strokeWidth: 1.5 },
    { name: "anchor", size: 34, color: "#475569", strokeWidth: 1.75 },
    { name: "archive", size: 34, color: "#334155", strokeWidth: 1.75 },
    { name: "badge-check", size: 34, color: "#2563eb", strokeWidth: 1.5 },
    { name: "battery", size: 34, color: "#16a34a", strokeWidth: 1.75 },
    { name: "book-open", size: 34, color: "#7c3aed", strokeWidth: 1.5 },
    { name: "bookmark", size: 34, color: "#a16207", strokeWidth: 1.75 },
    { name: "calendar", size: 34, color: "#0f766e", strokeWidth: 1.75 },
    { name: "cloud", size: 34, color: "#0284c7", strokeWidth: 1.5 },
    { name: "compass", size: 34, color: "#dc2626", strokeWidth: 1.75 },
    { name: "cpu", size: 34, color: "#4338ca", strokeWidth: 1.5 },
    { name: "database", size: 34, color: "#0f766e", strokeWidth: 1.75 },
    { name: "flame", size: 34, color: "#ea580c", strokeWidth: 1.75 },
    { name: "gift", size: 34, color: "#be123c", strokeWidth: 1.5 },
    { name: "globe", size: 34, color: "#0369a1", strokeWidth: 1.5 },
    { name: "headphones", size: 34, color: "#1d4ed8", strokeWidth: 1.75 },
    { name: "home", size: 34, color: "#0f172a", strokeWidth: 1.75 },
    { name: "key-round", size: 34, color: "#92400e", strokeWidth: 1.75 },
    { name: "leaf", size: 34, color: "#15803d", strokeWidth: 1.5 },
    { name: "lock", size: 34, color: "#334155", strokeWidth: 1.75 },
    { name: "map-pin", size: 34, color: "#b91c1c", strokeWidth: 1.5 },
    { name: "moon", size: 34, color: "#1e293b", strokeWidth: 1.75 },
    { name: "rocket", size: 34, color: "#7c3aed", strokeWidth: 1.5 },
    { name: "search", size: 34, color: "#0f172a", strokeWidth: 1.75 },
    { name: "shield", size: 34, color: "#0369a1", strokeWidth: 1.5 },
    { name: "sun", size: 34, color: "#ca8a04", strokeWidth: 1.75 },
    { name: "thumbs-up", size: 34, color: "#1d4ed8", strokeWidth: 1.5 },
    { name: "trash-2", size: 34, color: "#dc2626", strokeWidth: 1.75 },
    { name: "user-round", size: 34, color: "#334155", strokeWidth: 1.75 },
    { name: "wifi", size: 34, color: "#0284c7", strokeWidth: 1.5 },
  ] as const;
  const palette = ["#0f172a", "#2563eb", "#dc2626", "#16a34a", "#a855f7", "#ea580c"] as const;

  return (
    <View
      style={{
        width: W,
        padding: 16,
        flexDirection: "column",
        gap: 14,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>
        {t`Image（src/assets/hero.png）`}
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        {t`Vite 打包后的 URL，运行时 fetch + CanvasKit 解码；contain / cover / fill 三列，盒 100×100，灰底对照。`}
      </Text>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        {(
          [
            { label: t`contain`, fit: "contain" as const },
            { label: t`cover`, fit: "cover" as const },
            { label: t`fill`, fit: "fill" as const },
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
        {t`LucideIcon（camera）`}
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
        {t`直接使用封装后的 LucideIcon 组件，支持 size / color / strokeWidth 配置。`}
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
          {mainCamera ? (
            <LucideIcon icon={mainCamera} size={72} color="#0f172a" strokeWidth={1.5} />
          ) : (
            <Text style={{ fontSize: 11, color: "#dc2626" }}>{t`camera missing`}</Text>
          )}
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
          {mainCamera ? (
            <LucideIcon icon={mainCamera} size={56} color="#2563eb" strokeWidth={1.25} />
          ) : (
            <Text style={{ fontSize: 11, color: "#dc2626" }}>{t`camera missing`}</Text>
          )}
        </View>
      </View>

      <Text
        style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.4, marginTop: 4 }}
      >
        {t`Icon 组件预览（size / color / strokeWidth）`}
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 10,
          padding: 10,
          gap: 8,
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          {t`外部控制：点击调整后，下面全部 icon 会实时更新`}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View
            style={({ hovered }) => ({
              width: 28,
              height: 24,
              borderRadius: 6,
              backgroundColor: hovered ? "#e2e8f0" : "#f1f5f9",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            })}
            onClick={() => setSizeOffset((v) => Math.max(-12, v - 2))}
          >
            <Text style={{ fontSize: 12, color: "#334155" }}>−</Text>
          </View>
          <Text
            style={{ fontSize: 11, color: "#334155" }}
          >{t`size ${sizeOffset >= 0 ? "+" : ""}${sizeOffset}`}</Text>
          <View
            style={({ hovered }) => ({
              width: 28,
              height: 24,
              borderRadius: 6,
              backgroundColor: hovered ? "#e2e8f0" : "#f1f5f9",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            })}
            onClick={() => setSizeOffset((v) => Math.min(16, v + 2))}
          >
            <Text style={{ fontSize: 12, color: "#334155" }}>+</Text>
          </View>
          <View
            style={({ hovered }) => ({
              width: 28,
              height: 24,
              borderRadius: 6,
              backgroundColor: hovered ? "#e2e8f0" : "#f1f5f9",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              marginLeft: 8,
            })}
            onClick={() =>
              setStrokeOffset((v) => Math.max(-0.8, Math.round((v - 0.25) * 100) / 100))
            }
          >
            <Text style={{ fontSize: 12, color: "#334155" }}>−</Text>
          </View>
          <Text style={{ fontSize: 11, color: "#334155" }}>
            {t`stroke ${strokeOffset >= 0 ? "+" : ""}${strokeOffset.toFixed(2)}`}
          </Text>
          <View
            style={({ hovered }) => ({
              width: 28,
              height: 24,
              borderRadius: 6,
              backgroundColor: hovered ? "#e2e8f0" : "#f1f5f9",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            })}
            onClick={() =>
              setStrokeOffset((v) => Math.min(1.5, Math.round((v + 0.25) * 100) / 100))
            }
          >
            <Text style={{ fontSize: 12, color: "#334155" }}>+</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {palette.map((c) => (
            <View
              key={c}
              style={({ hovered }) => ({
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: c,
                borderWidth: activeColor === c ? 2 : 1,
                borderColor: activeColor === c ? "#0f172a" : hovered ? "#334155" : "#cbd5e1",
                cursor: "pointer",
              })}
              onClick={() => setActiveColor(c)}
            />
          ))}
          <Text style={{ fontSize: 11, color: "#64748b" }}>{activeColor}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        {iconShowcase.map((item) => {
          const icon = iconByName[item.name];
          const renderSize = Math.max(14, item.size + sizeOffset);
          const renderStroke = Math.max(0.75, item.strokeWidth + strokeOffset);
          const label = `${item.name} / ${renderSize}`;
          return (
            <View
              key={item.name}
              style={{
                width: 112,
                minHeight: 88,
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                backgroundColor: "#ffffff",
                paddingTop: 8,
                paddingBottom: 6,
                paddingLeft: 8,
                paddingRight: 8,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {icon ? (
                <LucideIcon
                  icon={icon}
                  size={renderSize}
                  color={activeColor || item.color}
                  strokeWidth={renderStroke}
                />
              ) : (
                <Text style={{ fontSize: 11, color: "#dc2626", lineHeight: 1.4 }}>
                  {t`not supported`}
                </Text>
              )}
              <Text style={{ fontSize: 10, color: "#64748b", lineHeight: 1.35 }}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
