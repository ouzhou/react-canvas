import type { InteractionHandlers, TextStyle, ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      View: {
        style?: ViewStyle;
        children?: ReactNode;
      } & InteractionHandlers;
      Text: {
        style?: TextStyle;
        children?: ReactNode;
      } & InteractionHandlers;
    }
  }
}

export {};
