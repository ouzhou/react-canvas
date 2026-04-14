import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";

import type { SmokeDemoId } from "../../smoke-types.ts";

export type DemoPageMeta = {
  id: SmokeDemoId;
  navLabel: string;
  title: string;
  description: string;
};

export function useDemoCatalog() {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const DEMO_PAGES: readonly DemoPageMeta[] = [
      {
        id: "intro",
        navLabel: t`首页介绍`,
        title: t`总览与能力索引`,
        description: t`概览引擎能力与技术要点；下列演示可逐项体验。`,
      },
      {
        id: "media",
        navLabel: t`图片与矢量`,
        title: t`Image 与 SvgPath`,
        description: t`位图：data URL 与 object-fit（contain / cover / fill）。矢量：@lucide/icons 的 camera 图标 node 合并为单条 path d，默认 viewBox 0 0 24 24。`,
      },
      {
        id: "scroll-demo",
        navLabel: t`滚动快照`,
        title: t`ScrollView 与布局快照`,
        description: t`无 onScroll 回调时，用 subscribeAfterLayout 读取 scrollY，驱动三角形的旋转、缩放与透明度。`,
      },
      {
        id: "animation",
        navLabel: t`动画`,
        title: t`时间与变换动画`,
        description: t`requestAnimationFrame 更新状态，驱动 opacity 与 transform（平移、旋转、缩放）及组合，用于对照逐帧绘制与交互命中。`,
      },
      {
        id: "layout",
        navLabel: t`布局`,
        title: t`Flex 布局`,
        description: t`验证纵向 flex 容器内多行子布局：各行内再使用行向 flex 与 flex 比例，用于对照 Yoga 分行、占比与基础绘制。`,
      },
      {
        id: "pointer",
        navLabel: t`点击与层级`,
        title: t`点击命中顺序`,
        description: t`红、绿矩形部分重叠且后绘制的块在上层。用于验证同坐标点击是否命中「后插入」的节点，而非底层先绘制的块。`,
      },
      {
        id: "through",
        navLabel: t`穿透`,
        title: t`pointer-events 穿透`,
        description: t`前景层使用 pointer-events: none 时，事件应穿过该层命中背后节点。用于验证穿透语义与命中链。`,
      },
      {
        id: "hover",
        navLabel: t`悬停`,
        title: t`悬停样式`,
        description: t`通过函数式 style 根据 hovered 切换背景色。用于验证 pointerenter / pointerleave 与 hover 态样式更新。`,
      },
      {
        id: "cursor",
        navLabel: t`光标`,
        title: t`光标样式`,
        description: t`覆盖静态 cursor、父子继承与覆盖、hover 时变更、穿透层对光标的影响，以及 grab / grabbing 与画布外松手恢复。`,
      },
      {
        id: "modal",
        navLabel: t`弹窗`,
        title: t`模态框`,
        description: t`全屏半透明遮罩、点击遮罩关闭、内容在视口居中。用于验证 scene-modal 槽与弹窗打开/关闭流程。`,
      },
      {
        id: "popover",
        navLabel: t`浮层`,
        title: t`Popover`,
        description: t`基于 Modal 槽位渲染的非模态浮层示例，验证 click-away、四向定位与边界修正。`,
      },
      {
        id: "text",
        navLabel: t`文本`,
        title: t`文本与段落`,
        description: t`CanvasKit Paragraph：行高、对齐、装饰线、字距、斜体与 rgba、字体族回退等。可通过控件调节主段换行宽度。`,
      },
      {
        id: "style",
        navLabel: t`样式`,
        title: t`视图布局样式`,
        description: t`Yoga 扩展：margin、gap、padding 与换行、flex 分项、方向翻转、透明度与裁剪、圆角与 hover 等。请用下方标签切换子示例。`,
      },
      {
        id: "border",
        navLabel: t`边框`,
        title: t`边框与圆角`,
        description: t`borderWidth 经 Yoga 参与占位；borderColor 在 Skia 描边，可与 borderRadius、padding 叠加。舞台内分三段子示例：粗边+圆角+padding、细边 rgba 描边、1px/3px/无边线宽对比，用于核对布局盒与视觉一致。`,
      },
    ];

    const smokeDemoList = DEMO_PAGES.map((p) => ({ id: p.id, label: p.navLabel }));
    const pageById = Object.fromEntries(DEMO_PAGES.map((p) => [p.id, p])) as Record<
      SmokeDemoId,
      DemoPageMeta
    >;

    return {
      smokeDemoList,
      getDemoPageMeta: (demo: SmokeDemoId) => pageById[demo],
    };
  }, [t, i18n.locale]);
}
