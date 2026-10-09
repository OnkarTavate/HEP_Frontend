"use client";

import { useEffect, useState } from "react";
import { compactParams, fetchTraffic } from "./api";

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX = 200;

/**
 * Fetches `${TRAFFIC_API}${path}` with params. Aborts stale requests when params
 * change, keeps a short in-memory cache per (path, params) so tab switches feel
 * instant, keeps the previous payload visible while a new one loads, and exposes
 * a manual `refetch`. State is only set from async callbacks (React Compiler safe).
 */
export default function useTrafficData(path, params = {}, { enabled = true } = {}) {
  const key = `${path}?${JSON.stringify(compactParams(params))}`;
  const [results, setResults] = useState({});
  const [tick, setTick] = useState(0);

  const cached = cache.get(key);
  const entry = results[key] || (cached ? { data: cached.data, error: null } : null);

  useEffect(() => {
    if (!enabled) return undefined;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS && tick === 0) return undefined;

    const controller = new AbortController();
    fetchTraffic(path, params, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (cache.size >= CACHE_MAX) cache.clear();
        cache.set(key, { data, at: Date.now() });
        setResults((r) => ({ ...r, [key]: { data, error: null }, __last: data }));
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        setResults((r) => ({ ...r, [key]: { data: r[key]?.data || null, error: err?.message || "Request failed" } }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, tick]);

  return {
    data: entry?.data ?? results.__last ?? null,
    loading: enabled && !entry,
    error: entry?.error || null,
    refetch: () => setTick((t) => t + 1),
  };
}

export function clearTrafficCache() {
  cache.clear();
}
