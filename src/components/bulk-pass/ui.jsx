"use client";

/**
 * ui.jsx — the Bulk Pass management design kit
 * --------------------------------------------
 * One set of building blocks for every non-applicant Bulk Pass screen
 * (department, admin, traffic approval, traffic manager), so the pages look and
 * behave the same: header → view switcher → status filter → toolbar → table.
 *
 * `accent` is "amber" (department / admin) or "orange" (traffic). Every class
 * string is written out in full so Tailwind can see it.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search, X, RefreshCw, CalendarDays, ChevronLeft, ChevronRight, Inbox,
  Send, Clock, CornerUpLeft, XCircle, CheckCircle2, FileText, Layers,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
} from "lucide-react";

// ── Status language (one source for pills, cards and charts) ────────────────

export const BATCH_STATUS = {
  DRAFT: {
    label: "Sent to Applicant",
    short: "Sent",
    description: "Link sent — waiting for the applicant to upload visitor details.",
    icon: Send,
    pill: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
    soft: "bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  UNDER_REVIEW: {
    label: "Pending Approval",
    short: "Pending",
    description: "Submitted by the applicant — waiting for traffic officer review.",
    icon: Clock,
    pill: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  RETURNED_TO_APPLICANT: {
    label: "Returned",
    short: "Returned",
    description: "Sent back to the applicant to correct — a fresh link was issued.",
    icon: CornerUpLeft,
    pill: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
    soft: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
  REJECTED: {
    label: "Rejected",
    short: "Rejected",
    description: "Rejected by the traffic officer — no pass issued.",
    icon: XCircle,
    pill: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
    soft: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
  COMPLETED: {
    label: "Approved",
    short: "Approved",
    description: "Approved — QR pass PDF generated for the applicant.",
    icon: CheckCircle2,
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    soft: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
};

// Pipeline order: where a batch is in its life, left to right.
export const BATCH_STATUS_ORDER = ["DRAFT", "UNDER_REVIEW", "RETURNED_TO_APPLICANT", "REJECTED", "COMPLETED"];

const UNKNOWN_STATUS = {
  label: "Unknown",
  short: "Unknown",
  icon: FileText,
  pill: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10",
  soft: "bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400",
  dot: "bg-stone-400",
  bar: "bg-stone-400",
};

export const statusMeta = (status) => BATCH_STATUS[status] || { ...UNKNOWN_STATUS, label: titleCase(status) };

// A reusable Bulk Pass is a container; its lifecycle comes from its validity.
export const PASS_STATE = {
  ACTIVE: { label: "Accepting Batches", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20", dot: "bg-emerald-500" },
  EXPIRED: { label: "Closed", pill: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10", dot: "bg-stone-400" },
  NOT_STARTED: { label: "Not Started", pill: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20", dot: "bg-sky-500" },
  REVOKED: { label: "Revoked", pill: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/20", dot: "bg-orange-500" },
};

// ── Accents ──────────────────────────────────────────────────────────────────

const ACCENT = {
  amber: {
    primary: "bg-amber-400 text-stone-900 hover:bg-amber-500 shadow-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
    hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    ring: "focus-visible:ring-amber-400/60",
    within: "focus-within:ring-amber-400/60",
    focus: "focus:border-amber-400 focus:ring-amber-400/20",
    selected: "ring-amber-400 dark:ring-amber-400/70",
    badge: "bg-amber-500 text-white",
    spinner: "border-amber-400",
    rowHover: "hover:bg-amber-50/40 dark:hover:bg-amber-400/[0.04]",
  },
  orange: {
    primary: "bg-[#ff6b00] text-white hover:bg-[#e85f00] shadow-orange-500/25",
    text: "text-[#ff6b00] dark:text-orange-400",
    hoverText: "group-hover:text-[#ff6b00] dark:group-hover:text-orange-400",
    soft: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
    ring: "focus-visible:ring-orange-400/60",
    within: "focus-within:ring-orange-400/60",
    focus: "focus:border-orange-400 focus:ring-orange-400/20",
    selected: "ring-[#ff6b00] dark:ring-orange-400/70",
    badge: "bg-[#ff6b00] text-white",
    spinner: "border-[#ff6b00]",
    rowHover: "hover:bg-orange-50/40 dark:hover:bg-orange-400/[0.04]",
  },
};

export const accentOf = (accent) => ACCENT[accent] || ACCENT.amber;

// ── Formatting ───────────────────────────────────────────────────────────────

export function titleCase(s) {
  return !s ? "—" : String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const DATE_TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
});

export function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : DATE_FMT.format(d);
}

export function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : DATE_TIME_FMT.format(d);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", else the date. */
export function timeAgo(v, now = Date.now()) {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
  return formatDate(v);
}

