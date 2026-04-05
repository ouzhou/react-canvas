/**
 * Compute source (image pixel space) and destination (layout box space) rectangles
 * for Skia `drawImageRect`, aligned with common React Native `resizeMode` behavior.
 */

export type ResizeMode = "cover" | "contain" | "stretch" | "center";

export type ImageRect = { left: number; top: number; width: number; height: number };

function clampPositive(n: number): number {
  return n > 0 && Number.isFinite(n) ? n : 0;
}

/**
 * @param imageWidth / imageHeight — intrinsic pixel size of the bitmap
 * @param boxWidth / boxHeight — Yoga layout content size of the Image node
 */
export function computeImageSrcDestRects(
  mode: ResizeMode,
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
): { src: ImageRect; dst: ImageRect } {
  const iw = clampPositive(imageWidth);
  const ih = clampPositive(imageHeight);
  const boxW = clampPositive(boxWidth);
  const boxH = clampPositive(boxHeight);

  const empty: ImageRect = { left: 0, top: 0, width: 0, height: 0 };
  if (iw === 0 || ih === 0 || boxW === 0 || boxH === 0) {
    return { src: empty, dst: empty };
  }

  const fullSrc: ImageRect = { left: 0, top: 0, width: iw, height: ih };

  if (mode === "stretch") {
    return {
      src: fullSrc,
      dst: { left: 0, top: 0, width: boxW, height: boxH },
    };
  }

  if (mode === "contain") {
    const s = Math.min(boxW / iw, boxH / ih);
    const dw = iw * s;
    const dh = ih * s;
    return {
      src: fullSrc,
      dst: {
        left: (boxW - dw) / 2,
        top: (boxH - dh) / 2,
        width: dw,
        height: dh,
      },
    };
  }

  if (mode === "cover") {
    const s = Math.max(boxW / iw, boxH / ih);
    const cropW = boxW / s;
    const cropH = boxH / s;
    const srcLeft = (iw - cropW) / 2;
    const srcTop = (ih - cropH) / 2;
    return {
      src: {
        left: srcLeft,
        top: srcTop,
        width: cropW,
        height: cropH,
      },
      dst: { left: 0, top: 0, width: boxW, height: boxH },
    };
  }

  // center: no upscale; if larger than box, scale down uniformly (same as contain)
  if (iw <= boxW && ih <= boxH) {
    return {
      src: fullSrc,
      dst: {
        left: (boxW - iw) / 2,
        top: (boxH - ih) / 2,
        width: iw,
        height: ih,
      },
    };
  }

  const s = Math.min(boxW / iw, boxH / ih);
  const dw = iw * s;
  const dh = ih * s;
  return {
    src: fullSrc,
    dst: {
      left: (boxW - dw) / 2,
      top: (boxH - dh) / 2,
      width: dw,
      height: dh,
    },
  };
}
