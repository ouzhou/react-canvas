import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { App } from "./App";
import { disableBrowserZoomGestures } from "./disable-browser-zoom";
import { linguiI18n } from "./lib/lingui";
import "./index.css";

disableBrowserZoomGestures();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <I18nProvider i18n={linguiI18n}>
      <App />
    </I18nProvider>
  </StrictMode>,
);
