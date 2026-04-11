import { createContext } from "react";
import type { SceneRuntime } from "@react-canvas/core-v2";

export const SceneRuntimeContext = createContext<SceneRuntime | null>(null);

/** 当前 `View` 在场景树中的父节点 id（根为 Canvas 提供的 root id）。 */
export const ParentSceneIdContext = createContext<string | null>(null);
