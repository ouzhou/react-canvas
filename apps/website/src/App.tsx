import { useEffect, useRef } from "react";
import { render, View } from "@react-canvas/react";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { unmount } = render(
      <View style={{ backgroundColor: "#4a90d9" }} />,
      canvas,
    );

    return unmount;
  }, []);

  return (
    <main className="demo">
      <h1>React Canvas</h1>
      <p className="lede">Minimal custom renderer — one host View.</p>
      <canvas ref={canvasRef} className="stage" />
    </main>
  );
}
