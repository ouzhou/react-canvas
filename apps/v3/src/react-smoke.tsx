import { Canvas, CanvasProvider, Text, View } from "@react-canvas/react-v2";
import { useCallback, useEffect, useState } from "react";
import { TEXT_DEMO_WRAP_MAX, TEXT_DEMO_WRAP_MIN } from "./demo-dimensions.ts";
import { readDemoSearch, type SmokeDemoId } from "./smoke-types.ts";
import {
  STYLE_OPACITY_SLIDER_DEFAULT,
  STYLE_OPACITY_SLIDER_MAX,
  STYLE_OPACITY_SLIDER_MIN,
  type StyleDemoCase,
} from "./style-demo-content.ts";
import { useDemoCatalog } from "./smoke/hooks/use-demo-catalog.tsx";
import { useStyleDemoCases } from "./smoke/hooks/use-style-demo-cases.tsx";
import {
  AD_COLOR_PRIMARY,
  AD_NAV_BG_HOVER,
  AD_NAV_BG_SELECTED,
  AD_SPLIT,
  AD_TEXT,
  AD_TEXT_SECONDARY,
  AD_TEXT_TERTIARY,
  SIDEBAR_W,
} from "./smoke/constants.ts";
import { demoStageSize } from "./smoke/demo-stage.ts";
import { useViewportSize } from "./smoke/hooks/use-viewport-size.ts";
import { BorderDemoScene } from "./smoke/scenes/border-demo-scene.tsx";
import { CursorDemoScene } from "./smoke/scenes/cursor-demo-scene.tsx";
import { HoverDemoScene } from "./smoke/scenes/hover-demo-scene.tsx";
import { LayoutDemoScene } from "./smoke/scenes/layout-demo-scene.tsx";
import { ModalDemoInCanvas } from "./smoke/scenes/modal-demo-scene.tsx";
import { PointerClickLog, PointerClickLogB } from "./smoke/scenes/pointer-click-log.tsx";
import { PointerDemoScene } from "./smoke/scenes/pointer-demo-scene.tsx";
import { StyleDemoScene } from "./smoke/scenes/style-demo-scene.tsx";
import { TextDemoScene } from "./smoke/scenes/text-demo-scene.tsx";
import { ThroughClickLog } from "./smoke/scenes/through-click-log.tsx";
import { ThroughDemoScene } from "./smoke/scenes/through-demo-scene.tsx";
import { useLingui } from "@lingui/react/macro";
import { activateLinguiLocale, linguiI18n } from "./lib/lingui.ts";

/**
 * 整页仅一块 {@link Canvas}（另含库内部的定位容器与 `<canvas />`）。
 * 侧栏、说明、工具与日志均在场景树内，无业务用 HTML 控件。
 */
