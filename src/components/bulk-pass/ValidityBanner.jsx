"use client";

/**
 * ValidityBanner.jsx
 * ------------------
 * Says, in one glance, whether a Bulk Pass is still accepting batches.
 *
 * The applicant portal shows the full banner; management tables use the
 * `ValidityBadge` export. Both read the same `validity` object the API returns
 * so the two sides can never disagree.
 */

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, CalendarClock, Info } from "lucide-react";
import { getValidityMeta, describeRemaining, formatValidityDateTime } from "@/lib/bulkPassValidity";

const ICONS = {
  ACTIVE: CheckCircle2,
  EXPIRING_SOON: AlertTriangle,
  EXPIRED: XCircle,
  NOT_STARTED: CalendarClock,
  UNKNOWN: Info,
};

export function ValidityBadge({ validity, className = "" }) {
  const meta = getValidityMeta(validity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${meta.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} shrink-0`} />
      {meta.label}
    </span>
  );
}

/**
 * @param {object}  validity   { state, expiringSoon, daysRemaining, validityFrom, validityUpto }
 * @param {boolean} canSubmit  whether another batch may be sent right now
 * @param {string}  message    server-supplied explanation when submissions are closed
 */
export default function ValidityBanner({ validity, canSubmit, message, className = "" }) {
  const meta = getValidityMeta(validity);
  const Icon = ICONS[meta.key] || Info;

  // What the applicant most needs to know, in order of usefulness. A pass can
  // be inside its window yet closed for another reason (allowance spent, link
  // switched off), and the headline must not promise a batch the server will
  // refuse.
  const openButBlocked = canSubmit === false && (meta.key === "ACTIVE" || meta.key === "EXPIRING_SOON");
  const headline = openButBlocked
    ? "This bulk pass is within its validity, but new submissions are closed"
    : meta.key === "ACTIVE"
      ? "This bulk pass is active — you can submit another batch"
      : meta.key === "EXPIRING_SOON"
      ? "This bulk pass is nearing expiry"
      : meta.key === "EXPIRED"
      ? "This bulk pass has expired"
      : meta.key === "NOT_STARTED"
      ? "This bulk pass has not started yet"
      : "Validity period unavailable";

  const detail =
    message ||
    (meta.key === "ACTIVE"
      ? `Use this same link to send batches any time until ${formatValidityDateTime(validity?.validityUpto, { upto: true })}.` +
        // The link opens when it is issued; the visit window may start later.
        (validity?.visitsNotStarted ? ` Visits can be scheduled from ${formatValidityDateTime(validity?.validityFrom)}.` : "")
      : meta.key === "EXPIRING_SOON"
      ? `Submissions close on ${formatValidityDateTime(validity?.validityUpto, { upto: true })}. Send any remaining batches before then.`
      : meta.key === "NOT_STARTED"
      ? `Submissions open on ${formatValidityDateTime(validity?.validityFrom)}.`
      : "");

  // How far through the validity window we are, from the dates alone (no
  // clock read during render): the server already gives daysRemaining.
  const from = validity?.validityFrom ? new Date(validity.validityFrom) : null;
  const upto = validity?.validityUpto ? new Date(validity.validityUpto) : null;
  const totalDays =
    from && upto && !Number.isNaN(from.getTime()) && !Number.isNaN(upto.getTime())
      ? Math.max(1, Math.round((upto.getTime() - from.getTime()) / 86400000))
      : null;
  const elapsedPct =
    totalDays != null && typeof validity?.daysRemaining === "number"
      ? Math.min(100, Math.max(0, Math.round(((totalDays - validity.daysRemaining) / totalDays) * 100)))
      : null;

  return (
    <div className={`rounded-2xl p-4 sm:p-5 bp-reveal ${openButBlocked ? "bg-amber-50 ring-1 ring-amber-200" : meta.panel} ${className}`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 ${meta.heading}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`text-sm font-bold ${meta.heading}`}>{headline}</p>
            <ValidityBadge validity={validity} />
          </div>
          {detail && <p className={`text-xs leading-relaxed ${meta.body}`}>{detail}</p>}

          <div className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs ${meta.body}`}>
            {validity?.validityFrom && (
              <span>
                <span className="font-semibold uppercase tracking-wider opacity-70">Valid From</span>{" "}
                <span className="font-bold">{formatValidityDateTime(validity.validityFrom)}</span>
              </span>
            )}
            <span>
              <span className="font-semibold uppercase tracking-wider opacity-70">Valid Until</span>{" "}
              <span className="font-bold">{formatValidityDateTime(validity?.validityUpto, { upto: true })}</span>
            </span>
            <span className="font-bold">{describeRemaining(validity)}</span>
          </div>

          {elapsedPct != null && meta.key !== "NOT_STARTED" && (
            <div className="mt-3 h-1.5 rounded-full bg-white/70 ring-1 ring-black/5 overflow-hidden" aria-hidden="true">
              <div
                className={`h-full bp-bar ${meta.key === "EXPIRED" ? "bg-red-400" : meta.key === "EXPIRING_SOON" ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
          )}

          {/* Only shown when the window is open but something else blocks the
              applicant — e.g. the department revoked the link. */}
          {canSubmit === false && meta.key === "ACTIVE" && !message && (
            <p className={`mt-2 text-xs font-semibold ${meta.body}`}>
              New submissions are currently unavailable for this bulk pass.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
