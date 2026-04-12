import type { TransRenderProps } from "@lingui/react";
import { I18nProvider } from "@lingui/react";
import { linguiI18n } from "./lib/lingui";
import { SmokeCanvasApp } from "./react-smoke.tsx";

export type { SmokeDemoId } from "./smoke-types.ts";

const DefaultI18n = ({ children }: TransRenderProps) => <span>{children}</span>;

export function App() {
  return (
    <I18nProvider i18n={linguiI18n} defaultComponent={DefaultI18n}>
      <SmokeCanvasApp />
    </I18nProvider>
  );
}
