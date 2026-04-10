import {
  ImageNode,
  registerPaintFrameRequester,
  SvgPathNode,
  TextNode,
  unregisterPaintFrameRequester,
  ViewNode,
} from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

const heroUrl = new URL("../assets/hero.png", import.meta.url).href;

function mountResizeControls(
  parent: HTMLElement,
  state: { canvasW: number; canvasH: number; textWrapW: number },
  onApply: () => void,
  onStatus: (msg: string) => void,
): () => void {
  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 12px;margin-bottom:8px;" +
    "background:#1e293b;border:1px solid #334155;border-radius:10px;font-size:12px;color:#cbd5e1;";

  const mk = (
    label: string,
    min: number,
    max: number,
    step: number,
    key: "canvasW" | "canvasH" | "textWrapW",
  ): void => {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;cursor:pointer;";
    const t = document.createElement("span");
    t.textContent = label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(state[key]);
    const valueEl = document.createElement("span");
    valueEl.style.minWidth = "42px";
    valueEl.style.fontVariantNumeric = "tabular-nums";
    valueEl.textContent = String(Math.round(state[key]));
    range.addEventListener("input", () => {
      state[key] = Number(range.value);
      valueEl.textContent = String(Math.round(state[key]));
      onApply();
      onStatus(
        `画布 ${Math.round(state.canvasW)}×${Math.round(state.canvasH)} · 段落容器宽 ${Math.round(state.textWrapW)}px（Skia Paragraph 随宽度换行）`,
      );
    });
    wrap.appendChild(t);
    wrap.appendChild(range);
    wrap.appendChild(valueEl);
    bar.appendChild(wrap);
  };

  mk("画布宽", 260, 640, 10, "canvasW");
  mk("画布高", 300, 640, 10, "canvasH");
  mk("段落容器宽", 120, 560, 10, "textWrapW");

  parent.insertBefore(bar, parent.firstChild);
  return () => bar.remove();
}

/**
 * `docs/core-design.md` §5 节点模型 — View / Text / Image / SvgPath 同屏对照。
 */
export async function mountNodeModelDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const dims = { canvasW: 400, canvasH: 420, textWrapW: 360 };

  const host = await createStageDemoHost(container, dims.canvasW, dims.canvasH);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga, canvasKit } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 10,
    flexDirection: "column",
    backgroundColor: "#0f172a",
  });

  const title = new TextNode(yoga);
  title.setStyle({ fontSize: 12, color: "#94a3b8" });
  title.appendTextSlot({
    nodeValue:
      "§5 节点模型 — ViewNode · TextNode · ImageNode · SvgPathNode（拖条改画布或段落宽度可看换行）",
  });

  const row = new ViewNode(yoga, "View");
  row.setStyle({ flexDirection: "row", gap: 8, alignItems: "stretch" });
  const chip = (bg: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({ flex: 1, height: 48, backgroundColor: bg, borderRadius: 8 });
    return v;
  };
  row.appendChild(chip("#2563eb"));
  row.appendChild(chip("#059669"));
  row.appendChild(chip("#d97706"));

  const textWrap = new ViewNode(yoga, "View");
  textWrap.setStyle({
    alignSelf: "flex-start",
    width: Math.round(dims.textWrapW),
  });

  const text = new TextNode(yoga);
  text.setStyle({ fontSize: 14, color: "#e2e8f0", lineHeight: 1.4 });
  text.appendTextSlot({
    nodeValue:
      "TextNode：Skia Paragraph，中文与 English 混排；Yoga measureFunc 测高。收窄画布或收窄「段落容器宽」时，本段应在更窄的内容盒内自动换行。",
  });
  textWrap.appendChild(text);

  const imgRow = new ViewNode(yoga, "View");
  imgRow.setStyle({
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "flex-start",
  });

  const img = new ImageNode(yoga);
  img.setImageProps(
    {},
    {
      source: { uri: heroUrl },
      resizeMode: "contain",
      onLoad: () => onStatus("ImageNode onLoad"),
      onError: (e) => onStatus(`ImageNode onError：${String(e)}`),
    },
  );
  img.setStyle({ width: 160, height: 100, borderRadius: 8 });

  const imgCap = new TextNode(yoga);
  imgCap.setStyle({ fontSize: 11, color: "#94a3b8", flex: 1 });
  imgCap.appendTextSlot({
    nodeValue: "ImageNode：异步解码、SkImage；解码完成触发 requestLayoutPaint。",
  });
  imgRow.appendChild(img);
  imgRow.appendChild(imgCap);

  const svgRow = new ViewNode(yoga, "View");
  svgRow.setStyle({
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flex: 1,
    minHeight: 0,
  });

  const path = new SvgPathNode(yoga);
  path.setSvgPathProps(
    {},
    {
      d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
      viewBox: "0 0 24 24",
      size: 72,
      stroke: "#a5b4fc",
      fill: "#6366f1",
      strokeWidth: 1.5,
    },
  );

  const svgCap = new TextNode(yoga);
  svgCap.setStyle({ fontSize: 11, color: "#c7d2fe", flex: 1 });
  svgCap.appendTextSlot({
    nodeValue: "SvgPathNode：d + viewBox，矢量图标。",
  });
  svgRow.appendChild(path);
  svgRow.appendChild(svgCap);

  root.appendChild(title);
  root.appendChild(row);
  root.appendChild(textWrap);
  root.appendChild(imgRow);
  root.appendChild(svgRow);

  sceneRoot.appendChild(root);

  const applyResize = (): void => {
    stage.resize(Math.round(dims.canvasW), Math.round(dims.canvasH));
    textWrap.setStyle({ width: Math.round(dims.textWrapW) });
    requestFrame();
  };

  const removeToolbar = mountResizeControls(container, dims, applyResize, onStatus);

  const redraw = (): void => {
    stage.requestLayoutPaint();
  };
  registerPaintFrameRequester(redraw);
  img.beginLoad(canvasKit);

  requestFrame();
  onStatus(
    `画布 ${Math.round(dims.canvasW)}×${Math.round(dims.canvasH)} · 段落容器宽 ${Math.round(dims.textWrapW)}px`,
  );

  return () => {
    unregisterPaintFrameRequester(redraw);
    removeToolbar();
    root.destroy();
    dispose();
  };
}
