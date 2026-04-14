export const V3_LOCALE_STORAGE_KEY = "react-canvas-v3-locale";

/** 与 `lingui.config` / `LINGUI_LOCALES` 一致。 */
export type V3SupportedLocale = "en" | "zh-cn";

function isPersistedLocale(value: string | null): value is V3SupportedLocale {
  return value === "en" || value === "zh-cn";
}

/** 与 `navigator.language(s)` 对齐到已实现的目录：`en*` → en，`zh*` → zh-cn，否则中文。 */
export function localeFromBrowser(): V3SupportedLocale {
  if (typeof navigator === "undefined") {
    return "zh-cn";
  }
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const raw of candidates) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("zh")) {
      return "zh-cn";
    }
    if (lower.startsWith("en")) {
      return "en";
    }
  }
  return "zh-cn";
}

/**
 * 首次进入：优先 localStorage；无有效值则用浏览器语言；仍无匹配则中文。
 */
export function resolveInitialLocale(): V3SupportedLocale {
  try {
    const raw = localStorage.getItem(V3_LOCALE_STORAGE_KEY);
    if (isPersistedLocale(raw)) {
      return raw;
    }
  } catch {
    // 隐私模式等
  }
  return localeFromBrowser();
}

/** 每次需要读取用户持久化语言时使用（无有效记录则返回 `null`）。 */
export function readStoredV3Locale(): V3SupportedLocale | null {
  try {
    const raw = localStorage.getItem(V3_LOCALE_STORAGE_KEY);
    return isPersistedLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistV3Locale(locale: V3SupportedLocale): void {
  try {
    localStorage.setItem(V3_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}
