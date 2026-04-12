import type { ScenePointerEvent } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useId, useLayoutEffect, useRef } from "react";
import { ParentSceneIdContext } from "./context.tsx";
import { useSceneRuntime } from "./hooks.ts";
import { View } from "./view.tsx";

export type ModalProps = {
  visible: boolean;
  children?: ReactNode;
  /** `false`（默认）时使用半透明遮罩；`true` 时背板透明但仍全屏占位命中。 */
  transparent?: boolean;
  /**
   * 背板场景节点 id；不设时由 `useId` 生成，避免多 Modal 冲突。
   * 与命令式 `insertView(modalRoot, id, …)` 对照时请传同一字符串。
   */
  backdropId?: string;
  /** 例如点背板关闭；不修改 `visible`，由父组件更新状态。 */
  onRequestClose?: () => void;
};

/**
 * 参考 RN `Modal` 语义：内容挂在 `scene-modal` 槽，默认全屏背板；关闭时不挂载子树。
 * 槽位在 core 中默认可穿透（`pointerEvents: 'none'`），打开时由本组件改回 `auto`。
 */
export function Modal(props: ModalProps): ReactNode {
  const {
    visible,
    children,
    transparent = false,
    onRequestClose,
    backdropId: backdropIdProp,
  } = props;
  const rt = useSceneRuntime();
  const modalRootId = rt.getModalRootId();
  const wasVisibleRef = useRef(false);
  const generatedBackdropId = useId().replace(/:/g, "");
  const backdropId = backdropIdProp ?? `modal-backdrop-${generatedBackdropId}`;

  useLayoutEffect(() => {
    return () => {
      if (wasVisibleRef.current) {
        rt.patchStyle(modalRootId, { pointerEvents: "none" });
        wasVisibleRef.current = false;
      }
    };
  }, [rt, modalRootId]);

  if (!visible) {
    if (wasVisibleRef.current) {
      rt.patchStyle(modalRootId, { pointerEvents: "none" });
      wasVisibleRef.current = false;
    }
    return null;
  }

  if (!wasVisibleRef.current) {
    rt.patchStyle(modalRootId, { pointerEvents: "auto" });
    wasVisibleRef.current = true;
  }

  const onBackdropClick =
    onRequestClose !== undefined
      ? (_e: ScenePointerEvent) => {
          onRequestClose();
        }
      : undefined;

  return (
    <ParentSceneIdContext.Provider value={modalRootId}>
      <View
        id={backdropId}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          backgroundColor: transparent ? "transparent" : "rgba(0,0,0,0.58)",
        }}
        onClick={onBackdropClick}
      />
      {children}
    </ParentSceneIdContext.Provider>
  );
}
