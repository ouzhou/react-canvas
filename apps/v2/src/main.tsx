import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./style.css";

const el = document.querySelector<HTMLDivElement>("#app");
if (el) {
  createRoot(el).render(<App />);
}
