"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileStack,
  CornerUpLeft,
  Activity,
  ChevronRight,
  Inbox,
  Send,
  FileText,
  Car,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// ── Status metadata ──────────────────────────────────────────────────────────
// Each status represents a stage in the bulk pass lifecycle.
const STATUS_META = {
  DRAFT: {
    label: "Sent to User",
    // What it means: The department created the batch and the invitation email
    // with the upload link has been sent to the applicant. Waiting for them to
    // fill in visitor details and photos.
    description: "Invitation sent to applicant — waiting for them to upload visitor details & photos.",
    bg: "bg-stone-100 dark:bg-stone-700/40",
    text: "text-stone-600 dark:text-stone-300",
    border: "border-stone-200 dark:border-stone-600",
    dot: "bg-stone-400",
  },
  UNDER_REVIEW: {
    label: "Pending Approval",
    // What it means: Applicant has submitted the data. Now sitting in the
    // traffic officer's queue, waiting to be approved or rejected.
    description: "Applicant submitted data — awaiting traffic officer review & approval.",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-700",
    dot: "bg-amber-500",
  },
  RETURNED_TO_APPLICANT: {
    label: "Returned",
    // What it means: Traffic officer or admin found issues and sent it back
    // to the applicant with a reason. A fresh upload link is re-issued.
    description: "Officer returned it to the applicant to fix errors — a new upload link was sent.",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-700",
    dot: "bg-purple-500",
  },
  REJECTED: {
    label: "Rejected",
    // What it means: Traffic officer rejected the batch. No pass will be issued.
    description: "Rejected by the traffic officer — no pass issued for this batch.",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-700",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Approved",
    // What it means: Traffic officer approved it. QR passes have been generated
    // and the applicant can download the PDF.
    description: "Approved by traffic officer — QR pass PDF generated and sent to applicant.",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-700",
    dot: "bg-emerald-500",
  },
};

const fmtDateTime = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const formatWhen = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : fmtDateTime.format(d);
};

const titleCase = (s) =>
  !s ? "—" : String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Card shell ───────────────────────────────────────────────────────────────
const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "transition-all duration-300";

