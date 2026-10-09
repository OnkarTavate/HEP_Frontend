"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { shiftDays, toISTDateString } from "./format";

/** Keys shared by every tab; everything else is tab-specific and reset on tab change. */
export const GLOBAL_KEYS = ["tab", "from", "to", "fromTime", "toTime", "terminal", "weighbridge", "movement", "q"];

export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "eir", label: "EIR" },
  { key: "form13", label: "Form 13" },
  { key: "weighbridge", label: "Weighbridge" },
  { key: "customs", label: "Customs" },
  { key: "gate", label: "Gate Events" },
  { key: "journey", label: "Container Journey" },
];

export const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

export const SHIFTS = [
  { key: "all", label: "All day", fromTime: "", toTime: "" },
  { key: "shift1", label: "Shift 1 · 07–14", fromTime: "07:00", toTime: "14:00" },
  { key: "shift2", label: "Shift 2 · 14–21", fromTime: "14:00", toTime: "21:00" },
  { key: "shift3", label: "Shift 3 · 21–07", fromTime: "21:00", toTime: "07:00" },
];

export function presetRange(key) {
  const today = toISTDateString();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = shiftDays(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: shiftDays(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "30d":
    default:
      return { from: shiftDays(today, -29), to: today };
  }
}

export function detectPreset(from, to) {
  if (!from || !to) return "custom";
  for (const p of DATE_PRESETS) {
    if (p.key === "custom") continue;
    const r = presetRange(p.key);
    if (r.from === from && r.to === to) return p.key;
  }
  return "custom";
}

export function detectShift(fromTime, toTime) {
  const s = SHIFTS.find((x) => x.fromTime === (fromTime || "") && x.toTime === (toTime || ""));
  return s ? s.key : "custom";
}

/**
 * URL-backed state for the dashboard. All filters live in the query string so
 * views are shareable, refresh-safe and deep-linkable from exception cards.
 */
export default function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    const obj = {};
    searchParams.forEach((value, key) => {
      obj[key] = value;
    });
    if (!obj.from && !obj.to) {
      const r = presetRange("30d");
      obj.from = r.from;
      obj.to = r.to;
    }
    if (!obj.tab) obj.tab = "overview";
    return obj;
  }, [searchParams]);

  const replace = useCallback(
    (next) => {
      const sp = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "" && v !== false) sp.set(k, String(v));
      });
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  /** Patch some keys. Any change other than page/sort resets page to 1. */
  const set = useCallback(
    (patch) => {
      const next = { ...state, ...patch };
      const onlyPaging = Object.keys(patch).every((k) => ["page", "limit", "sortBy", "sortOrder"].includes(k));
      if (!onlyPaging) delete next.page;
      replace(next);
    },
    [state, replace],
  );

  /** Switch tab: keep global filters, drop tab-specific ones. */
  const setTab = useCallback(
    (tab, extra = {}) => {
      const next = {};
      GLOBAL_KEYS.forEach((k) => {
        if (state[k]) next[k] = state[k];
      });
      next.tab = tab;
      Object.assign(next, extra);
      replace(next);
    },
    [state, replace],
  );

  const reset = useCallback(() => {
    const r = presetRange("30d");
    replace({ tab: state.tab, from: r.from, to: r.to });
  }, [replace, state.tab]);

  return { state, set, setTab, reset };
}
