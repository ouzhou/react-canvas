import { i18n } from "@lingui/core";
import { messages as messagesEn } from "../locales/en/messages.po";
import { messages as messagesZhCn } from "../locales/zh-cn/messages.po";
import { resolveInitialLocale, type LabSupportedLocale } from "./locale-preference";

export const LINGUI_LOCALES = ["en", "zh-cn"] as const;
const DEFAULT_LOCALE = "zh-cn";

export function normalizeLinguiLocale(locale: string): LabSupportedLocale {
  if ((LINGUI_LOCALES as readonly string[]).includes(locale)) {
    return locale as LabSupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export const linguiI18n = i18n;

linguiI18n.load({
  en: messagesEn,
  "zh-cn": messagesZhCn,
});
linguiI18n.activate(resolveInitialLocale());

export function activateLinguiLocale(locale: string) {
  linguiI18n.activate(normalizeLinguiLocale(locale));
}