export function SmokeCanvasApp() {
  const { t } = useLingui();
  const { smokeDemoList, getDemoPageMeta } = useDemoCatalog();
  const styleDemoCases = useStyleDemoCases();
  const [{ demo }, setNav] = useState(readDemoSearch);
  const setDemo = useCallback((next: SmokeDemoId) => {
    setNav({ demo: next });
  }, []);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("demo", demo);
    u.searchParams.delete("smoke");
    history.replaceState(null, "", `${u.pathname}?${u.searchParams.toString()}${u.hash}`);
  }, [demo]);

  const { vw, vh } = useViewportSize();
  const innerW = Math.max(120, vw - SIDEBAR_W);

  const [lastClickTarget, setLastClickTarget] = useState<string | null>(null);
  const [textWrapWidth, setTextWrapWidth] = useState(TEXT_DEMO_WRAP_MAX);
  const [textDemoClickLog, setTextDemoClickLog] = useState<string | null>(null);
  const [styleCase, setStyleCase] = useState<StyleDemoCase>("margin-gap");
  const [styleOpacityPercent, setStyleOpacityPercent] = useState(STYLE_OPACITY_SLIDER_DEFAULT);
  const [modalLog, setModalLog] = useState<string | null>(null);
  const [i18nLocale, setI18nLocale] = useState(() => linguiI18n.locale);
  const pickLocale = useCallback((locale: string) => {
    activateLinguiLocale(locale);
    setI18nLocale(linguiI18n.locale);
  }, []);
  const onPointerHit = useCallback((label: string) => setLastClickTarget(label), []);
  const onTextBodyClick = useCallback(() => {
    setTextDemoClickLog(t`text-body · ${new Date().toLocaleTimeString()}`);
  }, [t]);
  const onModalLog = useCallback((msg: string) => setModalLog(msg), []);

  useEffect(() => {
    if (demo !== "pointer" && demo !== "through") setLastClickTarget(null);
  }, [demo]);

  useEffect(() => {
    if (demo !== "text") setTextDemoClickLog(null);
  }, [demo]);

  useEffect(() => {
    if (demo !== "style") setStyleCase("margin-gap");
  }, [demo]);

  useEffect(() => {
    if (demo !== "modal") setModalLog(null);
  }, [demo]);

  const { dw, dh } = demoStageSize(demo);
  const doc = getDemoPageMeta(demo);

  let logLine: string | null = null;
  if (demo === "pointer" || demo === "through") {
    logLine = lastClickTarget ? t`click: ${lastClickTarget}` : t`click: （尚未点击）`;
  } else if (demo === "text") {
    logLine = textDemoClickLog ? t`主段: ${textDemoClickLog}` : t`主段: （点主灰条）`;
  } else if (demo === "modal") {
    logLine = modalLog ? t`modal: ${modalLog}` : t`modal: （尚未点击）`;
  }

  const bumpTextWrap = (delta: number) => {
    setTextWrapWidth((w) => Math.min(TEXT_DEMO_WRAP_MAX, Math.max(TEXT_DEMO_WRAP_MIN, w + delta)));
  };

  const bumpOpacity = (delta: number) => {
    setStyleOpacityPercent((p) =>
      Math.min(STYLE_OPACITY_SLIDER_MAX, Math.max(STYLE_OPACITY_SLIDER_MIN, p + delta)),
    );
  };

  return (
    <CanvasProvider>
      {({ isReady, runtime }) =>
        isReady && runtime ? (
          <Canvas
            width={vw}
            height={vh}
            paragraphFontProvider={runtime.paragraphFontProvider}
            defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
          >
            <View
              id="smoke-root"
              style={{
                width: vw,
                height: vh,
                flexDirection: "row",
                backgroundColor: "#ffffff",
              }}
            >
              <View
                id="smoke-sidebar"
                style={{
                  width: SIDEBAR_W,
                  height: vh,
                  flexDirection: "row",
                  backgroundColor: "#ffffff",
                }}
              >
                <View
                  id="smoke-sidebar-inner"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: vh,
                    paddingTop: 16,
                    paddingBottom: 12,
                    paddingLeft: 12,
                    paddingRight: 12,
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <View id="smoke-sidebar-brand" style={{ paddingBottom: 12, marginBottom: 4 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: AD_TEXT,
                        lineHeight: 1.35,
                      }}
                    >
                      react-canvas
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: AD_TEXT_TERTIARY,
                        lineHeight: 1.35,
                      }}
                    >
                      {t`能力示例`}
                    </Text>
                  </View>
                  {smokeDemoList.map((item) => {
                    const active = demo === item.id;
                    return (
                      <View
                        key={item.id}
                        id={`nav-${item.id}`}
                        style={({ hovered }) => ({
                          paddingLeft: 10,
                          paddingRight: 10,
                          paddingTop: 8,
                          paddingBottom: 8,
                          borderRadius: 6,
                          backgroundColor: active
                            ? AD_NAV_BG_SELECTED
                            : hovered
                              ? AD_NAV_BG_HOVER
                              : "transparent",
                          cursor: "pointer",
                        })}
                        onClick={() => setDemo(item.id)}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: active ? AD_COLOR_PRIMARY : AD_TEXT,
                            lineHeight: 1.45,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View
                  id="smoke-sidebar-rail"
                  style={{ width: 1, height: vh, backgroundColor: AD_SPLIT }}
                />
              </View>

              <View
                id="smoke-main"
                style={{
                  width: innerW,
                  height: vh,
                  flexDirection: "column",
                  minWidth: 0,
                  backgroundColor: "#ffffff",
                }}
              >
                <View style={{ flexDirection: "column" }}>
                  <View
                    style={{
                      paddingLeft: 24,
                      paddingRight: 24,
                      paddingTop: 14,
                      paddingBottom: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: AD_TEXT_TERTIARY, lineHeight: 1.5 }}>
                      {t`react-canvas · 场景演示`}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {(
                        [
                          { code: "zh-cn" as const, label: t`中文` },
                          { code: "en" as const, label: t`English` },
                        ] as const
                      ).map(({ code, label }) => {
                        const active = i18nLocale === code;
                        return (
                          <View
                            key={code}
                            id={`smoke-locale-${code}`}
                            style={({ hovered }) => ({
                              paddingLeft: 10,
                              paddingRight: 10,
                              paddingTop: 5,
                              paddingBottom: 5,
                              borderRadius: 6,
                              backgroundColor: active
                                ? AD_NAV_BG_SELECTED
                                : hovered
                                  ? AD_NAV_BG_HOVER
                                  : "transparent",
                              cursor: "pointer",
                            })}
                            onClick={() => pickLocale(code)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: active ? AD_COLOR_PRIMARY : AD_TEXT_SECONDARY,
                                lineHeight: 1.45,
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  <View
                    id="smoke-main-header-rule"
                    style={{ width: innerW, height: 1, backgroundColor: AD_SPLIT }}
                  />
                  <View
                    id="smoke-doc-block"
                    style={{
                      paddingLeft: 24,
                      paddingRight: 24,
                      paddingTop: 20,
                      paddingBottom: 8,
                    }}
                  >
                    <Text
                      id="smoke-doc-title"
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        color: AD_TEXT,
                        lineHeight: 1.35,
                        width: Math.max(40, innerW - 48),
                      }}
                    >
                      {doc.title}
                    </Text>
                    <Text
                      id="smoke-doc-desc"
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        color: AD_TEXT_SECONDARY,
                        lineHeight: 1.6,
                        width: Math.max(40, innerW - 48),
                      }}
                    >
                      {doc.description}
                    </Text>
                    {demo === "style" ? (
                      <Text
                        id="smoke-doc-style-case"
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: AD_TEXT_TERTIARY,
                          lineHeight: 1.55,
                          width: Math.max(40, innerW - 48),
                        }}
                      >
                        {(() => {
                          const c = styleDemoCases.find((x) => x.id === styleCase);
                          return c ? t`当前子示例：${c.label}。${c.hint}` : "";
                        })()}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {demo === "style" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      paddingLeft: 24,
                      paddingRight: 24,
                      paddingTop: 4,
                      paddingBottom: 8,
                    }}
                  >
                    {styleDemoCases.map((c) => {
                      const tabActive = styleCase === c.id;
                      return (
                        <View
                          key={c.id}
                          id={`style-tab-${c.id}`}
                          style={({ hovered }) => ({
                            paddingLeft: 10,
                            paddingRight: 10,
                            paddingTop: 5,
                            paddingBottom: 5,
                            borderRadius: 6,
                            backgroundColor: tabActive
                              ? AD_NAV_BG_SELECTED
                              : hovered
                                ? AD_NAV_BG_HOVER
                                : "transparent",
                            cursor: "pointer",
                          })}
                          onClick={() => setStyleCase(c.id)}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: tabActive ? AD_COLOR_PRIMARY : AD_TEXT,
                              lineHeight: 1.4,
                            }}
                          >
                            {c.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {demo === "text" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 24,
                      paddingRight: 24,
                      paddingTop: 4,
                      paddingBottom: 8,
                    }}
                  >
                    <View
                      id="text-wrap-minus"
                      style={({ hovered }) => ({
                        width: 36,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: hovered ? AD_NAV_BG_HOVER : AD_SPLIT,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                      onClick={() => bumpTextWrap(-24)}
                    >
                      <Text style={{ fontSize: 14, color: AD_TEXT }}>−</Text>
                    </View>
                    <Text
                      style={{ fontSize: 12, color: AD_TEXT_TERTIARY }}
                    >{`${textWrapWidth}px`}</Text>
                    <View
                      id="text-wrap-plus"
                      style={({ hovered }) => ({
                        width: 36,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: hovered ? AD_NAV_BG_HOVER : AD_SPLIT,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                      onClick={() => bumpTextWrap(24)}
                    >
                      <Text style={{ fontSize: 14, color: AD_TEXT }}>+</Text>
                    </View>
                  </View>
                ) : null}

                {demo === "style" && styleCase === "opacity" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingLeft: 24,
                      paddingRight: 24,
                      paddingBottom: 8,
                    }}
                  >
                    <View
                      id="opacity-minus"
                      style={({ hovered }) => ({
                        width: 36,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: hovered ? AD_NAV_BG_HOVER : AD_SPLIT,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                      onClick={() => bumpOpacity(-5)}
                    >
                      <Text style={{ fontSize: 14, color: AD_TEXT }}>−</Text>
                    </View>
                    <Text
                      style={{ fontSize: 12, color: AD_TEXT_TERTIARY }}
                    >{`${styleOpacityPercent}%`}</Text>
                    <View
                      id="opacity-plus"
                      style={({ hovered }) => ({
                        width: 36,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: hovered ? AD_NAV_BG_HOVER : AD_SPLIT,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                      onClick={() => bumpOpacity(5)}
                    >
                      <Text style={{ fontSize: 14, color: AD_TEXT }}>+</Text>
                    </View>
                  </View>
                ) : null}

                <View
                  id="smoke-stage"
                  style={{
                    flex: 1,
                    minHeight: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <View
                    id="smoke-stage-inner"
                    style={{
                      width: dw,
                      height: dh,
                      position: "relative",
                    }}
                  >
                    {demo === "layout" ? (
                      <LayoutDemoScene W={dw} H={dh} />
                    ) : demo === "text" ? (
                      <TextDemoScene
                        W={dw}
                        H={dh}
                        wrapWidth={textWrapWidth}
                        defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
                        onBodyClick={onTextBodyClick}
                      />
                    ) : demo === "pointer" ? (
                      <>
                        <PointerDemoScene W={dw} H={dh} />
                        <PointerClickLog onHit={onPointerHit} />
                        <PointerClickLogB onHit={onPointerHit} />
                      </>
                    ) : demo === "through" ? (
                      <>
                        <ThroughDemoScene W={dw} H={dh} />
                        <ThroughClickLog onHit={onPointerHit} />
                      </>
                    ) : demo === "cursor" ? (
                      <CursorDemoScene W={dw} H={dh} />
                    ) : demo === "style" ? (
                      <StyleDemoScene
                        W={dw}
                        H={dh}
                        scene={styleCase}
                        opacityDemoPercent={styleOpacityPercent}
                      />
                    ) : demo === "modal" ? (
                      <ModalDemoInCanvas
                        W={dw}
                        H={dh}
                        viewportW={vw}
                        viewportH={vh}
                        onLog={onModalLog}
                      />
                    ) : demo === "border" ? (
                      <BorderDemoScene W={dw} H={dh} />
                    ) : (
                      <HoverDemoScene />
                    )}
                  </View>
                </View>

                {logLine ? (
                  <View id="smoke-log-wrap" style={{ flexDirection: "column" }}>
                    <View
                      id="smoke-log-rule"
                      style={{ width: innerW, height: 1, backgroundColor: AD_SPLIT }}
                    />
                    <View
                      id="smoke-log"
                      style={{
                        paddingLeft: 24,
                        paddingRight: 24,
                        paddingTop: 8,
                        paddingBottom: 16,
                        minHeight: 28,
                        justifyContent: "center",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: AD_TEXT, lineHeight: 1.5 }}>
                        {logLine}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </Canvas>
        ) : null
      }
    </CanvasProvider>
  );
}
