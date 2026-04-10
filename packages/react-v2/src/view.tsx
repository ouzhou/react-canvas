import type { ScenePointerEvent, ViewStyle } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useContext, useId, useLayoutEffect, useMemo } from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";

export type ViewProps = {
  id?: string;
  style?: ViewStyle;
  children?: ReactNode;
  onPointerDown?: (e: ScenePointerEvent) => void;
  onPointerUp?: (e: ScenePointerEvent) => void;
  onClick?: (e: ScenePointerEvent) => void;
};

export function View(props: ViewProps): ReactNode {
  const { style, children, onPointerDown, onPointerUp, onClick, id: idProp } = props;
  const rt = useSceneRuntime();
  const parentId = useContext(ParentSceneIdContext);
  const generated = useId().replace(/:/g, "");
  const nodeId = idProp ?? `view-${generated}`;
  const styleJson = useMemo(() => JSON.stringify(style ?? {}), [style]);

  // React 对 useLayoutEffect 的遍历顺序可能让子组件先于父组件执行；
  // 父 View 尚未 insertView 时，用 queueMicrotask 等到父节点出现在 store 中再挂载。
  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("View must be rendered under CanvasRuntime");
    }
    const parsed: ViewStyle = JSON.parse(styleJson) as ViewStyle;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10_000;

    const scheduleInsert = () => {
      if (cancelled) return;
      if (!rt.hasSceneNode(parentId)) {
        attempts += 1;
        if (attempts > maxAttempts) {
          throw new Error(
            `View: parent scene node "${parentId}" never appeared (max ${maxAttempts} retries)`,
          );
        }
        queueMicrotask(scheduleInsert);
        return;
      }
      rt.insertView(parentId, nodeId, parsed);
    };

    scheduleInsert();

    return () => {
      cancelled = true;
      rt.removeView(nodeId);
    };
  }, [rt, parentId, nodeId, styleJson]);

  useLayoutEffect(() => {
    const offs: Array<() => void> = [];
    if (onPointerDown) {
      offs.push(rt.addListener(nodeId, "pointerdown", onPointerDown, { label: "onPointerDown" }));
    }
    if (onPointerUp) {
      offs.push(rt.addListener(nodeId, "pointerup", onPointerUp, { label: "onPointerUp" }));
    }
    if (onClick) {
      offs.push(rt.addListener(nodeId, "click", onClick, { label: "onClick" }));
    }
    return () => {
      for (const o of offs) o();
    };
  }, [rt, nodeId, onPointerDown, onPointerUp, onClick]);

  return <ParentSceneIdContext.Provider value={nodeId}>{children}</ParentSceneIdContext.Provider>;
}
