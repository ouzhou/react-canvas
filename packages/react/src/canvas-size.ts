export function syncCanvasBackingStore(canvas: HTMLCanvasElement): void {
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 150;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
