import type { PresentFrameInfo } from "@react-canvas/react-v2";
import { useCallback, useEffect, useRef, useState } from "react";

const WINDOW_MS = 1000;
const HUD_TICK_MS = 250;
/** 距上一次真正画到屏上小于该值，视为「正在重绘」 */
const RECENT_FLUSH_MS = 400;

/**
 * 统计约 1s 内画布重绘次数，并判断最近是否仍在连续重绘（用于右下角性能提示）。
 */
export function useSmokePresentHud(): {
  onPresentFrame: (info: PresentFrameInfo) => void;
  /** 约最近 1 秒内 Skia flush 次数（有布局提交才会画） */
  redrawsPerSec: number;
  /** 约 400ms 内有过一次成功落屏，视为「正在更新」 */
  isRedrawingNow: boolean;
} {
  const flushTimestampsRef = useRef<number[]>([]);
  const lastFlushPerfRef = useRef<number | null>(null);
  const [redrawsPerSec, setRedrawsPerSec] = useState(0);
  const [isRedrawingNow, setIsRedrawingNow] = useState(false);

  const onPresentFrame = useCallback((info: PresentFrameInfo) => {
    const now = performance.now();
    if (info.didFlush) {
      lastFlushPerfRef.current = now;
      flushTimestampsRef.current.push(now);
    }
    const cutoff = now - WINDOW_MS;
    flushTimestampsRef.current = flushTimestampsRef.current.filter((t) => t >= cutoff);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const cutoff = now - WINDOW_MS;
      flushTimestampsRef.current = flushTimestampsRef.current.filter((t) => t >= cutoff);
      const count = flushTimestampsRef.current.length;
      const last = lastFlushPerfRef.current;
      const recent = last != null && now - last < RECENT_FLUSH_MS;

      setRedrawsPerSec((p) => (p === count ? p : count));
      setIsRedrawingNow((p) => (p === recent ? p : recent));
    }, HUD_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return { onPresentFrame, redrawsPerSec, isRedrawingNow };
}
