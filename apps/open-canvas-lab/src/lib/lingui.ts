import { i18n } from "@lingui/core";
import { resolveInitialLocale, type LabSupportedLocale } from "./locale-preference";

const DEFAULT_LOCALE: LabSupportedLocale = "zh-cn";
export const LINGUI_LOCALES = ["en", "zh-cn"] as const;

const catalogs: Record<LabSupportedLocale, Record<string, string>> = {
  "zh-cn": {
    "lab.loading": "Canvas 正在加载...",
    "lab.initError": "画布初始化失败：{message}",
    "lab.editor.title": "代码编辑器",
    "lab.editor.apply": "应用",
    "lab.chat.title": "对话（Vercel AI ADK）",
    "lab.chat.placeholder": "这里预留对话入口与消息区域。",
    "lab.canvas.title": "React Canvas View",
    "lab.locale.zh": "中文",
    "lab.locale.en": "English",
  },
  en: {
    "lab.loading": "Canvas is loading...",
    "lab.initError": "Canvas initialization failed: {message}",
    "lab.editor.title": "Code Editor",
    "lab.editor.apply": "Apply",
    "lab.chat.title": "Chat (Vercel AI ADK)",
    "lab.chat.placeholder": "Reserved area for chat entry and messages.",
    "lab.canvas.title": "React Canvas View",
    "lab.locale.zh": "中文",
    "lab.locale.en": "English",
  },
};

export function normalizeLinguiLocale(locale: string): LabSupportedLocale {
  if ((LINGUI_LOCALES as readonly string[]).includes(locale)) {
    return locale as LabSupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export const linguiI18n = i18n;

linguiI18n.load(catalogs);
linguiI18n.activate(resolveInitialLocale());

export function activateLinguiLocale(locale: string) {
  linguiI18n.activate(normalizeLinguiLocale(locale));
}
