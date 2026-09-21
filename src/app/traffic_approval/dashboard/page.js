"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import {
  FileText,
  CheckCircle2,
  Building2,
  ShieldBan,
  Users,
  UserCircle,
  Car,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Activity,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Timer,
  CircleDollarSign,
  Ban,
  Sparkles,
  ArrowUpRight,
  CalendarDays,
  Wallet,
  PackageCheck,
  Truck,
  HelpCircle,
  XCircle,
  RotateCcw,
  Layers,
  TrendingUp,
  Calculator,
  Target,
  Globe,
  CheckCircle,
  Zap,
  ShieldOff,
  Search,
  X,
  ExternalLink,
  Receipt,
  Download,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileSpreadsheet,
  CreditCard,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const getAuthHeaders = () => {
  let token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!token) return {};
  token = token.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${token}` };
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtNum = (v) => num(v).toLocaleString("en-IN");
const fmtMoney = (v) =>
  "₹" + num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const fmtDateTime = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const calcAvgApprovalTime = (list = []) => {
  const diffs = list
    .filter(
      (p) =>
        p.status === "PROCESSED" ||
        p.status === "processed" ||
        p.status === "APPROVED" ||
        p.status === "COMPLETED",
    )
    .map((p) => {
      const c = p.createdAt ? new Date(p.createdAt).getTime() : null;
      const u = p.updatedAt ? new Date(p.updatedAt).getTime() : null;
      if (!c || !u || u <= c) return null;
      return (u - c) / 60000;
    })
    .filter(Boolean);
  if (!diffs.length) return null;
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
};
const fmtDuration = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const TONE = {
  blue: {
    border: "border-blue-500",
    grad: "from-blue-500 via-blue-600 to-indigo-600",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-blue-100",
    accent: "bg-white/40",
  },
  sky: {
    border: "border-sky-500",
    grad: "from-sky-400 via-sky-500 to-cyan-600",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-sky-100",
    accent: "bg-white/40",
  },
  emerald: {
    border: "border-emerald-500",
    grad: "from-emerald-500 via-emerald-600 to-teal-600",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-emerald-100",
    accent: "bg-white/40",
  },
  teal: {
    border: "border-teal-500",
    grad: "from-teal-500 via-teal-600 to-cyan-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-teal-100",
    accent: "bg-white/40",
  },
  amber: {
    border: "border-amber-500",
    grad: "from-amber-400 via-amber-500 to-orange-600",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-amber-100",
    accent: "bg-white/40",
  },
  orange: {
    border: "border-orange-500",
    grad: "from-orange-500 via-orange-600 to-amber-600",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-orange-100",
    accent: "bg-white/40",
  },
  red: {
    border: "border-red-500",
    grad: "from-red-500 via-red-600 to-rose-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-red-100",
    accent: "bg-white/40",
  },
  rose: {
    border: "border-rose-500",
    grad: "from-rose-500 via-rose-600 to-pink-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-rose-100",
    accent: "bg-white/40",
  },
  violet: {
    border: "border-violet-500",
    grad: "from-violet-500 via-violet-600 to-purple-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-violet-100",
    accent: "bg-white/40",
  },
  slate: {
    border: "border-slate-500",
    grad: "from-slate-500 via-slate-600 to-gray-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-slate-100",
    accent: "bg-white/40",
  },
  indigo: {
    border: "border-indigo-500",
    grad: "from-indigo-500 via-indigo-600 to-violet-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-indigo-100",
    accent: "bg-white/40",
  },
  cyan: {
    border: "border-cyan-500",
    grad: "from-cyan-500 via-cyan-600 to-sky-700",
    text: "text-white",
    chip: "bg-white/20 text-white",
    label: "text-cyan-100",
    accent: "bg-white/40",
  },
};
const BL_STATUS_TONE = {
  BLACKLISTED: "bg-rose-50 text-rose-700 border-rose-200",
  PENDING_BLACKLIST: "bg-amber-50 text-amber-700 border-amber-200",
  UNBLACKLIST_REQUESTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNBLACKLISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-600 border-slate-200",
};
const PASS_STATUS_TONE = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW: "bg-violet-50 text-violet-700 border-violet-200",
  RESUBMITTED: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-5 w-14 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <CheckCircle2 className="h-8 w-8 text-emerald-300" />
      <p className="text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

const PANEL_ACCENT = {
  navy: "from-[#0a1e4d] to-[#1b3a8a]",
  orange: "from-orange-400 to-amber-500",
  emerald: "from-emerald-400 to-teal-500",
  blue: "from-blue-400 to-indigo-500",
  sky: "from-sky-400 to-blue-500",
  violet: "from-violet-400 to-purple-500",
  red: "from-red-400 to-rose-500",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-500",
  indigo: "from-indigo-400 to-violet-500",
  teal: "from-teal-400 to-cyan-500",
  cyan: "from-cyan-400 to-sky-500",
};

function SectionDivider({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      {Icon && (
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0a1e4d]/8 text-[#0a1e4d] shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  actionHref = "#",
  icon: Icon,
  tone = "navy",
  children,
  className = "",
}) {
  const iconChip = {
    navy: "bg-gradient-to-br from-[#0a1e4d] to-[#1b3a8a] text-white",
    orange: "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
    emerald: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
    blue: "bg-gradient-to-br from-blue-500 to-indigo-500 text-white",
    sky: "bg-gradient-to-br from-sky-500 to-blue-500 text-white",
    violet: "bg-gradient-to-br from-violet-500 to-purple-500 text-white",
    red: "bg-gradient-to-br from-red-500 to-rose-500 text-white",
    amber: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    rose: "bg-gradient-to-br from-rose-500 to-pink-500 text-white",
    indigo: "bg-gradient-to-br from-indigo-500 to-violet-500 text-white",
    teal: "bg-gradient-to-br from-teal-500 to-cyan-500 text-white",
    cyan: "bg-gradient-to-br from-cyan-500 to-sky-500 text-white",
  };
  const headerWash = {
    navy: "bg-gradient-to-r from-[#0a1e4d]/5 to-transparent",
    orange: "bg-gradient-to-r from-orange-50 to-transparent",
    emerald: "bg-gradient-to-r from-emerald-50 to-transparent",
    blue: "bg-gradient-to-r from-blue-50 to-transparent",
    sky: "bg-gradient-to-r from-sky-50 to-transparent",
    violet: "bg-gradient-to-r from-violet-50 to-transparent",
    red: "bg-gradient-to-r from-red-50 to-transparent",
    amber: "bg-gradient-to-r from-amber-50 to-transparent",
    rose: "bg-gradient-to-r from-rose-50 to-transparent",
    indigo: "bg-gradient-to-r from-indigo-50 to-transparent",
    teal: "bg-gradient-to-r from-teal-50 to-transparent",
    cyan: "bg-gradient-to-r from-cyan-50 to-transparent",
  };
  const chip = iconChip[tone] || iconChip.navy;
  const wash = headerWash[tone] || headerWash.navy;
  const accent = PANEL_ACCENT[tone] || PANEL_ACCENT.navy;
  return (
    <section
      className={`group/panel relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] flex flex-col transition-all duration-300 hover:shadow-[0_16px_40px_-14px_rgba(10,30,77,0.24)] ${className}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r ${accent}`}
      />
      <div
        className={`${wash} flex items-center justify-between gap-2 px-5 pt-5 pb-3 rounded-t-3xl`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${chip} shrink-0 shadow-md ring-1 ring-inset ring-white/30`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[#0a1e4d] truncate leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <Link
            href={actionHref}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 shrink-0 transition-colors group/link rounded-full bg-orange-50 px-2.5 py-1 border border-orange-100 hover:bg-orange-100"
          >
            {action}
            <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
      <div className="px-5 pb-5 flex-1">{children}</div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone = "blue",
  money = false,
  loading = false,
  icon: Icon,
  href,
  sub,
}) {
  const t = TONE[tone] || TONE.blue;
  const Wrapper = href ? Link : "div";
  const wp = href ? { href } : {};
  return (
    <Wrapper
      {...wp}
      className={`group/ms relative block overflow-hidden rounded-2xl border-2 ${t.border} bg-gradient-to-br ${t.grad} px-4 py-3.5 shadow-lg transition-all duration-200 ${href ? "hover:-translate-y-1.5 hover:shadow-xl cursor-pointer" : ""}`}
    >
      {/* top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div
        className={`pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/20`}
      />
      <div
        className={`pointer-events-none absolute -left-3 -bottom-3 h-10 w-10 rounded-full bg-white/10`}
      />
      <div
        className={`absolute left-0 inset-y-0 w-[4px] rounded-l-2xl ${t.accent}`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${t.label} leading-tight`}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-xl ${t.chip} shrink-0 shadow-md`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        )}
      </div>
      {loading ? (
        <div className="relative h-7 w-16 mt-1.5 rounded bg-white/30 animate-pulse" />
      ) : (
        <p
          className={`relative text-2xl font-black ${t.text} mt-1.5 tabular-nums drop-shadow-sm`}
        >
          {money ? fmtMoney(value) : fmtNum(value)}
        </p>
      )}
      {sub && !loading && (
        <p
          className={`relative text-[10px] ${t.label} opacity-80 font-medium mt-0.5`}
        >
          {sub}
        </p>
      )}
      {href && (
        <ArrowUpRight
          className={`absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-white opacity-0 group-hover/ms:opacity-70 transition-opacity`}
        />
      )}
    </Wrapper>
  );
}

function IconStatRow({
  label,
  value,
  icon: Icon,
  tone = "blue",
  money = false,
  loading = false,
  href,
}) {
  const t = TONE[tone] || TONE.blue;
  const Wrapper = href ? Link : "div";
  const wp = href ? { href } : {};

  // Gradient background per tone — same vivid palette as the Overstay tiles
  const overlayGrad = {
    emerald: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600",
    rose: "bg-gradient-to-r from-rose-400    via-rose-500    to-pink-600",
    amber: "bg-gradient-to-r from-amber-400   via-amber-500   to-orange-500",
    sky: "bg-gradient-to-r from-sky-400     via-sky-500     to-blue-600",
    blue: "bg-gradient-to-r from-blue-400    via-blue-500    to-indigo-600",
    violet: "bg-gradient-to-r from-violet-400  via-violet-500  to-purple-600",
    teal: "bg-gradient-to-r from-teal-400    via-teal-500    to-cyan-600",
    indigo: "bg-gradient-to-r from-indigo-400  via-indigo-500  to-violet-600",
    orange: "bg-gradient-to-r from-orange-400  via-orange-500  to-red-500",
    cyan: "bg-gradient-to-r from-cyan-400    via-cyan-500    to-sky-600",
    red: "bg-gradient-to-r from-red-400     via-red-500     to-rose-600",
  };

  // Colored glow shadow per tone
  const glowMap = {
    emerald: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(16,185,129,0.55)]",
    rose: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(244,63,94,0.5)]",
    amber: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(251,191,36,0.55)]",
    sky: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(14,165,233,0.5)]",
    blue: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(59,130,246,0.5)]",
    violet: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(139,92,246,0.5)]",
    teal: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(20,184,166,0.5)]",
    indigo: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(99,102,241,0.5)]",
    orange: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(249,115,22,0.5)]",
    cyan: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(6,182,212,0.5)]",
    red: "group-hover/row:shadow-[0_8px_24px_-6px_rgba(239,68,68,0.5)]",
  };

  const overlay = overlayGrad[tone] || overlayGrad.blue;
  const glowCls = glowMap[tone] || glowMap.blue;

  return (
    <Wrapper
      {...wp}
      className={`group/row relative overflow-hidden flex items-center justify-between gap-3 -mx-2 rounded-xl px-3 py-2.5 transition-all duration-200 border border-transparent ring-1 ring-inset ring-transparent ${
        href
          ? `group-hover/row:border-white/20 group-hover/row:ring-white/20 hover:-translate-y-[1px] ${glowCls} cursor-pointer`
          : ""
      }`}
    >
      {/* ── Gradient background layer — fades in on hover ── */}
      {href && (
        <div
          className={`absolute inset-0 ${overlay} opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 rounded-xl`}
        />
      )}

      {/* Top shimmer line — identical to the Overstay colored tiles */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200" />

      {/* Decorative orb — top-right, like the colored tiles */}
      <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-white/15 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200" />

      {/* ── Left: icon + label ── */}
      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.chip} group-hover/row:bg-white/25 group-hover/row:ring-1 group-hover/row:ring-inset group-hover/row:ring-white/40 shrink-0 shadow-sm transition-all duration-200 group-hover/row:scale-110`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-xs font-semibold text-slate-700 group-hover/row:text-white/90 truncate transition-colors duration-150">
          {label}
        </span>
      </div>

      {/* ── Right: value + chevron ── */}
      <div className="flex items-center gap-1.5 shrink-0 relative z-10">
        {loading ? (
          <div className="h-5 w-12 rounded bg-slate-200 group-hover/row:bg-white/30 animate-pulse transition-colors" />
        ) : (
          <span
            className={`text-lg font-black tabular-nums ${t.text} group-hover/row:text-white drop-shadow-sm transition-all duration-150 group-hover/row:scale-[1.06]`}
          >
            {money ? fmtMoney(value) : fmtNum(value)}
          </span>
        )}
        {href && (
          <ChevronRight className="h-3.5 w-3.5 text-white opacity-0 -translate-x-1 group-hover/row:opacity-80 group-hover/row:translate-x-0 transition-all duration-150" />
        )}
      </div>
    </Wrapper>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  gradient,
  glow,
  href,
  chips,
  loading,
  isMoney = false,
}) {
  const Wrapper = href ? Link : "div";
  const wp = href ? { href } : {};
  return (
    <Wrapper
      {...wp}
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-4 sm:p-5 text-white ring-1 ring-inset ring-white/30 shadow-[0_12px_40px_-12px_var(--tw-shadow-color),inset_0_1px_0_0_rgba(255,255,255,0.45)] ${glow} transition-all duration-300 min-h-[130px] flex flex-col ${href ? "hover:-translate-y-1.5 hover:shadow-[0_24px_56px_-16px_var(--tw-shadow-color)] cursor-pointer" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="pointer-events-none absolute -top-1/2 inset-x-0 h-full bg-gradient-to-b from-white/20 to-transparent opacity-80" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/25 ring-1 ring-inset ring-white/40 shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.3} />
        </span>
        {href && (
          <ArrowUpRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-90 group-hover:translate-x-0 transition-all" />
        )}
      </div>
      {loading ? (
        <div className="relative mt-3 h-8 w-20 rounded-lg bg-white/30 animate-pulse" />
      ) : (
        <p className="relative mt-3 text-2xl sm:text-3xl font-black tabular-nums drop-shadow-sm leading-none">
          {isMoney ? fmtMoney(value) : fmtNum(value)}
        </p>
      )}
      <p className="relative mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/85 leading-tight">
        {title}
      </p>
      {chips && !loading && (
        <div className="relative mt-2 flex flex-wrap gap-1">
          {chips.map((ch) => {
            const C = ch.icon;
            return (
              <span
                key={ch.label}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-900 ring-1 ring-inset ring-white/60 shadow-sm"
              >
                <C className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.4} />
                {fmtNum(ch.value)} {ch.label}
              </span>
            );
          })}
        </div>
      )}
    </Wrapper>
  );
}

const EMPTY = {
  pass: { pending: 0, processed: 0, total: 0, rejected: 0, reverted: 0 },
  passMine: 0,
  pendingQueue: { persons: 0, vehicles: 0, companies: 0, list: [], counted: 0 },
  processedQueue: { persons: 0, vehicles: 0, counted: 0, list: [] },
  allPassesQueue: { persons: 0, vehicles: 0, list: [], counted: 0 },
  rawAllPasses: [],
  company: { total: 0, approved: 0, rejected: 0, pending: 0 },
  profileUpdates: 0,
  bulk: { total: 0, pending: 0, approved: 0, rejected: 0 },
  bl: {
    active_blacklisted: 0,
    pending_blacklist: 0,
    pending_unblacklist: 0,
    total_unblacklisted: 0,
    total: 0,
  },
  blType: { COMPANY: 0, PERSON: 0, DRIVER: 0, VEHICLE: 0 },
  blRecent: [],
  blPending: [],
  overstay: {
    pending: 0,
    paid: 0,
    exceptions: 0,
    pendingAmount: 0,
    paidAmount: 0,
    total: 0,
    todayPaid: 0,
    monthPaid: 0,
    rawCharges: [],
  },
  hepRevenue: {
    total: 0,
    accountTotal: 0,
    ecashTotal: 0,
    todayTotal: 0,
    monthTotal: 0,
    processedTotal: 0,
    pendingTotal: 0,
    totalPersons: 0,
    totalVehicles: 0,
    topCompanies: [],
    companyList: [],
  },
  portActivity: { today: 0, week: 0, month: 0 },
  avgApprovalMins: null,
};

// ── Pass Type Distribution Pie Chart ──────────────────────────────────────────
// Mirrors the PassTypeChart from app/dashboard/page.js for design uniformity.
function PassTypeDistributionChart({ persons, vehicles, loading }) {
  const passTypeData = [
    { name: "Personnel", value: persons, color: "#14b8a6" },
    { name: "Vehicles", value: vehicles, color: "#f59e0b" },
  ];
  const total = persons + vehicles;
  const [activeIndex, setActiveIndex] = useState(null);
  const activeSlice = activeIndex !== null ? passTypeData[activeIndex] : null;
  const top = total
    ? passTypeData.reduce((a, b) => (a.value >= b.value ? a : b))
    : { name: "None", value: 0, color: "#cccccc" };
  const topPct = total ? Math.round((top.value / total) * 100) : 0;

  return (
    <Panel
      title="Pass Type Distribution"
      subtitle="Breakdown of authorised entities by category"
      icon={BarChart3}
      tone="teal"
      action="View Passes"
      actionHref="/traffic_approval/passes"
    >
      {loading || total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          {loading ? (
            <div className="h-40 w-40 mx-auto rounded-full bg-slate-100 animate-pulse" />
          ) : (
            <>
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="text-xs font-semibold text-slate-400">
                No pass data to chart yet
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Donut chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <defs>
                  <linearGradient id="ptcPersonnel" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                  <linearGradient id="ptcVehicle" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <Pie
                  data={passTypeData}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={4}
                  cornerRadius={10}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {passTypeData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Personnel"
                          ? "url(#ptcPersonnel)"
                          : "url(#ptcVehicle)"
                      }
                      opacity={
                        activeIndex === null || activeIndex === idx ? 1 : 0.45
                      }
                      style={{ transition: "opacity 200ms ease" }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centre label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {activeSlice ? activeSlice.name : "Top type"}
              </p>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900 leading-none mt-1">
                {activeSlice
                  ? `${Math.round((activeSlice.value / total) * 100)}%`
                  : `${topPct}%`}
              </p>
              <p
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold"
                style={{ color: activeSlice ? activeSlice.color : top.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: activeSlice
                      ? activeSlice.color
                      : top.color,
                  }}
                />
                {activeSlice
                  ? `${fmtNum(activeSlice.value)} entries`
                  : top.name}
              </p>
            </div>
          </div>

          {/* Legend rows */}
          <div className="mt-4 space-y-2.5">
            {passTypeData.map((item) => {
              const pct = total ? Math.round((item.value / total) * 100) : 0;
              const Icon = item.name === "Vehicles" ? Car : Users;
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 px-3 py-2.5"
                >
                  <span
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                    }}
                  >
                    <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-bold text-slate-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-900">
                        {fmtNum(item.value)}
                        <span className="ml-1.5 text-xs font-semibold text-slate-500">
                          {pct}%
                        </span>
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

export default function TrafficManagerDashboard() {
  const router = useRouter();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [selectedLedgerCompany, setSelectedLedgerCompany] = useState(null);
  const [showFullLedgerModal, setShowFullLedgerModal] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState("ALL");
  const [ledgerModeFilter, setLedgerModeFilter] = useState("ALL");
  const [allCompaniesSearch, setAllCompaniesSearch] = useState("");
  const [ledgerActiveTab, setLedgerActiveTab] = useState("transactions");
  const [expandedPassId, setExpandedPassId] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);

  const copyToClipboard = useCallback((text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 2000);
      toast.success(`Copied: ${text}`);
    }
  }, []);

  const exportLedgerCSV = useCallback((company) => {
    if (!company || !company.passes?.length) {
      toast.info("No transaction records found for this company");
      return;
    }
    const headers = [
      "Sl No",
      "Pass Reference",
      "Status",
      "Payment Mode",
      "Total Amount (INR)",
      "Person Fees (INR)",
      "Vehicle Fees (INR)",
      "Persons Count",
      "Vehicles Count",
      "Applicant Name",
      "Applicant Email",
      "Submitted Date",
      "Purpose",
      "Harbor Zone",
    ];
    const rows = company.passes.map((p, idx) => [
      idx + 1,
      `"${p.referenceNo || ""}"`,
      `"${p.status || ""}"`,
      `"${p.paymentMode || ""}"`,
      p.amount || 0,
      p.personFee || 0,
      p.vehicleFee || 0,
      p.personsCount || 0,
      p.vehiclesCount || 0,
      `"${(p.applicantName || "").replace(/"/g, '""')}"`,
      `"${(p.email || "").replace(/"/g, '""')}"`,
      `"${fmtDate(p.createdAt)}"`,
      `"${(p.purpose || "").replace(/"/g, '""')}"`,
      `"${(p.zone || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${(company.name || "Company").replace(/[^a-zA-Z0-9]/g, "_")}_Revenue_Ledger.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ledger for ${company.name}`);
  }, []);

  const rowLinkProps = useCallback(
    (href, label) => ({
      role: "link",
      tabIndex: 0,
      title: label,
      onClick: () => router.push(href),
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      },
    }),
    [router],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    const g = (url, params) =>
      axios.get(url, { headers, params, validateStatus: (s) => s < 500 });
    try {
      const [
        [
          passMineRes,
          companyRes,
          profileRes,
          blStatsRes,
          blRecentRes,
          blPendingRes,
          overstayRes,
          overstayExcRes,
          bulkRes,
        ],
        firstPassRes,
      ] = await Promise.all([
        Promise.allSettled([
          g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
            limit: 1,
            page: 1,
            processedByMe: "true",
          }),
          g(`${ADMIN_API}/user/agent-users`, { limit: 1, page: 1 }),
          g(`${ADMIN_API}/user/profile-update-requests`, {
            status: "pending",
            limit: 1,
            page: 1,
          }),
          g(`${ADMIN_API}/blacklist/stats`),
          g(`${ADMIN_API}/blacklist/list`, { limit: 6, page: 1 }),
          g(`${ADMIN_API}/blacklist/list`, {
            status: "PENDING_BLACKLIST",
            limit: 6,
            page: 1,
          }),
          g(`${ADMIN_API}/overstay/charges`, { limit: 500, page: 1 }),
          g(`${ADMIN_API}/overstay/exception-requests`, { limit: 1, page: 1 }),
          g(`${ADMIN_API}/bulk-pass/queue`, { limit: 1, page: 1 }),
        ]),
        // Fetch page 1 of all pass requests (unrestricted by status) to capture all passes
        g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          limit: 100,
          page: 1,
        }),
      ]);

      const ok = (r) =>
        r.status === "fulfilled" && r.value?.data && r.value.status < 400;
      const val = (r, fb) => (ok(r) ? r.value.data : fb);

      // 1. Hydrate ALL pass requests across all pages
      let allPassList = firstPassRes?.data?.data || [];
      const totalPassPages = num(
        firstPassRes?.data?.pagination?.totalPages ?? 1,
      );
      if (totalPassPages > 1) {
        const extraReqs = [];
        for (let pg = 2; pg <= totalPassPages; pg++) {
          extraReqs.push(
            g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
              limit: 100,
              page: pg,
            }),
          );
        }
        const extraResults = await Promise.allSettled(extraReqs);
        extraResults.forEach((r) => {
          if (r.status === "fulfilled" && r.value?.data?.data) {
            allPassList = allPassList.concat(r.value.data.data);
          }
        });
      }

      // 2. Classify by status
      const pendingList = allPassList.filter((p) =>
        ["SUBMITTED", "PENDING", "IN_REVIEW", "UNDER_REVIEW"].includes(
          String(p.status || "").toUpperCase(),
        ),
      );
      const processedList = allPassList.filter((p) =>
        ["APPROVED", "PROCESSED", "COMPLETED", "ISSUED"].includes(
          String(p.status || "").toUpperCase(),
        ),
      );
      const revertedList = allPassList.filter((p) =>
        ["REVERTED"].includes(String(p.status || "").toUpperCase()),
      );
      const rejectedList = allPassList.filter((p) =>
        ["REJECTED"].includes(String(p.status || "").toUpperCase()),
      );

      const passCounts = {
        total: allPassList.length,
        pending: pendingList.length,
        processed: processedList.length,
        reverted: revertedList.length,
        rejected: rejectedList.length,
      };

      const passMineCounts = val(passMineRes, {}).counts || {};
      const companyCounts = val(companyRes, {}).counts || {};

      const pendingPersons = pendingList.reduce(
        (s, p) => s + (p.persons?.length || 0),
        0,
      );
      const pendingVehicles = pendingList.reduce(
        (s, p) => s + (p.vehicles?.length || 0),
        0,
      );
      const pendingCompanies = new Set(
        pendingList
          .map((p) => p.agentId || p.email || p.entityName)
          .filter(Boolean),
      ).size;

      const processedPersons = processedList.reduce(
        (s, p) => s + (p.persons?.length || 0),
        0,
      );
      const processedVehicles = processedList.reduce(
        (s, p) => s + (p.vehicles?.length || 0),
        0,
      );

      const allPersons = allPassList.reduce(
        (s, p) => s + (p.persons?.length || 0),
        0,
      );
      const allVehicles = allPassList.reduce(
        (s, p) => s + (p.vehicles?.length || 0),
        0,
      );

      const profilePagination = val(profileRes, {}).pagination || {};

      // 3. Blacklist stats
      const blRaw = val(blStatsRes, {});
      const blStats = blRaw?.data || blRaw || {};
      const blByType = blStats.by_type || {};
      const blRecentList = val(blRecentRes, {}).data || [];
      const blPendingList = val(blPendingRes, {}).data || [];

      // 4. Overstay charges
      const charges = val(overstayRes, {}).data || [];
      const ovPending = charges.filter((c) => c.status === "PENDING");
      const ovPaid = charges.filter((c) => c.status === "PAID");
      const excData = val(overstayExcRes, {});
      const ovExc = num(
        excData.count ??
          excData.pagination?.totalRecords ??
          (excData.data || []).length,
      );

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const todayPaid = ovPaid
        .filter(
          (c) =>
            new Date(c.created_at || c.updatedAt || c.createdAt) >= todayStart,
        )
        .reduce((s, c) => s + num(c.total_amount ?? c.amount), 0);
      const monthPaid = ovPaid
        .filter(
          (c) =>
            new Date(c.created_at || c.updatedAt || c.createdAt) >= monthStart,
        )
        .reduce((s, c) => s + num(c.total_amount ?? c.amount), 0);

      // 5. Port activity
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const activityToday = allPassList.filter((p) => {
        const d = new Date(p.createdAt || p.submittedAt);
        return !isNaN(d.getTime()) && d >= todayStart;
      }).length;
      const activityWeek = allPassList.filter((p) => {
        const d = new Date(p.createdAt || p.submittedAt);
        return !isNaN(d.getTime()) && d >= weekStart;
      }).length;
      const activityMonth = allPassList.filter((p) => {
        const d = new Date(p.createdAt || p.submittedAt);
        return !isNaN(d.getTime()) && d >= monthStart;
      }).length;

      // 6. Bulk pass counts
      const bulkData = val(bulkRes, {});
      const bulkCounts = bulkData.counts || bulkData.pagination || {};
      const bulkTotal = num(bulkCounts.total ?? bulkCounts.totalRecords ?? 0);
      const bulkPending = num(bulkCounts.pending ?? 0);
      const bulkApproved = num(
        bulkCounts.approved ?? bulkCounts.completed ?? 0,
      );
      const bulkRejected = num(bulkCounts.rejected ?? 0);

      // 7. Comprehensive Revenue Calculation across ALL Pass Requests
      const getPassAmt = (p) => {
        const direct = parseFloat(
          p.netAmount ??
            p.net_amount ??
            p.netamount ??
            p.baseTotal ??
            p.basetotal ??
            p.grossTotal ??
            p.grosstotal ??
            0,
        );
        if (Number.isFinite(direct) && direct > 0) return direct;
        let sum = 0;
        (p.persons || []).forEach((x) => {
          sum += parseFloat(x.amount || 0) || 0;
        });
        (p.vehicles || []).forEach((x) => {
          sum += parseFloat(x.amount || 0) || 0;
        });
        return sum;
      };

      let hepTotal = 0,
        hepAccount = 0,
        hepEcash = 0,
        hepToday = 0,
        hepMonth = 0;
      let hepProcessedTotal = 0,
        hepPendingTotal = 0;
      const companyMap = {};

      allPassList.forEach((p) => {
        const amt = getPassAmt(p);
        hepTotal += amt;
        const mode = String(
          p.paymentMode || p.payment_mode || p.paymentmode || "",
        ).toUpperCase();
        if (mode === "E-CASH" || mode === "ECASH") {
          hepEcash += amt;
        } else {
          hepAccount += amt;
        }

        const pStatus = String(p.status || "").toUpperCase();
        if (
          ["APPROVED", "PROCESSED", "COMPLETED", "ISSUED"].includes(pStatus)
        ) {
          hepProcessedTotal += amt;
        } else {
          hepPendingTotal += amt;
        }

        const d = new Date(p.createdAt || p.submittedAt || p.updatedAt);
        if (!isNaN(d.getTime())) {
          if (d >= todayStart) hepToday += amt;
          if (d >= monthStart) hepMonth += amt;
        }

        const pCount = (p.persons || []).length;
        const vCount = (p.vehicles || []).length;

        const co = (
          p.entityName ||
          p.entity_name ||
          p.agentName ||
          p.agent_name ||
          p.companyName ||
          "Direct / Authorized Agent"
        ).trim();
        if (!companyMap[co]) {
          companyMap[co] = {
            name: co,
            total: 0,
            passCount: 0,
            persons: 0,
            vehicles: 0,
            paymentMode: mode || "ACCOUNT",
          };
        }
        companyMap[co].total += amt;
        companyMap[co].passCount += 1;
        companyMap[co].persons += pCount;
        companyMap[co].vehicles += vCount;
      });

      const companyList = Object.values(companyMap).sort(
        (a, b) => b.total - a.total,
      );
      const topCompanies = companyList.slice(0, 5).map((c) => ({
        name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
        fullName: c.name,
        value: c.total,
        passCount: c.passCount,
        persons: c.persons,
        vehicles: c.vehicles,
      }));

      const avgMins = calcAvgApprovalTime(processedList);

      console.log(
        "%c=== [TRAFFIC – PASS OS SECTION DASHBOARD] PASS STATISTICS ===",
        "background: #1e3a5f; color: #fbbf24; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px;",
      );
      console.log("📊 Pass Request Counts:", passCounts);
      console.log("💰 Revenue Summary:", {
        "Total Revenue (All Passes)": `₹ ${hepTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "Account (HEP)": `₹ ${hepAccount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "E-Cash": `₹ ${hepEcash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "Today's Revenue": `₹ ${hepToday.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "This Month's Revenue": `₹ ${hepMonth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });

      setData({
        pass: {
          pending: num(passCounts.pending),
          processed: num(passCounts.processed),
          total: num(passCounts.total),
          rejected: num(passCounts.rejected ?? 0),
          reverted: num(passCounts.reverted ?? 0),
        },
        passMine: num(passMineCounts.processed),
        pendingQueue: {
          persons: pendingPersons,
          vehicles: pendingVehicles,
          companies: pendingCompanies,
          list: pendingList,
          counted: pendingList.length,
        },
        processedQueue: {
          persons: processedPersons,
          vehicles: processedVehicles,
          counted: processedList.length,
          list: processedList,
        },
        allPassesQueue: {
          persons: allPersons,
          vehicles: allVehicles,
          list: allPassList,
          counted: allPassList.length,
        },
        rawAllPasses: allPassList,
        company: {
          total: num(companyCounts.total),
          approved: num(companyCounts.approved),
          rejected: num(companyCounts.rejected),
          pending: num(companyCounts.pending),
        },
        profileUpdates: num(profilePagination.totalRecords),
        bulk: {
          total: bulkTotal,
          pending: bulkPending,
          approved: bulkApproved,
          rejected: bulkRejected,
        },
        bl: {
          active_blacklisted: num(blStats.active_blacklisted),
          pending_blacklist: num(blStats.pending_blacklist),
          pending_unblacklist: num(blStats.pending_unblacklist),
          total_unblacklisted: num(blStats.total_unblacklisted),
          total: num(blStats.total),
        },
        blType: {
          COMPANY: num(blByType.COMPANY ?? 0),
          PERSON: num(blByType.PERSON ?? 0),
          DRIVER: num(blByType.DRIVER ?? 0),
          VEHICLE: num(blByType.VEHICLE ?? 0),
        },
        blRecent: blRecentList,
        blPending: blPendingList,
        overstay: {
          pending: ovPending.length,
          paid: ovPaid.length,
          exceptions: ovExc,
          pendingAmount: ovPending.reduce(
            (s, c) => s + num(c.total_amount ?? c.amount),
            0,
          ),
          paidAmount: ovPaid.reduce(
            (s, c) => s + num(c.total_amount ?? c.amount),
            0,
          ),
          total: charges.length,
          todayPaid,
          monthPaid,
          rawCharges: charges,
        },
        hepRevenue: {
          total: hepTotal,
          accountTotal: hepAccount,
          ecashTotal: hepEcash,
          todayTotal: hepToday,
          monthTotal: hepMonth,
          processedTotal: hepProcessedTotal,
          pendingTotal: hepPendingTotal,
          totalPersons: allPersons,
          totalVehicles: allVehicles,
          topCompanies,
          companyList,
        },
        portActivity: {
          today: activityToday,
          week: activityWeek,
          month: activityMonth,
        },
        avgApprovalMins: avgMins,
      });
      setLastUpdated(fmtDateTime());
    } catch (err) {
      console.error("Dashboard fetchAll error:", err);
      toast.error("Failed to load dashboard. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 3 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const filterRange = useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    if (filterPeriod === "today") {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      return { from, to, label: "Today" };
    }
    if (filterPeriod === "week") {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to, label: "Last 7 Days" };
    }
    if (filterPeriod === "month") {
      const from = new Date();
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      return { from, to, label: "This Month" };
    }
    if (filterPeriod === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      return { from, to: end, label: `${customFrom} to ${customTo}` };
    }
    return { from: new Date(0), to: new Date(), label: "All Time" };
  }, [filterPeriod, customFrom, customTo]);

  const displayData = useMemo(() => {
    const isAll = filterPeriod === "all";
    const inRange = (dStr) => {
      if (!dStr) return false;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return false;
      return d >= filterRange.from && d <= filterRange.to;
    };

    // Shift-wise time filter
    const inShift = (dStr) => {
      if (shiftFilter === "all") return true;
      if (!dStr) return false;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return false;
      const h = d.getHours();
      if (shiftFilter === "shift1") return h >= 7 && h < 14; // Morning  07:00–14:00
      if (shiftFilter === "shift2") return h >= 14 && h < 21; // Afternoon 14:00–21:00
      if (shiftFilter === "shift3") return h >= 21 || h < 7; // Night    21:00–07:00
      return true;
    };

    const getPassAmt = (p) => {
      const direct = parseFloat(
        p.netAmount ??
          p.net_amount ??
          p.netamount ??
          p.baseTotal ??
          p.basetotal ??
          p.grossTotal ??
          p.grosstotal ??
          0,
      );
      if (Number.isFinite(direct) && direct > 0) return direct;
      let sum = 0;
      (p.persons || []).forEach((x) => {
        sum += parseFloat(x.amount || 0) || 0;
      });
      (p.vehicles || []).forEach((x) => {
        sum += parseFloat(x.amount || 0) || 0;
      });
      return sum;
    };

    const passSourceList =
      data.rawAllPasses?.length > 0
        ? data.rawAllPasses
        : data.allPassesQueue?.list || [];

    // Apply date-range filter first, then shift-time filter
    const dateFiltered = isAll
      ? passSourceList
      : passSourceList.filter((p) =>
          inRange(p.createdAt || p.submittedAt || p.updatedAt),
        );
    const filteredPasses = dateFiltered.filter((p) =>
      inShift(p.createdAt || p.submittedAt || p.updatedAt),
    );

    // ── Shift Filter Debug Log ─────────────────────────────────────────────
    const shiftName =
      shiftFilter === "shift1"
        ? "1st Shift — Morning  (07:00–14:00)"
        : shiftFilter === "shift2"
          ? "2nd Shift — Afternoon (14:00–21:00)"
          : shiftFilter === "shift3"
            ? "3rd Shift — Night    (21:00–07:00)"
            : "All Shifts (no time filter)";

    const toRow = (p) => {
      const raw = p.createdAt || p.submittedAt || p.updatedAt;
      const d = raw ? new Date(raw) : null;
      return {
        ref: p.referenceNo || p.id || "—",
        status: p.status || "—",
        company: p.companyName || p.company?.name || "—",
        persons: p.persons?.length ?? 0,
        vehicles: p.vehicles?.length ?? 0,
        date: d ? d.toLocaleDateString("en-IN") : "—",
        time: d
          ? d.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "—",
        hour: d ? d.getHours() + "h" : "—",
        rawTimestamp: raw || "—",
      };
    };

    console.group(
      "%c🔀 SHIFT FILTER PIPELINE",
      "background:#0a1e4d;color:#fbbf24;font-weight:bold;font-size:12px;padding:3px 8px;border-radius:4px;",
    );
    console.log("Date period   :", filterRange.label);
    console.log("Shift active  :", shiftName);
    console.log("─────────────────────────────────────────────────");
    console.log("Total source  :", passSourceList.length, "passes");
    console.log("After date ↓  :", dateFiltered.length, "passes");
    console.log("After shift ↓ :", filteredPasses.length, "passes");

    // Hour-bucket breakdown
    const buckets = { "00–07": 0, "07–14": 0, "14–21": 0, "21–24": 0 };
    dateFiltered.forEach((p) => {
      const d = new Date(p.createdAt || p.submittedAt || p.updatedAt);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        if (h < 7) buckets["00–07"]++;
        else if (h < 14) buckets["07–14"]++;
        else if (h < 21) buckets["14–21"]++;
        else buckets["21–24"]++;
      }
    });
    console.log("Hour buckets  :", buckets);

    // Full source list with timestamps
    console.groupCollapsed(`📋 All Source Passes (${passSourceList.length})`);
    console.table(passSourceList.map(toRow));
    console.groupEnd();

    // Full date-filtered list
    console.groupCollapsed(
      `📅 After Date Filter — ${filterRange.label} (${dateFiltered.length})`,
    );
    console.table(dateFiltered.map(toRow));
    console.groupEnd();

    // Full shift-matched list
    console.groupCollapsed(
      `⏰ After Shift Filter — ${shiftName} (${filteredPasses.length})`,
    );
    console.table(filteredPasses.map(toRow));
    console.groupEnd();

    console.groupEnd();
    // ──────────────────────────────────────────────────────────────────────

    const pendingList = filteredPasses.filter((p) =>
      ["SUBMITTED", "PENDING", "IN_REVIEW", "UNDER_REVIEW"].includes(
        String(p.status || "").toUpperCase(),
      ),
    );
    const processedList = filteredPasses.filter((p) =>
      ["APPROVED", "PROCESSED", "COMPLETED", "ISSUED"].includes(
        String(p.status || "").toUpperCase(),
      ),
    );
    const revertedList = filteredPasses.filter((p) =>
      ["REVERTED"].includes(String(p.status || "").toUpperCase()),
    );
    const rejectedList = filteredPasses.filter((p) =>
      ["REJECTED"].includes(String(p.status || "").toUpperCase()),
    );

    const pendingPersons = pendingList.reduce(
      (s, p) => s + (p.persons?.length || 0),
      0,
    );
    const pendingVehicles = pendingList.reduce(
      (s, p) => s + (p.vehicles?.length || 0),
      0,
    );
    const pendingCompanies = new Set(
      pendingList
        .map((p) => p.agentId || p.email || p.entityName)
        .filter(Boolean),
    ).size;

    const processedPersons = processedList.reduce(
      (s, p) => s + (p.persons?.length || 0),
      0,
    );
    const processedVehicles = processedList.reduce(
      (s, p) => s + (p.vehicles?.length || 0),
      0,
    );

    const totalPersons = filteredPasses.reduce(
      (s, p) => s + (p.persons?.length || 0),
      0,
    );
    const totalVehicles = filteredPasses.reduce(
      (s, p) => s + (p.vehicles?.length || 0),
      0,
    );

    let totalRevenue = 0,
      accountRevenue = 0,
      ecashRevenue = 0;
    const companyMap = {};

    filteredPasses.forEach((p) => {
      const amt = getPassAmt(p);
      totalRevenue += amt;
      const mode = String(
        p.paymentMode || p.payment_mode || p.paymentmode || "",
      ).toUpperCase();
      if (mode === "E-CASH" || mode === "ECASH") {
        ecashRevenue += amt;
      } else {
        accountRevenue += amt;
      }

      const pCount = (p.persons || []).length;
      const vCount = (p.vehicles || []).length;
      let pFee = 0;
      (p.persons || []).forEach((x) => {
        pFee += parseFloat(x.amount || 0) || 0;
      });
      let vFee = 0;
      (p.vehicles || []).forEach((x) => {
        vFee += parseFloat(x.amount || 0) || 0;
      });

      const co = (
        p.entityName ||
        p.entity_name ||
        p.agentName ||
        p.agent_name ||
        p.companyName ||
        "Direct / Authorized Agent"
      ).trim();

      const pStatus = String(p.status || "APPROVED").toUpperCase();
      const isApproved = [
        "APPROVED",
        "PROCESSED",
        "COMPLETED",
        "ISSUED",
      ].includes(pStatus);
      const isPending = [
        "SUBMITTED",
        "PENDING",
        "IN_REVIEW",
        "UNDER_REVIEW",
      ].includes(pStatus);

      if (!companyMap[co]) {
        companyMap[co] = {
          name: co,
          total: 0,
          accountTotal: 0,
          ecashTotal: 0,
          passCount: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          personPassFee: 0,
          vehiclePassFee: 0,
          persons: 0,
          vehicles: 0,
          paymentMode: mode || "ACCOUNT",
          passes: [],
        };
      }
      companyMap[co].total += amt;
      if (mode === "E-CASH" || mode === "ECASH") {
        companyMap[co].ecashTotal += amt;
      } else {
        companyMap[co].accountTotal += amt;
      }
      companyMap[co].passCount += 1;
      companyMap[co].persons += pCount;
      companyMap[co].vehicles += vCount;
      companyMap[co].personPassFee += pFee;
      companyMap[co].vehiclePassFee += vFee;
      if (isApproved) {
        companyMap[co].approvedCount += 1;
      } else if (isPending) {
        companyMap[co].pendingCount += 1;
      } else {
        companyMap[co].rejectedCount += 1;
      }

      companyMap[co].passes.push({
        id: p.id,
        referenceNo: p.referenceNo || (p.id ? `REQ-${p.id}` : "—"),
        status: pStatus,
        paymentMode: mode || "ACCOUNT",
        amount: amt,
        personFee: pFee,
        vehicleFee: vFee,
        personsCount: pCount,
        vehiclesCount: vCount,
        persons: p.persons || [],
        vehicles: p.vehicles || [],
        createdAt: p.createdAt || p.submittedAt || p.updatedAt,
        approvedAt: p.approvedAt || p.reviewedAt || null,
        entityName: p.entityName || p.companyName || co,
        email: p.email || p.applicantEmail || "",
        applicantName: p.applicantName || p.name || p.contactPerson || "",
        purpose:
          p.purposeOfVisit || p.purpose || "Port Operations & Cargo Movement",
        zone:
          p.zone ||
          p.department ||
          p.harborCategory ||
          p.area ||
          "Harbor Operational Zone",
        passType: p.passType || p.type || "Harbor Entry Permit",
        validityType: p.validityType || p.duration || "Standard Daily",
      });
    });

    const companyList = Object.values(companyMap)
      .map((c) => ({
        ...c,
        avgPassAmount: c.passCount > 0 ? c.total / c.passCount : 0,
        approvalRate:
          c.passCount > 0
            ? Math.round((c.approvedCount / c.passCount) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const topCompanies = companyList.slice(0, 5).map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
      fullName: c.name,
      value: c.total,
      passCount: c.passCount,
      persons: c.persons,
      vehicles: c.vehicles,
    }));

    const chargeSourceList = data.overstay?.rawCharges || [];
    const filteredCharges = isAll
      ? chargeSourceList
      : chargeSourceList.filter((c) =>
          inRange(c.created_at || c.updatedAt || c.createdAt),
        );

    const ovPending = filteredCharges.filter((c) => c.status === "PENDING");
    const ovPaid = filteredCharges.filter((c) => c.status === "PAID");
    const ovPaidAmount = ovPaid.reduce(
      (s, c) => s + num(c.total_amount ?? c.amount),
      0,
    );
    const ovPendingAmount = ovPending.reduce(
      (s, c) => s + num(c.total_amount ?? c.amount),
      0,
    );

    const filteredBlRecent = isAll
      ? data.blRecent
      : data.blRecent.filter((e) => inRange(e.createdAt));

    return {
      pass: {
        total: filteredPasses.length,
        pending: pendingList.length,
        processed: processedList.length,
        reverted: revertedList.length,
        rejected: rejectedList.length,
      },
      pendingQueue: {
        persons: pendingPersons,
        vehicles: pendingVehicles,
        companies: pendingCompanies,
        list: pendingList,
        counted: pendingList.length,
      },
      processedQueue: {
        persons: processedPersons,
        vehicles: processedVehicles,
        counted: processedList.length,
        list: processedList,
      },
      hepRevenue: {
        total: totalRevenue,
        accountTotal: accountRevenue,
        ecashTotal: ecashRevenue,
        todayTotal: data.hepRevenue.todayTotal,
        monthTotal: data.hepRevenue.monthTotal,
        allTimeTotal: data.hepRevenue.total,
        totalPersons,
        totalVehicles,
        topCompanies,
        companyList,
      },
      overstay: {
        total: filteredCharges.length,
        pending: ovPending.length,
        paid: ovPaid.length,
        exceptions: data.overstay.exceptions,
        pendingAmount: ovPendingAmount,
        paidAmount: ovPaidAmount,
        todayPaid: data.overstay.todayPaid,
        monthPaid: data.overstay.monthPaid,
        allTimePaid: data.overstay.paidAmount,
      },
      portActivity: {
        currentPeriod: filteredPasses.length,
        today: data.portActivity.today,
        week: data.portActivity.week,
        month: data.portActivity.month,
      },
      blRecent:
        filteredBlRecent.length > 0
          ? filteredBlRecent
          : isAll
            ? data.blRecent
            : [],
      blPending: data.blPending,
      blType: data.blType,
      company: data.company,
      bulk: data.bulk,
      profileUpdates: data.profileUpdates,
      bl: data.bl,
      avgApprovalMins: data.avgApprovalMins,
    };
  }, [data, filterPeriod, filterRange, shiftFilter]);

  const hepRevBreakup = useMemo(
    () => [
      { label: "Today", value: data.hepRevenue.todayTotal },
      { label: "This Month", value: data.hepRevenue.monthTotal },
      { label: "All Time", value: data.hepRevenue.total },
    ],
    [data],
  );

  const revBreakup = useMemo(
    () => [
      { label: "Today", value: data.overstay.todayPaid },
      { label: "This Month", value: data.overstay.monthPaid },
      { label: "All Time", value: data.overstay.paidAmount },
    ],
    [data],
  );

  const PERIOD_TABS = [
    { key: "all", label: "All Time", icon: "🌐" },
    { key: "today", label: "Today", icon: "⚡" },
    { key: "week", label: "Last 7 Days", icon: "📅" },
    { key: "month", label: "This Month", icon: "🗓" },
  ];

  const SHIFT_TABS = [
    {
      key: "all",
      label: "All Shifts",
      icon: "🕐",
      color: "bg-white text-[#0a1e4d]",
      activeGlow: "shadow-[0_4px_16px_rgba(255,255,255,0.25)]",
    },
    {
      key: "shift1",
      label: "1st · Morning",
      icon: "🌅",
      color: "bg-amber-400 text-white",
      activeGlow: "shadow-[0_4px_16px_rgba(251,191,36,0.55)]",
    },
    {
      key: "shift2",
      label: "2nd · Afternoon",
      icon: "☀️",
      color: "bg-orange-500 text-white",
      activeGlow: "shadow-[0_4px_16px_rgba(249,115,22,0.55)]",
    },
    {
      key: "shift3",
      label: "3rd · Night",
      icon: "🌙",
      color: "bg-indigo-500 text-white",
      activeGlow: "shadow-[0_4px_16px_rgba(99,102,241,0.55)]",
    },
  ];

  const shiftLabel =
    shiftFilter === "shift1"
      ? " · Morning (07:00–14:00)"
      : shiftFilter === "shift2"
        ? " · Afternoon (14:00–21:00)"
        : shiftFilter === "shift3"
          ? " · Night (21:00–07:00)"
          : "";

  const activeShiftTab =
    SHIFT_TABS.find((s) => s.key === shiftFilter) || SHIFT_TABS[0];

  const avgColor =
    data.avgApprovalMins == null
      ? "text-slate-300"
      : data.avgApprovalMins < 30
        ? "text-emerald-300"
        : data.avgApprovalMins < 120
          ? "text-amber-300"
          : "text-orange-300";
  const avgDot =
    data.avgApprovalMins == null
      ? "bg-slate-400"
      : data.avgApprovalMins < 30
        ? "bg-emerald-400"
        : data.avgApprovalMins < 120
          ? "bg-amber-400"
          : "bg-orange-400";

  const activeModalCompany = useMemo(() => {
    if (!selectedLedgerCompany) return null;
    const found = displayData.hepRevenue.companyList.find(
      (c) => c.name === selectedLedgerCompany.name,
    );
    return found || selectedLedgerCompany;
  }, [selectedLedgerCompany, displayData.hepRevenue.companyList]);

  const filteredCompanyPasses = useMemo(() => {
    if (!activeModalCompany?.passes) return [];
    return activeModalCompany.passes.filter((p) => {
      if (ledgerStatusFilter !== "ALL" && p.status !== ledgerStatusFilter)
        return false;
      if (
        ledgerModeFilter === "ACCOUNT" &&
        (p.paymentMode === "E-CASH" || p.paymentMode === "ECASH")
      )
        return false;
      if (
        ledgerModeFilter === "ECASH" &&
        p.paymentMode !== "E-CASH" &&
        p.paymentMode !== "ECASH"
      )
        return false;
      if (ledgerSearchQuery.trim()) {
        const q = ledgerSearchQuery.toLowerCase();
        const refMatch = String(p.referenceNo || "")
          .toLowerCase()
          .includes(q);
        const emailMatch = String(p.email || "")
          .toLowerCase()
          .includes(q);
        const entityMatch = String(p.entityName || "")
          .toLowerCase()
          .includes(q);
        const personMatch = (p.persons || []).some((x) =>
          String(x.name || x.fullName || "")
            .toLowerCase()
            .includes(q),
        );
        const vehicleMatch = (p.vehicles || []).some((x) =>
          String(x.vehicleNumber || x.vehicleNo || "")
            .toLowerCase()
            .includes(q),
        );
        return (
          refMatch || emailMatch || entityMatch || personMatch || vehicleMatch
        );
      }
      return true;
    });
  }, [
    activeModalCompany,
    ledgerSearchQuery,
    ledgerStatusFilter,
    ledgerModeFilter,
  ]);

  const activeCompanyEntities = useMemo(() => {
    if (!activeModalCompany?.passes) return { persons: [], vehicles: [] };
    const personsMap = new Map();
    const vehiclesMap = new Map();

    activeModalCompany.passes.forEach((p) => {
      (p.persons || []).forEach((psn, pIdx) => {
        const key =
          psn.id ||
          psn.aadhaarNo ||
          psn.idNumber ||
          `${psn.name || psn.fullName || "person"}-${pIdx}`;
        if (key && !personsMap.has(key)) {
          personsMap.set(key, {
            id: key,
            name: psn.name || psn.fullName || "Authorized Personnel",
            designation: psn.designation || psn.role || "Port Staff / Driver",
            idProof:
              psn.aadhaarNo ||
              psn.idNumber ||
              psn.documentNumber ||
              psn.idProof ||
              "Verified ID",
            phone: psn.mobileNumber || psn.phone || psn.contactNo || "—",
            passRef: p.referenceNo,
            passStatus: p.status,
            amount: psn.amount || 0,
            date: p.createdAt,
          });
        }
      });

      (p.vehicles || []).forEach((veh, vIdx) => {
        const key =
          veh.id ||
          veh.vehicleNumber ||
          veh.registrationNumber ||
          `veh-${vIdx}-${veh.vehicleNo || ""}`;
        if (key && !vehiclesMap.has(key)) {
          vehiclesMap.set(key, {
            id: key,
            plate:
              veh.vehicleNumber ||
              veh.registrationNumber ||
              veh.vehicleNo ||
              "Commercial Fleet Vehicle",
            type:
              veh.vehicleType ||
              veh.type ||
              "Heavy Commercial / Container Truck",
            driver:
              veh.driverName ||
              veh.driver ||
              p.applicantName ||
              "Authorized Operator",
            passRef: p.referenceNo,
            passStatus: p.status,
            amount: veh.amount || 0,
            date: p.createdAt,
          });
        }
      });
    });

    return {
      persons: Array.from(personsMap.values()),
      vehicles: Array.from(vehiclesMap.values()),
    };
  }, [activeModalCompany]);

  const companyFinancials = useMemo(() => {
    if (!activeModalCompany) {
      return {
        accountPct: 0,
        ecashPct: 0,
        approvedTotal: 0,
        pendingTotal: 0,
        personSharePct: 0,
        vehicleSharePct: 0,
      };
    }
    const tot = activeModalCompany.total || 0;
    const acct = activeModalCompany.accountTotal || 0;
    const ecash = activeModalCompany.ecashTotal || 0;
    const pFee = activeModalCompany.personPassFee || 0;
    const vFee = activeModalCompany.vehiclePassFee || 0;

    let appTotal = 0;
    let pendTotal = 0;
    (activeModalCompany.passes || []).forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (
        ["APPROVED", "PROCESSED", "COMPLETED", "ISSUED"].includes(
          String(p.status).toUpperCase(),
        )
      ) {
        appTotal += amt;
      } else {
        pendTotal += amt;
      }
    });

    return {
      accountPct: tot > 0 ? Math.round((acct / tot) * 100) : 0,
      ecashPct: tot > 0 ? Math.round((ecash / tot) * 100) : 0,
      approvedTotal: appTotal,
      pendingTotal: pendTotal,
      personSharePct: tot > 0 ? Math.round((pFee / tot) * 100) : 0,
      vehicleSharePct: tot > 0 ? Math.round((vFee / tot) * 100) : 0,
    };
  }, [activeModalCompany]);

  const allCompaniesFiltered = useMemo(() => {
    const list = displayData.hepRevenue.companyList || [];
    if (!allCompaniesSearch.trim()) return list;
    const q = allCompaniesSearch.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [displayData.hepRevenue.companyList, allCompaniesSearch]);

  return (
    <div className="relative space-y-5 font-sans text-slate-800 p-6 pb-8 bg-slate-50 min-h-screen">
      {/* HEADER STRIP */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] ring-1 ring-inset ring-white/15 px-5 py-4 text-white shadow-[0_8px_24px_-10px_rgba(10,30,77,0.55)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shrink-0">
              <BarChart3 className="h-5 w-5 text-orange-300" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-200/80">
                Traffic & Pass Section · Chennai Port Authority
              </p>
              <h2 className="text-lg font-black tracking-tight text-white leading-tight">
                TRAFFIC – PASS OPERATIONAL SECTION DASHBOARD
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-inset ring-white/15">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
              <button
                onClick={fetchAll}
                disabled={loading}
                className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
              <div className="leading-tight">
                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70 block">
                  Last Updated
                </span>
                {lastUpdated ? (
                  <span className="text-[11px] font-bold text-white">
                    {lastUpdated}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/50 animate-pulse">
                    Syncing…
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#112568] to-[#1a2f7a] shadow-[0_8px_28px_-8px_rgba(10,30,77,0.45)] ring-1 ring-inset ring-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30">
              <CalendarDays className="h-4 w-4 text-orange-300" />
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-200/70">
                Dashboard Control
              </p>
              <p className="text-sm font-extrabold text-white">Filter Period</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/15 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setFilterPeriod(t.key);
                  setShowCustom(false);
                }}
                className={`relative px-5 py-2 rounded-xl text-[13px] font-extrabold tracking-wide transition-all duration-200 ${filterPeriod === t.key && !showCustom ? "bg-white text-[#0a1e4d] shadow-[0_4px_16px_rgba(255,255,255,0.25)] scale-105" : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white ring-1 ring-inset ring-white/15"}`}
              >
                {filterPeriod === t.key && !showCustom && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                  </span>
                )}
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <div className="h-6 w-px bg-white/15 shrink-0" />
            <button
              onClick={() => {
                setShowCustom((p) => !p);
                setFilterPeriod("custom");
              }}
              className={`px-5 py-2 rounded-xl text-[13px] font-extrabold tracking-wide transition-all duration-200 flex items-center gap-2 ${showCustom ? "bg-orange-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.5)] scale-105" : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white ring-1 ring-inset ring-white/15"}`}
            >
              <CalendarDays className="h-4 w-4" />
              Custom Range
            </button>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-200/60 block">
              Active Filter
            </span>
            <span className="text-base font-black text-orange-300 block leading-tight">
              {filterRange.label}
            </span>
            {/* Shift subtitle — fixed height, opacity-only transition, no layout shift */}
            <span
              className={`text-[11px] font-bold block leading-tight mt-0.5 transition-opacity duration-200 ${
                shiftFilter === "all"
                  ? "opacity-0 text-blue-200/60"
                  : "opacity-100 text-blue-200/80"
              }`}
            >
              {shiftFilter === "shift1"
                ? "🌅 Morning · 07:00–14:00"
                : shiftFilter === "shift2"
                  ? "☀️ Afternoon · 14:00–21:00"
                  : shiftFilter === "shift3"
                    ? "🌙 Night · 21:00–07:00"
                    : "\u00a0"}
            </span>
          </div>
        </div>
        {showCustom && (
          <div className="relative border-t border-white/10 px-5 py-3 flex items-center gap-3 flex-wrap bg-white/5">
            <span className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider shrink-0">
              Date Range
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white/60 uppercase">
                From
              </span>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setFilterPeriod("custom");
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white/60 uppercase">
                To
              </span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setFilterPeriod("custom");
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
              />
            </div>
            {customFrom && customTo && (
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setFilterPeriod("month");
                  setShowCustom(false);
                }}
                className="ml-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 border border-rose-400/30 transition-all"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {/* SHIFT FILTER ROW — iOS segmented control style, zero layout change on click */}
        <div className="relative border-t border-white/10 px-5 py-3 flex items-center gap-3 bg-white/[0.03]">
          {/* Label */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/25 ring-1 ring-indigo-400/30">
              <Timer className="h-3.5 w-3.5 text-indigo-300" />
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-200/60">
                Duty Shift
              </p>
              <p className="text-[12px] font-extrabold text-white">
                Shift Filter
              </p>
            </div>
          </div>
          <div className="h-6 w-px bg-white/15 shrink-0" />

          {/* Segmented control — single container, no individual button color changes */}
          <div className="flex items-center rounded-xl bg-white/8 ring-1 ring-inset ring-white/10 p-0.5 gap-0.5">
            {SHIFT_TABS.map((s) => (
              <button
                key={s.key}
                onClick={() => setShiftFilter(s.key)}
                className={`relative px-4 py-1.5 rounded-[10px] text-[12px] font-extrabold tracking-wide transition-colors duration-150 flex items-center gap-1.5 ${
                  shiftFilter === s.key
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. OPERATIONAL EXECUTIVE SUMMARY */}
      <div>
        <SectionDivider label="Executive Operations Summary" icon={Sparkles} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mt-2">
          <KpiCard
            title="Pass Approvals"
            value={displayData.pass.total}
            icon={ShieldCheck}
            gradient="from-blue-600 via-indigo-600 to-violet-700"
            glow="shadow-blue-500/30"
            href="/traffic_approval/passes"
            loading={loading}
            chips={[
              {
                icon: Clock,
                value: displayData.pass.pending,
                label: "Pending",
              },
              ...(displayData.pass.reverted > 0
                ? [
                    {
                      icon: RotateCcw,
                      value: displayData.pass.reverted,
                      label: "Reverted",
                    },
                  ]
                : []),
            ]}
          />
          {/* ── NEW: Passes Approved ── */}
          <KpiCard
            title="Passes Approved"
            value={displayData.pass.processed}
            icon={CheckCircle2}
            gradient="from-emerald-500 via-emerald-600 to-teal-600"
            glow="shadow-emerald-500/35"
            href="/traffic_approval/passes?tab=processed"
            loading={loading}
            chips={[
              {
                icon: Users,
                value: displayData.processedQueue.persons,
                label: "Persons",
              },
              {
                icon: Car,
                value: displayData.processedQueue.vehicles,
                label: "Vehicles",
              },
            ]}
          />
          {/* ── NEW: Passes Rejected ── */}
          <KpiCard
            title="Passes Rejected"
            value={displayData.pass.rejected}
            icon={XCircle}
            gradient="from-rose-500 via-rose-600 to-pink-700"
            glow="shadow-rose-500/35"
            href="/traffic_approval/passes?tab=processed"
            loading={loading}
            chips={[
              {
                icon: RotateCcw,
                value: displayData.pass.reverted,
                label: "Reverted",
              },
            ]}
          />
          <KpiCard
            title="Company Approvals"
            value={displayData.company.approved}
            icon={Building2}
            gradient="from-indigo-600 via-purple-600 to-violet-700"
            glow="shadow-indigo-500/30"
            href="/traffic_approval/companies?tab=processed"
            loading={loading}
            chips={[
              {
                icon: Clock,
                value: displayData.company.pending,
                label: "Pending",
              },
              {
                icon: Building2,
                value: displayData.company.total,
                label: "Total",
              },
            ]}
          />
          <KpiCard
            title="Port Traffic"
            value={displayData.portActivity.today}
            icon={Truck}
            gradient="from-sky-500 to-cyan-600"
            glow="shadow-sky-500/30"
            href="/traffic_approval/passes"
            loading={loading}
            chips={[
              {
                icon: Clock,
                value: displayData.portActivity.today,
                label: "Today",
              },
              {
                icon: Activity,
                value: displayData.portActivity.week,
                label: "This Week",
              },
            ]}
          />
          <KpiCard
            title="Active Blacklisted"
            value={displayData.bl.active_blacklisted}
            icon={ShieldBan}
            gradient="from-rose-500 to-red-600"
            glow="shadow-rose-500/30"
            href="/traffic_approval/blacklist"
            loading={loading}
            chips={[
              {
                icon: Car,
                value: displayData.blType.VEHICLE,
                label: "Vehicles",
              },
              {
                icon: UserCircle,
                value: displayData.blType.DRIVER,
                label: "Drivers",
              },
            ]}
          />
          <KpiCard
            title="Overstay Cases"
            value={displayData.overstay.pending}
            icon={Timer}
            gradient="from-violet-500 to-purple-600"
            glow="shadow-violet-500/30"
            href="/traffic_approval/overstay"
            loading={loading}
            chips={[
              {
                icon: AlertTriangle,
                value: displayData.overstay.exceptions,
                label: "Exceptions",
              },
              {
                icon: CircleDollarSign,
                value: displayData.overstay.paid,
                label: "Settled",
              },
            ]}
          />
          <KpiCard
            title="Revenue Collected"
            value={displayData.hepRevenue.total}
            icon={Wallet}
            gradient="from-blue-600 to-indigo-700"
            glow="shadow-blue-600/30"
            href="/traffic_approval/revenue"
            isMoney
            loading={loading}
            chips={[
              {
                icon: Calculator,
                value: displayData.hepRevenue.accountTotal,
                label: "Account",
              },
              {
                icon: PackageCheck,
                value: displayData.pass.total,
                label: "Passes",
              },
            ]}
          />
        </div>
      </div>

      {/* 2. PENDING PASS APPLICATIONS — PRIORITY CLEARANCE */}
      <SectionDivider
        label="Pass Applications — Pending Clearance (Priority)"
        icon={Clock}
      />
      <Panel
        title="Pass Applications Awaiting Clearance"
        subtitle={`Entries awaiting operational clearance & approval (${filterRange.label})`}
        icon={Clock}
        tone="amber"
        action="Review All"
        actionHref="/traffic_approval/passes?tab=pending"
      >
        {/* Summary chips row */}
        <div className="flex items-center gap-2.5 flex-wrap mb-4">
          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white border border-amber-600 px-3.5 py-1.5 shadow-md shadow-amber-300/40">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-black tabular-nums">
              {loading ? "—" : fmtNum(displayData.pass.pending)}
            </span>
            <span className="text-[11px] font-bold text-amber-100">
              Pending
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white border border-blue-700 px-3.5 py-1.5 shadow-md shadow-blue-300/40">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-black tabular-nums">
              {loading ? "—" : fmtNum(displayData.pendingQueue.persons)}
            </span>
            <span className="text-[11px] font-bold text-blue-100">Persons</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white border border-violet-700 px-3.5 py-1.5 shadow-md shadow-violet-300/40">
            <Car className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-black tabular-nums">
              {loading ? "—" : fmtNum(displayData.pendingQueue.vehicles)}
            </span>
            <span className="text-[11px] font-bold text-violet-100">
              Vehicles
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white border border-emerald-700 px-3.5 py-1.5 shadow-md shadow-emerald-300/40">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-black tabular-nums">
              {loading ? "—" : fmtNum(displayData.pendingQueue.companies)}
            </span>
            <span className="text-[11px] font-bold text-emerald-100">
              Companies
            </span>
          </span>
          <Link
            href="/traffic_approval/companies?tab=processed"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 px-3.5 py-1.5 shadow-md shadow-indigo-300/40 transition-all hover:-translate-y-0.5"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px] font-black tabular-nums">
              {loading ? "—" : fmtNum(displayData.company.approved)}
            </span>
            <span className="text-[11px] font-bold text-indigo-100">
              Approved
            </span>
            <ArrowUpRight className="h-3 w-3 text-indigo-200" />
          </Link>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto max-h-72 space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-amber-50">
          {loading ? (
            <div className="py-2">
              <SkeletonRows />
            </div>
          ) : displayData.pendingQueue.list.length === 0 ? (
            <EmptyRow label="No passes awaiting approval in this period" />
          ) : (
            displayData.pendingQueue.list.map((p, i) => {
              const status = String(p.status || "PENDING").toUpperCase();
              return (
                <div
                  key={p.id ?? p.referenceNo ?? i}
                  {...rowLinkProps(
                    "/traffic_approval/passes?tab=pending",
                    `Review ${p.referenceNo || "pass request"}`,
                  )}
                  className="group/row relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 cursor-pointer shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-[1px] hover:bg-amber-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 overflow-hidden"
                >
                  {/* Left accent stripe */}
                  <div className="absolute left-0 inset-y-0 w-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500" />

                  {/* Serial number */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-[12px] font-black group-hover/row:bg-amber-100 group-hover/row:text-amber-700 transition-colors">
                    {i + 1}
                  </span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Reference number + Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-mono font-black text-slate-900 tracking-tight leading-none">
                        {p.referenceNo || (p.id ? `REQ-${p.id}` : "—")}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg font-extrabold text-[10px] border ${PASS_STATUS_TONE[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>
                    {/* Row 2: Entity name · email */}
                    <p className="text-[12px] text-slate-600 font-semibold truncate mt-0.5 leading-snug">
                      {p.entityName || "—"}
                      {p.email ? (
                        <span className="text-slate-400 font-normal">
                          {" "}
                          · {p.email}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {/* Person / Vehicle count badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold shadow-sm">
                      <Users className="h-3.5 w-3.5" />
                      {p.persons?.length || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-violet-600 text-white px-2.5 py-1 text-[11px] font-bold shadow-sm">
                      <Car className="h-3.5 w-3.5" />
                      {p.vehicles?.length || 0}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-[11px] font-bold text-slate-500 shrink-0 hidden sm:block bg-slate-100 rounded-lg px-2.5 py-1 min-w-[80px] text-center group-hover/row:bg-amber-100 group-hover/row:text-amber-700 transition-colors">
                    {fmtDate(p.createdAt)}
                  </span>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 -translate-x-1 opacity-0 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-150" />
                </div>
              );
            })
          )}
        </div>

        {!loading && displayData.pendingQueue.list.length > 0 && (
          <p className="mt-3 text-[11px] font-bold text-amber-600 text-right">
            Showing {fmtNum(displayData.pendingQueue.list.length)} of{" "}
            {fmtNum(displayData.pass.pending)} pending passes
          </p>
        )}
      </Panel>

      {/* 3. PORT OPERATIONS & TRAFFIC MONITORING */}
      <SectionDivider
        label="Port Operations & Traffic Monitoring"
        icon={Globe}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Port Traffic & Movement Register"
          subtitle="Authorised movements and transactions within port limits"
          icon={Globe}
          tone="cyan"
          action="View Details"
          actionHref="/traffic_approval/overstay"
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MiniStat
              label="Total Pass Applications"
              value={displayData.pass.total}
              tone="cyan"
              icon={Truck}
              loading={loading}
              href="/traffic_approval/passes"
            />
            <MiniStat
              label="Overstay Pending"
              value={displayData.overstay.pending}
              tone="rose"
              icon={Timer}
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <MiniStat
              label="Exceptions"
              value={displayData.overstay.exceptions}
              tone="amber"
              icon={AlertTriangle}
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <MiniStat
              label="Settled"
              value={displayData.overstay.paid}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/overstay"
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: "Today",
                value: displayData.portActivity.today,
                icon: "⚡",
                grad: "from-amber-400 via-orange-500 to-red-500",
                shadow: "shadow-orange-400/25",
              },
              {
                label: "Last 7 Days",
                value: displayData.portActivity.week,
                icon: "📊",
                grad: "from-sky-500 via-blue-500 to-indigo-600",
                shadow: "shadow-blue-500/25",
              },
              {
                label: "This Month",
                value: displayData.portActivity.month,
                icon: "🗓",
                grad: "from-emerald-500 via-teal-500 to-cyan-600",
                shadow: "shadow-emerald-500/25",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.grad} shadow-md ${item.shadow} px-3 py-2.5 ring-1 ring-inset ring-white/20 text-center`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="text-xs">{item.icon}</span>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/80">
                    {item.label}
                  </p>
                </div>
                {loading ? (
                  <div className="h-5 w-12 mx-auto rounded bg-white/30 animate-pulse mt-1" />
                ) : (
                  <p className="text-base font-black text-white tabular-nums drop-shadow-sm">
                    {fmtNum(item.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Overstay & Port Dues Clearance"
          subtitle={`Charges & exception requests (${filterRange.label})`}
          icon={Timer}
          tone="teal"
          action="View Overstay"
          actionHref="/traffic_approval/overstay"
        >
          <div className="space-y-1 mb-3">
            <IconStatRow
              label="Overstay Collected"
              value={displayData.overstay.paidAmount}
              icon={CircleDollarSign}
              tone="emerald"
              money
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Pending Dues"
              value={displayData.overstay.pendingAmount}
              icon={AlertTriangle}
              tone="rose"
              money
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Exception Requests"
              value={displayData.overstay.exceptions}
              icon={HelpCircle}
              tone="amber"
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Settled Cases"
              value={displayData.overstay.paid}
              icon={CheckCircle2}
              tone="sky"
              loading={loading}
              href="/traffic_approval/overstay"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 mt-3">
            {[
              {
                label: "Today",
                value: revBreakup[0]?.value,
                grad: "from-amber-400 to-orange-500",
                icon: "⚡",
              },
              {
                label: "This Month",
                value: revBreakup[1]?.value,
                grad: "from-teal-500 to-cyan-600",
                icon: "🗓",
              },
              {
                label: "All Time",
                value: revBreakup[2]?.value,
                grad: "from-indigo-500 to-violet-600",
                icon: "🌐",
              },
            ].map((r) => (
              <div
                key={r.label}
                className={`relative overflow-hidden flex items-center justify-between rounded-xl bg-gradient-to-r ${r.grad} px-3 py-2.5 ring-1 ring-inset ring-white/20`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 flex items-center gap-1">
                  <span>{r.icon}</span>
                  {r.label}
                </p>
                {loading ? (
                  <div className="h-5 w-16 rounded bg-white/30 animate-pulse" />
                ) : (
                  <p className="text-sm font-black text-white tabular-nums drop-shadow-sm">
                    {fmtMoney(r.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 4. PASS APPLICATION STATUS REGISTER & DEPARTMENTAL CLEARANCE */}
      <SectionDivider
        label="Pass Status & Department Distribution"
        icon={FileText}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Pass Application Status Register"
          subtitle={`Status-wise distribution (${filterRange.label})`}
          icon={FileText}
          tone="blue"
          action="View All"
          actionHref="/traffic_approval/passes"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat
              label="Approved"
              value={displayData.pass.processed}
              tone="emerald"
              icon={CheckCircle}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Pending"
              value={displayData.pass.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <MiniStat
              label="Total"
              value={displayData.pass.total}
              tone="blue"
              icon={FileText}
              loading={loading}
              href="/traffic_approval/passes"
            />
            <MiniStat
              label="Rejected"
              value={displayData.pass.rejected}
              tone="rose"
              icon={XCircle}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Reverted"
              value={displayData.pass.reverted}
              tone="violet"
              icon={RotateCcw}
              loading={loading}
              href="/traffic_approval/passes"
            />
            <MiniStat
              label="Blacklisted"
              value={displayData.blType.PERSON + displayData.blType.DRIVER}
              tone="red"
              icon={ShieldBan}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
          </div>
        </Panel>
        <PassTypeDistributionChart
          persons={displayData.hepRevenue.totalPersons}
          vehicles={displayData.hepRevenue.totalVehicles}
          loading={loading}
        />
      </div>

      {/* 5. PASS APPROVAL BREAKDOWN — PENDING & PROCESSED */}
      <SectionDivider
        label="Application Processing Status Summary"
        icon={ClipboardCheck}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Pass Applications — Pending Review"
          subtitle={`Applications under review (${filterRange.label})`}
          icon={Clock}
          tone="amber"
          action="Review"
          actionHref="/traffic_approval/passes?tab=pending"
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Total Pending"
              value={displayData.pass.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <MiniStat
              label="Persons"
              value={displayData.pendingQueue.persons}
              tone="blue"
              icon={Users}
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <MiniStat
              label="Vehicles"
              value={displayData.pendingQueue.vehicles}
              tone="violet"
              icon={Car}
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 mt-3">
            <MiniStat
              label="Companies"
              value={displayData.pendingQueue.companies}
              tone="indigo"
              icon={Building2}
              loading={loading}
              href="/traffic_approval/companies"
            />
          </div>
        </Panel>
        <Panel
          title="Pass Approval — Processed"
          subtitle={`Approved entries (${filterRange.label})`}
          icon={CheckCircle2}
          tone="emerald"
          action="View"
          actionHref="/traffic_approval/passes?tab=processed"
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Total Processed"
              value={displayData.pass.processed}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Total Passes"
              value={displayData.pass.total}
              tone="blue"
              icon={PackageCheck}
              loading={loading}
              href="/traffic_approval/passes"
            />
            <MiniStat
              label="My Processed"
              value={data.passMine}
              tone="sky"
              icon={ClipboardCheck}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <MiniStat
              label="Persons"
              value={displayData.processedQueue.persons}
              tone="blue"
              icon={Users}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Vehicles"
              value={displayData.processedQueue.vehicles}
              tone="violet"
              icon={Car}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Companies Approved"
              value={displayData.company.approved}
              tone="indigo"
              icon={Building2}
              loading={loading}
              href="/traffic_approval/companies?tab=processed"
            />
          </div>
        </Panel>
      </div>

      {/* 6. SECURITY & BLACKLIST CONTROLS */}
      <SectionDivider label="Security & Restrictions" icon={ShieldBan} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Blacklist & Restrictions"
          subtitle="Active restrictions across all entity types"
          icon={ShieldBan}
          tone="red"
          action="View All"
          actionHref="/traffic_approval/blacklist"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <MiniStat
              label="Companies"
              value={displayData.blType.COMPANY}
              tone="red"
              icon={Building2}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Persons"
              value={displayData.blType.PERSON}
              tone="rose"
              icon={Users}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Drivers"
              value={displayData.blType.DRIVER}
              tone="orange"
              icon={UserCircle}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Vehicles"
              value={displayData.blType.VEHICLE}
              tone="amber"
              icon={Car}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Unblock Pending"
              value={displayData.bl.pending_unblacklist}
              tone="blue"
              icon={HelpCircle}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Total Active"
              value={displayData.bl.active_blacklisted}
              tone="red"
              icon={ShieldBan}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
          </div>
        </Panel>

        <Panel
          title="Pending Blacklist Approvals"
          subtitle="Awaiting review"
          icon={AlertTriangle}
          tone="amber"
          action="Review"
          actionHref="/traffic_approval/blacklist"
        >
          {loading ? (
            <SkeletonRows />
          ) : displayData.blPending.length === 0 ? (
            <EmptyRow label="No pending blacklist approvals" />
          ) : (
            <div className="space-y-2">
              {displayData.blPending.map((e, i) => (
                <div
                  key={e.id ?? i}
                  {...rowLinkProps(
                    "/traffic_approval/blacklist",
                    `Review ${e.identifier || "blacklist entry"}`,
                  )}
                  className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-white to-amber-50/40 px-4 py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(10,30,77,0.12)] hover:border-amber-200"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold text-slate-700 font-mono uppercase truncate">
                      {e.identifier}
                    </p>
                    {e.entity_name && e.entity_name !== e.identifier && (
                      <p className="text-[9px] text-slate-400 truncate">
                        {e.entity_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">
                    {e.entity_type}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                    {fmtDate(e.createdAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-amber-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 7. REVENUE & ACCOUNTS COLLECTIONS */}
      <SectionDivider
        label="Revenue & Accounts Collections"
        icon={TrendingUp}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel
          title="HEP Pass Revenue & Collections"
          subtitle={`Revenue by company and payment mode (${filterRange.label})`}
          icon={TrendingUp}
          tone="emerald"
          action="View All Passes"
          actionHref="/traffic_approval/passes"
          className="lg:col-span-2"
        >
          {/* Period breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                label: "Today",
                value: hepRevBreakup[0]?.value,
                icon: "⚡",
                grad: "from-amber-400 via-orange-500 to-red-500",
                shadow: "shadow-orange-400/30",
              },
              {
                label: "This Month",
                value: hepRevBreakup[1]?.value,
                icon: "🗓",
                grad: "from-emerald-500 via-teal-500 to-cyan-600",
                shadow: "shadow-emerald-500/30",
              },
              {
                label: "All Time",
                value: hepRevBreakup[2]?.value,
                icon: "🌐",
                grad: "from-indigo-500 via-violet-500 to-purple-600",
                shadow: "shadow-indigo-500/30",
              },
            ].map((r) => (
              <div
                key={r.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${r.grad} shadow-lg ${r.shadow} px-4 py-3.5 ring-1 ring-inset ring-white/20`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-white/15" />
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/70">
                    {r.label}
                  </p>
                  <span className="text-sm">{r.icon}</span>
                </div>
                {loading ? (
                  <div className="h-6 w-20 rounded bg-white/30 animate-pulse" />
                ) : (
                  <p className="text-xl font-black text-white tabular-nums drop-shadow-sm">
                    {fmtMoney(r.value)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Payment mode & Entity split */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MiniStat
              label="Total Amount"
              value={displayData.hepRevenue.total}
              tone="emerald"
              icon={CircleDollarSign}
              money
              loading={loading}
              href="/traffic_approval/revenue"
            />
            <MiniStat
              label="Account (HEP)"
              value={displayData.hepRevenue.accountTotal}
              tone="teal"
              icon={Calculator}
              money
              loading={loading}
              href="/traffic_approval/revenue"
            />
            <MiniStat
              label="E-Cash"
              value={displayData.hepRevenue.ecashTotal}
              tone="violet"
              icon={Wallet}
              money
              loading={loading}
              href="/traffic_approval/revenue"
            />
            <MiniStat
              label="Total Entities"
              value={`${displayData.hepRevenue.totalPersons}P · ${displayData.hepRevenue.totalVehicles}V`}
              tone="blue"
              icon={Users}
              loading={loading}
              href="/traffic_approval/passes"
              sub={`${fmtNum(displayData.pass.total)} Pass Requests`}
            />
          </div>

          {/* Company Revenue Ledger — fixed-height scrollable */}
          {!loading && displayData.hepRevenue.companyList.length > 0 && (
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                    Company Revenue Ledger ({filterRange.label})
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    · {displayData.hepRevenue.companyList.length} companies
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Total: {fmtMoney(displayData.hepRevenue.total)}
                </span>
              </div>

              {/* Search box — shown only when > 6 companies */}
              {displayData.hepRevenue.companyList.length > 6 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search company…"
                    value={allCompaniesSearch}
                    onChange={(e) => setAllCompaniesSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-slate-400 transition"
                  />
                  {allCompaniesSearch && (
                    <button
                      onClick={() => setAllCompaniesSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Fixed-height scrollable leaderboard table */}
              <div
                className="overflow-y-auto rounded-xl border border-slate-200 bg-white"
                style={{ maxHeight: "260px" }}
              >
                {/* Table header */}
                <div className="sticky top-0 z-10 grid grid-cols-[28px_1fr_auto] gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <span className="text-center">#</span>
                  <span>Company</span>
                  <span className="text-right">Revenue</span>
                </div>

                {/* Rows */}
                {(() => {
                  const q = allCompaniesSearch.trim().toLowerCase();
                  const filtered = q
                    ? displayData.hepRevenue.companyList.filter((c) =>
                        c.name.toLowerCase().includes(q),
                      )
                    : displayData.hepRevenue.companyList;

                  if (filtered.length === 0)
                    return (
                      <p className="text-center text-[11px] text-slate-400 py-6">
                        No companies match "{allCompaniesSearch}"
                      </p>
                    );

                  const rankBadge = [
                    "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
                    "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
                    "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                  ];

                  return filtered.map((c, i) => {
                    const originalRank =
                      displayData.hepRevenue.companyList.indexOf(c);
                    const badgeCls =
                      rankBadge[originalRank] ?? "bg-slate-100 text-slate-600";
                    const pct =
                      displayData.hepRevenue.total > 0
                        ? Math.round(
                            (c.total / displayData.hepRevenue.total) * 100,
                          )
                        : 0;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedLedgerCompany(c);
                          setLedgerSearchQuery("");
                          setLedgerStatusFilter("ALL");
                          setLedgerModeFilter("ALL");
                          setLedgerActiveTab("transactions");
                          setExpandedPassId(null);
                        }}
                        className="group/row grid grid-cols-[28px_1fr_auto] gap-2 items-center px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-emerald-50/60 cursor-pointer transition-colors"
                        title="Click to view detailed company revenue ledger"
                      >
                        {/* Rank badge */}
                        <span
                          className={`flex h-5 w-5 shrink-0 mx-auto items-center justify-center rounded-md text-[9px] font-black shadow-sm ${badgeCls}`}
                        >
                          {originalRank + 1}
                        </span>

                        {/* Name + meta */}
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-800 truncate group-hover/row:text-emerald-700 transition-colors">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-semibold">
                              {c.passCount} passes · {c.persons}P · {c.vehicles}
                              V
                            </span>
                            {pct > 0 && (
                              <span className="text-[9px] font-bold text-emerald-600">
                                {pct}%
                              </span>
                            )}
                          </div>
                          {/* Share bar */}
                          <div className="mt-1 h-0.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Amount + arrow */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-black text-emerald-600 tabular-nums text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg group-hover/row:bg-emerald-100/80 transition-colors">
                            {fmtMoney(c.total)}
                          </span>
                          <ArrowUpRight className="h-3 w-3 text-emerald-500 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {!loading && displayData.hepRevenue.companyList.length === 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-6 text-[11px] text-slate-400 font-medium text-center">
              No pass revenue recorded for {filterRange.label}.
            </div>
          )}
        </Panel>

        {/* Recent Blacklist Activity */}
        <Panel
          title="Recent Blacklist Activity"
          subtitle="Latest records"
          icon={ClipboardList}
          tone="navy"
          action="View All"
          actionHref="/traffic_approval/blacklist"
        >
          {loading ? (
            <SkeletonRows />
          ) : displayData.blRecent.length === 0 ? (
            <EmptyRow label="No blacklist records in this period" />
          ) : (
            <div className="space-y-2">
              {displayData.blRecent.map((e, i) => (
                <div
                  key={e.id ?? i}
                  {...rowLinkProps(
                    "/traffic_approval/blacklist",
                    `View ${e.identifier || "blacklist entry"}`,
                  )}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/60 px-4 py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(10,30,77,0.12)] hover:border-slate-200"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${e.entity_type === "VEHICLE" ? "bg-amber-100 text-amber-600" : e.entity_type === "COMPANY" ? "bg-red-100 text-red-600" : "bg-rose-100 text-rose-600"}`}
                  >
                    {e.entity_type === "VEHICLE" ? (
                      <Car className="h-4 w-4" />
                    ) : e.entity_type === "COMPANY" ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <UserCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-extrabold text-slate-700 font-mono uppercase truncate">
                      {e.identifier}
                    </p>
                    {e.entity_name && e.entity_name !== e.identifier && (
                      <p className="text-[9px] text-slate-400 truncate">
                        {e.entity_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">
                    {e.entity_type}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] border shrink-0 ${BL_STATUS_TONE[e.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                  >
                    {String(e.status || "").replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 hidden sm:block">
                    {fmtDate(e.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 8. COMPANY MANAGEMENT & BULK PASS */}
      <SectionDivider label="Company & Bulk Pass Management" icon={Building2} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Company Management"
          subtitle="Company Registration & Status Overview"
          icon={Building2}
          tone="violet"
          action="View All"
          actionHref="/traffic_approval/companies"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat
              label="Total Registered"
              value={displayData.company.total}
              tone="blue"
              icon={Building2}
              loading={loading}
              href="/traffic_approval/companies"
            />
            <MiniStat
              label="Approved"
              value={displayData.company.approved}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/companies?tab=processed"
            />
            <MiniStat
              label="Pending"
              value={displayData.company.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/companies?tab=pending"
            />
            <MiniStat
              label="Rejected"
              value={displayData.company.rejected}
              tone="rose"
              icon={Ban}
              loading={loading}
              href="/traffic_approval/companies?tab=processed"
            />
            <MiniStat
              label="Blacklisted"
              value={displayData.blType.COMPANY}
              tone="red"
              icon={ShieldBan}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Profile Updates"
              value={displayData.profileUpdates}
              tone="sky"
              icon={ClipboardList}
              loading={loading}
              href="/traffic_approval/companies?tab=profile_updates"
            />
          </div>
        </Panel>

        <Panel
          title="Bulk Pass"
          subtitle="Group pass applications"
          icon={Users}
          tone="indigo"
          action="View All"
          actionHref="/traffic_approval/bulk-pass"
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MiniStat
              label="Total Applications"
              value={displayData.bulk.total}
              tone="indigo"
              icon={Layers}
              loading={loading}
              href="/traffic_approval/bulk-pass"
            />
            <MiniStat
              label="Pending"
              value={displayData.bulk.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/bulk-pass?tab=pending"
            />
            <MiniStat
              label="Approved"
              value={displayData.bulk.approved}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/bulk-pass?tab=approved"
            />
            <MiniStat
              label="Rejected"
              value={displayData.bulk.rejected}
              tone="rose"
              icon={XCircle}
              loading={loading}
              href="/traffic_approval/bulk-pass?tab=rejected"
            />
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-[10px] text-indigo-600 font-medium flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Bulk Pass API integration active
          </div>
        </Panel>
      </div>

      {/* MODAL 1: COMPANY REVENUE LEDGER DETAIL MODAL */}
      {activeModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1e4d] via-[#102456] to-[#1c1b5e] px-6 py-5 text-white shrink-0">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shrink-0">
                    <Building2 className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                        Port Revenue &amp; Accounts Ledger
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-[10px] font-bold text-blue-200/90 bg-white/10 px-2.5 py-0.5 rounded-full ring-1 ring-white/15">
                        {filterRange.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="h-3 w-3" />
                        Verified Port Entity
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight mt-0.5">
                      {activeModalCompany.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => exportLedgerCSV(activeModalCompany)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold ring-1 ring-white/20 transition-all cursor-pointer shadow-sm"
                    title="Export full ledger statement as CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLedgerCompany(null);
                      setLedgerSearchQuery("");
                      setLedgerStatusFilter("ALL");
                      setLedgerModeFilter("ALL");
                      setLedgerActiveTab("transactions");
                      setExpandedPassId(null);
                    }}
                    className="rounded-2xl p-2 text-white/70 hover:text-white hover:bg-white/15 transition-all focus:outline-none cursor-pointer"
                    title="Close Ledger"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 6 Key Financial & Volume KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 mt-4 pt-3 border-t border-white/10 [&>div]:min-h-[60px]">
                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                    Total Net Revenue
                  </span>
                  <span className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                    {fmtMoney(activeModalCompany.total)}
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                      Account (HEP)
                    </span>
                    <span className="text-[9px] font-extrabold text-teal-300">
                      {companyFinancials.accountPct}%
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-teal-300 tabular-nums">
                    {fmtMoney(activeModalCompany.accountTotal)}
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                      E-Cash Direct
                    </span>
                    <span className="text-[9px] font-extrabold text-violet-300">
                      {companyFinancials.ecashPct}%
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-violet-300 tabular-nums">
                    {fmtMoney(activeModalCompany.ecashTotal)}
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                      Pass Volume
                    </span>
                    <span className="text-[9px] font-extrabold text-amber-300">
                      {activeModalCompany.approvalRate || 100}% Appr.
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-white tabular-nums">
                    {activeModalCompany.passCount} Passes
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                    Registered Fleet
                  </span>
                  <span className="text-sm sm:text-base font-black text-white tabular-nums truncate block">
                    {activeModalCompany.persons}P ·{" "}
                    {activeModalCompany.vehicles}V
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/15">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200/80 block">
                    Avg Per Pass
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
                    {fmtMoney(activeModalCompany.avgPassAmount || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center justify-between px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLedgerActiveTab("transactions")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    ledgerActiveTab === "transactions"
                      ? "border-orange-500 text-orange-600 bg-white shadow-sm rounded-t-xl"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  Pass Transactions
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">
                    {activeModalCompany.passes?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setLedgerActiveTab("financials")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    ledgerActiveTab === "financials"
                      ? "border-orange-500 text-orange-600 bg-white shadow-sm rounded-t-xl"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Financial Statement
                </button>

                <button
                  onClick={() => setLedgerActiveTab("entities")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                    ledgerActiveTab === "entities"
                      ? "border-orange-500 text-orange-600 bg-white shadow-sm rounded-t-xl"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Fleet &amp; Personnel
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">
                    {activeCompanyEntities.persons.length +
                      activeCompanyEntities.vehicles.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={() => exportLedgerCSV(activeModalCompany)}
                  className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[11px] font-bold"
                >
                  <Download className="h-3 w-3" /> Export
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {ledgerActiveTab === "transactions" && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Filter Bar */}
                <div className="flex items-center justify-between gap-3 px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex-wrap shrink-0">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by pass reference no, applicant, person, vehicle plate..."
                      value={ledgerSearchQuery}
                      onChange={(e) => setLedgerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Filter */}
                    <div className="flex items-center rounded-xl bg-white p-0.5 border border-slate-200 text-[11px] font-bold">
                      {["ALL", "APPROVED", "PENDING", "REJECTED"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setLedgerStatusFilter(st)}
                          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-extrabold ${
                            ledgerStatusFilter === st
                              ? "bg-[#0a1e4d] text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {st === "ALL"
                            ? "All"
                            : st.charAt(0) + st.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>

                    {/* Mode Filter */}
                    <div className="flex items-center rounded-xl bg-white p-0.5 border border-slate-200 text-[11px] font-bold">
                      <button
                        onClick={() => setLedgerModeFilter("ALL")}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-extrabold ${
                          ledgerModeFilter === "ALL"
                            ? "bg-[#0a1e4d] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All Modes
                      </button>
                      <button
                        onClick={() => setLedgerModeFilter("ACCOUNT")}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-extrabold ${
                          ledgerModeFilter === "ACCOUNT"
                            ? "bg-teal-600 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Account
                      </button>
                      <button
                        onClick={() => setLedgerModeFilter("ECASH")}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-extrabold ${
                          ledgerModeFilter === "ECASH"
                            ? "bg-violet-600 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        E-Cash
                      </button>
                    </div>

                    <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                      {filteredCompanyPasses.length} records
                    </span>
                  </div>
                </div>

                {/* Scrollable Transaction Ledger */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
                  {filteredCompanyPasses.length === 0 ? (
                    <div className="py-14 text-center text-slate-400">
                      <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold">
                        No transactions match your search or filter
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try resetting the status or mode filter
                      </p>
                    </div>
                  ) : (
                    filteredCompanyPasses.map((p, idx) => {
                      const isExpanded = expandedPassId === (p.id || idx);
                      return (
                        <div
                          key={p.id ?? idx}
                          className="rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all duration-150 overflow-hidden shadow-sm"
                        >
                          <div
                            onClick={() =>
                              setExpandedPassId(isExpanded ? null : p.id || idx)
                            }
                            className="flex items-center justify-between gap-3 p-3 sm:p-3.5 hover:bg-slate-50/80 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-mono text-[11px] font-black shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-slate-900 text-xs tracking-tight">
                                    {p.referenceNo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(p.referenceNo);
                                    }}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                    title="Copy Reference Number"
                                  >
                                    {copiedRef === p.referenceNo ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full font-extrabold text-[9px] border ${
                                      PASS_STATUS_TONE[p.status] ||
                                      "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {p.status.replace(/_/g, " ")}
                                  </span>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full font-extrabold text-[9px] ${
                                      p.paymentMode === "E-CASH" ||
                                      p.paymentMode === "ECASH"
                                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                                        : "bg-teal-50 text-teal-700 border border-teal-200"
                                    }`}
                                  >
                                    {p.paymentMode}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                                  Submitted: {fmtDate(p.createdAt)}
                                  {p.applicantName
                                    ? ` · ${p.applicantName}`
                                    : ""}
                                  {p.email ? ` · ${p.email}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100">
                                  <Users className="h-3 w-3" /> {p.personsCount}
                                  P
                                </span>
                                <span className="inline-flex items-center gap-0.5 bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg border border-violet-100">
                                  <Car className="h-3 w-3" /> {p.vehiclesCount}V
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-emerald-600 tabular-nums bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl block">
                                  {fmtMoney(p.amount)}
                                </span>
                              </div>
                              <div className="text-slate-400 hover:text-slate-600">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Detail Accordion */}
                          {isExpanded && (
                            <div className="px-4 py-3.5 bg-slate-50/70 border-t border-slate-100 text-xs animate-in slide-in-from-top-1 duration-150">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                {/* Registered Persons */}
                                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                      <Users className="h-3 w-3 text-blue-600" />
                                      Personnel Authorized (
                                      {p.persons?.length || 0})
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                      Fee: {fmtMoney(p.personFee || 0)}
                                    </span>
                                  </div>
                                  {p.persons?.length > 0 ? (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                      {p.persons.map((psn, pi) => (
                                        <div
                                          key={pi}
                                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                                        >
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-800 truncate">
                                              {psn.name ||
                                                psn.fullName ||
                                                "Personnel"}
                                            </p>
                                            <p className="text-[9px] text-slate-400 truncate">
                                              {psn.designation || "Staff"} · ID:{" "}
                                              {psn.aadhaarNo ||
                                                psn.idNumber ||
                                                psn.documentNumber ||
                                                "Verified"}
                                            </p>
                                          </div>
                                          {psn.amount > 0 && (
                                            <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                                              {fmtMoney(psn.amount)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">
                                      No person entries
                                    </p>
                                  )}
                                </div>

                                {/* Registered Vehicles */}
                                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                      <Car className="h-3 w-3 text-violet-600" />
                                      Vehicles Authorized (
                                      {p.vehicles?.length || 0})
                                    </span>
                                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                                      Fee: {fmtMoney(p.vehicleFee || 0)}
                                    </span>
                                  </div>
                                  {p.vehicles?.length > 0 ? (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                      {p.vehicles.map((veh, vi) => (
                                        <div
                                          key={vi}
                                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                                        >
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-800 font-mono">
                                              {veh.vehicleNumber ||
                                                veh.registrationNumber ||
                                                veh.vehicleNo ||
                                                "Vehicle"}
                                            </p>
                                            <p className="text-[9px] text-slate-400 truncate">
                                              {veh.vehicleType || "Commercial"}{" "}
                                              {veh.driverName
                                                ? `· Driver: ${veh.driverName}`
                                                : ""}
                                            </p>
                                          </div>
                                          {veh.amount > 0 && (
                                            <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                                              {fmtMoney(veh.amount)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">
                                      No vehicle entries
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Purpose, Zone, and Action Strip */}
                              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/80 flex-wrap">
                                <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                                  <span>
                                    <strong>Purpose:</strong> {p.purpose}
                                  </span>
                                  <span>
                                    <strong>Harbor Zone:</strong> {p.zone}
                                  </span>
                                  <span>
                                    <strong>Permit Type:</strong> {p.passType} (
                                    {p.validityType})
                                  </span>
                                </div>
                                <Link
                                  href={`/traffic_approval/passes`}
                                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-600 hover:text-orange-700 transition-colors"
                                >
                                  Open In Pass Inspector{" "}
                                  <ArrowUpRight className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIAL STATEMENT & ANALYSIS */}
            {ledgerActiveTab === "financials" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Distribution */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Settlement Mode Split
                      </h4>
                      <span className="text-[11px] font-extrabold text-slate-400">
                        Total {fmtMoney(activeModalCompany.total)}
                      </span>
                    </div>

                    {/* Dual Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${companyFinancials.accountPct}%` }}
                          className="bg-teal-500 h-full transition-all"
                          title={`Account: ${companyFinancials.accountPct}%`}
                        />
                        <div
                          style={{ width: `${companyFinancials.ecashPct}%` }}
                          className="bg-violet-500 h-full transition-all"
                          title={`E-Cash: ${companyFinancials.ecashPct}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-teal-500" />
                          Account Ledger ({companyFinancials.accountPct}%)
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-violet-500" />
                          E-Cash Counter ({companyFinancials.ecashPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                        <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                          Account Invoiced
                        </span>
                        <span className="text-lg font-black text-teal-700 tabular-nums">
                          {fmtMoney(activeModalCompany.accountTotal)}
                        </span>
                        <p className="text-[9px] text-teal-600/80 mt-0.5">
                          Credit Ledger Dues
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100">
                        <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wider block">
                          E-Cash Collections
                        </span>
                        <span className="text-lg font-black text-violet-700 tabular-nums">
                          {fmtMoney(activeModalCompany.ecashTotal)}
                        </span>
                        <p className="text-[9px] text-violet-600/80 mt-0.5">
                          Counter / Instant Dues
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fee Classification */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Calculator className="h-4 w-4 text-emerald-600" />
                        Fee Classification Breakdown
                      </h4>
                      <span className="text-[11px] font-extrabold text-slate-400">
                        Revenue Sources
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                            Person Passes
                          </span>
                          <span className="text-[10px] font-extrabold text-blue-700">
                            {companyFinancials.personSharePct}%
                          </span>
                        </div>
                        <span className="text-lg font-black text-blue-700 tabular-nums">
                          {fmtMoney(activeModalCompany.personPassFee || 0)}
                        </span>
                        <p className="text-[9px] text-blue-600/80 mt-0.5">
                          {activeModalCompany.persons} Authorized Persons
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wider block">
                            Vehicle Passes
                          </span>
                          <span className="text-[10px] font-extrabold text-violet-700">
                            {companyFinancials.vehicleSharePct}%
                          </span>
                        </div>
                        <span className="text-lg font-black text-violet-700 tabular-nums">
                          {fmtMoney(activeModalCompany.vehiclePassFee || 0)}
                        </span>
                        <p className="text-[9px] text-violet-600/80 mt-0.5">
                          {activeModalCompany.vehicles} Fleet Vehicles
                        </p>
                      </div>
                    </div>

                    {/* Settlement Status */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">
                          Settled / Approved Passes:
                        </span>
                        <span className="font-black text-emerald-700 tabular-nums">
                          {fmtMoney(companyFinancials.approvedTotal)} (
                          {activeModalCompany.approvedCount || 0} passes)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">
                          Under Review / Pending Passes:
                        </span>
                        <span className="font-black text-amber-700 tabular-nums">
                          {fmtMoney(companyFinancials.pendingTotal)} (
                          {activeModalCompany.pendingCount || 0} passes)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Port Certification Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0a1e4d] text-white flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-sm tracking-tight">
                        Chennai Port Authority · Pass Clearing Certified
                      </h5>
                      <p className="text-[11px] text-slate-300">
                        Automated ledger synchronization with Port Dues &amp;
                        HEP Harbor Permit Registry
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => exportLedgerCSV(activeModalCompany)}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-[#0a1e4d] font-black text-xs hover:bg-slate-100 transition-colors shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Financial Statement
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AUTHORIZED FLEET & PERSONNEL DIRECTORY */}
            {ledgerActiveTab === "entities" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Personnel Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-blue-600" />
                        Authorized Personnel Directory (
                        {activeCompanyEntities.persons.length})
                      </h4>
                    </div>

                    {activeCompanyEntities.persons.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                        No registered personnel found for this company in{" "}
                        {filterRange.label}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {activeCompanyEntities.persons.map((psn, pi) => (
                          <div
                            key={pi}
                            className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate">
                                {psn.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {psn.designation} · ID: {psn.idProof}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {psn.passRef}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {fmtDate(psn.date)}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[9px] border shrink-0 ${
                                PASS_STATUS_TONE[psn.passStatus] ||
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {psn.passStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vehicles Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Car className="h-4 w-4 text-violet-600" />
                        Commercial Fleet Vehicles (
                        {activeCompanyEntities.vehicles.length})
                      </h4>
                    </div>

                    {activeCompanyEntities.vehicles.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                        No registered fleet vehicles found for this company in{" "}
                        {filterRange.label}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {activeCompanyEntities.vehicles.map((veh, vi) => (
                          <div
                            key={vi}
                            className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-mono font-black text-slate-900 text-sm">
                                {veh.plate}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {veh.type} · Driver: {veh.driver}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {veh.passRef}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {fmtDate(veh.date)}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[9px] border shrink-0 ${
                                PASS_STATUS_TONE[veh.passStatus] ||
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {veh.passStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Company:{" "}
                  <strong className="text-slate-800">
                    {activeModalCompany.name}
                  </strong>{" "}
                  · Total {activeModalCompany.passCount} Passes Recorded
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportLedgerCSV(activeModalCompany)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <Link
                  href="/traffic_approval/passes"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View in Passes Portal
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLedgerCompany(null);
                    setLedgerSearchQuery("");
                    setLedgerStatusFilter("ALL");
                    setLedgerModeFilter("ALL");
                    setLedgerActiveTab("transactions");
                    setExpandedPassId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL COMPANY REVENUE LEDGER DIRECTORY */}
      {showFullLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1e4d] via-[#122863] to-[#1b1c5c] px-6 py-5 text-white shrink-0">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shrink-0">
                    <Receipt className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      Directory & Financial Ledger
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      All Companies Revenue Ledger
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowFullLedgerModal(false);
                    setAllCompaniesSearch("");
                  }}
                  className="rounded-2xl p-2 text-white/70 hover:text-white hover:bg-white/15 transition-all focus:outline-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mt-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search companies by name..."
                  value={allCompaniesSearch}
                  onChange={(e) => setAllCompaniesSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 text-xs font-semibold ring-1 ring-inset ring-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                />
              </div>
            </div>

            {/* Ranked Company List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 divide-y divide-slate-100">
              {allCompaniesFiltered.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">
                    No companies match your search
                  </p>
                </div>
              ) : (
                allCompaniesFiltered.map((c, i) => (
                  <div
                    key={c.name}
                    onClick={() => {
                      setSelectedLedgerCompany(c);
                      setShowFullLedgerModal(false);
                      setLedgerSearchQuery("");
                      setLedgerStatusFilter("ALL");
                      setLedgerModeFilter("ALL");
                      setLedgerActiveTab("transactions");
                      setExpandedPassId(null);
                    }}
                    className="flex items-center justify-between gap-3 pt-2.5 first:pt-0 hover:bg-emerald-50/50 p-3 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-mono text-xs font-black shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 text-xs truncate">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {c.passCount} passes · {c.persons} Persons ·{" "}
                          {c.vehicles} Vehicles
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-emerald-600 text-sm tabular-nums bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        {fmtMoney(c.total)}
                      </span>
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-orange-100 transition-colors">
                        View Ledger <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <span className="text-xs font-bold text-slate-500">
                Showing {allCompaniesFiltered.length} of{" "}
                {displayData.hepRevenue.companyList.length} companies
              </span>
              <button
                onClick={() => setShowFullLedgerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
