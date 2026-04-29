"use client";

import { useEffect } from "react";

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

/**
 * Registers a beforeunload listener that fires navigator.sendBeacon to clear
 * the Redis session when the user closes the tab or browser window.
 *
 * sendBeacon is used because:
 *  - It is guaranteed to be dispatched even as the page unloads.
 *  - fetch/axios requests are cancelled by the browser on unload.
 *  - It does NOT support custom headers, so the token is sent in the body.
 */
export function useBeaconLogout() {
  useEffect(() => {
    const handleUnload = () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken || !AUTH_API) return;

      const url = `${AUTH_API}/auth/beacon-logout`;

      // sendBeacon only accepts Blob, ArrayBuffer, FormData, URLSearchParams, or string.
      // We use a Blob with application/json so the backend can parse req.body normally.
      const payload = JSON.stringify({ accessToken });
      const blob = new Blob([payload], { type: "application/json" });

      navigator.sendBeacon(url, blob);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
