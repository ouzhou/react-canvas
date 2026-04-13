import {
  getRuntimeServerSnapshot,
  getRuntimeSnapshot,
  initRuntime,
  subscribeRuntimeInit,
  type Runtime,
  type RuntimeInitSnapshot,
  type RuntimeOptions,
} from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";

export type CanvasProviderRenderProps = {
  snapshot: RuntimeInitSnapshot;
  isReady: boolean;
  /** `status === "ready"` 时的共享运行时；否则为 `null`。 */
  runtime: Runtime | null;
  /**
   * `idle` 或 `loading`：尚未就绪，可展示加载态。
   * 注意 SSR 水合时客户端首帧可能为 `idle`，随后很快变为 `loading`。
   */
  isRuntimeInitPending: boolean;
  /** `status === "error"` 时的异常，便于 DOM 展示；否则为 `null`。 */
  initError: Error | null;
};

export type CanvasProviderProps = {
  children: (props: CanvasProviderRenderProps) => ReactNode;
  /** 传给 {@link initRuntime}；仅首次有效（与 core-design §2.2 一致）。 */
  initOptions?: RuntimeOptions;
};

/** 调用 {@link initRuntime}，并用 `useSyncExternalStore` 订阅模块级初始化快照（与 core-design §2.3 一致）。 */
export function CanvasProvider(props: CanvasProviderProps): ReactNode {
  const { children, initOptions } = props;
  const initialInitOptionsRef = useRef(initOptions);

  useEffect(() => {
    void initRuntime(initialInitOptionsRef.current);
  }, []);

  const snapshot = useSyncExternalStore(
    subscribeRuntimeInit,
    getRuntimeSnapshot,
    getRuntimeServerSnapshot,
  );

  const isReady = snapshot.status === "ready";
  const runtime = isReady ? snapshot.runtime : null;
  const initError = snapshot.status === "error" ? snapshot.error : null;
  const isRuntimeInitPending = snapshot.status === "idle" || snapshot.status === "loading";

  return <>{children({ snapshot, isReady, runtime, isRuntimeInitPending, initError })}</>;
}
