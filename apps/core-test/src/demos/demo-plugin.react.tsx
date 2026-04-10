import type { Plugin, PluginContext, Stage } from "@react-canvas/core";
import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { useEffect, useRef, useState } from "react";

import { mountReactApp } from "../lib/react-demo-root.tsx";

const DEMO_SERVICE = Symbol("core-test-demo-service");

type DemoService = { label: string };

function PluginDemoApp({ onStatus }: { onStatus: (msg: string) => void }) {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    if (!stage) return;

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
          onStatusRef.current(
            `§18 插件系统 · afterPaint #${afterPaintCount} · consume:「${svc?.label ?? "none"}」`,
          );
        });
      },
      detach() {
        untapAfterPaint?.();
      },
    };

    stage.use(producer).use(consumer);
    stage.requestLayoutPaint();

    return () => {
      stage.removePlugin("core-test-plugin-consumer");
      stage.removePlugin("core-test-plugin-producer");
    };
  }, [stage]);

  return (
    <CanvasProvider>
      {({ isReady, error }) => {
        if (error) {
          return (
            <div role="alert" className="impl-react-error">
              {String(error.message)}
            </div>
          );
        }
        if (!isReady) {
          return (
            <div aria-busy="true" className="impl-react-loading">
              Loading…
            </div>
          );
        }
        return (
          <Canvas width={360} height={120} onStageReady={setStage}>
            <View
              style={{
                width: "100%",
                height: "100%",
                padding: 16,
                backgroundColor: "#1c1917",
              }}
            />
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}

export function mountPluginDemoReact(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  return Promise.resolve(mountReactApp(container, <PluginDemoApp onStatus={onStatus} />));
}
