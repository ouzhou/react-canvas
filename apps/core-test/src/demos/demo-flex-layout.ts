import { ViewNode } from "@react-canvas/core";

import { createDemoHost } from "../lib/demo-host.ts";

export async function mountFlexLayoutDemo(container: HTMLElement): Promise<() => void> {
  const host = await createDemoHost(container, 360, 200);
  const { runtime, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#0f172a",
  });

  const mk = (bg: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({ flex: 1, backgroundColor: bg, borderRadius: 8 });
    return v;
  };

  root.appendChild(mk("#2563eb"));
  root.appendChild(mk("#059669"));
  root.appendChild(mk("#d97706"));

  requestFrame(root);

  return () => {
    root.destroy();
    dispose();
  };
}
