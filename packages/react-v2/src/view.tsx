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

  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("View must be rendered under CanvasRuntime");
    }
    const parsed: ViewStyle = JSON.parse(styleJson) as ViewStyle;
    rt.insertView(parentId, nodeId, parsed);
    return () => {
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
