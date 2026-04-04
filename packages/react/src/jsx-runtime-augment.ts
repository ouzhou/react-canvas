import type { ViewProps } from "@react-canvas/core";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        View: ViewProps;
      }
    }
  }
}

export {};
