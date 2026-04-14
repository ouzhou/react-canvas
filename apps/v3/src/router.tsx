import { createBrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import { HomePage } from "./routes/home-page.tsx";
import { JuejinPage } from "./routes/juejin-page.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "juejin", element: <JuejinPage /> },
    ],
  },
]);
