"use client";

import {
  clearLabTsxStorage,
  saveLabTsxToStorage,
  type LabTsxPersisted,
} from "@/lib/mobile-app-lab-tsx-storage";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type MobileAppLabTsxContextValue = {
  draft: string;
  setDraft: (v: string | ((prev: string) => string)) => void;
  appliedCode: string;
  setAppliedCode: (v: string | ((prev: string) => string)) => void;
  draftForPrompt: string;
  resetLabTsx: () => void;
  persistError: string | null;
};

export const MobileAppLabTsxContext = createContext<MobileAppLabTsxContextValue | null>(null);

export function MobileAppLabTsxProvider({
  children,
  defaultSource,
  initialFromStorage,
}: {
  children: ReactNode;
  defaultSource: string;
  initialFromStorage: LabTsxPersisted | null;
}) {
  const initialDraft = initialFromStorage?.draft ?? defaultSource;
  const initialApplied = initialFromStorage?.appliedCode ?? defaultSource;
  const [draft, setDraft] = useState(initialDraft);
  const [appliedCode, setAppliedCode] = useState(initialApplied);
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    const result = saveLabTsxToStorage({ draft, appliedCode });
    if (result.ok) {
      setPersistError(null);
    } else if (result.reason === "quota") {
      setPersistError("本地存储空间不足，无法保存 TSX（请缩短源码或清理站点数据）。");
    } else {
      setPersistError("无法保存 TSX 到本地存储。");
    }
  }, [draft, appliedCode]);

  const resetLabTsx = useCallback(() => {
    setDraft(defaultSource);
    setAppliedCode(defaultSource);
    clearLabTsxStorage();
    setPersistError(null);
  }, [defaultSource]);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      appliedCode,
      setAppliedCode,
      draftForPrompt: draft,
      resetLabTsx,
      persistError,
    }),
    [draft, appliedCode, resetLabTsx, persistError],
  );

  return (
    <MobileAppLabTsxContext.Provider value={value}>{children}</MobileAppLabTsxContext.Provider>
  );
}
