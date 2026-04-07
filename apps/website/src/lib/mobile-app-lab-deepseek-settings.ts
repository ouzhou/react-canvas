/** localStorage 键：Mobile App Lab 对话使用的 DeepSeek API Key（仅存于本机浏览器）。 */
export const MOBILE_APP_LAB_DEEPSEEK_STORAGE_KEY = "mobile-app-lab:deepseek-api-key";

export function readDeepseekApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const v = window.localStorage.getItem(MOBILE_APP_LAB_DEEPSEEK_STORAGE_KEY);
    const t = v?.trim();
    return !t ? null : t;
  } catch {
    return null;
  }
}

export function writeDeepseekApiKey(key: string): void {
  window.localStorage.setItem(MOBILE_APP_LAB_DEEPSEEK_STORAGE_KEY, key.trim());
}

export function clearDeepseekApiKey(): void {
  window.localStorage.removeItem(MOBILE_APP_LAB_DEEPSEEK_STORAGE_KEY);
}