// ── Status card with tooltip description ─────────────────────────────────────
function StatusCard({ statusKey, value, onClick }) {
  const meta = STATUS_META[statusKey];
  const [showTip, setShowTip] = useState(false);

  const iconMap = {
    DRAFT: Send,
    UNDER_REVIEW: Clock,
    RETURNED_TO_APPLICANT: CornerUpLeft,
    REJECTED: XCircle,
    COMPLETED: CheckCircle2,
  };
  const Icon = iconMap[statusKey] || FileText;

  return (
    <div
      onClick={onClick}
      className={`${cardShell} p-4 sm:p-5 ring-1 ${meta.border} flex flex-col gap-3 transition-all relative ${
        onClick
          ? "cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
          : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex items-center justify-center h-8 w-8 rounded-xl ${meta.bg} shrink-0`}>
            <Icon className={`h-4 w-4 ${meta.text}`} strokeWidth={2.5} />
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${meta.text} leading-tight`}>
            {meta.label}
          </span>
        </div>
        {/* Info tooltip trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTip((v) => !v); }}
            onBlur={() => setShowTip(false)}
            className="text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 transition focus:outline-none"
            tabIndex={-1}
            aria-label="What does this mean?"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {showTip && (
            <div className="absolute right-0 top-6 z-20 w-56 rounded-2xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200 dark:ring-white/10 shadow-xl p-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {meta.description}
            </div>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums leading-none">
        {value ?? 0}
      </p>

      {/* Dot indicator bar */}
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-6 rounded-full ${meta.dot} opacity-60`} />
        {onClick && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500">
            Click to filter
          </span>
        )}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`${cardShell} p-5 ${className}`}>
      <h3 className="flex items-center gap-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 uppercase tracking-widest mb-4">
        {Icon && (
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
          </span>
        )}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkPassDashboard({
  fetcher,
  stats: statsProp,
  loading: loadingProp,
  onRefresh,
  variant = "dept",
  title = "Bulk Pass Dashboard",
  subtitle = "Overview of group port-entry pass activity",
  queueHref,
  queueLabel = "Open Queue",
  detailHrefBase,
  onCardClick,
  hideHeader = false,
}) {
  const router = useRouter();
  const controlled = typeof fetcher !== "function";
  const [internalStats, setInternalStats] = useState(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const load = useCallback(
    async (showSpinner = true) => {
      if (controlled) {
        onRefresh?.();
        return;
      }
      if (showSpinner) setInternalLoading(true);
      try {
        const data = await fetcher();
        setInternalStats(data);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load dashboard.");
      } finally {
        if (showSpinner) setInternalLoading(false);
      }
    },
    [fetcher, controlled, onRefresh]
  );

  useEffect(() => {
    if (controlled) return;
    load(true);
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, [load, controlled]);

  const stats = controlled ? statsProp : internalStats;
  const loading = controlled ? loadingProp : internalLoading;
  const summary = stats?.summary || {};
  const activity = stats?.recentActivity || [];
  const accent = variant === "traffic" ? "#ff6b00" : "#f59e0b";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: accent, borderTopColor: "transparent" }}
          />
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5">

      {/* Header */}
      {!hideHeader && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accent}20` }}
            >
              <Activity className="h-5 w-5" style={{ color: accent }} strokeWidth={2.5} />
            </span>
            {title}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {queueHref && (
            <button
              onClick={() => router.push(queueHref)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: accent }}
            >
              <Inbox className="h-4 w-4" strokeWidth={2.5} />
              {queueLabel}
              {summary.pendingReview > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white/25 text-[11px] font-bold">
                  {summary.pendingReview}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
      )}

      {/* ── Summary strip ── */}
      <div className={`${cardShell} p-5`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/5">
              <FileStack className="h-5 w-5 text-stone-600 dark:text-stone-300" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Batches</p>
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">{summary.totalBatches ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Persons</p>
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">{summary.totalPersons ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30">
              <Car className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Total Vehicles</p>
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">{summary.totalVehicles ?? 0}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Status cards (5 statuses with descriptions) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
        <StatusCard statusKey="DRAFT"                 value={summary.draft}        onClick={() => onCardClick?.("DRAFT")} />
        <StatusCard statusKey="UNDER_REVIEW"          value={summary.underReview}  onClick={() => onCardClick?.("UNDER_REVIEW")} />
        <StatusCard statusKey="RETURNED_TO_APPLICANT" value={summary.returned}     onClick={() => onCardClick?.("RETURNED_TO_APPLICANT")} />
        <StatusCard statusKey="REJECTED"              value={summary.rejected}     onClick={() => onCardClick?.("REJECTED")} />
        <StatusCard statusKey="COMPLETED"             value={summary.completed}    onClick={() => onCardClick?.("COMPLETED")} />
      </div>

      {/* ── Recent activity ── */}
      <div className="grid grid-cols-1 gap-5">

        {/* Recent Activity */}
        <Panel title="Recent Activity" icon={Activity}>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-stone-400 dark:text-stone-500">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-100 dark:divide-white/[0.06] max-h-[360px] overflow-y-auto">
              {activity.map((a, idx) => {
                const meta = STATUS_META[a.status] || {
                  label: titleCase(a.status),
                  bg: "bg-stone-100 dark:bg-white/10",
                  text: "text-stone-600 dark:text-stone-300",
                };
                return (
                  <li
                    key={`${a.batchId}-${idx}`}
                    className={`flex items-center gap-3 py-3 ${
                      detailHrefBase
                        ? "cursor-pointer hover:bg-stone-50/70 dark:hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition"
                        : ""
                    }`}
                    onClick={
                      detailHrefBase
                        ? () => router.push(`${detailHrefBase}/${a.batchId}`)
                        : undefined
                    }
                  >
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${meta.bg} ${meta.text}`}
                    >
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                        <span className="text-amber-600 dark:text-amber-400">{a.refNo || "—"}</span>
                        {a.companyName ? ` · ${a.companyName}` : ""}
                      </p>
                      {a.remarks && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                          {a.remarks}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
                      {formatWhen(a.createdAt)}
                    </span>
                    {detailHrefBase && (
                      <ChevronRight className="h-4 w-4 text-stone-300 dark:text-stone-600 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
