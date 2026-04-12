import { useSceneRuntime } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { useLayoutEffect } from "react";

export function PointerClickLog(props: { onHit: (label: string) => void }) {
  const { t, i18n } = useLingui();
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("hit-sm", "click", () => props.onHit(t`hit-sm（红，先插入）`));
    const o2 = rt.addListener("hit-lg", "click", () => props.onHit(t`hit-lg（绿，后插入）`));
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit, t, i18n.locale]);
  return null;
}

/** 示例二：紫底、蓝顶，重叠区应命中蓝。 */
export function PointerClickLogB(props: { onHit: (label: string) => void }) {
  const { t, i18n } = useLingui();
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    const o1 = rt.addListener("hit-sm2-back", "click", () =>
      props.onHit(t`hit-sm2-back（紫，先插入）`),
    );
    const o2 = rt.addListener("hit-sm2-front", "click", () =>
      props.onHit(t`hit-sm2-front（蓝，后插入）`),
    );
    return () => {
      o1();
      o2();
    };
  }, [rt, props.onHit, t, i18n.locale]);
  return null;
}
