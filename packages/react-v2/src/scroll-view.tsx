import type { ViewStyle } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";

export type ScrollViewProps = {
  id?: string;
  style?: ViewStyle | ((state: { hovered: boolean }) => ViewStyle);
  children?: ReactNode;
};

/**
 * 纵向滚动容器：场景节点 `kind: "scrollView"`，子节点挂在 **内容** 根上（单槽）。
 * 默认视口 `overflow: "hidden"`（与 core-v2 ScrollView 规格一致）。
 */
export function ScrollView(props: ScrollViewProps): ReactNode {
  const { style, children, id: idProp } = props;
  const rt = useSceneRuntime();
  const parentId = useContext(ParentSceneIdContext);
  const generated = useId().replace(/:/g, "");
  const scrollId = idProp ?? `scroll-${generated}`;
  const contentId = `${scrollId}-content`;
  const [hovered, setHovered] = useState(false);
  const isFunctionStyle = typeof style === "function";

  const styleSnapshotKey = useMemo(() => {
    if (style === undefined) return "{}";
    if (typeof style === "function") return JSON.stringify(style({ hovered }));
    return JSON.stringify(style ?? {});
  }, [style, hovered]);

  const parsedStyle = useMemo(() => JSON.parse(styleSnapshotKey) as ViewStyle, [styleSnapshotKey]);
  const styleRef = useRef<ViewStyle>(parsedStyle);
  styleRef.current = parsedStyle;

  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("ScrollView must be rendered under Canvas");
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10_000;

    const scheduleInsert = () => {
      if (cancelled) return;
      if (!rt.hasSceneNode(parentId)) {
        attempts += 1;
        if (attempts > maxAttempts) {
          throw new Error(
            `ScrollView: parent scene node "${parentId}" never appeared (max ${maxAttempts} retries)`,
          );
        }
        queueMicrotask(scheduleInsert);
        return;
      }
      rt.insertScrollView(parentId, scrollId, styleRef.current);
      rt.insertView(scrollId, contentId, {
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
      });
    };

    scheduleInsert();

    return () => {
      cancelled = true;
      rt.removeView(scrollId);
    };
  }, [rt, parentId, scrollId, contentId]);

  useLayoutEffect(() => {
    rt.updateStyle(scrollId, { overflow: "hidden", ...parsedStyle });
  }, [rt, scrollId, parsedStyle]);

  useLayoutEffect(() => {
    if (!isFunctionStyle) return;
    const offEnter = rt.addListener(scrollId, "pointerenter", () => setHovered(true), {
      label: "scroll-view:hover-enter",
    });
    const offLeave = rt.addListener(scrollId, "pointerleave", () => setHovered(false), {
      label: "scroll-view:hover-leave",
    });
    return () => {
      offEnter();
      offLeave();
    };
  }, [rt, scrollId, isFunctionStyle]);

  return (
    <ParentSceneIdContext.Provider value={contentId}>{children}</ParentSceneIdContext.Provider>
  );
}
