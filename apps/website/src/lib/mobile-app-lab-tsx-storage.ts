export const MOBILE_APP_LAB_TSX_STORAGE_KEY = "mobile-app-lab:tsx-state";

export type LabTsxPersisted = {
  draft: string;
  appliedCode: string;
};

export function parsePersistedLabTsx(raw: string | null): LabTsxPersisted | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (
      typeof v !== "object" ||
      v === null ||
      !("draft" in v) ||
      !("appliedCode" in v) ||
      typeof (v as { draft: unknown }).draft !== "string" ||
      typeof (v as { appliedCode: unknown }).appliedCode !== "string"
    ) {
      return null;
    }
    return {
      draft: (v as LabTsxPersisted).draft,
      appliedCode: (v as LabTsxPersisted).appliedCode,
    };
  } catch {
    return null;
  }
}

export function serializeLabTsx(p: LabTsxPersisted): string {
  return JSON.stringify(p);
}

/** 从 localStorage 读取；失败返回 null */
export function loadLabTsxFromStorage(): LabTsxPersisted | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return parsePersistedLabTsx(window.localStorage.getItem(MOBILE_APP_LAB_TSX_STORAGE_KEY));
  } catch {
    return null;
  }
}

export type SaveLabTsxResult = { ok: true } | { ok: false; reason: "quota" | "unknown" };

export function saveLabTsxToStorage(p: LabTsxPersisted): SaveLabTsxResult {
  try {
    window.localStorage.setItem(MOBILE_APP_LAB_TSX_STORAGE_KEY, serializeLabTsx(p));
    return { ok: true };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unknown" };
  }
}

export function clearLabTsxStorage(): void {
  try {
    window.localStorage.removeItem(MOBILE_APP_LAB_TSX_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
