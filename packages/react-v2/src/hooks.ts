import { useContext } from "react";
import type { SceneRuntime } from "@react-canvas/core-v2";
import { SceneRuntimeContext } from "./context.tsx";

export function useSceneRuntime(): SceneRuntime {
  const rt = useContext(SceneRuntimeContext);
  if (!rt) {
    throw new Error("useSceneRuntime must be used within Canvas");
  }
  return rt;
}
