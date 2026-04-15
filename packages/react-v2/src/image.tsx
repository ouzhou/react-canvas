import type { ImageObjectFit, ScenePointerEvent, ViewStyle } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";

export type ImageProps = {
  id?: string;
  name?: string;
  uri: string;
  objectFit?: ImageObjectFit;
  style?: ViewStyle | ((state: { hovered: boolean }) => ViewStyle);
  onLoad?: () => void;
  onError?: (err: unknown) => void;
  onPointerDown?: (e: ScenePointerEvent) => void;
  onPointerUp?: (e: ScenePointerEvent) => void;
  onClick?: (e: ScenePointerEvent) => void;
};

export function Image(props: ImageProps): ReactNode {
  const {
    uri,
    objectFit,
    style,
    onLoad,
    onError,
    onPointerDown,
    onPointerUp,
    onClick,
    id: idProp,
    name,
  } = props;
  const rt = useSceneRuntime();
  const parentId = useContext(ParentSceneIdContext);
  const generated = useId().replace(/:/g, "");
  const nodeId = idProp ?? `image-${generated}`;
  const [hovered, setHovered] = useState(false);
  const isFunctionStyle = typeof style === "function";
  const styleSnapshotKey = useMemo(() => {
    if (style === undefined) return "{}";
    if (typeof style === "function") return JSON.stringify(style({ hovered }));
    return JSON.stringify(style ?? {});
  }, [style, hovered]);
  const parsedStyle = useMemo(() => JSON.parse(styleSnapshotKey) as ViewStyle, [styleSnapshotKey]);
  const styleRef = useRef(parsedStyle);
  styleRef.current = parsedStyle;

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("Image must be rendered under Canvas");
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
            `Image: parent scene node "${parentId}" never appeared (max ${maxAttempts} retries)`,
          );
        }
        queueMicrotask(scheduleInsert);
        return;
      }
      rt.insertImage(
        parentId,
        nodeId,
        {
          uri,
          objectFit,
          style: styleRef.current,
          onLoad: () => onLoadRef.current?.(),
          onError: (e) => onErrorRef.current?.(e),
        },
        name,
      );
    };

    scheduleInsert();

    return () => {
      cancelled = true;
      rt.removeView(nodeId);
    };
  }, [rt, parentId, nodeId, uri, objectFit]);

  useLayoutEffect(() => {
    rt.updateStyle(nodeId, parsedStyle);
  }, [rt, nodeId, parsedStyle]);

  useLayoutEffect(() => {
    if (!isFunctionStyle) return;
    const offEnter = rt.addListener(nodeId, "pointerenter", () => setHovered(true), {
      label: "image-style:hover-enter",
    });
    const offLeave = rt.addListener(nodeId, "pointerleave", () => setHovered(false), {
      label: "image-style:hover-leave",
    });
    return () => {
      offEnter();
      offLeave();
    };
  }, [rt, nodeId, isFunctionStyle]);

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

  return null;
}
