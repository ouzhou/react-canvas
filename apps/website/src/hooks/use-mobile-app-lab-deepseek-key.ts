import {
  clearDeepseekApiKey,
  readDeepseekApiKey,
  writeDeepseekApiKey,
} from "@/lib/mobile-app-lab-deepseek-settings";
import { useCallback, useState } from "react";

/**
 * DeepSeek API Key（localStorage），与 {@link readDeepseekApiKey} 同步。
 */
export function useMobileAppLabDeepseekKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => readDeepseekApiKey());

  const save = useCallback((key: string) => {
    const t = key.trim();
    if (t) {
      writeDeepseekApiKey(t);
      setApiKey(t);
    } else {
      clearDeepseekApiKey();
      setApiKey(null);
    }
  }, []);

  const clear = useCallback(() => {
    clearDeepseekApiKey();
    setApiKey(null);
  }, []);

  return { apiKey, save, clear };
}
