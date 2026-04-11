import { useCallback, useEffect, useState } from "react";
import { CoreSmoke } from "./core-smoke.tsx";
import { ReactSmoke } from "./react-smoke.tsx";
import {
  SMOKE_DEMO_LIST,
  type SmokeDemoId,
  type SmokeTab,
  readSmokeSearch,
} from "./smoke-types.ts";

export type { SmokeTab } from "./smoke-types.ts";

export function App() {
  const [{ tab, demo }, setNav] = useState(readSmokeSearch);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("smoke", tab);
    u.searchParams.set("demo", demo);
    history.replaceState(null, "", `${u.pathname}?${u.searchParams.toString()}${u.hash}`);
  }, [tab, demo]);

  const setTab = useCallback((next: SmokeTab) => {
    setNav((n) => ({ ...n, tab: next }));
  }, []);

  const setDemo = useCallback((next: SmokeDemoId) => {
    setNav((n) => ({ ...n, demo: next }));
  }, []);

  return (
    <div className="v2-app">
      <aside className="v2-app__sidebar" aria-label="示例列表">
        <div className="v2-app__brand">react-canvas v2</div>
        <nav className="v2-app__nav">
          {SMOKE_DEMO_LIST.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`v2-app__nav-item${demo === item.id ? " v2-app__nav-item--active" : ""}`}
              onClick={() => setDemo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="v2-app__main">
        <header className="v2-app__toolbar" aria-label="运行模式">
          <div className="v2-app__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "core"}
              className={`v2-app__tab${tab === "core" ? " v2-app__tab--active" : ""}`}
              onClick={() => setTab("core")}
            >
              Core（纯 API）
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "react"}
              className={`v2-app__tab${tab === "react" ? " v2-app__tab--active" : ""}`}
              onClick={() => setTab("react")}
            >
              React（CanvasRuntime + View）
            </button>
          </div>
          <span className="v2-app__hint">
            链接：<code>?smoke=core|react</code>{" "}
            <code>&amp;demo=layout|pointer|through|hover|cursor</code>
          </span>
        </header>

        <div className="v2-app__result">
          {tab === "core" ? <CoreSmoke demo={demo} /> : <ReactSmoke demo={demo} />}
        </div>
      </div>
    </div>
  );
}
