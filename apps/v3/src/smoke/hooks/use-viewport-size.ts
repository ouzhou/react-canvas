import { useEffect, useState } from "react";

export function useViewportSize(): { vw: number; vh: number } {
  const [s, setS] = useState(() => ({
    vw: typeof window !== "undefined" ? window.innerWidth : 1024,
    vh: typeof window !== "undefined" ? window.innerHeight : 640,
  }));
  useEffect(() => {
    const on = () => setS({ vw: window.innerWidth, vh: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}
