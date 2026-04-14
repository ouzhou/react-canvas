export const LAB_LOCALE_STORAGE_KEY = "open-canvas-lab-locale";

export type LabSupportedLocale = "en" | "zh-cn";

function isPersistedLocale(value: string | null): value is LabSupportedLocale {
  return value === "en" || value === "zh-cn";
}

function localeFromBrowser(): LabSupportedLocale {
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

export function resolveInitialLocale(): LabSupportedLocale {
  try {
    const raw = localStorage.getItem(LAB_LOCALE_STORAGE_KEY);
    if (isPersistedLocale(raw)) {
      return raw;
    }
  } catch {
    // ignore localStorage read failures in private mode
  }
  return localeFromBrowser();
}

export function persistLabLocale(locale: LabSupportedLocale): void {
  try {
    localStorage.setItem(LAB_LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}
