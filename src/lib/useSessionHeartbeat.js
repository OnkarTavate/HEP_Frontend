"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds — must be less than server TTL (120 s)

/**
 * Sends a POST /auth/heartbeat every 60 seconds while the tab is open.
 * The server slides the Redis TTL forward on each call (TTL = 120 s).
 *
 * When the tab is closed:
 *   - Heartbeats stop.
 *   - Redis TTL expires after ~120 s.
 *   - The next login attempt finds no session and proceeds normally.
 *
 * If the server returns 401 (session expired / replaced):
 *   - Clears localStorage and redirects to login.
 */
export function useSessionHeartbeat() {
  const router = useRouter();
  const intervalRef = useRef(null);

  useEffect(() => {
    const beat = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const authApi = process.env.NEXT_PUBLIC_AUTH_API;

      if (!accessToken || !authApi) return;

      try {
        await axios.post(
          `${authApi}/auth/heartbeat`,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (err) {
        if (err?.response?.status === 401) {
          // Session expired or replaced on the server — force re-login
          clearInterval(intervalRef.current);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          router.push("/");
        }
        // Any other error (network blip, 5xx) — silently ignore, try again next interval
      }
    };

    // Fire once immediately so the TTL is refreshed on page load/navigation,
    // then repeat on the interval.
    beat();
    intervalRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [router]);
}
