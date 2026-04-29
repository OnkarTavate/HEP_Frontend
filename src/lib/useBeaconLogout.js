"use client";

import { useEffect } from "react";

/**
 * Registers a beforeunload listener that fires navigator.sendBeacon to clear
 * the Redis session when the user closes the tab or browser window.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. sendBeacon is used because fetch/axios are cancelled by the browser on unload.
 *
 * 2. We use application/x-www-form-urlencoded (NOT application/json) because:
 *    - JSON blobs trigger a CORS preflight (OPTIONS request).
 *    - The browser will NOT wait for the preflight to complete on unload.
 *    - The beacon is silently dropped as a result.
 *    - URLSearchParams / form-encoded bodies are "simple requests" — no preflight,
 *      so the beacon fires immediately and reliably.
 *
 * 3. AUTH_API is read inside the handler (not at module load) to avoid
 *    capturing an undefined value during Next.js SSR/module initialisation.
 */
export function useBeaconLogout() {
  useEffect(() => {
    const handleUnload = () => {
      const accessToken = localStorage.getItem("accessToken");
      const authApi = process.env.NEXT_PUBLIC_AUTH_API;

      if (!accessToken || !authApi) return;

      const url = `${authApi}/auth/beacon-logout`;

      // URLSearchParams produces application/x-www-form-urlencoded — a CORS
      // "simple request" that requires no preflight and fires reliably on unload.
      const body = new URLSearchParams({ accessToken });

      navigator.sendBeacon(url, body);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