export const compactNumber = (n) =>
  new Intl.NumberFormat("en-IN", { notation: Number(n) >= 100000 ? "compact" : "standard" }).format(Number(n) || 0);

// ── Surfaces ─────────────────────────────────────────────────────────────────

export const surface =
  "rounded-2xl bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/80 dark:ring-white/[0.06] " +
  "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]";

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={`${surface} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** A titled card section: heading on the left, optional action on the right. */
export function Section({ title, description, icon: Icon, action, className = "", bodyClassName = "", children }) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h3>
            {description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={`p-5 flex-1 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}

// ── Header & actions ─────────────────────────────────────────────────────────

export function PageHeader({ icon: Icon = Layers, eyebrow, title, subtitle, actions, accent = "amber" }) {
  const a = accentOf(accent);
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        <span className={`hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${a.soft}`}>
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500">{eyebrow}</p>
          )}
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-stone-900 dark:text-stone-50 leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </div>
  );
}

export function Button({ variant = "secondary", accent = "amber", icon: Icon, children, className = "", ...rest }) {
  const a = accentOf(accent);
  const variants = {
    primary: `${a.primary} shadow-sm font-bold`,
    secondary:
      "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 hover:ring-stone-300 font-semibold " +
      "dark:bg-white/5 dark:text-stone-200 dark:ring-white/10 dark:hover:bg-white/10",
    ghost: "text-stone-600 hover:bg-stone-100 font-semibold dark:text-stone-300 dark:hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-700 font-bold shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-sm",
    violet: "bg-violet-600 text-white hover:bg-violet-700 font-bold shadow-sm",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus-visible:ring-2 ${a.ring} ${variants[variant] || variants.secondary} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />}
      {children}
    </button>
  );
}

/** Refresh with a spinning icon while loading and a quiet "updated" stamp. */
export function RefreshButton({ onClick, loading = false, updatedAt, accent = "amber" }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2">
      {updatedAt && (
        <span className="hidden lg:inline text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
          Updated {timeAgo(updatedAt)}
        </span>
      )}
      <Button accent={accent} onClick={onClick} disabled={loading} aria-label="Refresh" title="Refresh" className="w-10 px-0">
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2.4} />
      </Button>
    </div>
  );
}

// ── View switcher ────────────────────────────────────────────────────────────

