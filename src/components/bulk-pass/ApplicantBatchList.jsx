"use client";

/**
 * ApplicantBatchList.jsx
 * ----------------------
 * The applicant's compact list of batches on one Bulk Pass. One dense row per
 * batch — just enough to recognise it — and the full detail only once a row is
 * selected. Long lists are revealed a page at a time with "Load more", so the
 * applicant is never handed thirty rows at once.
 *
 * Expects rows already normalised by `groupApplicantBatches`.
 */

import React, { useState } from "react";
import { Archive, Users, Car, ChevronRight, Download, Loader2, AlertCircle, Edit2 } from "lucide-react";
import { formatBatchWindow, SubmissionStatusBadge } from "./SubmissionHistory";

export const BATCH_PAGE_SIZE = 6;

export default function ApplicantBatchList({
  rows = [],
  selectedId = null,
  onSelect,
  onDownload,
  downloadingId = null,
  onCorrect = null,
  correctionLoadingId = null,
  correctingId = null,
  emptyTitle = "No batches here",
  emptyHint = "",
}) {
  const [loaded, setLoaded] = useState(BATCH_PAGE_SIZE);

  // A batch selected from elsewhere (the correction alert, the success panel)
  // may sit beyond the loaded page — always reveal enough rows to show it.
  const selectedIdx = selectedId == null ? -1 : rows.findIndex((r) => String(r.id) === String(selectedId));
  const visible = Math.max(loaded, Math.ceil((selectedIdx + 1) / BATCH_PAGE_SIZE) * BATCH_PAGE_SIZE);

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 gap-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
          <Archive className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-stone-600">{emptyTitle}</p>
        {emptyHint && <p className="text-xs text-stone-400 max-w-xs">{emptyHint}</p>}
      </div>
    );
  }

  const shown = rows.slice(0, visible);
  const left = rows.length - shown.length;

  return (
    <div className="flex flex-col">
      <ul role="listbox" aria-label="Batches" className="flex flex-col gap-2">
        {shown.map((s) => {
          const selected = selectedId != null && String(selectedId) === String(s.id);
          const returned = s.status === "RETURNED_TO_APPLICANT";
          const canDownload = onDownload && s.status === "COMPLETED";
          const busy = downloadingId != null && String(downloadingId) === String(s.id);
          const correcting = correctingId != null && String(correctingId) === String(s.id);
          const loadingCorrection = correctionLoadingId != null && String(correctionLoadingId) === String(s.id);
          return (
            <li key={s.id} role="option" aria-selected={selected}>
              <div
                className={`group flex items-center gap-3 rounded-2xl px-3 sm:px-4 py-3 ring-1 transition cursor-pointer ${
                  selected
                    ? "bg-amber-50 ring-amber-300"
                    : returned
                    ? "bg-orange-50/50 ring-orange-200 hover:ring-orange-300"
                    : "bg-white ring-stone-200 hover:ring-amber-200 hover:bg-amber-50/30"
                }`}
                onClick={() => onSelect?.(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(s);
                  }
                }}
                tabIndex={0}
              >
                <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-lg bg-stone-900 text-white text-xs font-bold tabular-nums shrink-0">
                  #{s.number}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-bold text-stone-800 truncate max-w-[12rem]">{s.refNo}</span>
                    <SubmissionStatusBadge status={s.status} />
                    {returned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700">
                        <AlertCircle className="h-3 w-3" /> {correcting ? "Being corrected" : "Changes needed"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                    <span className="font-semibold text-stone-600">{formatBatchWindow(s.validityFrom, s.validityUpto)}</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Users className="h-3 w-3 text-stone-400" />
                      {s.persons}
                      {s.rejected > 0 && <span className="text-red-600">({s.rejected} rejected)</span>}
                    </span>
                    {s.vehicles > 0 && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Car className="h-3 w-3 text-stone-400" />
                        {s.vehicles}
                      </span>
                    )}
                  </div>
                </div>

                {returned && onCorrect && !correcting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCorrect(s);
                    }}
                    disabled={loadingCorrection}
                    title="Correct this batch here"
                    aria-label={`Correct batch #${s.number}`}
                    className="bp-press inline-flex h-8 w-8 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 shrink-0"
                  >
                    {loadingCorrection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit2 className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Correct</span>
                  </button>
                )}
                {canDownload && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(s);
                    }}
                    disabled={busy}
                    title="Download the approved pass (PDF)"
                    aria-label={`Download pass for batch #${s.number}`}
                    className="bp-press inline-flex h-8 w-8 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shrink-0"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Pass</span>
                  </button>
                )}
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition ${selected ? "text-amber-600" : "text-stone-300 group-hover:text-stone-500"}`}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {left > 0 && (
        <button
          type="button"
          onClick={() => setLoaded(visible + BATCH_PAGE_SIZE)}
          className="mt-3 self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition"
        >
          Load more ({Math.min(left, BATCH_PAGE_SIZE)} of {left} remaining)
        </button>
      )}
    </div>
  );
}
