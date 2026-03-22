"use client";

import { useEffect } from "react";

/** Warn before closing or refreshing the tab when an exam is in progress. */
export function useNavigationGuard(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
