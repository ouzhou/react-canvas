import { ScrollView, Text, View, useSceneRuntime } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DEMO_PAGE_BG,
  DEMO_PAGE_MARGIN_TOP,
  DEMO_PAGE_PADDING_X,
  demoPageContentWidth,
} from "../constants.ts";
import { Popover } from "../components/popover.tsx";
import type { PopoverPlacement, PopoverTriggerRect } from "../lib/compute-popover-position.ts";

type PopoverDemoSceneProps = {
  W: number;
  H: number;
  viewportW: number;
  viewportH: number;
  onLog: (msg: string) => void;
};

const TRIGGER_W = 92;
const TRIGGER_H = 36;
const SCROLL_ID = "popover-demo-scroll";
const PLACEMENTS: PopoverPlacement[] = ["top", "bottom", "left", "right"];
const TRIGGER_IDS: Record<PopoverPlacement, string> = {
  top: "popover-trigger-top",
  bottom: "popover-trigger-bottom",
  left: "popover-trigger-left",
  right: "popover-trigger-right",
};

export function PopoverDemoScene(props: PopoverDemoSceneProps): ReactNode {
  const { t } = useLingui();
  const { W, H, viewportW, viewportH, onLog } = props;
  const rt = useSceneRuntime();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement>("top");
  const [triggerRect, setTriggerRect] = useState<PopoverTriggerRect | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<PopoverPlacement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const prevSampledScrollYRef = useRef(scrollY);
  const wasOpenRef = useRef(open);

  const frame = useMemo(() => {
    const pad = DEMO_PAGE_PADDING_X;
    const left = pad;
    const top = DEMO_PAGE_MARGIN_TOP + pad + 18;
    const width = Math.max(240, demoPageContentWidth(W));
    const height = Math.max(180, H - 82);
    return { left, top, width, height };
  }, [W, H]);

  const triggerLocalRect = useMemo(() => {
    const centerX = Math.max(0, Math.round((frame.width - TRIGGER_W) / 2));
    const centerY = 260;
    const sideOffsetX = 120;
    const sideOffsetY = 56;
    return {
      top: { left: centerX, top: centerY, width: TRIGGER_W, height: TRIGGER_H },
      bottom: {
        left: centerX,
        top: centerY + sideOffsetY * 2,
        width: TRIGGER_W,
        height: TRIGGER_H,
      },
      left: {
        left: Math.max(0, centerX - sideOffsetX),
        top: centerY + sideOffsetY,
        width: TRIGGER_W,
        height: TRIGGER_H,
      },
      right: {
        left: Math.min(frame.width - TRIGGER_W, centerX + sideOffsetX),
        top: centerY + sideOffsetY,
        width: TRIGGER_W,
        height: TRIGGER_H,
      },
    } satisfies Record<PopoverPlacement, PopoverTriggerRect>;
  }, [frame.width]);

  const readCurrentScrollY = () => {
    const snapshot = rt.getLayoutSnapshot();
    const raw = snapshot[SCROLL_ID]?.scrollY;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  };

  const readTriggerRectFromSnapshot = (p: PopoverPlacement): PopoverTriggerRect | null => {
    const snapshot = rt.getLayoutSnapshot();
    const node = snapshot[TRIGGER_IDS[p]];
    if (!node) return null;
    const { absLeft, absTop, width, height } = node;
    if (
      typeof absLeft !== "number" ||
      !Number.isFinite(absLeft) ||
      typeof absTop !== "number" ||
      !Number.isFinite(absTop) ||
      typeof width !== "number" ||
      !Number.isFinite(width) ||
      typeof height !== "number" ||
      !Number.isFinite(height)
    ) {
      return null;
    }
    return { left: absLeft, top: absTop, width, height };
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      const nextScrollY = readCurrentScrollY();
      setScrollY((prev) => (Math.abs(prev - nextScrollY) >= 0.5 ? nextScrollY : prev));
    }, 120);
    return () => window.clearInterval(timer);
  }, [rt, open]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const baseline = readCurrentScrollY();
      prevSampledScrollYRef.current = baseline;
      setScrollY((prev) => (Math.abs(prev - baseline) >= 0.5 ? baseline : prev));
    }
    wasOpenRef.current = open;
  }, [open, rt]);

  useEffect(() => {
    const prev = prevSampledScrollYRef.current;
    const changed = Math.abs(scrollY - prev) >= 0.5;
    if (changed && open) {
      setOpen(false);
      setActiveTrigger(null);
      onLog(t`滚动关闭：检测到 ScrollView 发生滚动，已关闭 Popover。`);
    }
    prevSampledScrollYRef.current = scrollY;
  }, [scrollY, open, onLog]);

  const onTriggerClick = (p: PopoverPlacement) => {
    if (open && activeTrigger === p) {
      setOpen(false);
      setActiveTrigger(null);
      onLog(t`点击关闭：再次点击同一 trigger（${p}）关闭 Popover。`);
      return;
    }
    const latestScrollY = readCurrentScrollY();
    setScrollY(latestScrollY);
    prevSampledScrollYRef.current = latestScrollY;
    const nextRect = readTriggerRectFromSnapshot(p);
    if (!nextRect) {
      onLog(t`定位失败：无法从 layout snapshot 读取 trigger=${p} 的绝对坐标，已取消打开。`);
      return;
    }
    setPlacement(p);
    setTriggerRect(nextRect);
    if (open && activeTrigger && activeTrigger !== p) {
      onLog(t`切换打开：trigger ${activeTrigger} -> ${p}，已更新 placement 与 triggerRect。`);
    } else {
      onLog(t`点击打开：trigger=${p}，Popover 已打开。`);
    }
    setActiveTrigger(p);
    setOpen(true);
  };

  return (
    <View style={{ width: W, height: H, backgroundColor: DEMO_PAGE_BG, position: "relative" }}>
      <Text
        style={{
          position: "absolute",
          left: DEMO_PAGE_PADDING_X,
          top: DEMO_PAGE_MARGIN_TOP,
          fontSize: 14,
          color: "#334155",
        }}
      >
        {t`Popover Demo（滚动时自动关闭）`}
      </Text>
      <ScrollView
        id={SCROLL_ID}
        style={{
          position: "absolute",
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 10,
          backgroundColor: "#ffffff",
        }}
      >
        <View style={{ width: frame.width, minHeight: 920, position: "relative" }}>
          <Text
            style={{
              padding: DEMO_PAGE_PADDING_X,
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            {t`向下滚动后 Popover 将自动关闭并打印日志。中部四个 trigger 分别对应 top / bottom / left / right。`}
          </Text>
          {PLACEMENTS.map((p) => {
            const rect = triggerLocalRect[p];
            const active = activeTrigger === p && open;
            return (
              <View
                key={p}
                id={TRIGGER_IDS[p]}
                style={({ hovered }) => ({
                  position: "absolute",
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  borderRadius: 8,
                  backgroundColor: active ? "#1677ff" : hovered ? "#dbeafe" : "#eff6ff",
                  borderWidth: 1,
                  borderColor: active ? "#1677ff" : "#93c5fd",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                })}
                onClick={() => onTriggerClick(p)}
              >
                <Text
                  style={{ fontSize: 12, color: active ? "#ffffff" : "#1e3a8a", lineHeight: 1.2 }}
                >
                  {p}
                </Text>
              </View>
            );
          })}
          <View
            style={{
              position: "absolute",
              left: DEMO_PAGE_PADDING_X,
              top: 560,
              width: Math.max(40, frame.width - 2 * DEMO_PAGE_PADDING_X),
              height: 320,
              borderRadius: 8,
              backgroundColor: "#f1f5f9",
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              {t`继续滚动此区域可触发“滚动关闭”。这是用于验证策略 A 的可滚动内容区。`}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open) {
            setOpen(false);
            setActiveTrigger(null);
            onLog(t`外部关闭：Popover 由 onRequestClose 触发关闭（点击外部/遮罩）。`);
            return;
          }
          setOpen(nextOpen);
        }}
        triggerRect={triggerRect}
        placement={placement}
        viewportW={viewportW}
        viewportH={viewportH}
        panelW={220}
        panelH={108}
        content={
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              {t`Popover placement: ${placement}`}
            </Text>
            <Text style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
              {t`点击同一 trigger 会关闭；切换 trigger 会更新定位并复用同一个 Popover 实例。`}
            </Text>
          </View>
        }
      />
    </View>
  );
}
