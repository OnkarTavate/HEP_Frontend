"use client";

/**
 * BulkPassDashboard.jsx — the analytics overview for every management role.
 *
 * Reads the `computeBulkPassStats()` shape. Either pass `stats` + `loading`
 * (controlled) or a `fetcher` that resolves to that shape (self-loading,
 * refreshed every 30 s).
 *
 * Layout, top to bottom: what needs action now → headline numbers → where
 * batches are in the pipeline → six-month trend + visitor mix → recent activity.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Car, CheckCircle2, ChevronRight,
  Clock, CornerUpLeft, FileStack, Inbox, PieChart, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  BATCH_STATUS, BATCH_STATUS_ORDER, Button, Card, EmptyState, PageHeader, RefreshButton,
  Section, Spinner, StatusPill, compactNumber, statusMeta, timeAgo,
} from "./ui";

// Chart colours — categorical slots 1 and 3 from the validated reference palette
// (blue/aqua pass the CVD + normal-vision checks; aqua is < 3:1 on the light
// surface, so the chart always ships a legend, tooltips and a table view).
const SERIES = {
  created: { label: "Created", light: "#2a78d6", dark: "#3987e5", swatch: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  completed: { label: "Approved", light: "#1baf7a", dark: "#199e70", swatch: "bg-[#1baf7a] dark:bg-[#199e70]" },
};
const SEQUENTIAL = "bg-[#2a78d6] dark:bg-[#3987e5]";

// ── Headline tile ────────────────────────────────────────────────────────────

function KpiTile({ label, value, hint, icon: Icon, tone, onClick }) {
  const tones = {
    stone: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Card>
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`w-full text-left p-5 rounded-2xl ${onClick ? "hover:bg-stone-50/60 dark:hover:bg-white/[0.02] transition" : ""}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone] || tones.stone}`}>
            <Icon className="h-4 w-4" strokeWidth={2.3} />
          </span>
        </div>
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 leading-none">{value}</p>
        {hint && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
      </Tag>
    </Card>
  );
}

// ── "Needs your attention" strip ─────────────────────────────────────────────

function AttentionStrip({ pending, returned, onOpen, actionLabel, accent }) {
  if (!pending && !returned) {
    return (
      <Card className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-stone-900 dark:text-stone-50">All caught up</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">No batches are waiting for review right now.</p>
        </div>
      </Card>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 ring-1 ring-amber-200/80 dark:from-amber-400/10 dark:via-amber-400/5 dark:to-orange-400/10 dark:ring-amber-400/20">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-stone-900 shadow-sm">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-950 dark:text-amber-100">Needs your attention</p>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            {pending > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> <b className="text-amber-950 dark:text-amber-100">{pending}</b> pending approval
              </span>
            )}
            {returned > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <CornerUpLeft className="h-4 w-4" /> <b className="text-amber-950 dark:text-amber-100">{returned}</b> returned to applicant
              </span>
            )}
          </div>
        </div>
        {onOpen && (
          <Button variant="primary" accent={accent} onClick={onOpen} className="shrink-0">
            {actionLabel} <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Pipeline: part-to-whole stacked bar + clickable legend rows ─────────────

function Pipeline({ summary, onSelect }) {
  const counts = {
    DRAFT: summary.draft ?? 0,
    UNDER_REVIEW: summary.underReview ?? 0,
    RETURNED_TO_APPLICANT: summary.returned ?? 0,
    REJECTED: summary.rejected ?? 0,
    COMPLETED: summary.completed ?? 0,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const [hover, setHover] = useState(null);

  if (!total) {
    return <EmptyState icon={PieChart} title="No batches yet" message="Batch statuses will appear here once applicants start submitting." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stacked bar — 2px surface gaps between segments, rounded ends */}
      <div className="relative">
        <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Batches by status">
          {BATCH_STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onSelect?.(k)}
              onMouseEnter={() => setHover(k)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(k)}
              onBlur={() => setHover(null)}
              aria-label={`${BATCH_STATUS[k].label}: ${counts[k]}`}
              className={`h-full ${BATCH_STATUS[k].bar} transition-opacity ${hover && hover !== k ? "opacity-40" : ""} ${onSelect ? "cursor-pointer" : "cursor-default"}`}
              style={{ width: `${(counts[k] / total) * 100}%`, minWidth: 6 }}
            />
          ))}
        </div>
      </div>

      {/* Legend rows carry label, count and share — identity is never colour alone */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {BATCH_STATUS_ORDER.map((k) => {
          const m = BATCH_STATUS[k];
          const Icon = m.icon;
          const pct = total ? Math.round((counts[k] / total) * 100) : 0;
          return (
            <li key={k}>
              <button
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(k)}
                onMouseEnter={() => setHover(k)}
                onMouseLeave={() => setHover(null)}
                className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  hover === k ? "bg-stone-50 dark:bg-white/[0.04]" : ""
                } ${onSelect ? "hover:bg-stone-50 dark:hover:bg-white/[0.04]" : "cursor-default"}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.soft}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.3} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{m.label}</span>
                  <span className="block text-[11px] text-stone-500 dark:text-stone-400 truncate">{m.description}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-bold text-stone-900 dark:text-stone-50 tabular-nums">{counts[k]}</span>
                  <span className="block text-[11px] text-stone-400 tabular-nums">{pct}%</span>
                </span>
                {onSelect && <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Six-month trend: paired columns, hover tooltip, legend, table view ──────

// Axis top as 4 whole-number steps of 1 / 2 / 5 × 10ⁿ, so ticks stay integers.
function niceMax(n) {
  const raw = Math.max(1, n) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw);
  return Math.max(4, Math.ceil(step) * 4);
}

function TrendChart({ trend }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const data = trend || [];
  const peak = Math.max(0, ...data.map((d) => Math.max(d.created, d.completed)));
  const max = niceMax(peak);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const hasData = peak > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
          {Object.entries(SERIES).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${s.swatch}`} /> {s.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setShowTable((v) => !v)}
          className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline-offset-2 hover:underline">
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>

      {showTable || !hasData ? (
        hasData ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2 font-bold">Month</th>
                <th className="py-2 font-bold text-right">Created</th>
                <th className="py-2 font-bold text-right">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {data.map((d) => (
                <tr key={d.month}>
                  <td className="py-2 text-stone-700 dark:text-stone-200">{d.month}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-stone-900 dark:text-stone-50">{d.created}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-stone-900 dark:text-stone-50">{d.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={BarChart3} title="No activity in the last 6 months" message="New bulk passes will show up here month by month." />
        )
      ) : (
        <div className="relative pl-8">
          {/* Y axis + hairline grid */}
          <div className="absolute inset-y-0 left-0 right-0 h-60">
            {ticks.map((t) => (
              <div key={t} className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(t / max) * 100}%` }}>
                <span className="w-7 -translate-y-px text-right pr-2 text-[10px] tabular-nums text-stone-400">{t}</span>
                <span className="flex-1 border-t border-stone-100 dark:border-white/5" />
              </div>
            ))}
          </div>

          <div className="relative grid h-60 items-end gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
            {data.map((d, i) => (
              <div
                key={d.month}
                className="relative flex h-full items-end justify-center gap-[2px] rounded-lg"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                aria-label={`${d.month}: ${d.created} created, ${d.completed} approved`}
              >
                {active === i && <div className="absolute inset-x-0 inset-y-0 -mx-1 rounded-lg bg-stone-100/70 dark:bg-white/[0.04]" />}
                {["created", "completed"].map((k) => (
                  <div
                    key={k}
                    className={`relative w-full max-w-[22px] rounded-t-[4px] ${SERIES[k].swatch} transition-[height] duration-500`}
                    style={{ height: `${(d[k] / max) * 100}%`, minHeight: d[k] ? 3 : 0 }}
                  />
                ))}
                {active === i && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-xl bg-stone-900 px-3 py-2 text-xs text-white shadow-xl dark:bg-stone-100 dark:text-stone-900">
                    <p className="font-bold mb-1">{d.month}</p>
                    {Object.entries(SERIES).map(([k, s]) => (
                      <p key={k} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-[2px] ${s.swatch}`} />
                        {s.label} <b className="ml-auto pl-3 tabular-nums">{d[k]}</b>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
            {data.map((d, i) => (
              <span key={d.month} className={`text-center text-[11px] ${active === i ? "font-bold text-stone-800 dark:text-stone-100" : "text-stone-500"}`}>
                {d.month.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Visitor mix: sorted horizontal bars, one hue, value at the tip ──────────

function VisitorMix({ visitorTypes }) {
  const rows = useMemo(() => {
    const list = (visitorTypes || []).filter((v) => v.count > 0);
    if (list.length <= 6) return list;
    const head = list.slice(0, 5);
    const other = list.slice(5).reduce((n, v) => n + v.count, 0);
    return [...head, { visitorType: "Other", count: other }];
  }, [visitorTypes]);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((n, r) => n + r.count, 0);

  if (!rows.length) {
    return <EmptyState icon={Users} title="No visitor data yet" message="Visitor types appear once bulk passes are created." />;
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.visitorType} title={`${r.visitorType}: ${r.count} (${Math.round((r.count / total) * 100)}%)`}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-stone-700 dark:text-stone-200 truncate">{r.visitorType}</span>
            <span className="font-bold text-stone-900 dark:text-stone-50 tabular-nums">{r.count}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 dark:bg-white/5">
            <div className={`h-full rounded-full ${SEQUENTIAL}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Recent activity timeline ────────────────────────────────────────────────

function RecentActivity({ activity, onOpen }) {
  if (!activity.length) {
    return <EmptyState icon={Inbox} title="No recent activity" message="Updates to bulk pass batches will be listed here." />;
  }
  return (
    <ol className="relative flex flex-col">
      {activity.map((a, idx) => {
        const m = statusMeta(a.status);
        const Icon = m.icon;
        const last = idx === activity.length - 1;
        return (
          <li key={`${a.batchId}-${idx}`} className="relative">
            {!last && <span className="absolute left-[19px] top-11 bottom-0 w-px bg-stone-200 dark:bg-white/10" aria-hidden />}
            <button
              type="button"
              disabled={!onOpen}
              onClick={() => onOpen?.(a.batchId)}
              className={`group w-full flex items-start gap-3 rounded-xl px-1 py-2.5 text-left transition ${onOpen ? "hover:bg-stone-50 dark:hover:bg-white/[0.03]" : "cursor-default"}`}
            >
              <span className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4 ring-white dark:ring-[#1f232d] ${m.soft}`}>
                <Icon className="h-4 w-4" strokeWidth={2.3} />
              </span>
              <span className="flex-1 min-w-0 pt-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[13px] font-bold text-stone-900 dark:text-stone-50">{a.refNo || "—"}</span>
                  <StatusPill status={a.status} />
                </span>
                <span className="block text-sm text-stone-600 dark:text-stone-300 truncate mt-0.5">
                  {a.companyName || "—"}
                  {a.departmentName ? <span className="text-stone-400"> · {a.departmentName}</span> : null}
                </span>
                {a.remarks && <span className="block text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">“{a.remarks}”</span>}
              </span>
              <span className="shrink-0 pt-1 text-xs text-stone-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BulkPassDashboard({
  fetcher,
  stats: statsProp,
  loading: loadingProp,
  onRefresh,
  variant = "dept",
  title = "Bulk Pass Dashboard",
  subtitle = "Overview of group port-entry pass activity",
  queueHref,
  queueLabel = "Open approval queue",
  onOpenQueue,
  detailHrefBase,
  onCardClick,
  hideHeader = false,
}) {
  const router = useRouter();
  const accent = variant === "traffic" ? "orange" : "amber";
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
        setInternalStats(await fetcher());
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

  const decided = (summary.completed ?? 0) + (summary.rejected ?? 0);
  const approvalRate = decided ? Math.round(((summary.completed ?? 0) / decided) * 100) : null;
  const openQueue = onOpenQueue || (queueHref ? () => router.push(queueHref) : onCardClick ? () => onCardClick("UNDER_REVIEW") : null);
  const openDetail = detailHrefBase ? (id) => router.push(`${detailHrefBase}/${id}`) : null;

  if (loading && !stats) return <Spinner label="Loading dashboard…" accent={accent} />;

  return (
    <div className="w-full flex flex-col gap-5">
      {!hideHeader && (
        <PageHeader
          icon={Activity}
          title={title}
          subtitle={subtitle}
          accent={accent}
          actions={<RefreshButton onClick={() => load(true)} loading={loading} accent={accent} />}
        />
      )}

      <AttentionStrip
        pending={summary.underReview ?? 0}
        returned={summary.returned ?? 0}
        onOpen={summary.underReview ? openQueue : null}
        actionLabel={queueLabel}
        accent={accent}
      />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          label="Total batches"
          value={compactNumber(summary.totalBatches)}
          hint={`${summary.completed ?? 0} approved · ${summary.underReview ?? 0} in review`}
          icon={FileStack}
          tone="stone"
          onClick={onCardClick ? () => onCardClick("ALL") : undefined}
        />
        <KpiTile
          label="Approval rate"
          value={approvalRate == null ? "—" : `${approvalRate}%`}
          hint={decided ? `${summary.completed ?? 0} of ${decided} decided batches` : "No decisions yet"}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile label="Persons" value={compactNumber(summary.totalPersons)} hint="Submitted across all batches" icon={Users} tone="blue" />
        <KpiTile label="Vehicles" value={compactNumber(summary.totalVehicles)} hint="Submitted across all batches" icon={Car} tone="violet" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Section
          className="xl:col-span-3"
          icon={PieChart}
          title="Batch pipeline"
          description={onCardClick ? "Where every batch is right now — click a status to see those batches." : "Where every batch is right now."}
        >
          <Pipeline summary={summary} onSelect={onCardClick} />
        </Section>
        <Section className="xl:col-span-2" icon={Users} title="Visitor types" description="Bulk passes by visitor category.">
          <VisitorMix visitorTypes={stats?.visitorTypes} />
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Section className="xl:col-span-3" icon={BarChart3} title="Last 6 months" description="Bulk passes created and approved each month.">
          <TrendChart trend={stats?.trend} />
        </Section>
        <Section
          className="xl:col-span-2"
          icon={Activity}
          title="Recent activity"
          description="Latest updates, newest first."
          bodyClassName="max-h-[360px] overflow-y-auto [scrollbar-width:thin]"
        >
          <RecentActivity activity={activity} onOpen={openDetail} />
        </Section>
      </div>
    </div>
  );
}
