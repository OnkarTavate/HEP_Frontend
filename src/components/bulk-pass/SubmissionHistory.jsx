"use client";

/**
 * SubmissionHistory.jsx
 * ---------------------
 * The batch history of a single Bulk Pass, shared by the applicant portal and
 * every management detail page so both sides read the same story:
 *
 *   Bulk Pass → Validity → Multiple Batches → Persons / Vehicles → Status
 *
 * Renders as a table from `md` up and as stacked cards below it, because the
 * applicant usually opens their link on a phone.
 */

import React from "react";
import { Archive, Eye, Users, Car, Clock, CheckCircle2, XCircle, Download, Loader2 } from "lucide-react";

// Lifecycle labels for a single batch inside a Bulk Pass. Kept in one place so
// the applicant never sees an internal enum name.
export const SUBMISSION_STATUS_META = {
  DRAFT: {
    label: "Awaiting Upload",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  RETURNED_TO_APPLICANT: {
    label: "Returned",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    dot: "bg-purple-500",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

export function submissionStatusMeta(status) {
  return (
    SUBMISSION_STATUS_META[status] || {
      label: status || "Unknown",
      badge: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
      dot: "bg-slate-400",
    }
  );
}

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatWhen(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : dateTimeFmt.format(d);
}

export function SubmissionStatusBadge({ status }) {
  const meta = submissionStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} shrink-0`} />
      {meta.label}
    </span>
  );
}

/**
 * Tolerates both shapes the API returns for a submission: the applicant
 * `validate-token` payload and the management `getChildSubmissions` payload.
 */
function normalise(submission, index) {
  const persons =
    submission.personsCount ??
    submission.submittedPersonsCount ??
    submission.noOfPersons ??
    0;
  const vehicles =
    submission.vehiclesCount ??
    submission.submittedVehiclesCount ??
    submission.noOfVehicles ??
    0;

  // Officer verdicts per row. A rejected batch counts every person as rejected
  // even if the officer never reached them individually.
  const rejectedBatch = submission.status === "REJECTED";
  const approved = rejectedBatch ? 0 : Number(submission.approvedPersonsCount ?? 0) || 0;
  const rejected = rejectedBatch
    ? Number(persons) || 0
    : Number(submission.rejectedPersonsCount ?? 0) || 0;

  return {
    id: submission.id,
    number: submission.submissionNumber ?? submission.submission_number ?? index + 1,
    refNo: submission.refNo || "—",
    persons: Number(persons) || 0,
    vehicles: Number(vehicles) || 0,
    approved,
    rejected,
    status: submission.status,
    submittedAt: submission.submittedAt || submission.createdAt || null,
    validityUpto: submission.validityUpto || null,
    // The approved pass exists once Traffic has finalised the batch.
    passAvailable: submission.passAvailable ?? (submission.status === "COMPLETED" && !!submission.qrPdfPath),
  };
}

/**
 * "27 approved · 3 rejected" under a person count, once the officer has
 * decided anything. Rejected people give their place on the Bulk Pass back,
 * so the applicant needs to see that number, not just the batch status.
 */
function VerdictLine({ approved, rejected }) {
  if (!approved && !rejected) return null;
  return (
    <span className="flex items-center gap-2 text-[10px] font-semibold mt-0.5">
      {approved > 0 && (
        <span className="inline-flex items-center gap-0.5 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> {approved} approved
        </span>
      )}
      {rejected > 0 && (
        <span className="inline-flex items-center gap-0.5 text-red-600">
          <XCircle className="h-3 w-3" /> {rejected} rejected
        </span>
      )}
    </span>
  );
}

function Loading({ accent }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div
        className="h-9 w-9 rounded-full border-[3px] border-t-transparent animate-spin"
        style={{ borderColor: accent, borderTopColor: "transparent" }}
      />
      <p className="text-sm text-slate-400">Loading submission history…</p>
    </div>
  );
}

function Empty({ emptyTitle, emptyHint }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Archive className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{emptyTitle}</p>
      <p className="text-xs text-slate-400 max-w-sm">{emptyHint}</p>
    </div>
  );
}

/**
 * @param {Array}    submissions  batches belonging to this Bulk Pass
 * @param {boolean}  loading
 * @param {Function} onView       called with the submission when "View" is clicked; omit to hide the action
 * @param {Function} onDownload   called with the submission when "Download pass" is clicked on an
 *                                approved batch; omit to hide the action
 * @param {number|string} downloadingId  id of the batch whose pass is being fetched, for the spinner
 * @param {string}   accent       spinner / highlight colour, matches the host console
 */
export default function SubmissionHistory({
  submissions = [],
  loading = false,
  onView,
  onDownload,
  downloadingId = null,
  accent = "#f59e0b",
  emptyTitle = "No batches submitted yet",
  emptyHint = "Submissions made with this bulk pass link will be listed here.",
  className = "",
}) {
  if (loading) return <Loading accent={accent} />;
  if (!submissions.length) return <Empty emptyTitle={emptyTitle} emptyHint={emptyHint} />;

  const rows = submissions.map(normalise);
  const showActions = !!(onView || onDownload);

  // "Download pass" appears only once Traffic has approved the batch.
  const DownloadButton = ({ s, full = false }) => {
    if (!onDownload || s.status !== "COMPLETED") return null;
    const busy = downloadingId != null && String(downloadingId) === String(s.id);
    return (
      <button
        type="button"
        onClick={() => onDownload(s)}
        disabled={busy}
        title={s.passAvailable ? "Download the approved pass (PDF)" : "The pass document is being prepared"}
        className={`bp-press inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition whitespace-nowrap ${
          full ? "w-full py-2" : "py-1.5"
        }`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download pass
      </button>
    );
  };

  return (
    <div className={className}>
      {/* ── Desktop / tablet: table ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl ring-1 ring-slate-100">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Batch", "Reference No", "Persons", "Vehicles", "Status", "Submitted On", ...(showActions ? [""] : [])].map(
                (h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((s, i) => (
              <tr
                key={s.id}
                className="bp-row bp-reveal hover:bg-amber-50/40"
                style={{ "--bp-delay": `${Math.min(i, 8) * 45}ms` }}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-lg bg-slate-900 text-white text-xs font-bold tabular-nums">
                    #{s.number}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                  {s.refNo}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold tabular-nums">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {s.persons}
                  </span>
                  <VerdictLine approved={s.approved} rejected={s.rejected} />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold tabular-nums">
                    <Car className="h-3.5 w-3.5 text-slate-400" />
                    {s.vehicles}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SubmissionStatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {formatWhen(s.submittedAt)}
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <DownloadButton s={s} />
                      {onView && (
                        <button
                          type="button"
                          onClick={() => onView(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked cards ── */}
      <ul className="md:hidden flex flex-col gap-3">
        {rows.map((s, i) => (
          <li
            key={s.id}
            className="rounded-2xl ring-1 ring-slate-200 bg-white p-4 bp-reveal bp-lift"
            style={{ "--bp-delay": `${Math.min(i, 8) * 45}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold tabular-nums">
                    #{s.number}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 truncate">{s.refNo}</span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatWhen(s.submittedAt)}
                </p>
              </div>
              <SubmissionStatusBadge status={s.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold tabular-nums">
                <Users className="h-4 w-4 text-slate-400" />
                {s.persons}
                <span className="text-xs font-normal text-slate-400">persons</span>
              </span>
              <VerdictLine approved={s.approved} rejected={s.rejected} />
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold tabular-nums">
                <Car className="h-4 w-4 text-slate-400" />
                {s.vehicles}
                <span className="text-xs font-normal text-slate-400">vehicles</span>
              </span>
            </div>

            {showActions && (
              <div className="mt-3 flex flex-col gap-2">
                <DownloadButton s={s} full />
                {onView && (
                  <button
                    type="button"
                    onClick={() => onView(s)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <Eye className="h-3.5 w-3.5" /> View details
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact stat strip summarising every batch sent against one Bulk Pass.
 * `summary` is the `submissionSummary` object returned by the API; when it is
 * missing the numbers are derived from the history rows so the strip still
 * renders something truthful.
 */
export function SubmissionSummaryStrip({ summary, submissions = [], className = "" }) {
  const rows = submissions.map(normalise);
  const totals = {
    submissions: summary?.totalSubmissions ?? rows.length,
    persons: summary?.totalPersons ?? rows.reduce((n, s) => n + s.persons, 0),
    vehicles: summary?.totalVehicles ?? rows.reduce((n, s) => n + s.vehicles, 0),
    approvedPersons: summary?.approvedPersons ?? rows.reduce((n, s) => n + s.approved, 0),
    rejectedPersons: summary?.rejectedPersons ?? rows.reduce((n, s) => n + s.rejected, 0),
  };

  const tiles = [
    { label: "Total Batches", value: totals.submissions, icon: Archive, cls: "bg-slate-100 text-slate-600" },
    { label: "Persons Submitted", value: totals.persons, icon: Users, cls: "bg-blue-100 text-blue-600" },
    { label: "Persons Approved", value: totals.approvedPersons, icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600" },
    { label: "Persons Rejected", value: totals.rejectedPersons, icon: XCircle, cls: "bg-red-100 text-red-600" },
    { label: "Vehicles Submitted", value: totals.vehicles, icon: Car, cls: "bg-purple-100 text-purple-600" },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}>
      {tiles.map(({ label, value, icon: Icon, cls }, i) => (
        <div
          key={label}
          className="rounded-2xl ring-1 ring-slate-200 bg-white px-4 py-3.5 bp-reveal bp-lift"
          style={{ "--bp-delay": `${i * 50}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">{value ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 truncate">
                {label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
