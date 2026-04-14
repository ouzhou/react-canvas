import { createHashRouter } from "react-router-dom";
import { App } from "./App.tsx";
import { HomePage } from "./routes/home-page.tsx";
import { JuejinPage } from "./routes/juejin-page.tsx";
import { DevToPage } from "./routes/devto-page.tsx";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "juejin", element: <JuejinPage /> },
      { path: "devto", element: <DevToPage /> },
    ],
  },
]);
