import { useEffect, useState } from "react";
import { CoreSmoke } from "./core-smoke.tsx";
import { ReactSmoke } from "./react-smoke.tsx";

export type SmokeTab = "core" | "react";

function readTab(): SmokeTab {
  const p = new URLSearchParams(window.location.search).get("smoke");
  return p === "core" ? "core" : "react";
}

export function App() {
  const [tab, setTab] = useState<SmokeTab>(readTab);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("smoke", tab);
    history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`);
  }, [tab]);

  return (
    <div style={{ padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>react-canvas v2 冒烟</h1>

      <nav
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
        aria-label="冒烟类型"
      >
        <span style={{ color: "#64748b", marginRight: "0.25rem" }}>页面：</span>
        <button type="button" disabled={tab === "core"} onClick={() => setTab("core")}>
          Core（纯 API）
        </button>
        <button type="button" disabled={tab === "react"} onClick={() => setTab("react")}>
          React（CanvasRuntime + View）
        </button>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          分享链接：<code>?smoke=core</code> 或 <code>?smoke=react</code>
        </span>
      </nav>

      {tab === "core" ? <CoreSmoke /> : <ReactSmoke />}
    </div>
  );
}
