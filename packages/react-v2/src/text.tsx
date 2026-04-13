import type { ScenePointerEvent, TextFlatRun, ViewStyle } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import {
  Children,
  Fragment,
  isValidElement,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";
import { View } from "./view.tsx";

/** 与 {@link View} 内 `TEXT_COMPONENT_DISPLAY_NAME` 保持一致。 */
const TEXT_DISPLAY = "RcCanvasText";

export type TextProps = {
  id?: string;
  style?: ViewStyle | ((state: { hovered: boolean }) => ViewStyle);
  children?: ReactNode;
  onPointerDown?: (e: ScenePointerEvent) => void;
  onPointerUp?: (e: ScenePointerEvent) => void;
  onClick?: (e: ScenePointerEvent) => void;
};

function mergeInheritedTextStyle(base: ViewStyle, override: ViewStyle): ViewStyle {
  let o: ViewStyle = { ...base };
  if (override.color !== undefined) o = { ...o, color: override.color };
  if (override.fontSize !== undefined) o = { ...o, fontSize: override.fontSize };
  if (override.fontFamily !== undefined) o = { ...o, fontFamily: override.fontFamily };
  if (override.fontWeight !== undefined) o = { ...o, fontWeight: override.fontWeight };
  if (override.lineHeight !== undefined) o = { ...o, lineHeight: override.lineHeight };
  return o;
}

function nestedTextResolvedStyle(props: TextProps): ViewStyle {
  if (typeof props.style === "function") {
    throw new Error("Text: 嵌套子 Text 暂不支持函数式 style");
  }
  return (props.style ?? {}) as ViewStyle;
}

function pickRunFields(from: ViewStyle): Partial<TextFlatRun> {
  const r: Partial<TextFlatRun> = {};
  if (from.color !== undefined) r.color = from.color;
  if (from.fontSize !== undefined) r.fontSize = from.fontSize;
  if (from.fontFamily !== undefined) r.fontFamily = from.fontFamily;
  if (from.fontFamilies !== undefined) r.fontFamilies = from.fontFamilies;
  if (from.fontWeight !== undefined) r.fontWeight = from.fontWeight;
  if (from.lineHeight !== undefined) r.lineHeight = from.lineHeight;
  if (from.textDecorationLine !== undefined) r.textDecorationLine = from.textDecorationLine;
  if (from.textDecorationStyle !== undefined) r.textDecorationStyle = from.textDecorationStyle;
  if (from.textDecorationThickness !== undefined) {
    r.textDecorationThickness = from.textDecorationThickness;
  }
  if (from.textDecorationColor !== undefined) r.textDecorationColor = from.textDecorationColor;
  if (from.letterSpacing !== undefined) r.letterSpacing = from.letterSpacing;
  if (from.wordSpacing !== undefined) r.wordSpacing = from.wordSpacing;
  if (from.fontStyle !== undefined) r.fontStyle = from.fontStyle;
  return r;
}

function collectTextRuns(children: ReactNode, inherited: ViewStyle): TextFlatRun[] {
  const out: TextFlatRun[] = [];
  let textBuf = "";

  const flushBuf = (): void => {
    if (textBuf.length === 0) return;
    out.push({ text: textBuf, ...pickRunFields(inherited) });
    textBuf = "";
  };

  const walkNodes = (nodes: ReactNode): void => {
    Children.forEach(nodes, (child) => {
      if (child == null || typeof child === "boolean") return;
      if (typeof child === "string" || typeof child === "number") {
        textBuf += String(child);
        return;
      }
      if (!isValidElement(child)) return;
      if (child.type === View) {
        throw new Error("Text 内不能放置 <View>（与 react-native Text 一致）");
      }
      if (
        typeof child.type !== "string" &&
        (child.type as { displayName?: string }).displayName === TEXT_DISPLAY
      ) {
        flushBuf();
        const sub = nestedTextResolvedStyle(child.props as TextProps);
        const merged = mergeInheritedTextStyle(inherited, sub);
        out.push(...collectTextRuns((child.props as TextProps).children, merged));
        return;
      }
      if (child.type === Fragment) {
        walkNodes((child.props as { children?: ReactNode }).children);
        return;
      }
      throw new Error("Text 仅支持字符串、数字或嵌套 Text");
    });
  };

  walkNodes(children);
  flushBuf();
  return out;
}

function toInsertTextPayload(runs: TextFlatRun[]): string | TextFlatRun[] {
  if (runs.length === 0) return "";
  if (runs.length === 1) {
    const [r] = runs;
    const extraKeys = Object.keys(r).filter((k) => k !== "text");
    if (extraKeys.length === 0) return r.text;
  }
  return runs;
}

export function Text(props: TextProps): ReactNode {
  const { style, children, onPointerDown, onPointerUp, onClick, id: idProp } = props;
  const rt = useSceneRuntime();
  const parentId = useContext(ParentSceneIdContext);
  const generated = useId().replace(/:/g, "");
  const nodeId = idProp ?? `text-${generated}`;
  const [hovered, setHovered] = useState(false);
  const isFunctionStyle = typeof style === "function";
  const styleSnapshotKey = useMemo(() => {
    if (style === undefined) return "{}";
    if (typeof style === "function") return JSON.stringify(style({ hovered }));
    return JSON.stringify(style ?? {});
  }, [style, hovered]);
  const parsedStyle = useMemo(() => JSON.parse(styleSnapshotKey) as ViewStyle, [styleSnapshotKey]);

  const textPayload = useMemo(() => {
    const runs = collectTextRuns(children, parsedStyle);
    return toInsertTextPayload(runs);
  }, [children, parsedStyle]);

  /**
   * 仅卸载时移除场景节点。必须与下方「插入/更新」effect 拆开：
   * 若在同一 effect 的 cleanup 里 `removeView`，再在依赖（如 `textPayload`）变化时重跑，
   * 会先删后建；`insertText` 走 `createChildAt` 会把节点追加到父节点 **末尾**，导致兄弟顺序错乱
   *（例如父级 setState 后嵌套 M3 段落整块跑到列尾）。内容/样式变化应走 `insertText` 的 existing 分支原地更新。
   */
  useLayoutEffect(() => {
    return () => {
      rt.removeView(nodeId);
    };
  }, [rt, nodeId]);

  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("Text must be rendered under Canvas");
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
            `Text: parent scene node "${parentId}" never appeared (max ${maxAttempts} retries)`,
          );
        }
        queueMicrotask(scheduleInsert);
        return;
      }
      rt.insertText(parentId, nodeId, textPayload, parsedStyle);
    };

    scheduleInsert();

    return () => {
      cancelled = true;
    };
  }, [rt, parentId, nodeId, textPayload, parsedStyle]);

  useLayoutEffect(() => {
    if (!isFunctionStyle) return;
    const offEnter = rt.addListener(nodeId, "pointerenter", () => setHovered(true), {
      label: "text-style:hover-enter",
    });
    const offLeave = rt.addListener(nodeId, "pointerleave", () => setHovered(false), {
      label: "text-style:hover-leave",
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

Text.displayName = TEXT_DISPLAY;
