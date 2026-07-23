"use client";

import { useTheme as useNextThemes } from "next-themes";
import { useCallback } from "react";

/**
 * Thin wrapper around next-themes that also persists the choice to the
 * profiles table via API (server-side, cross-device).
 *
 * The local next-themes state updates instantly (no FOUC); the API call
 * is fire-and-forget — if it fails, the preference still works locally
 * for this session, and will be re-persisted on next successful toggle.
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextThemes();

  const setPersistedTheme = useCallback(
    async (newTheme: "light" | "dark" | "system") => {
      setTheme(newTheme);
      try {
        await fetch("/api/profile/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newTheme }),
        });
      } catch {
        // Best-effort persistence — local state still applied
      }
    },
    [setTheme],
  );

  return {
    theme,
    resolvedTheme,
    setTheme: setPersistedTheme,
  };
}
