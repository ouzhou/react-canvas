import { ScrollView, SvgPath, Text, View } from "@react-canvas/react-v2";
import type { ViewStyle } from "@react-canvas/core-v2";
import { Fragment, type ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";

import {
  AD_TEXT,
  AD_TEXT_SECONDARY,
  AD_TEXT_TERTIARY,
  DEMO_PAGE_BG,
  DEMO_PAGE_MARGIN_TOP,
  DEMO_PAGE_PADDING_X,
  demoPageContentWidth,
} from "../constants.ts";
import { useLayoutScrollY } from "../hooks/use-layout-scroll-y.ts";

const TRI_D = "M 0 100 L 50 0 L 100 100 Z";
const TRI_VIEWBOX = "0 0 100 100";

/** 与 {@link ScrollView} 的 `id` 一致，供 {@link useLayoutScrollY} 读取快照 */
export const SCROLL_DEMO_SCROLL_ID = "scroll-demo-sv";

const TRI_BOX = 72;
const TRI_ROW_TOP = 260;
/** 行与行之间「上一行顶」到「下一行顶」的间距（含三角形占位，空隙较大便于扫视） */
const ROW_STRIDE = 460;
const TRI_ROWS = 5;
/**
 * 每一排相对上一排「延后」多少 scrollY 才进入同一套动画相位。
 * 若四列都用全局 scrollY，每排数值相同，看起来后面几排「没有变化」。
 */
const ROW_ANIM_STAGGER = 220;
const CONTENT_MIN_H = TRI_ROW_TOP + (TRI_ROWS - 1) * ROW_STRIDE + TRI_BOX + 520;

function stylesForScrollRow(
  scrollY: number,
  row: number,
): {
  rotate: ViewStyle;
  grow: ViewStyle;
  shrink: ViewStyle;
  hide: ViewStyle;
} {
  const rowY = Math.max(0, scrollY - row * ROW_ANIM_STAGGER);
  const rotateDeg = Math.min(540, rowY * 0.65);
  const scaleUp = Math.min(1.9, 1 + rowY / 260);
  const scaleDown = Math.max(0.22, 1 - rowY / 380);
  const fadeOut = Math.max(0, 1 - rowY / 420);
  return {
    rotate: {
      transform: [{ rotate: `${rotateDeg.toFixed(2)}deg` }],
    },
    grow: {
      transform: [{ scale: scaleUp }],
    },
    shrink: {
      transform: [{ scale: scaleDown }],
    },
    hide: {
      opacity: fadeOut,
    },
  };
}

export function ScrollDemoScene(props: {
  W: number;
  H: number;
  scrollResetKey?: string | number;
}): ReactNode {
  const { W, H, scrollResetKey } = props;
  const { t } = useLingui();
  const innerW = demoPageContentWidth(W);
  const scrollY = useLayoutScrollY(SCROLL_DEMO_SCROLL_ID);

  const colLeft = (i: number) => DEMO_PAGE_PADDING_X + (i * (W - 2 * DEMO_PAGE_PADDING_X)) / 4;

  return (
    <View
      id="scroll-demo-root"
      style={{
        width: W,
        height: H,
        backgroundColor: DEMO_PAGE_BG,
      }}
    >
      <ScrollView
        id={SCROLL_DEMO_SCROLL_ID}
        scrollResetKey={scrollResetKey}
        style={{
          width: W,
          height: H,
        }}
      >
        <View
          id="scroll-demo-inner"
          style={{
            width: W,
            minHeight: CONTENT_MIN_H,
            position: "relative",
            paddingBottom: 48,
          }}
        >
          <View
            style={{
              paddingLeft: DEMO_PAGE_PADDING_X,
              paddingRight: DEMO_PAGE_PADDING_X,
              paddingTop: DEMO_PAGE_MARGIN_TOP + DEMO_PAGE_PADDING_X,
              paddingBottom: 10,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: 600, color: AD_TEXT, lineHeight: 1.4 }}>
              {t`滚动与快照`}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 13,
                color: AD_TEXT_SECONDARY,
                lineHeight: 1.55,
                width: innerW,
              }}
            >
              {t`core-v2 未提供 onScroll；滚动时更新 scrollY 并 emitLayoutCommit。此处用 subscribeAfterLayout + getLayoutSnapshot()[scrollId].scrollY 驱动下方多排三角形（旋转 / 放大 / 缩小 / 淡出）。每排对 scrollY 做阶梯偏移（row × stagger），避免各排同相、看起来「后面不动」。`}
            </Text>
            <Text
              style={{
                marginTop: 10,
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                color: AD_TEXT_TERTIARY,
                lineHeight: 1.45,
              }}
            >
              {t`scrollY = ${scrollY}px`}
            </Text>
          </View>

          {Array.from({ length: TRI_ROWS }, (_, row) => {
            const rowTop = TRI_ROW_TOP + row * ROW_STRIDE;
            const styles = stylesForScrollRow(scrollY, row);
            const labs = [
              { key: `lab-rotate-${row}`, label: t`旋转`, col: 0 },
              { key: `lab-grow-${row}`, label: t`放大`, col: 1 },
              { key: `lab-shrink-${row}`, label: t`缩小`, col: 2 },
              { key: `lab-fade-${row}`, label: t`淡出`, col: 3 },
            ] as const;
            return (
              <Fragment key={`tri-row-${row}`}>
                {labs.map((lab) => (
                  <Text
                    key={lab.key}
                    style={{
                      position: "absolute",
                      left: colLeft(lab.col),
                      top: rowTop - 22,
                      fontSize: 11,
                      color: AD_TEXT_TERTIARY,
                      lineHeight: 1.3,
                    }}
                  >
                    {lab.label}
                  </Text>
                ))}

                <View
                  id={`scroll-fx-tri-rotate-r${row}`}
                  style={{
                    position: "absolute",
                    left: colLeft(0),
                    top: rowTop,
                    width: TRI_BOX,
                    height: TRI_BOX,
                    ...styles.rotate,
                  }}
                >
                  <SvgPath
                    d={TRI_D}
                    viewBox={TRI_VIEWBOX}
                    fill="#ef4444"
                    style={{ width: TRI_BOX, height: TRI_BOX }}
                  />
                </View>

                <View
                  id={`scroll-fx-tri-grow-r${row}`}
                  style={{
                    position: "absolute",
                    left: colLeft(1),
                    top: rowTop,
                    width: TRI_BOX,
                    height: TRI_BOX,
                    ...styles.grow,
                  }}
                >
                  <SvgPath
                    d={TRI_D}
                    viewBox={TRI_VIEWBOX}
                    fill="#22c55e"
                    style={{ width: TRI_BOX, height: TRI_BOX }}
                  />
                </View>

                <View
                  id={`scroll-fx-tri-shrink-r${row}`}
                  style={{
                    position: "absolute",
                    left: colLeft(2),
                    top: rowTop,
                    width: TRI_BOX,
                    height: TRI_BOX,
                    ...styles.shrink,
                  }}
                >
                  <SvgPath
                    d={TRI_D}
                    viewBox={TRI_VIEWBOX}
                    fill="#3b82f6"
                    style={{ width: TRI_BOX, height: TRI_BOX }}
                  />
                </View>

                <View
                  id={`scroll-fx-tri-fade-r${row}`}
                  style={{
                    position: "absolute",
                    left: colLeft(3),
                    top: rowTop,
                    width: TRI_BOX,
                    height: TRI_BOX,
                    ...styles.hide,
                  }}
                >
                  <SvgPath
                    d={TRI_D}
                    viewBox={TRI_VIEWBOX}
                    fill="#a855f7"
                    style={{ width: TRI_BOX, height: TRI_BOX }}
                  />
                </View>
              </Fragment>
            );
          })}

          <View
            style={{
              position: "absolute",
              left: DEMO_PAGE_PADDING_X,
              top: CONTENT_MIN_H - 100,
              width: Math.max(40, innerW),
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#e2e8f0",
            }}
          >
            <Text style={{ fontSize: 12, color: AD_TEXT_SECONDARY, lineHeight: 1.5 }}>
              {t`继续滚动以观察上方多排三角形的 transform / opacity 变化。`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
