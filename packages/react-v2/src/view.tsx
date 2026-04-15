import type { ScenePointerEvent, ViewStyle } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import {
  Fragment,
  isValidElement,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";

/** 与 {@link Text} 的 `displayName` 一致；`View` 校验裸文本时不进入 Text 子树。 */
const TEXT_COMPONENT_DISPLAY_NAME = "RcCanvasText";

function assertNoBareTextChildren(children: ReactNode): void {
  const hasBareText = (node: ReactNode): boolean => {
    if (node == null || typeof node === "boolean") return false;
    if (typeof node === "string" || typeof node === "number") return true;
    if (Array.isArray(node)) return node.some(hasBareText);
    if (isValidElement(node)) {
      if ((node.type as { displayName?: string }).displayName === TEXT_COMPONENT_DISPLAY_NAME) {
        return false;
      }
      if (node.type === Fragment) {
        return hasBareText((node.props as { children?: ReactNode }).children);
      }
      return hasBareText((node.props as { children?: ReactNode }).children);
    }
    return false;
  };
  if (hasBareText(children)) {
    throw new Error("View 下不能直接写文字，请使用 <Text>。");
  }
}

export type ViewProps = {
  id?: string;
  name?: string;
  /**
   * 静态 `ViewStyle` 对象，或 `({ hovered }) => ViewStyle`（由运行时合成 `pointerenter` / `pointerleave` 驱动 `hovered`）。
   *
   * **引用 vs 内容：** 每次 render 写 `style={{ width: 100 }}` 或内联箭头函数都会得到**新引用**，容易误以为会反复打散场景。
   * `View` 与运行时同步时以 **解析后样式的 JSON 快照** 为准（内容相同则快照相同），**不**依赖对象/函数引用是否稳定；不必为 `style` 包 `useCallback`/`useMemo` 也能正确合并更新。
   * 若单帧内 `JSON.stringify` 成本可感知，再在父级对「大对象」自行 `useMemo` 即可。
   */
  style?: ViewStyle | ((state: { hovered: boolean }) => ViewStyle);
  children?: ReactNode;
  onPointerDown?: (e: ScenePointerEvent) => void;
  onPointerUp?: (e: ScenePointerEvent) => void;
  onClick?: (e: ScenePointerEvent) => void;
};

export function View(props: ViewProps): ReactNode {
  const { style, children, onPointerDown, onPointerUp, onClick, id: idProp, name } = props;
  assertNoBareTextChildren(children);
  const rt = useSceneRuntime();
  const parentId = useContext(ParentSceneIdContext);
  const generated = useId().replace(/:/g, "");
  const nodeId = idProp ?? `view-${generated}`;
  const [hovered, setHovered] = useState(false);

  /** 是否使用函数式 style（仅「静态 ↔ 函数」切换时重挂 enter/leave，不因函数引用每帧变而重复订阅）。 */
  const isFunctionStyle = typeof style === "function";

  /** 与 SceneRuntime 对齐的唯一依据：解析后样式的 JSON 字符串（内容相等则键相等，与引用无关）。 */
  const styleSnapshotKey = useMemo(() => {
    if (style === undefined) return "{}";
    if (typeof style === "function") return JSON.stringify(style({ hovered }));
    return JSON.stringify(style ?? {});
  }, [style, hovered]);

  /** 当前帧的解析样式对象；通过 ref 传入生命周期 effect，避免 style 成为挂载 effect 的依赖。 */
  const parsedStyle = useMemo(() => JSON.parse(styleSnapshotKey) as ViewStyle, [styleSnapshotKey]);
  const styleRef = useRef<ViewStyle>(parsedStyle);
  styleRef.current = parsedStyle;

  // React 对 useLayoutEffect 的遍历顺序可能让子组件先于父组件执行；
  // 父 View 尚未 insertView 时，用 queueMicrotask 等到父节点出现在 store 中再挂载。
  // Effect 1：只管节点生命周期，不含 style 依赖——样式变更不会触发节点销毁重建。
  useLayoutEffect(() => {
    if (parentId === null) {
      throw new Error("View must be rendered under Canvas");
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
            `View: parent scene node "${parentId}" never appeared (max ${maxAttempts} retries)`,
          );
        }
        queueMicrotask(scheduleInsert);
        return;
      }
      rt.insertView(parentId, nodeId, styleRef.current, name);
    };

    scheduleInsert();

    return () => {
      cancelled = true;
      rt.removeView(nodeId);
    };
  }, [rt, parentId, nodeId]);

  // Effect 2：只管样式同步——原地 updateStyle，不销毁节点，子节点 Yoga 树不受影响。
  useLayoutEffect(() => {
    rt.updateStyle(nodeId, parsedStyle);
  }, [rt, nodeId, parsedStyle]);

  useLayoutEffect(() => {
    if (!isFunctionStyle) return;
    const offEnter = rt.addListener(nodeId, "pointerenter", () => setHovered(true), {
      label: "style:hover-enter",
    });
    const offLeave = rt.addListener(nodeId, "pointerleave", () => setHovered(false), {
      label: "style:hover-leave",
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

  return <ParentSceneIdContext.Provider value={nodeId}>{children}</ParentSceneIdContext.Provider>;
}
