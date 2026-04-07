/**
 * Map DOM `clientX/Y` to canvas **logical** coordinates (same space as `ViewNode.layout`).
 */
export function clientToCanvasLogical(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  return {
    x: ((clientX - rect.left) * logicalWidth) / rw,
    y: ((clientY - rect.top) * logicalHeight) / rh,
  };
}

/**
 * Inverse of {@link clientToCanvasLogical}: logical canvas coords → client CSS pixels.
 */
export function logicalToCanvasClient(
  logicalX: number,
  logicalY: number,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  return {
    x: rect.left + (logicalX * rw) / logicalWidth,
    y: rect.top + (logicalY * rh) / logicalHeight,
  };
}
