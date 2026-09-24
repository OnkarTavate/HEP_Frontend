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
  Calendar,
  X,
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
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Eye,
  BadgeCheck,
} from "lucide-react";

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
  "\u20B9" + num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? "\u2014"
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
  if (mins == null) return "\u2014";
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
  return (
    <Wrapper
      {...wp}
      className={`group/row flex items-center justify-between gap-3 -mx-2 rounded-xl px-2 py-2.5 transition-all duration-150 ${href ? `hover:bg-gradient-to-r hover:${t.grad} cursor-pointer border border-transparent hover:${t.border}` : "hover:bg-slate-50"}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.chip} shrink-0 shadow-sm`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="text-xs font-semibold text-slate-700 truncate">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {loading ? (
          <div className="h-5 w-12 rounded bg-slate-200 animate-pulse" />
        ) : (
          <span className={`text-lg font-black tabular-nums ${t.text}`}>
            {money ? fmtMoney(value) : fmtNum(value)}
          </span>
        )}
        {href && (
          <ChevronRight
            className={`h-3.5 w-3.5 ${t.label} opacity-0 -translate-x-1 group-hover/row:opacity-80 group-hover/row:translate-x-0 transition-all`}
          />
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
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white ring-1 ring-inset ring-white/30 shadow-[0_12px_40px_-12px_var(--tw-shadow-color),inset_0_1px_0_0_rgba(255,255,255,0.45)] ${glow} transition-all duration-300 ${href ? "hover:-translate-y-1.5 hover:shadow-[0_24px_56px_-16px_var(--tw-shadow-color)] cursor-pointer" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="pointer-events-none absolute -top-1/2 inset-x-0 h-full bg-gradient-to-b from-white/20 to-transparent opacity-80" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 ring-1 ring-inset ring-white/40">
          <Icon className="h-5 w-5" strokeWidth={2.3} />
        </span>
        {href && (
          <ArrowUpRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-90 group-hover:translate-x-0 transition-all" />
        )}
      </div>
      {loading ? (
        <div className="relative mt-4 h-9 w-20 rounded-lg bg-white/30 animate-pulse" />
      ) : (
        <p className="relative mt-4 text-3xl font-black tabular-nums drop-shadow-sm">
          {isMoney ? fmtMoney(value) : fmtNum(value)}
        </p>
      )}
      <p className="relative mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/85">
        {title}
      </p>
      {chips && !loading && (
        <div className="relative mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((ch) => {
            const C = ch.icon;
            return (
              <span
                key={ch.label}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-900 ring-1 ring-inset ring-white/60 shadow-sm"
              >
                <C className="h-3 w-3" strokeWidth={2.4} />
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

export default function TrafficManagerDashboard() {
  const router = useRouter();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

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

      // 1. Use page-1 data for list display only — DO NOT loop all pages.
      // Aggregate counts come from the server-side counts/pagination metadata
      // that the backend already computes via SQL COUNT queries.
      // Fetching all 194 pages concurrently was exhausting the DB connection pool.
      const allPassList = firstPassRes?.data?.data || [];

      // Server-supplied aggregate counts (avoids fetching all records client-side)
      const apiCounts = firstPassRes?.data?.counts || {};
      const apiPagination = firstPassRes?.data?.pagination || {};

      // 2. Classify page-1 slice by status (for queue display / recent items only)
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

      // Use server-provided counts; fall back to page-1 slice counts only if
      // the API doesn't return them (older backend versions).
      const passCounts = {
        total: num(
          apiCounts.total ??
            apiPagination.totalRecords ??
            allPassList.length,
        ),
        pending: num(apiCounts.pending ?? pendingList.length),
        processed: num(apiCounts.processed ?? processedList.length),
        reverted: num(apiCounts.reverted ?? revertedList.length),
        rejected: num(apiCounts.rejected ?? rejectedList.length),
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

      // persons/vehicles totals are derived from page-1 slice only.
      // For accurate all-time totals, a dedicated backend stats endpoint is needed.
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
        name: c.name.length > 18 ? c.name.slice(0, 16) + "..." : c.name,
        fullName: c.name,
        value: c.total,
        passCount: c.passCount,
        persons: c.persons,
        vehicles: c.vehicles,
      }));

      const avgMins = calcAvgApprovalTime(processedList);

      console.log(
        "%c=== [TRAFFIC MANAGER EXECUTIVE DASHBOARD] FULL PORT REVENUE & STATISTICS ===",
        "background: #7c3aed; color: #fde68a; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px;",
      );
      console.log("[Pass Request Counts] (Normal + Vendor):", passCounts);
      console.log("[Revenue Summary] (Includes Normal & Vendor Passes):", {
        "Total Revenue (All Passes)": `\u20B9 ${hepTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "Account (HEP)": `\u20B9 ${hepAccount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "E-Cash": `\u20B9 ${hepEcash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "Today's Revenue": `\u20B9 ${hepToday.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "This Month's Revenue": `\u20B9 ${hepMonth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
    const filteredPasses = isAll
      ? passSourceList
      : passSourceList.filter((p) =>
          inRange(p.createdAt || p.submittedAt || p.updatedAt),
        );

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
      name: c.name.length > 18 ? c.name.slice(0, 16) + "..." : c.name,
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
  }, [data, filterPeriod, filterRange]);

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
    { key: "all", label: "All Time", icon: Globe },
    { key: "today", label: "Today", icon: Zap },
    { key: "week", label: "Last 7 Days", icon: CalendarDays },
    { key: "month", label: "This Month", icon: Calendar },
  ];

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

  return (
    <div className="relative space-y-5 font-sans text-slate-800 p-6 pb-8 bg-slate-50 min-h-screen">
      {/* HEADER STRIP */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] ring-1 ring-inset ring-white/15 px-6 py-5 text-white shadow-[0_12px_32px_-10px_rgba(10,30,77,0.65)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => router.back()}
              title="Go back"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black ring-1 ring-inset ring-white/20 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 group"
            >
              <ArrowLeft className="h-4 w-4 text-orange-300 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/30 shrink-0">
              <BarChart3 className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-200/70 hidden sm:inline">
                  Chennai Port Trust · Traffic Authority Division
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight mt-0.5">
                TRAFFIC MANAGER DASHBOARD
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/traffic_manager/companies"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition-all ring-1 ring-inset ring-white/15 shadow-sm"
            >
              <Building2 className="h-3.5 w-3.5 text-orange-300" />
              Operators
            </Link>
            <Link
              href="/traffic_manager/passes"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition-all ring-1 ring-inset ring-white/15 shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 text-orange-300" />
              Pass Register
            </Link>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-inset ring-white/15">
              <button
                onClick={fetchAll}
                disabled={loading}
                title="Refresh dashboard data"
                className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin text-orange-300" : ""}`}
                />
              </button>
              <div className="leading-tight">
                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70 block">
                  Last Synced
                </span>
                {lastUpdated ? (
                  <span className="text-[11px] font-bold text-white">
                    {lastUpdated}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/60 animate-pulse">
                    Syncing...
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
        <div className="relative flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 ring-1 ring-orange-400/30 shadow-sm">
              <CalendarDays className="h-4 w-4 text-orange-300" />
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-blue-200/70">
                Dashboard Timeline
              </p>
              <p className="text-sm font-black text-white">Filter Period</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/15 shrink-0 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setFilterPeriod(t.key);
                  setShowCustom(false);
                }}
                className={`relative px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-200 cursor-pointer select-none ${
                  filterPeriod === t.key && !showCustom
                    ? "bg-white text-[#0a1e4d] shadow-[0_4px_16px_rgba(255,255,255,0.25)] scale-105"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white ring-1 ring-inset ring-white/15"
                }`}
              >
                {filterPeriod === t.key && !showCustom && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                  </span>
                )}
                <t.icon className="mr-1.5 h-3.5 w-3.5 inline-block" />
                {t.label}
              </button>
            ))}
            <div className="h-6 w-px bg-white/15 shrink-0 hidden sm:block" />
            <button
              onClick={() => {
                setShowCustom((p) => !p);
                setFilterPeriod("custom");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer select-none ${
                showCustom
                  ? "bg-orange-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.5)] scale-105"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white ring-1 ring-inset ring-white/15"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Custom Range
            </button>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 ring-1 ring-white/15">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-200/70">
              Active:
            </span>
            <span className="text-xs font-black text-orange-300">
              {filterRange.label}
            </span>
          </div>
        </div>
        {showCustom && (
          <div className="relative border-t border-white/10 px-5 py-3 flex items-center gap-3 flex-wrap bg-white/5">
            <span className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider shrink-0">
              Select Dates:
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
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
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
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
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
                className="ml-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 border border-rose-400/30 transition-all cursor-pointer"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* — CRITICAL DECISIONS RIBBON — */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 p-4 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-t-2xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shrink-0">
              <ShieldAlert className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-700">
                Pending Authorisation — Immediate Review Required
              </p>
              <p className="text-[11px] font-semibold text-slate-600">
                The following require Traffic Manager action and sign-off
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                href: "/traffic_manager/passes?tab=pending",
                label: `${displayData.pass.pending} Pass Applications`,
                icon: FileText,
                cls: "bg-amber-500 hover:bg-amber-600",
                urgent: displayData.pass.pending > 5,
              },
              {
                href: "/traffic_manager/companies?tab=pending",
                label: `${displayData.company.pending} Operator Approvals`,
                icon: Building2,
                cls: "bg-blue-600 hover:bg-blue-700",
                urgent: false,
              },
              {
                href: "/traffic_manager/blacklist",
                label: `${displayData.bl.pending_blacklist} Restriction Reviews`,
                icon: ShieldBan,
                cls: "bg-rose-600 hover:bg-rose-700",
                urgent: displayData.bl.pending_blacklist > 0,
              },
              {
                href: "/traffic_manager/overstay",
                label: `${displayData.overstay.pending} Overstay Dues`,
                icon: Timer,
                cls: "bg-violet-600 hover:bg-violet-700",
                urgent: false,
              },
            ].map((item) => {
              const I = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl ${item.cls} text-white text-xs font-black shadow-sm transition-all hover:scale-105`}
                >
                  {item.urgent && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
                    </span>
                  )}
                  <I className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  <ChevronRight className="h-3 w-3 opacity-70" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* — SECTION NAV — */}
      <div className="sticky top-2 z-20 flex items-center gap-2 overflow-x-auto py-1 px-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-3 shrink-0 flex items-center gap-1">
          <Layers className="h-3 w-3 text-orange-500" />
          Jump To:
        </span>
        {[
          { id: "sec-overview", label: "Command Overview", icon: Sparkles },
          { id: "sec-revenue", label: "Revenue & Collections", icon: TrendingUp },
          {
            id: "sec-health",
            label: "Pass & Operator Status",
            icon: ClipboardCheck,
          },
          {
            id: "sec-security",
            label: "Security & Compliance",
            icon: ShieldBan,
          },
          { id: "sec-operations", label: "Port Operations", icon: Globe },
        ].map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => {
                const el = document.getElementById(sec.id);
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-slate-700 hover:text-[#0a1e4d] hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5 text-orange-500" />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* — EXECUTIVE OVERVIEW — Strategic KPIs — */}
      <div id="sec-overview">
        <SectionDivider label="Executive Overview" icon={Sparkles} />

        {/* Avg approval time banner */}
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0a1e4d] to-[#1b3a8a] px-5 py-3 ring-1 ring-inset ring-white/10 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 shrink-0">
              <Timer className="h-4 w-4 text-orange-300" />
            </span>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-blue-200/70">
                Avg. Pass Processing Time
              </p>
              <p className={`text-lg font-black tabular-nums ${avgColor}`}>
                {fmtDuration(data.avgApprovalMins)}
              </p>
            </div>
            <div
              className={`h-2 w-2 rounded-full ${avgDot} animate-pulse ml-1`}
            />
          </div>
          <div className="hidden sm:flex items-center gap-6">
            {[
              {
                label: "Application Clearance Rate",
                value: `${Math.round(((displayData.pass.processed || 0) / (displayData.pass.total || 1)) * 100)}%`,
                color: "text-emerald-300",
              },
              {
                label: "Company Approval Rate",
                value: `${Math.round(((displayData.company.approved || 0) / (displayData.company.total || 1)) * 100)}%`,
                color: "text-blue-300",
              },
              {
                label: "Overstay Collection Rate",
                value:
                  displayData.overstay.total > 0
                    ? `${Math.round(((displayData.overstay.paid || 0) / (displayData.overstay.total || 1)) * 100)}%`
                    : "\u2014",
                color: "text-teal-300",
              },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200/60">
                  {m.label}
                </p>
                <p className={`text-base font-black tabular-nums ${m.color}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Total Revenue Collected"
            value={displayData.hepRevenue.total}
            icon={Wallet}
            gradient="from-emerald-500 to-teal-600"
            glow="shadow-emerald-500/30"
            href="/traffic_manager/revenue"
            isMoney
            loading={loading}
            chips={[
              {
                icon: PackageCheck,
                value: displayData.pass.total,
                label: "Passes",
              },
            ]}
          />
          {/* ── NEW: Passes Approved ── */}
          <KpiCard
            title="Passes Approved"
            value={displayData.pass.processed}
            icon={CheckCircle2}
            gradient="from-emerald-500 via-emerald-600 to-teal-600"
            glow="shadow-emerald-500/35"
            href="/traffic_manager/passes?tab=processed"
            loading={loading}
            chips={[
              {
                icon: Users,
                value: displayData.processedQueue?.persons ?? 0,
                label: "Persons",
              },
              {
                icon: Car,
                value: displayData.processedQueue?.vehicles ?? 0,
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
            href="/traffic_manager/passes"
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
            title="Awaiting Clearance"
            value={displayData.pass.pending}
            icon={Clock}
            gradient="from-amber-500 to-orange-600"
            glow="shadow-amber-500/30"
            href="/traffic_manager/passes?tab=pending"
            loading={loading}
            chips={[
              {
                icon: Building2,
                value: displayData.pendingQueue.companies,
                label: "Operators",
              },
            ]}
          />
          <KpiCard
            title="Registered Operators"
            value={displayData.company.total}
            icon={Building2}
            gradient="from-violet-500 to-purple-600"
            glow="shadow-violet-500/30"
            href="/traffic_manager/companies"
            loading={loading}
            chips={[
              {
                icon: CheckCircle2,
                value: displayData.company.approved,
                label: "Verified",
              },
            ]}
          />
          <KpiCard
            title="Active Blacklist Entries"
            value={displayData.bl.active_blacklisted}
            icon={ShieldBan}
            gradient="from-rose-500 to-red-600"
            glow="shadow-rose-500/30"
            href="/traffic_manager/blacklist"
            loading={loading}
            chips={[
              {
                icon: Clock,
                value: displayData.bl.pending_blacklist,
                label: "Pending",
              },
            ]}
          />
          <KpiCard
            title="Overstay Dues"
            value={displayData.overstay.pendingAmount}
            icon={Timer}
            gradient="from-orange-500 to-amber-600"
            glow="shadow-orange-500/30"
            href="/traffic_manager/overstay"
            isMoney
            loading={loading}
            chips={[
              {
                icon: AlertTriangle,
                value: displayData.overstay.pending,
                label: "Cases",
              },
            ]}
          />
          <KpiCard
            title="Passes Cleared"
            value={displayData.pass.processed}
            icon={PackageCheck}
            gradient="from-blue-500 to-indigo-600"
            glow="shadow-blue-500/30"
            href="/traffic_manager/passes?tab=processed"
            loading={loading}
            chips={[
              {
                icon: Users,
                value: displayData.processedQueue?.persons ?? 0,
                label: "P",
              },
              {
                icon: Car,
                value: displayData.processedQueue?.vehicles ?? 0,
                label: "V",
              },
            ]}
          />
        </div>
      </div>

      {/* — 2. REVENUE INTELLIGENCE — */}
      <div id="sec-revenue">
        <SectionDivider label="Revenue & Financial Collections" icon={TrendingUp} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel
            title="HEP Pass Revenue & Collections"
            subtitle={`Payment mode breakdown (${filterRange.label})`}
            icon={TrendingUp}
            tone="emerald"
            action="View All Passes"
            actionHref="/traffic_manager/passes"
            className="lg:col-span-2"
          >
            {/* Payment mode & Entity split */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniStat
                label="Account (HEP)"
                value={displayData.hepRevenue.accountTotal}
                tone="emerald"
                icon={Calculator}
                money
                loading={loading}
                href="/traffic_manager/revenue"
              />
              <MiniStat
                label="E-Cash"
                value={displayData.hepRevenue.ecashTotal}
                tone="violet"
                icon={Wallet}
                money
                loading={loading}
                href="/traffic_manager/revenue"
              />
              <MiniStat
                label="Total Entities"
                value={`${displayData.hepRevenue.totalPersons}P · ${displayData.hepRevenue.totalVehicles}V`}
                tone="blue"
                icon={Users}
                loading={loading}
                href="/traffic_manager/passes"
                sub={`${fmtNum(displayData.pass.total)} Pass Requests`}
              />
            </div>

            {/* Revenue collection efficiency bar */}
            <div className="mb-4 rounded-xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3 text-white ring-1 ring-white/10">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  Payment Mode Distribution
                </span>
                <span className="text-emerald-300 font-black">
                  {fmtMoney(displayData.hepRevenue.total)} total
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 flex">
                <div
                  style={{
                    width: `${Math.round(((displayData.hepRevenue.accountTotal || 0) / (displayData.hepRevenue.total || 1)) * 100)}%`,
                  }}
                  className="bg-emerald-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${Math.round(((displayData.hepRevenue.ecashTotal || 0) / (displayData.hepRevenue.total || 1)) * 100)}%`,
                  }}
                  className="bg-violet-400 h-full transition-all duration-700"
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-300 mt-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Account (
                  {Math.round(
                    ((displayData.hepRevenue.accountTotal || 0) /
                      (displayData.hepRevenue.total || 1)) *
                      100,
                  )}
                  %)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  E-Cash (
                  {Math.round(
                    ((displayData.hepRevenue.ecashTotal || 0) /
                      (displayData.hepRevenue.total || 1)) *
                      100,
                  )}
                  %)
                </span>
              </div>
            </div>

            {/* Top companies leaderboard */}
            {!loading && displayData.hepRevenue.companyList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Revenue Contribution by Operator
                  </p>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {fmtMoney(displayData.hepRevenue.total)} total
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayData.hepRevenue.companyList
                    .slice(0, 6)
                    .map((c, i) => {
                      const rankColors = [
                        "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
                        "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
                        "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                        "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
                        "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
                        "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
                      ];
                      const leftBorders = [
                        "border-l-yellow-400",
                        "border-l-slate-400",
                        "border-l-orange-400",
                        "border-l-emerald-500",
                        "border-l-blue-500",
                        "border-l-violet-500",
                      ];
                      const pct = Math.round(
                        (c.total / (displayData.hepRevenue.total || 1)) * 100,
                      );
                      return (
                        <div
                          key={i}
                          className={`group/co relative flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 border-l-4 ${leftBorders[i] || "border-l-slate-300"} text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black shadow-sm ${rankColors[i] || "bg-slate-200 text-slate-600"}`}
                            >
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-800 truncate text-[11px]">
                                {c.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    style={{ width: `${pct}%` }}
                                    className="h-full bg-emerald-400 rounded-full"
                                  />
                                </div>
                                <span className="text-[9px] text-slate-400 shrink-0">
                                  {pct}%
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {c.passCount} passes · {c.persons}P ·{" "}
                                {c.vehicles}V
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-emerald-600 tabular-nums shrink-0 text-sm ml-3 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            {fmtMoney(c.total)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {!loading && displayData.hepRevenue.companyList.length === 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-6 text-[11px] text-slate-400 font-medium text-center">
                No pass revenue recorded for {filterRange.label}.
              </div>
            )}
          </Panel>

          <Panel
            title="Overstay & Port Dues"
            icon={Timer}
            tone="teal"
            action="View Overstay"
            actionHref="/traffic_manager/overstay"
          >
            {/* Collection efficiency */}
            <div className="mb-3 rounded-xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3 text-white ring-1 ring-white/10">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-200 text-[10px]">
                  Dues Recovery Rate
                </span>
                <span className="text-teal-300 font-black text-sm">
                  {displayData.overstay.total > 0
                    ? `${Math.round(((displayData.overstay.paid || 0) / (displayData.overstay.total || 1)) * 100)}%`
                    : "\u2014"}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  style={{
                    width: `${displayData.overstay.total > 0 ? Math.round(((displayData.overstay.paid || 0) / (displayData.overstay.total || 1)) * 100) : 0}%`,
                  }}
                  className="h-full bg-teal-400 transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                <span>{displayData.overstay.paid} settled</span>
                <span>{displayData.overstay.pending} pending</span>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <IconStatRow
                label="Total Dues Collected"
                value={displayData.overstay.paidAmount}
                icon={CircleDollarSign}
                tone="emerald"
                money
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <IconStatRow
                label="Pending Dues"
                value={displayData.overstay.pendingAmount}
                icon={AlertTriangle}
                tone="rose"
                money
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <IconStatRow
                label="Waiver Requests"
                value={displayData.overstay.exceptions}
                icon={HelpCircle}
                tone="amber"
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <IconStatRow
                label="Cases Settled"
                value={displayData.overstay.paid}
                icon={CheckCircle2}
                tone="sky"
                loading={loading}
                href="/traffic_manager/overstay"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {[
                {
                  label: "Today",
                  value: revBreakup[0]?.value,
                  grad: "from-amber-400 to-orange-500",
                  icon: Zap,
                },
                {
                  label: "This Month",
                  value: revBreakup[1]?.value,
                  grad: "from-teal-500 to-cyan-600",
                  icon: Calendar,
                },
                {
                  label: "All Time",
                  value: revBreakup[2]?.value,
                  grad: "from-indigo-500 to-violet-600",
                  icon: Globe,
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className={`relative overflow-hidden flex items-center justify-between rounded-xl bg-gradient-to-r ${r.grad} px-3 py-2.5 ring-1 ring-inset ring-white/20`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                    <r.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{r.label}</span>
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
      </div>

      {/* — 3. PASS & OPERATOR STATUS — */}
      <div id="sec-health">
        <SectionDivider label="Pass Application & Operator Status" icon={ClipboardCheck} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pass Health */}
          <Panel
            title="Pass Application Status"
            subtitle={`Application status report — ${filterRange.label}`}
            icon={FileText}
            tone="blue"
            action="View Passes"
            actionHref="/traffic_manager/passes"
          >
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3.5 text-white ring-1 ring-white/10 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
                  Application Clearance Rate
                </span>
                <span className="text-blue-300 font-black text-lg">
                  {Math.round(
                    ((displayData.pass.processed || 0) /
                      (displayData.pass.total || 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 flex">
                <div
                  style={{
                    width: `${Math.round(((displayData.pass.processed || 0) / (displayData.pass.total || 1)) * 100)}%`,
                  }}
                  className="bg-emerald-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${Math.round(((displayData.pass.pending || 0) / (displayData.pass.total || 1)) * 100)}%`,
                  }}
                  className="bg-amber-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${Math.round((((displayData.pass.rejected || 0) + (displayData.pass.reverted || 0)) / (displayData.pass.total || 1)) * 100)}%`,
                  }}
                  className="bg-rose-500 h-full transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{" "}
                  Cleared ({displayData.pass.processed})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{" "}
                  Pending ({displayData.pass.pending})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{" "}
                  Closed (
                  {displayData.pass.rejected + displayData.pass.reverted})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat
                label="Total Applications"
                value={displayData.pass.total}
                tone="blue"
                icon={FileText}
                loading={loading}
                href="/traffic_manager/passes"
              />
              <MiniStat
                label="Approved"
                value={displayData.pass.processed}
                tone="emerald"
                icon={CheckCircle}
                loading={loading}
                href="/traffic_manager/passes?tab=processed"
              />
              <MiniStat
                label="Pending"
                value={displayData.pass.pending}
                tone="amber"
                icon={Clock}
                loading={loading}
                href="/traffic_manager/passes?tab=pending"
              />
              <MiniStat
                label="Rejected"
                value={displayData.pass.rejected}
                tone="rose"
                icon={XCircle}
                loading={loading}
                href="/traffic_manager/passes?tab=processed"
              />
              <MiniStat
                label="Reverted"
                value={displayData.pass.reverted}
                tone="violet"
                icon={RotateCcw}
                loading={loading}
                href="/traffic_manager/passes"
              />
              <MiniStat
                label="Bulk Applications"
                value={displayData.bulk.total}
                tone="indigo"
                icon={Layers}
                loading={loading}
                href="/traffic_manager/bulk-pass"
              />
            </div>

            {/* Key decision insight */}
            {!loading && displayData.pass.pending > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700">
                  {displayData.pass.pending} passes await approval —{" "}
                  {displayData.pendingQueue.persons} persons,{" "}
                  {displayData.pendingQueue.vehicles} vehicles across{" "}
                  {displayData.pendingQueue.companies} operators.
                </p>
                <Link
                  href="/traffic_manager/passes?tab=pending"
                  className="ml-auto shrink-0 text-[10px] font-black text-amber-700 hover:text-amber-800 underline"
                >
                  Review →
                </Link>
              </div>
            )}
          </Panel>

          {/* Company Health */}
          <Panel
            title="Operator Registration Status"
            subtitle="Registered operator compliance and approval status"
            icon={Building2}
            tone="violet"
            action="View All"
            actionHref="/traffic_manager/companies"
          >
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3.5 text-white ring-1 ring-white/10 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Operator Approval Rate
                </span>
                <span className="text-emerald-300 font-black text-lg">
                  {Math.round(
                    ((displayData.company.approved || 0) /
                      (displayData.company.total || 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 flex">
                <div
                  style={{
                    width: `${Math.round(((displayData.company.approved || 0) / (displayData.company.total || 1)) * 100)}%`,
                  }}
                  className="bg-emerald-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${Math.round(((displayData.company.pending || 0) / (displayData.company.total || 1)) * 100)}%`,
                  }}
                  className="bg-amber-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${Math.round(((displayData.company.rejected || 0) / (displayData.company.total || 1)) * 100)}%`,
                  }}
                  className="bg-rose-500 h-full transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{" "}
                  Approved ({displayData.company.approved})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{" "}
                  Pending ({displayData.company.pending})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{" "}
                  Rejected ({displayData.company.rejected})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat
                label="Total Operators"
                value={displayData.company.total}
                tone="blue"
                icon={Building2}
                loading={loading}
                href="/traffic_manager/companies"
              />
              <MiniStat
                label="Approved"
                value={displayData.company.approved}
                tone="emerald"
                icon={CheckCircle2}
                loading={loading}
                href="/traffic_manager/companies?tab=processed"
              />
              <MiniStat
                label="Pending"
                value={displayData.company.pending}
                tone="amber"
                icon={Clock}
                loading={loading}
                href="/traffic_manager/companies?tab=pending"
              />
              <MiniStat
                label="Rejected"
                value={displayData.company.rejected}
                tone="rose"
                icon={Ban}
                loading={loading}
                href="/traffic_manager/companies?tab=processed"
              />
              <MiniStat
                label="Blacklisted"
                value={displayData.blType.COMPANY}
                tone="red"
                icon={ShieldBan}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Profile Updates"
                value={displayData.profileUpdates}
                tone="sky"
                icon={ClipboardList}
                loading={loading}
                href="/traffic_manager/companies?tab=profile_updates"
              />
            </div>

            {!loading && displayData.company.pending > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2">
                <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <p className="text-[10px] font-bold text-blue-700">
                  {displayData.company.pending} operator registration(s) pending
                  approval.
                  {displayData.profileUpdates > 0
                    ? ` ${displayData.profileUpdates} profile updates need review.`
                    : ""}
                </p>
                <Link
                  href="/traffic_manager/companies?tab=pending"
                  className="ml-auto shrink-0 text-[10px] font-black text-blue-700 hover:text-blue-800 underline"
                >
                  Review →
                </Link>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* — 4. SECURITY & COMPLIANCE — */}
      <div id="sec-security">
        <SectionDivider label="Security & Regulatory Compliance" icon={ShieldBan} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Blacklist Register */}
          <Panel
            title="Blacklist Register & Restrictions"
            subtitle="Active restrictions across all entity types"
            icon={ShieldBan}
            tone="red"
            action="View All"
            actionHref="/traffic_manager/blacklist"
          >
            {/* Security index */}
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3.5 text-white ring-1 ring-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200/70">
                  Restriction Summary
                </span>
                <span className="text-rose-300 font-black text-lg">
                  {fmtNum(displayData.bl.active_blacklisted)} Active
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: "Companies",
                    value: displayData.blType.COMPANY,
                    color: "bg-red-400",
                  },
                  {
                    label: "Persons",
                    value: displayData.blType.PERSON,
                    color: "bg-rose-400",
                  },
                  {
                    label: "Drivers",
                    value: displayData.blType.DRIVER,
                    color: "bg-orange-400",
                  },
                  {
                    label: "Vehicles",
                    value: displayData.blType.VEHICLE,
                    color: "bg-amber-400",
                  },
                ].map((t) => (
                  <div key={t.label} className="text-center">
                    <div className="text-lg font-black tabular-nums text-white">
                      {loading ? "\u2014" : fmtNum(t.value)}
                    </div>
                    <div
                      className={`h-1 w-full rounded-full ${t.color} mt-1 mb-1 opacity-70`}
                    />
                    <div className="text-[8px] font-bold text-slate-300 uppercase tracking-wide">
                      {t.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MiniStat
                label="Companies"
                value={displayData.blType.COMPANY}
                tone="red"
                icon={Building2}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Persons"
                value={displayData.blType.PERSON}
                tone="rose"
                icon={Users}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Drivers"
                value={displayData.blType.DRIVER}
                tone="orange"
                icon={UserCircle}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Vehicles"
                value={displayData.blType.VEHICLE}
                tone="amber"
                icon={Car}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Unblock Pending"
                value={displayData.bl.pending_unblacklist}
                tone="blue"
                icon={HelpCircle}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
              <MiniStat
                label="Total Active"
                value={displayData.bl.active_blacklisted}
                tone="red"
                icon={ShieldBan}
                loading={loading}
                href="/traffic_manager/blacklist"
              />
            </div>

            {!loading && displayData.bl.pending_blacklist > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                <ShieldBan className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <p className="text-[10px] font-bold text-rose-700">
                  {displayData.bl.pending_blacklist} blacklist requests pending
                  your decision.
                  {displayData.bl.pending_unblacklist > 0
                    ? ` ${displayData.bl.pending_unblacklist} unblock requests also pending.`
                    : ""}
                </p>
                <Link
                  href="/traffic_manager/blacklist"
                  className="ml-auto shrink-0 text-[10px] font-black text-rose-700 hover:text-rose-800 underline"
                >
                  Review →
                </Link>
              </div>
            )}
          </Panel>

          {/* Overstay & Penalties */}
          <Panel
            title="Overstay & Penalty Register"
            subtitle="Port fee compliance and outstanding dues recovery"
            icon={Timer}
            tone="orange"
            action="Manage"
            actionHref="/traffic_manager/overstay"
          >
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3.5 text-white ring-1 ring-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200/70">
                  Dues Recovery Status
                </span>
                <span className="text-teal-300 font-black">
                  {displayData.overstay.total > 0
                    ? `${Math.round(((displayData.overstay.paid || 0) / (displayData.overstay.total || 1)) * 100)}% Settled`
                    : "No cases"}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 flex">
                <div
                  style={{
                    width: `${displayData.overstay.total > 0 ? Math.round(((displayData.overstay.paid || 0) / (displayData.overstay.total || 1)) * 100) : 0}%`,
                  }}
                  className="bg-teal-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${displayData.overstay.total > 0 ? Math.round(((displayData.overstay.pending || 0) / (displayData.overstay.total || 1)) * 100) : 0}%`,
                  }}
                  className="bg-rose-400 h-full transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1.5">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />{" "}
                  Settled ({displayData.overstay.paid})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />{" "}
                  Pending ({displayData.overstay.pending})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <MiniStat
                label="Dues Collected"
                value={displayData.overstay.paidAmount}
                tone="emerald"
                icon={CircleDollarSign}
                money
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <MiniStat
                label="Dues Outstanding"
                value={displayData.overstay.pendingAmount}
                tone="rose"
                icon={AlertTriangle}
                money
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <MiniStat
                label="Waiver Requests"
                value={displayData.overstay.exceptions}
                tone="amber"
                icon={HelpCircle}
                loading={loading}
                href="/traffic_manager/overstay"
              />
              <MiniStat
                label="Total Cases"
                value={displayData.overstay.total}
                tone="sky"
                icon={Timer}
                loading={loading}
                href="/traffic_manager/overstay"
              />
            </div>

            {!loading && displayData.overstay.pendingAmount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <p className="text-[10px] font-bold text-orange-700">
                  {fmtMoney(displayData.overstay.pendingAmount)} in outstanding
                  overstay dues across {displayData.overstay.pending} open
                  cases.
                </p>
                <Link
                  href="/traffic_manager/overstay"
                  className="ml-auto shrink-0 text-[10px] font-black text-orange-700 hover:text-orange-800 underline"
                >
                  Settle →
                </Link>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* — 5. OPERATIONS SUMMARY — */}
      <div id="sec-operations">
        <SectionDivider label="Operations Summary" icon={Globe} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Port Pass Transaction Volume */}
          <Panel
            title="Port Pass Transaction Volume"
            subtitle="Volume of pass submissions by period"
            icon={Activity}
            tone="cyan"
            action="View Passes"
            actionHref="/traffic_manager/passes"
          >
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  label: "Today",
                  value: displayData.portActivity.today,
                  icon: Zap,
                  grad: "from-amber-400 via-orange-500 to-red-500",
                  shadow: "shadow-orange-400/25",
                },
                {
                  label: "Last 7 Days",
                  value: displayData.portActivity.week,
                  icon: BarChart3,
                  grad: "from-sky-500 via-blue-500 to-indigo-600",
                  shadow: "shadow-blue-500/25",
                },
                {
                  label: "This Month",
                  value: displayData.portActivity.month,
                  icon: Calendar,
                  grad: "from-emerald-500 via-teal-500 to-cyan-600",
                  shadow: "shadow-emerald-500/25",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`relative overflow-hidden flex items-center justify-between rounded-xl bg-gradient-to-r ${item.grad} shadow-md ${item.shadow} px-4 py-3 ring-1 ring-inset ring-white/20`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-white shrink-0" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                      {item.label}
                    </p>
                  </div>
                  {loading ? (
                    <div className="h-6 w-12 rounded bg-white/30 animate-pulse" />
                  ) : (
                    <p className="text-xl font-black text-white tabular-nums drop-shadow-sm">
                      {fmtNum(item.value)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat
                label="Persons Processed"
                value={displayData.processedQueue.persons}
                tone="blue"
                icon={Users}
                loading={loading}
              />
              <MiniStat
                label="Vehicles Processed"
                value={displayData.processedQueue.vehicles}
                tone="violet"
                icon={Car}
                loading={loading}
              />
            </div>
          </Panel>

          {/* Bulk Pass */}
          <Panel
            title="Group Pass Application Status"
            subtitle="Status of group pass applications submitted"
            icon={Users}
            tone="indigo"
            action="View All"
            actionHref="/traffic_manager/bulk-pass"
          >
            <div className="mb-3 rounded-xl bg-gradient-to-r from-[#0a1e4d] to-[#12275f] p-3 text-white ring-1 ring-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200/70">
                  Group Pass Approval Rate
                </span>
                <span className="text-indigo-300 font-black">
                  {displayData.bulk.total > 0
                    ? `${Math.round(((displayData.bulk.approved || 0) / (displayData.bulk.total || 1)) * 100)}%`
                    : "\u2014"}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 flex">
                <div
                  style={{
                    width: `${displayData.bulk.total > 0 ? Math.round(((displayData.bulk.approved || 0) / (displayData.bulk.total || 1)) * 100) : 0}%`,
                  }}
                  className="bg-indigo-400 h-full transition-all duration-700"
                />
                <div
                  style={{
                    width: `${displayData.bulk.total > 0 ? Math.round(((displayData.bulk.pending || 0) / (displayData.bulk.total || 1)) * 100) : 0}%`,
                  }}
                  className="bg-amber-400 h-full transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                <span>{displayData.bulk.approved} approved</span>
                <span>{displayData.bulk.pending} pending</span>
                <span>{displayData.bulk.rejected} rejected</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Total Applications"
                value={displayData.bulk.total}
                tone="indigo"
                icon={Layers}
                loading={loading}
                href="/traffic_manager/bulk-pass"
              />
              <MiniStat
                label="Pending"
                value={displayData.bulk.pending}
                tone="amber"
                icon={Clock}
                loading={loading}
                href="/traffic_manager/bulk-pass?tab=pending"
              />
              <MiniStat
                label="Approved"
                value={displayData.bulk.approved}
                tone="emerald"
                icon={CheckCircle2}
                loading={loading}
                href="/traffic_manager/bulk-pass?tab=approved"
              />
              <MiniStat
                label="Rejected"
                value={displayData.bulk.rejected}
                tone="rose"
                icon={XCircle}
                loading={loading}
                href="/traffic_manager/bulk-pass?tab=rejected"
              />
            </div>
          </Panel>

          {/* Quick Links / Reports */}
          <Panel
            title="Management Module Directory"
            subtitle="Direct access to operational management modules"
            icon={BarChart3}
            tone="navy"
          >
            <div className="space-y-2">
              {[
                {
                  href: "/traffic_manager/revenue",
                  label: "Revenue Report",
                  sub: `${fmtMoney(displayData.hepRevenue.total)} collected`,
                  icon: TrendingUp,
                  color: "bg-emerald-50 border-emerald-200 text-emerald-700",
                  icolor: "text-emerald-600",
                },
                {
                  href: "/traffic_manager/passes",
                  label: "Pass Register",
                  sub: `${displayData.pass.total} total · ${displayData.pass.pending} pending`,
                  icon: FileText,
                  color: "bg-blue-50 border-blue-200 text-blue-700",
                  icolor: "text-blue-600",
                },
                {
                  href: "/traffic_manager/companies",
                  label: "Operator Registration Registry",
                  sub: `${displayData.company.total} registered · ${displayData.company.approved} verified`,
                  icon: Building2,
                  color: "bg-violet-50 border-violet-200 text-violet-700",
                  icolor: "text-violet-600",
                },
                {
                  href: "/traffic_manager/blacklist",
                  label: "Blacklist & Restrictions Register",
                  sub: `${displayData.bl.active_blacklisted} active · ${displayData.bl.pending_blacklist} pending`,
                  icon: ShieldBan,
                  color: "bg-rose-50 border-rose-200 text-rose-700",
                  icolor: "text-rose-600",
                },
                {
                  href: "/traffic_manager/overstay",
                  label: "Overstay Management",
                  sub: `${fmtMoney(displayData.overstay.pendingAmount)} outstanding`,
                  icon: Timer,
                  color: "bg-orange-50 border-orange-200 text-orange-700",
                  icolor: "text-orange-600",
                },
                {
                  href: "/traffic_manager/bulk-pass",
                  label: "Group Pass Application Register",
                  sub: `${displayData.bulk.total} applications · ${displayData.bulk.pending} need review`,
                  icon: Layers,
                  color: "bg-indigo-50 border-indigo-200 text-indigo-700",
                  icolor: "text-indigo-600",
                },
              ].map((item) => {
                const I = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between gap-3 rounded-xl border ${item.color} px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <I
                        className={`h-4 w-4 shrink-0 ${item.icolor}`}
                        strokeWidth={2.2}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold truncate">
                          {item.label}
                        </p>
                        <p className="text-[9px] font-medium opacity-70 truncate">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
