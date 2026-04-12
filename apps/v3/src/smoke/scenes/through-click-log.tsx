import { useSceneRuntime } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { useLayoutEffect } from "react";

export function ThroughClickLog(props: { onHit: (label: string) => void }) {
  const { t, i18n } = useLingui();
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("through-back", "click", () =>
      props.onHit(t`through-back（绿，背后层）`),
    );
    const o2 = rt.addListener("through-front", "click", () =>
      props.onHit(t`错误：through-front（橙）不应收到 click`),
    );
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit, t, i18n.locale]);
  return null;
}
