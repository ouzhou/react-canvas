import type { Plugin, PluginContext } from "@react-canvas/core";
import { ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

const DEMO_SERVICE = Symbol("core-test-demo-service");

type DemoService = { label: string };

/**
 * `Stage.use` + `PluginContext.provide` / `consume` + `onAfterPaint`，与 `core-design.md` §18 对齐。
 */
export async function mountPluginDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 360, 120);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    backgroundColor: "#1c1917",
  });
  sceneRoot.appendChild(root);

  let afterPaintCount = 0;
  let untapAfterPaint: (() => void) | undefined;

  const producer: Plugin = {
    name: "core-test-plugin-producer",
    attach(ctx: PluginContext) {
      ctx.provide(DEMO_SERVICE, { label: "demo-service" } satisfies DemoService);
    },
    detach() {},
  };

  const consumer: Plugin = {
    name: "core-test-plugin-consumer",
    after: ["core-test-plugin-producer"],
    attach(ctx: PluginContext) {
      const svc = ctx.consume(DEMO_SERVICE) as DemoService | undefined;
      untapAfterPaint = ctx.onAfterPaint.tap(() => {
        afterPaintCount++;
        onStatus(
          `§18 插件系统 · afterPaint #${afterPaintCount} · consume:「${svc?.label ?? "none"}」`,
        );
      });
    },
    detach() {
      untapAfterPaint?.();
    },
  };

  stage.use(producer).use(consumer);

  requestFrame();

  return () => {
    stage.removePlugin("core-test-plugin-consumer");
    stage.removePlugin("core-test-plugin-producer");
    root.destroy();
    dispose();
  };
}
