import { Text } from "@react-canvas/react-v2";
import { useContext } from "react";
import { LiveContext } from "react-live";

/** 与 react-live {@link LiveError} 对应：在画布内用 Text 展示转译/求值错误（无 DOM）。 */
export function LiveTranspileErrorText() {
  const live = useContext(LiveContext);
  const err =
    live && typeof live === "object" && "error" in live
      ? (live as { error?: string }).error
      : undefined;
  if (!err) return null;
  return (
    <Text
      style={{
        marginTop: 4,
        fontSize: 10,
        lineHeight: 1.45,
        color: "#fecaca",
      }}
    >
      {err}
    </Text>
  );
}
