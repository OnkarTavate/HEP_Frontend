"use client";

import { useSyncExternalStore } from "react";

/**
 * Unread notification counts keyed by sidebar href.
 *
 * NotificationPanel owns fetching and read-state; it publishes the per-tab
 * unread counts here so the sidebar can badge each tab without fetching the
 * same feeds a second time.
 */
let counts = {};
const listeners = new Set();

export function setNotificationCounts(next) {
  counts = next;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => counts;
const EMPTY = {};
const getServerSnapshot = () => EMPTY;

export function useNotificationCounts() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Unread count for a sidebar item: notifications on that page or below it. */
export function unreadForHref(countsByHref, href) {
  return Object.entries(countsByHref).reduce(
    (sum, [path, n]) => (path === href || path.startsWith(`${href}/`) ? sum + n : sum),
    0,
  );
}

/** Small red count pill, matching the bell's badge. */
export function formatBadge(n) {
  return n > 99 ? "99+" : String(n);
}
