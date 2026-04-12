import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";

import type { StyleDemoCase } from "../../style-demo-content.ts";

export function useStyleDemoCases() {
  const { t, i18n } = useLingui();
  return useMemo(
    () =>
      [
        {
          id: "margin-gap" as const,
          label: t`margin + gap`,
          hint: t`行向 gap；首块 marginTop、次块左右 margin。`,
        },
        {
          id: "padding-wrap" as const,
          label: t`padding + wrap`,
          hint: t`paddingTop 覆盖四边 padding；flexWrap 换行。`,
        },
        {
          id: "flex-longhands" as const,
          label: t`flexGrow / Shrink / Basis`,
          hint: t`无 flex 数字，仅用 grow+shrink+basis 占满剩余宽。`,
        },
        {
          id: "flex-reverse" as const,
          label: t`row-reverse`,
          hint: t`flexDirection: row-reverse，子项沿主轴从末端开始排。`,
        },
        {
          id: "opacity" as const,
          label: t`opacity 组透明`,
          hint: t`滑块调左半透明块与下行父容器 α；右为不透明参照；子块仍带自身 opacity。`,
        },
        {
          id: "aspect-overflow" as const,
          label: t`aspectRatio + overflow`,
          hint: t`固定宽 + aspectRatio 推导高；子项宽于父；overflow hidden + borderRadius 15%（Skia 裁剪/圆角）。`,
        },
        {
          id: "style-button" as const,
          label: t`圆角按钮 + hover`,
          hint: t`常规圆角矩形按钮 + 圆形按钮（48×48，borderRadius 24）；白字；hover 背景变浅、pointer（React 函数式 style；Core patchStyle）。`,
        },
      ] as ReadonlyArray<{ id: StyleDemoCase; label: string; hint: string }>,
    [t, i18n.locale],
  );
}
