import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.tsx";
import "./style.css";

const el = document.querySelector<HTMLDivElement>("#app");
if (el) {
  createRoot(el).render(<RouterProvider router={router} />);
}
