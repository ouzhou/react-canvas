export type ImageObjectFit = "contain" | "cover" | "fill";

export type Rect = { x: number; y: number; width: number; height: number };

export type ComputeImageDestSrcRectsArgs = {
  objectFit: ImageObjectFit;
  destW: number;
  destH: number;
  imageW: number;
  imageH: number;
};

export type DestSrcRects = { dest: Rect; src: Rect };

/**
 * 在「目标像素矩形 (0,0)-(destW,destH)」内放置图像。
 * 返回的 `dest` 为局部坐标下的绘制矩形；`src` 为图像像素空间中的采样矩形。
 */
export function computeImageDestSrcRects(args: ComputeImageDestSrcRectsArgs): DestSrcRects {
  const { objectFit, destW, destH, imageW, imageH } = args;
  if (
    !Number.isFinite(destW) ||
    !Number.isFinite(destH) ||
    !Number.isFinite(imageW) ||
    !Number.isFinite(imageH) ||
    destW <= 0 ||
    destH <= 0 ||
    imageW <= 0 ||
    imageH <= 0
  ) {
    return {
      dest: { x: 0, y: 0, width: Math.max(0, destW), height: Math.max(0, destH) },
      src: { x: 0, y: 0, width: Math.max(0, imageW), height: Math.max(0, imageH) },
    };
  }

  const fullDest: Rect = { x: 0, y: 0, width: destW, height: destH };
  const fullSrc: Rect = { x: 0, y: 0, width: imageW, height: imageH };

  if (objectFit === "fill") {
    return { dest: fullDest, src: fullSrc };
  }

  const scaleContain = Math.min(destW / imageW, destH / imageH);
  const scaleCover = Math.max(destW / imageW, destH / imageH);
  const scale = objectFit === "contain" ? scaleContain : scaleCover;

  const scaledW = imageW * scale;
  const scaledH = imageH * scale;
  const dx = (destW - scaledW) / 2;
  const dy = (destH - scaledH) / 2;

  if (objectFit === "contain") {
    return {
      dest: { x: dx, y: dy, width: scaledW, height: scaledH },
      src: fullSrc,
    };
  }

  const cropW = destW / scale;
  const cropH = destH / scale;
  const sx = (imageW - cropW) / 2;
  const sy = (imageH - cropH) / 2;
  return {
    dest: fullDest,
    src: { x: sx, y: sy, width: cropW, height: cropH },
  };
}
