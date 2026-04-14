import type { TransRenderProps } from "@lingui/react";
import { I18nProvider } from "@lingui/react";
import { Outlet } from "react-router-dom";
import { linguiI18n } from "./lib/lingui";

export type { SmokeDemoId } from "./smoke-types.ts";

const DefaultI18n = ({ children }: TransRenderProps) => <span>{children}</span>;

export function App() {
  return (
    <I18nProvider i18n={linguiI18n} defaultComponent={DefaultI18n}>
      <Outlet />
    </I18nProvider>
  );
}
