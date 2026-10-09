"use client";

import { formatBadge } from "@/lib/notificationCounts";

/**
 * Unread-notification count for a sidebar tab. Beside the label when the
 * sidebar is expanded; pinned to the icon's corner when it is collapsed.
 * The parent link must be `relative` for the collapsed placement.
 */
export default function NavUnreadBadge({ count, expanded = true }) {
  if (!count) return null;
  const label = `${count} unread notification${count === 1 ? "" : "s"}`;
  return (
    <span
      aria-label={label}
      title={label}
      className={
        expanded
          ? "ml-auto shrink-0 min-w-[1.375rem] h-[1.375rem] px-1.5 inline-flex items-center justify-center rounded-full bg-red-600 text-[11px] font-extrabold text-white tabular-nums"
          : "absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 inline-flex items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white tabular-nums ring-2 ring-[#0a0a0a]"
      }
    >
      {formatBadge(count)}
    </span>
  );
}