/** Segmented control. tabs: [{ key, label, icon, count, countTone }] */
export function ViewTabs({ tabs, value, onChange, accent = "amber" }) {
  const a = accentOf(accent);
  return (
    <div className="w-full overflow-x-auto [scrollbar-width:none]">
      <div role="tablist" className="inline-flex items-center gap-1 p-1 rounded-2xl bg-stone-100/80 ring-1 ring-stone-200/70 dark:bg-white/[0.04] dark:ring-white/[0.06]">
        {tabs.map((t) => {
          const active = value === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(t.key)}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition outline-none focus-visible:ring-2 ${a.ring} ${
                active
                  ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80 dark:bg-[#2a2f3b] dark:text-stone-50 dark:ring-white/10"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              {Icon && <Icon className={`h-4 w-4 ${active ? a.text : ""}`} strokeWidth={2.2} />}
              {t.label}
              {t.count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums ${t.countTone || a.badge}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Pills ────────────────────────────────────────────────────────────────────

export function Pill({ className = "", dot, children, title }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />}
      {children}
    </span>
  );
}

export function StatusPill({ status }) {
  const m = statusMeta(status);
  return <Pill className={m.pill} dot={m.dot} title={m.description}>{m.label}</Pill>;
}

export function PassStatePill({ state }) {
  const m = PASS_STATE[state] || { label: "No Validity", pill: UNKNOWN_STATUS.pill, dot: UNKNOWN_STATUS.dot };
  return <Pill className={m.pill} dot={m.dot}>{m.label}</Pill>;
}

export function Tag({ children, tone = "stone", title }) {
  const tones = {
    stone: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
    red: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${tones[tone] || tones.stone}`}>
      {children}
    </span>
  );
}

// ── Status filter cards ──────────────────────────────────────────────────────

/**
 * A row of clickable count cards that double as the table's status filter.
 * items: [{ key, label, value, icon, soft, bar, hint }]. `total` drives the
 * share bar under each count.
 */
export function StatusFilterCards({ items, value, onChange, total, accent = "amber" }) {
  const a = accentOf(accent);
  const max = Math.max(1, Number(total) || items.reduce((n, i) => Math.max(n, Number(i.value) || 0), 0));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((it) => {
        const active = value === it.key;
        const Icon = it.icon || Layers;
        const share = Math.min(100, Math.round(((Number(it.value) || 0) / max) * 100));
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && it.key !== "ALL" ? "ALL" : it.key)}
            title={it.hint}
            className={`${surface} group text-left px-4 py-3.5 transition outline-none focus-visible:ring-2 ${a.ring} ${
              active ? `ring-2 ${a.selected} shadow-md` : "hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${it.soft || "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300"}`}>
                <Icon className="h-4 w-4" strokeWidth={2.3} />
              </span>
              {active && it.key !== "ALL" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  <X className="h-3 w-3" /> Clear
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-extrabold text-stone-900 dark:text-stone-50 leading-none">{compactNumber(it.value)}</p>
            <p className="mt-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">{it.label}</p>
            <div className="mt-2.5 h-1 rounded-full bg-stone-100 dark:bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${it.bar || "bg-stone-400"} transition-all duration-500`} style={{ width: `${it.key === "ALL" ? 100 : share}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Status cards for batches, in pipeline order, plus an "All" card. */
export function batchStatusCards(summary = {}, { allLabel = "All Batches" } = {}) {
  const value = {
    DRAFT: summary.draft,
    UNDER_REVIEW: summary.underReview,
    RETURNED_TO_APPLICANT: summary.returned,
    REJECTED: summary.rejected,
    COMPLETED: summary.completed,
  };
  return [
    { key: "ALL", label: allLabel, value: summary.totalBatches ?? 0, icon: Layers, bar: "bg-stone-800 dark:bg-stone-300" },
    ...["UNDER_REVIEW", "RETURNED_TO_APPLICANT", "COMPLETED", "REJECTED", "DRAFT"].map((k) => ({
      key: k,
      label: BATCH_STATUS[k].label,
      hint: BATCH_STATUS[k].description,
      value: value[k] ?? 0,
      icon: BATCH_STATUS[k].icon,
      soft: BATCH_STATUS[k].soft,
      bar: BATCH_STATUS[k].bar,
    })),
  ];
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

export function Toolbar({ children, right }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">{children}</div>
      {right && <div className="flex items-center gap-2.5 lg:justify-end">{right}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", accent = "amber", className = "" }) {
  const a = accentOf(accent);
  const ref = useRef(null);
  // "/" focuses search, the way most consoles do.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className={`relative flex-1 min-w-[220px] max-w-md ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) onChange(""); }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full h-10 pl-10 pr-16 rounded-xl text-sm bg-white text-stone-800 placeholder:text-stone-400 ring-1 ring-stone-200 border border-transparent outline-none focus:ring-2 transition dark:bg-white/5 dark:text-stone-100 dark:ring-white/10 [&::-webkit-search-cancel-button]:hidden ${a.focus}`}
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-5 items-center rounded-md px-1.5 text-[10px] font-semibold text-stone-400 ring-1 ring-stone-200 dark:ring-white/10">/</kbd>
      )}
    </div>
  );
}

export function DateRange({ from, to, onChange, label = "Submitted" }) {
  const input =
    "h-full bg-transparent text-sm text-stone-700 dark:text-stone-200 outline-none w-[128px] [color-scheme:light] dark:[color-scheme:dark]";
  return (
    <div className="flex items-center h-10 rounded-xl bg-white ring-1 ring-stone-200 px-3 gap-2 dark:bg-white/5 dark:ring-white/10" title={`${label} date range`}>
      <CalendarDays className="h-4 w-4 text-stone-400 shrink-0" />
      <span className="hidden xl:inline text-xs font-semibold text-stone-400">{label}</span>
      <input type="date" value={from} max={to || undefined} aria-label={`${label} from`} onChange={(e) => onChange({ from: e.target.value, to })} className={input} />
      <span className="text-stone-300 dark:text-stone-600">→</span>
      <input type="date" value={to} min={from || undefined} aria-label={`${label} to`} onChange={(e) => onChange({ from, to: e.target.value })} className={input} />
    </div>
  );
}

/** An on/off filter chip. */
export function FilterChip({ active, onClick, icon: Icon, children, count, accent = "amber" }) {
  const a = accentOf(accent);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold transition outline-none focus-visible:ring-2 ${a.ring} ${
        active
          ? `${a.soft}`
          : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}
      {children}
      {active && count != null && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white/70 dark:bg-black/20 text-[11px] font-bold tabular-nums">{count}</span>
      )}
    </button>
  );
}

/**
 * A compact dropdown filter: "Visitor: All ▾". A native <select> sits on top
 * (transparent), so keyboard, screen readers and mobile pickers just work.
 * options: [{ value, label, count }]
 */
export function SelectFilter({ label, value, onChange, options, icon: Icon, allLabel = "All", accent = "amber" }) {
  const a = accentOf(accent);
  const current = options.find((o) => o.value === value);
  const active = !!value;
  return (
    <div
      className={`relative inline-flex items-center gap-2 h-10 pl-3.5 pr-3 rounded-xl text-sm transition focus-within:ring-2 ${a.within} ${
        active
          ? `${a.soft} font-semibold`
          : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10"
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />}
      <span className={active ? "opacity-70" : "text-stone-400 dark:text-stone-500"}>{label}:</span>
      <span className="font-semibold max-w-[140px] truncate">{current ? current.label : allLabel}</span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.count === 0 && o.value !== value}>
            {o.label}{o.count != null ? ` (${o.count})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "Showing N results · <chips> · Clear all" line under the toolbar. */
export function ResultSummary({ count, noun = "result", plural, chips = [], onClearAll }) {
  const word = count === 1 ? noun : plural || (/(s|x|ch|sh)$/.test(noun) ? `${noun}es` : `${noun}s`);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 min-h-[24px]">
      <span>
        <span className="font-bold text-stone-800 dark:text-stone-100 tabular-nums">{count}</span> {word}
      </span>
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold dark:bg-white/5 dark:text-stone-200">
          {c.label}
          <button type="button" onClick={c.onClear} aria-label={`Remove ${c.label}`} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-white/10">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll && (
        <button type="button" onClick={onClearAll} className="text-xs font-semibold text-stone-500 underline-offset-2 hover:underline hover:text-stone-800 dark:hover:text-stone-200">
          Clear all
        </button>
      )}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

export function TableCard({ children, footer }) {
  return (
    <Card className="overflow-hidden">
      {children}
      {footer}
    </Card>
  );
}

/**
 * Table with an optional sortable header. A column with `sortKey` becomes a
 * button; `sort` is { key, direction } and `onSort(key)` is called on click.
 */
export function DataTable({ columns, minWidth = 900, sort, onSort, children }) {
  return (
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-50/80 dark:bg-white/[0.02] border-b border-stone-200/70 dark:border-white/[0.06]">
            {columns.map((c) => {
              const sortable = !!(c.sortKey && onSort);
              const active = sortable && sort?.key === c.sortKey;
              const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
              const align = c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left";
              const label = "text-[11px] font-bold uppercase tracking-wider whitespace-nowrap";
              return (
                <th
                  key={c.key || c.label}
                  scope="col"
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={`px-4 py-3 text-stone-500 dark:text-stone-400 ${label} ${align} ${c.className || ""}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.sortKey)}
                      title={`Sort by ${String(c.label).toLowerCase()}`}
                      className={`group/sort inline-flex items-center gap-1 -mx-1.5 px-1.5 py-0.5 rounded-md transition ${label} ${
                        active ? "text-stone-900 dark:text-stone-50" : "text-inherit hover:text-stone-800 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-white/5"
                      }`}
                    >
                      {c.label}
                      <Icon className={`h-3 w-3 shrink-0 ${active ? "" : "opacity-40 group-hover/sort:opacity-80"}`} strokeWidth={2.6} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-white/[0.05]">{children}</tbody>
      </table>
    </div>
  );
}

/** A clickable, keyboard-reachable table row. */
export function Row({ onOpen, accent = "amber", className = "", children }) {
  const a = accentOf(accent);
  return (
    <tr
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(); } : undefined}
      className={`group transition-colors outline-none ${onOpen ? `cursor-pointer ${a.rowHover} focus-visible:bg-stone-50 dark:focus-visible:bg-white/[0.04]` : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ className = "", stop = false, children, ...rest }) {
  return (
    <td className={`px-4 py-3.5 align-middle ${className}`} onClick={stop ? (e) => e.stopPropagation() : undefined} {...rest}>
      {children}
    </td>
  );
}

/** Ref number + tags + secondary line — the identity cell of every table. */
export function RefCell({ refNo, sub, tags, accent = "amber" }) {
  const a = accentOf(accent);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`font-mono text-[13px] font-bold text-stone-900 dark:text-stone-100 transition-colors ${a.hoverText}`}>{refNo || "—"}</span>
        {tags}
      </div>
      {sub && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

/** "used / max" with a slim meter; max-less values show the number only. */
export function CapacityMeter({ used, max, icon: Icon, label }) {
  const u = Number(used) || 0;
  const m = Number(max) || 0;
  const pct = m > 0 ? Math.min(100, Math.round((u / m) * 100)) : 0;
  // Full is fine (the allowance is used up); only going over it is a problem.
  const tone = m > 0 && u > m ? "bg-red-500" : pct >= 100 ? "bg-stone-700 dark:bg-stone-300" : "bg-emerald-500";
  return (
    <div className="min-w-[88px]" title={m ? `${u} of ${m} ${label || ""} used` : undefined}>
      <div className="flex items-center gap-1.5 text-[13px]">
        {Icon && <Icon className="h-3.5 w-3.5 text-stone-400 shrink-0" />}
        <span className="font-bold text-stone-800 dark:text-stone-100 tabular-nums">{u}</span>
        {m > 0 && <span className="text-stone-400 tabular-nums">/ {m}</span>}
      </div>
      {m > 0 && (
        <div className="mt-1.5 h-1 w-full rounded-full bg-stone-100 dark:bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 7 }) {
  return (
    <div className="divide-y divide-stone-100 dark:divide-white/[0.05]" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-4 py-4">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className={`h-3.5 rounded-full bg-stone-100 dark:bg-white/5 animate-pulse ${c === 0 ? "w-28" : c === 1 ? "flex-1" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-3xl bg-stone-200/50 blur-xl dark:bg-white/5" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 text-stone-400 ring-1 ring-stone-200 dark:bg-white/5 dark:ring-white/10">
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-base font-bold text-stone-800 dark:text-stone-100">{title}</p>
      {message && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

export function Pagination({ page, pageSize, total, onPage, onPageSize, accent = "amber" }) {
  const a = accentOf(accent);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const nums = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
    .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("…"); acc.push(n); return acc; }, []);
  const btn =
    `inline-flex items-center justify-center h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition outline-none focus-visible:ring-2 ${a.ring} ` +
    "text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-300 dark:hover:bg-white/5";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-stone-200/70 dark:border-white/[0.06] bg-stone-50/50 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span>
          Showing <span className="font-bold text-stone-800 dark:text-stone-100 tabular-nums">{start}–{end}</span> of{" "}
          <span className="font-bold text-stone-800 dark:text-stone-100 tabular-nums">{total}</span>
        </span>
        <span className="text-stone-300 dark:text-stone-600">·</span>
        <label className="flex items-center gap-1.5 text-xs font-normal text-stone-500 dark:text-stone-400 m-0">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-7 rounded-lg bg-white ring-1 ring-stone-200 px-1.5 text-xs font-semibold text-stone-700 outline-none cursor-pointer dark:bg-white/5 dark:text-stone-200 dark:ring-white/10"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button type="button" className={btn} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`g${i}`} className="px-1 text-xs text-stone-400">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n)}
                aria-current={page === n ? "page" : undefined}
                className={page === n ? `${btn} bg-stone-900 text-white hover:bg-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-100` : btn}
              >
                {n}
              </button>
            )
          )}
          <button type="button" className={btn} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Slice one page out of rows, clamping the page when the list shrinks. */
export function usePaged(rows, initialSize = 15) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialSize);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const setPageSize = useCallback((n) => { setPageSizeState(n); setPage(1); }, []);
  const reset = useCallback(() => setPage(1), []);
  return {
    page: current,
    pageSize,
    total: rows.length,
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
    setPage,
    setPageSize,
    reset,
  };
}

// ── Modal ────────────────────────────────────────────────────────────────────

/**
 * Accessible dialog: Escape and backdrop close it, focus lands inside.
 * tone colours the header icon: "red" | "emerald" | "violet" | "amber".
 */
export function Modal({ title, description, icon: Icon, tone = "amber", onClose, children, footer, busy = false }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    window.addEventListener("keydown", onKey);
    const first = panelRef.current?.querySelector("textarea, input, select, button[data-autofocus]");
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  const tones = {
    red: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-modal-title"
        className="w-full sm:max-w-md bg-white dark:bg-[#1f232d] rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-stone-200/60 dark:ring-white/10 max-h-[92vh] flex flex-col"
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          {Icon && (
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone] || tones.amber}`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 id="bp-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-50">{title}</h3>
            {description && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/10 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-stone-100 dark:border-white/[0.06] bg-stone-50/60 dark:bg-white/[0.02] rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function FieldLabel({ children, required, hint }) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
        {children} {required && <span className="text-red-500">*</span>}
      </span>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </div>
  );
}

export const fieldCls =
  "w-full rounded-xl bg-stone-50 ring-1 ring-stone-200 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 outline-none " +
  "focus:bg-white focus:ring-2 focus:ring-amber-400/50 transition dark:bg-white/5 dark:text-stone-100 dark:ring-white/10 dark:focus:bg-white/10 " +
  "[color-scheme:light] dark:[color-scheme:dark]";

/** Loading spinner for whole-view waits (prefer TableSkeleton for tables). */
export function Spinner({ label = "Loading…", accent = "amber" }) {
  const a = accentOf(accent);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className={`h-9 w-9 rounded-full border-[3px] border-t-transparent animate-spin ${a.spinner}`} />
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
