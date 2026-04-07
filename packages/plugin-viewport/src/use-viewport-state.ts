import { useState, type Dispatch, type SetStateAction } from "react";
import { DEFAULT_VIEWPORT, type ViewportState } from "./viewport-state.ts";

export function useViewportState(
  initial: ViewportState = DEFAULT_VIEWPORT,
): [ViewportState, Dispatch<SetStateAction<ViewportState>>] {
  return useState<ViewportState>(initial);
}
