import { Modal, Text, View } from "@react-canvas/react-v2";
import type { ReactNode } from "react";

import {
  computePopoverPosition,
  type PopoverPlacement,
  type PopoverTriggerRect,
} from "../lib/compute-popover-position.ts";

export function Popover(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRect: PopoverTriggerRect | null;
  placement: PopoverPlacement;
  viewportW: number;
  viewportH: number;
  panelW: number;
  panelH: number;
  content: ReactNode;
}) {
  const {
    open,
    onOpenChange,
    triggerRect,
    placement,
    viewportW,
    viewportH,
    panelW,
    panelH,
    content,
  } = props;

  if (!open || !triggerRect) {
    return null;
  }

  const { left, top } = computePopoverPosition({
    placement,
    triggerRect,
    panelSize: { width: panelW, height: panelH },
    viewportSize: { width: viewportW, height: viewportH },
  });

  const panelContent =
    typeof content === "string" ? (
      <Text
        style={{
          fontSize: 14,
          lineHeight: 1.4,
          color: "rgba(0,0,0,0.88)",
        }}
      >
        {content}
      </Text>
    ) : (
      content
    );

  return (
    <Modal
      visible={open}
      transparent
      onRequestClose={() => {
        onOpenChange(false);
      }}
    >
      <View
        style={{
          position: "absolute",
          left,
          top,
          width: panelW,
          height: panelH,
          borderRadius: 10,
          backgroundColor: "#ffffff",
          padding: 12,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {panelContent}
      </View>
    </Modal>
  );
}
