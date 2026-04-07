import { useCallback, useEffect, useState } from "react";

/**
 * 监听 `keydown` / `keyup`（冒泡阶段），维护当前按下的 `event.code` 集合。
 * @param target 默认 `window`；可传 `document` 或 `null`（不监听）。
 */
export function useKeyboardMonitor(
  target: EventTarget | null = typeof globalThis !== "undefined" && typeof window !== "undefined"
    ? window
    : null,
): {
  pressedKeys: ReadonlySet<string>;
  isKeyDown: (code: string) => boolean;
} {
  const [pressedKeys, setPressedKeys] = useState(() => new Set<string>());

  const isKeyDown = useCallback(
    (code: string) => {
      return pressedKeys.has(code);
    },
    [pressedKeys],
  );

  useEffect(() => {
    if (target == null) return;

    const onKeyDown: EventListener = (ev) => {
      const ke = ev as KeyboardEvent;
      setPressedKeys((prev) => {
        if (prev.has(ke.code)) return prev;
        const next = new Set(prev);
        next.add(ke.code);
        return next;
      });
    };

    const onKeyUp: EventListener = (ev) => {
      const ke = ev as KeyboardEvent;
      setPressedKeys((prev) => {
        if (!prev.has(ke.code)) return prev;
        const next = new Set(prev);
        next.delete(ke.code);
        return next;
      });
    };

    const onBlur = () => {
      setPressedKeys(new Set());
    };

    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [target]);

  return { pressedKeys, isKeyDown };
}
