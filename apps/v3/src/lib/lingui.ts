import { i18n } from "@lingui/core";
import { messages as messagesEn } from "../locales/en/messages.po";
import { messages as messagesZhCn } from "../locales/zh-cn/messages.po";
import { resolveInitialLocale } from "./locale-preference.ts";

export const LINGUI_LOCALES = ["en", "zh-cn"] as const;
const DEFAULT_LOCALE = "zh-cn";

export function normalizeLinguiLocale(locale: string): (typeof LINGUI_LOCALES)[number] {
  if ((LINGUI_LOCALES as readonly string[]).includes(locale)) {
    return locale as (typeof LINGUI_LOCALES)[number];
  }
  return DEFAULT_LOCALE;
}

export const linguiI18n = i18n;

linguiI18n.load({
  en: messagesEn,
  "zh-cn": messagesZhCn,
});
linguiI18n.activate(resolveInitialLocale());

/** 同步切换语言（启动时已 `load` 全部目录）。 */
export function activateLinguiLocale(locale: string) {
  const normalizedLocale = normalizeLinguiLocale(locale);
  linguiI18n.activate(normalizedLocale);
}
