"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  FileText,
  CheckCircle2,
  Layers,
  Building2,
  ShieldBan,
  Users,
  UserCircle,
  Car,
  ClipboardList,
  ClipboardCheck,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Timer,
  CircleDollarSign,
  Ban,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   Traffic Approval — Management Dashboard
   All API endpoints verified against the live codebase:
     ■ AGENT_API  (:5001) — pass-request/get-agent-pass-requests
     ■ ADMIN_API  (:5005) — user/agent-users, user/profile-update-requests,
                            blacklist/stats, blacklist/list,
                            overstay/charges, overstay/exception-requests
   ════════════════════════════════════════════════════════════════ */

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const getAuthHeaders = () => {
  let token = localStorage.getItem("accessToken");
  if (!token) return {};
  token = token.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${token}` };
};

/* ─── helpers ─── */
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
const fmtDateTime = () => {
  const dt = new Date();
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ─────────────────────────────────────────────────────────────────
   Tone tokens — solid, opaque tinted surfaces. No translucency and no
   backdrop blur, so tiles stay crisp and nothing bleeds through from
   behind. Each tone gives a tinted fill, a matching border, a text
   colour for the number and a chip colour for the icon.
   ───────────────────────────────────────────────────────────────── */
const TONE = {
  blue: {
    border: "border-blue-100",
    bg: "bg-blue-50",
    text: "text-blue-700",
    chip: "bg-blue-100 text-blue-600",
  },
  sky: {
    border: "border-sky-100",
    bg: "bg-sky-50",
    text: "text-sky-700",
    chip: "bg-sky-100 text-sky-600",
  },
  emerald: {
    border: "border-emerald-100",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-600",
  },
  teal: {
    border: "border-teal-100",
    bg: "bg-teal-50",
    text: "text-teal-700",
    chip: "bg-teal-100 text-teal-600",
  },
  amber: {
    border: "border-amber-100",
    bg: "bg-amber-50",
    text: "text-amber-700",
    chip: "bg-amber-100 text-amber-600",
  },
  orange: {
    border: "border-orange-100",
    bg: "bg-orange-50",
    text: "text-orange-700",
    chip: "bg-orange-100 text-orange-600",
  },
  red: {
    border: "border-red-100",
    bg: "bg-red-50",
    text: "text-red-700",
    chip: "bg-red-100 text-red-600",
  },
  rose: {
    border: "border-rose-100",
    bg: "bg-rose-50",
    text: "text-rose-700",
    chip: "bg-rose-100 text-rose-600",
  },
  violet: {
    border: "border-violet-100",
    bg: "bg-violet-50",
    text: "text-violet-700",
    chip: "bg-violet-100 text-violet-600",
  },
  slate: {
    border: "border-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-600",
  },
};

/* panel header icon-chip tones — solid, no blur */
const PANEL_TONE = {
  navy: "bg-[#0a1e4d]/10 text-[#0a1e4d]",
  orange: "bg-orange-100 text-orange-600",
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  sky: "bg-sky-100 text-sky-600",
  violet: "bg-violet-100 text-violet-600",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-600",
};

const BL_STATUS_TONE = {
  BLACKLISTED: "bg-rose-50 text-rose-700 border-rose-200",
  PENDING_BLACKLIST: "bg-amber-50 text-amber-700 border-amber-200",
  UNBLACKLIST_REQUESTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNBLACKLISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-600 border-slate-200",
};

const ENTITY_ICON = {
  COMPANY: Building2,
  PERSON: Users,
  DRIVER: UserCircle,
  VEHICLE: Car,
};

/* pass-request status → badge tone */
const PASS_STATUS_TONE = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_REVIEW: "bg-violet-50 text-violet-700 border-violet-200",
  RESUBMITTED: "bg-sky-50 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

/* ─── section shell ─── */
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
  const chip = PANEL_TONE[tone] || PANEL_TONE.navy;
  return (
    <section
      className={`group/panel relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(10,30,77,0.18)] flex flex-col transition-shadow duration-300 hover:shadow-[0_14px_36px_-14px_rgba(10,30,77,0.26)] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-2xl ${chip} shrink-0`}
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
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 shrink-0 transition-colors group/link rounded-full bg-orange-50 px-2.5 py-1 border border-orange-100"
          >
            {action}
            <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
      <div className="px-6 pb-6 flex-1">{children}</div>
    </section>
  );
}

/* MiniStat — renders as a Link when `href` is given so every tile on the
   dashboard is clickable and drills through to the matching list view. */
function MiniStat({
  label,
  value,
  tone = "blue",
  money = false,
  loading = false,
  icon: Icon,
  href,
}) {
  const t = TONE[tone] || TONE.blue;
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      title={href ? `View ${label}` : undefined}
      className={`group/ms relative block overflow-hidden rounded-2xl border ${t.border} ${t.bg} px-4 py-3.5 transition-all duration-200 ${href
        ? "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(10,30,77,0.3)] hover:border-slate-300 cursor-pointer"
        : ""
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
          {label}
        </p>
        {Icon && (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${t.chip} shrink-0`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-16 mt-1.5 rounded bg-slate-200 animate-pulse" />
      ) : (
        <p className={`text-2xl font-black ${t.text} mt-1.5 tabular-nums`}>
          {money ? fmtMoney(value) : fmtNum(value)}
        </p>
      )}
      {href && (
        <ArrowUpRight className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-slate-400 opacity-0 group-hover/ms:opacity-100 transition-opacity" />
      )}
    </Wrapper>
  );
}

/* IconStatRow — also becomes a Link when `href` is supplied. */
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
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      title={href ? `View ${label}` : undefined}
      className={`group/row flex items-center justify-between gap-3 -mx-2 rounded-xl px-2 py-2 transition-colors ${href ? "hover:bg-slate-100 cursor-pointer" : "hover:bg-slate-50"
        }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.chip} shrink-0`}
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
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all" />
        )}
      </div>
    </Wrapper>
  );
}

/* ─── Hero circular gauge (approval throughput) ─── */
function ProcessRateGauge({ processed = 0, total = 0, pending = 0, loading = false }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  // 270° sweep, starting at 135° (bottom-left) going clockwise
  const R = 78;
  const C = 2 * Math.PI * R;
  const sweep = 0.75; // 270° of full circle
  const dash = C * sweep;
  const filled = dash * (pct / 100);

  return (
    <div className="relative flex h-[188px] w-[188px] items-center justify-center shrink-0">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-[135deg]">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
        />
        {/* value arc */}
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${loading ? 0 : filled} ${C}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 6px rgba(249,115,22,0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200/70">
          Approval Rate
        </span>
        {loading ? (
          <div className="mt-1 h-10 w-20 rounded-lg bg-white/20 animate-pulse" />
        ) : (
          <span className="text-4xl font-black tabular-nums text-white drop-shadow">
            {pct}
            <span className="text-xl align-top text-orange-300">%</span>
          </span>
        )}
        <span className="mt-1 text-[10px] font-semibold text-blue-100/60 tabular-nums">
          {fmtNum(processed)} / {fmtNum(total)} done
        </span>
        {pending > 0 && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold text-amber-200 ring-1 ring-amber-300/20">
            <Clock className="h-2.5 w-2.5" />
            {fmtNum(pending)} pending
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Bar tooltip ─── */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-gray-800">{label}</p>
      <p className="text-gray-600 tabular-nums">
        {fmtNum(payload[0].value)}
      </p>
    </div>
  );
};

/* ─── Pie tooltip ─── */
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-gray-800">{d.name}</p>
      <p className="text-gray-600">
        {fmtNum(d.value)} entities{" "}
        <span className="text-gray-400">({d.payload.pct}%)</span>
      </p>
    </div>
  );
};

/* ─── empty state ─── */
const EMPTY = {
  pass: { pending: 0, processed: 0, total: 0 },
  passMine: 0,
  /* composition of the pending queue — derived from the pending pass list */
  pendingQueue: { persons: 0, vehicles: 0, companies: 0, list: [], counted: 0 },
  processedQueue: { persons: 0, vehicles: 0, counted: 0 },
  company: { total: 0, approved: 0, rejected: 0, pending: 0 },
  profileUpdates: 0,
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
  overstay: { pending: 0, paid: 0, exceptions: 0, pendingAmount: 0, total: 0 },
};

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function TrafficApprovalDashboard() {
  const router = useRouter();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  /* Makes a summary table row behave like a link: click or Enter/Space
     navigates to the matching list view. Tables can't contain a block-level
     <a> wrapping a <tr>, so this drives the router directly while keeping
     the row keyboard-reachable. */
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
    [router]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    const g = (url, params) =>
      axios.get(url, { headers, params, validateStatus: (s) => s < 500 });

    try {
      const [
        passRes,       // GET pass requests — returns {counts:{total,pending,processed}}
        passMineRes,   // Same endpoint filtered by processedByMe
        pendingPassRes, // Pending pass list — used to derive queue composition
        processedPassRes, // Processed pass list — used to derive processed composition
        companyRes,    // GET company registrations — returns {counts:{total,approved,rejected,pending}}
        profileRes,    // GET profile update requests — returns {pagination:{totalRecords}}
        blStatsRes,    // GET blacklist stats — returns {data:{active_blacklisted,...}}
        blRecentRes,   // GET recent blacklist entries (last 6)
        blPendingRes,  // GET pending blacklist entries (last 6)
        overstayRes,   // GET overstay charges list
        overstayExcRes, // GET overstay exception requests
      ] = await Promise.allSettled([
        // ── Pass requests (user_service :5001) ───────────────────────────────
        g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          limit: 1,
          page: 1,
        }),
        g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          limit: 1,
          page: 1,
          processedByMe: "true",
        }),
        // ── Pending pass list — same call the Pass Approvals page makes.
        //    Each row carries persons[] / vehicles[], which we sum to show
        //    *what kind* of pass is waiting, not just how many.
        g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          status: "pending",
          limit: 200,
          page: 1,
          sortOrder: "DESC",
        }),
        // ── Processed pass list — to derive processed composition (persons/vehicles).
        g(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          status: "processed",
          limit: 200,
          page: 1,
          sortOrder: "DESC",
        }),
        // ── Company registrations (approval-admin :5005) ──────────────────────
        g(`${ADMIN_API}/user/agent-users`, { limit: 1, page: 1 }),
        // ── Profile updates (approval-admin :5005) ────────────────────────────
        g(`${ADMIN_API}/user/profile-update-requests`, {
          status: "pending",
          limit: 1,
          page: 1,
        }),
        // ── Blacklist stats (approval-admin :5005) ────────────────────────────
        g(`${ADMIN_API}/blacklist/stats`),
        // ── Recent blacklist entries ──────────────────────────────────────────
        g(`${ADMIN_API}/blacklist/list`, { limit: 6, page: 1 }),
        // ── Pending blacklist entries ─────────────────────────────────────────
        g(`${ADMIN_API}/blacklist/list`, {
          status: "PENDING_BLACKLIST",
          limit: 6,
          page: 1,
        }),
        // ── Overstay (approval-admin :5005) ──────────────────────────────────
        g(`${ADMIN_API}/overstay/charges`, { limit: 500, page: 1 }),
        g(`${ADMIN_API}/overstay/exception-requests`, { limit: 1, page: 1 }),
      ]);

      const ok = (r) =>
        r.status === "fulfilled" && r.value?.data && r.value.status < 400;
      const val = (r, fallback) => (ok(r) ? r.value.data : fallback);

      // ── Pass counts ──────────────────────────────────────────────────────────
      // Response: { success, data:[], counts:{total,pending,processed}, pagination }
      const passCounts = val(passRes, {}).counts || {};
      const passMineCounts = val(passMineRes, {}).counts || {};

      // ── Company counts ───────────────────────────────────────────────────────
      // Response: { success, data:[], counts:{total,approved,rejected,pending}, pagination }
      const companyCounts = val(companyRes, {}).counts || {};

      // ── Pending queue composition ────────────────────────────────────────────
      // Each pass row carries persons[] and vehicles[] (same shape the Pass
      // Approvals table renders as "N Persons | M Vehicles"). Summing them
      // tells us what kind of entry is actually waiting for approval.
      const pendingList = val(pendingPassRes, {}).data || [];
      const pendingPersons = pendingList.reduce(
        (s, p) => s + (p.persons?.length || 0),
        0
      );
      const pendingVehicles = pendingList.reduce(
        (s, p) => s + (p.vehicles?.length || 0),
        0
      );
      const pendingCompanies = new Set(
        pendingList.map((p) => p.email || p.entityName).filter(Boolean)
      ).size;

      // Processed pass composition — same shape, tells us what got approved.
      const processedList = val(processedPassRes, {}).data || [];
      const processedPersons = processedList.reduce(
        (s, p) => s + (p.persons?.length || 0),
        0
      );
      const processedVehicles = processedList.reduce(
        (s, p) => s + (p.vehicles?.length || 0),
        0
      );

      // ── Profile updates ──────────────────────────────────────────────────────
      // Response: { success, data:[], pagination:{totalRecords,...} }
      const profilePagination = val(profileRes, {}).pagination || {};

      // ── Blacklist stats ──────────────────────────────────────────────────────
      // Response: { success, data:{ active_blacklisted, pending_blacklist, pending_unblacklist, total_unblacklisted, total, by_type:{COMPANY,PERSON,DRIVER,VEHICLE} } }
      const blRaw = val(blStatsRes, {});
      const blStats = blRaw?.data || blRaw || {};
      const blByType = blStats.by_type || {};

      // ── Blacklist entity lists ────────────────────────────────────────────────
      // Response: { success, data:[], total, pagination }
      const blRecentList = val(blRecentRes, {}).data || [];
      const blPendingList = val(blPendingRes, {}).data || [];

      // ── Overstay charges ─────────────────────────────────────────────────────
      // Response: { success, data:[] }  (each charge has status:"PENDING"|"PAID", total_amount)
      const charges = val(overstayRes, {}).data || [];
      const overstayPending = charges.filter((c) => c.status === "PENDING");
      const overstayPaid = charges.filter((c) => c.status === "PAID");

      // ── Overstay exception count ─────────────────────────────────────────────
      // Response: { success, count, data:[] }
      const excData = val(overstayExcRes, {});
      const overstayExceptions = num(excData.count ?? excData.pagination?.totalRecords ?? (excData.data || []).length);

      let failures = 0;
      [passRes, companyRes, blStatsRes].forEach((r) => {
        if (!ok(r)) failures++;
      });

      setData({
        pass: {
          pending: num(passCounts.pending),
          processed: num(passCounts.processed),
          total: num(passCounts.total),
        },
        passMine: num(passMineCounts.processed),
        pendingQueue: {
          persons: pendingPersons,
          vehicles: pendingVehicles,
          companies: pendingCompanies,
          list: pendingList,
          // how many pass rows the sums above are based on — if this is less
          // than pass.pending the breakdown is partial (list was capped at 200)
          counted: pendingList.length,
        },
        processedQueue: {
          persons: processedPersons,
          vehicles: processedVehicles,
          counted: processedList.length,
        },
        company: {
          total: num(companyCounts.total),
          approved: num(companyCounts.approved),
          rejected: num(companyCounts.rejected),
          pending: num(companyCounts.pending),
        },
        profileUpdates: num(profilePagination.totalRecords),
        bl: {
          active_blacklisted: num(blStats.active_blacklisted),
          pending_blacklist: num(blStats.pending_blacklist),
          pending_unblacklist: num(blStats.pending_unblacklist),
          total_unblacklisted: num(blStats.total_unblacklisted),
          total: num(blStats.total),
        },
        blType: {
          COMPANY: num(blByType.COMPANY ?? blStats.byType?.COMPANY),
          PERSON: num(blByType.PERSON ?? blStats.byType?.PERSON),
          DRIVER: num(blByType.DRIVER ?? blStats.byType?.DRIVER),
          VEHICLE: num(blByType.VEHICLE ?? blStats.byType?.VEHICLE),
        },
        blRecent: blRecentList,
        blPending: blPendingList,
        overstay: {
          pending: overstayPending.length,
          paid: overstayPaid.length,
          exceptions: overstayExceptions,
          pendingAmount: overstayPending.reduce(
            (s, c) => s + num(c.total_amount ?? c.amount),
            0
          ),
          total: charges.length,
        },
      });

      setLastUpdated(fmtDateTime());

      if (failures > 0) {
        toast.warning(
          `${failures} dashboard section${failures > 1 ? "s" : ""} could not load. Showing available data.`
        );
      }
    } catch (err) {
      console.error("Dashboard fetchAll error:", err);
      toast.error("Failed to load dashboard. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchAll, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  /* ─── derived: KPI row (vibrant gradient cards) ─── */
  const kpis = useMemo(
    () => [
      {
        key: "pending",
        label: "Pending Passes",
        value: data.pass.pending,
        gradient: "from-amber-400 via-orange-400 to-orange-500",
        glow: "shadow-orange-500/30",
        icon: Clock,
        href: "/traffic_approval/passes?tab=pending",
        // what kind of entry is waiting, not just how many passes
        chips: [
          { icon: Users, value: data.pendingQueue.persons, label: "Persons" },
          { icon: Car, value: data.pendingQueue.vehicles, label: "Vehicles" },
        ],
      },
      {
        key: "processed",
        label: "Processed Passes",
        value: data.pass.processed,
        gradient: "from-emerald-400 via-emerald-500 to-teal-500",
        glow: "shadow-emerald-500/30",
        icon: CheckCircle2,
        href: "/traffic_approval/passes?tab=processed",
        chips: [
          { icon: Users, value: data.processedQueue.persons, label: "Persons" },
          { icon: Car, value: data.processedQueue.vehicles, label: "Vehicles" },
        ],
      },
      {
        key: "total",
        label: "Total Passes",
        value: data.pass.total,
        gradient: "from-blue-500 via-blue-600 to-indigo-600",
        glow: "shadow-blue-500/30",
        icon: FileText,
        href: "/traffic_approval/passes",
        chips: [
          { icon: Clock, value: data.pass.pending, label: "Pending" },
          { icon: CheckCircle2, value: data.pass.processed, label: "Done" },
        ],
      },
      {
        key: "companies",
        label: "Registered Companies",
        value: data.company.total,
        gradient: "from-violet-500 via-violet-600 to-purple-600",
        glow: "shadow-violet-500/30",
        icon: Building2,
        href: "/traffic_approval/companies",
        chips: [
          { icon: CheckCircle2, value: data.company.approved, label: "Approved" },
          { icon: Clock, value: data.company.pending, label: "Pending" },
        ],
      },
      {
        key: "blacklisted",
        label: "Active Blacklisted",
        value: data.bl.active_blacklisted,
        gradient: "from-rose-500 via-red-500 to-red-600",
        glow: "shadow-red-500/30",
        icon: ShieldBan,
        href: "/traffic_approval/blacklist",
        chips: [
          { icon: Users, value: data.blType.PERSON, label: "Persons" },
          { icon: Car, value: data.blType.VEHICLE, label: "Vehicles" },
        ],
      },
    ],
    [data]
  );

  /* ─── derived: blacklist-by-type donut ─── */
  const donut = useMemo(() => {
    const rows = [
      { name: "Company", value: data.blType.COMPANY, color: "#2563eb" },
      { name: "Person", value: data.blType.PERSON, color: "#059669" },
      { name: "Driver", value: data.blType.DRIVER, color: "#f97316" },
      { name: "Vehicle", value: data.blType.VEHICLE, color: "#7c3aed" },
    ];
    const total = rows.reduce((s, r) => s + r.value, 0);
    return {
      rows: rows.map((r) => ({
        ...r,
        pct: total ? Math.round((r.value / total) * 100) : 0,
      })),
      total,
    };
  }, [data]);

  /* ─── derived: pass pipeline bars (pending vs processed) ─── */
  const passBars = useMemo(
    () => [
      { name: "Pending", value: data.pass.pending, fill: "#f59e0b" },
      { name: "Processed", value: data.pass.processed, fill: "#10b981" },
      { name: "Total", value: data.pass.total, fill: "#2563eb" },
    ],
    [data]
  );

  /* ─── derived: company registration status bars ─── */
  const companyBars = useMemo(
    () => [
      { name: "Approved", value: data.company.approved, fill: "#10b981" },
      { name: "Pending", value: data.company.pending, fill: "#f59e0b" },
      { name: "Rejected", value: data.company.rejected, fill: "#ef4444" },
      { name: "Blacklisted", value: data.blType.COMPANY, fill: "#7c3aed" },
    ],
    [data]
  );

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="relative space-y-6 font-sans text-slate-800 pb-10">
      {/* Ambient liquid-glass light field is provided by the section layout
          (traffic_approval/layout.js) so every page shares the same backdrop. */}

      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1e4d] via-[#12275f] to-[#1b1856] ring-1 ring-inset ring-white/15 px-6 py-7 sm:px-8 text-white shadow-[0_16px_40px_-16px_rgba(10,30,77,0.6)]">
        {/* top specular rim + glass sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="pointer-events-none absolute -top-1/2 inset-x-0 h-full bg-gradient-to-b from-white/12 to-transparent" />
        {/* decorative glows */}
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="pointer-events-none absolute right-40 top-8 h-40 w-40 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-orange-200 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Pass Section · Control Center
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">
              Management Dashboard
            </h2>
            <p className="mt-1.5 max-w-lg text-sm font-medium text-blue-100/80">
              Live approvals, company registrations, blacklist &amp; overstay —
              everything the Pass Section runs, in one glance.
            </p>
          </div>

          <div className="flex items-center gap-5">
            {/* signature circular gauge */}
            <ProcessRateGauge
              processed={data.pass.processed}
              total={data.pass.total}
              pending={data.pass.pending}
              loading={loading}
            />

            <div className="flex flex-col items-stretch gap-2.5">
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 text-[11px] font-semibold text-blue-100 ring-1 ring-inset ring-white/20">
                <Activity
                  className={`h-3.5 w-3.5 ${loading ? "animate-pulse text-orange-300" : "text-emerald-300"
                    }`}
                />
                {lastUpdated ? (
                  <>
                    Updated{" "}
                    <span className="font-bold text-white">{lastUpdated}</span>
                  </>
                ) : (
                  "Syncing…"
                )}
              </div>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-[11px] font-bold text-white ring-1 ring-inset ring-white/30 shadow-[0_8px_24px_-6px_rgba(249,115,22,0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)] transition-all hover:from-orange-400 hover:to-orange-500 active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ TOP KPI CARDS ══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.key}
              href={c.href}
              className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-5 text-white ring-1 ring-inset ring-white/30 shadow-[0_12px_40px_-12px_var(--tw-shadow-color),inset_0_1px_0_0_rgba(255,255,255,0.45)] ${c.glow} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_56px_-16px_var(--tw-shadow-color),inset_0_1px_0_0_rgba(255,255,255,0.6)]`}
            >
              {/* crisp specular edge — no blur, keeps the gradient sharp */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              <div className="pointer-events-none absolute -top-1/2 inset-x-0 h-full bg-gradient-to-b from-white/20 to-transparent opacity-80" />
              {/* soft bubbles (solid, no blur) */}
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />
              <div className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/10" />

              <div className="relative flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 ring-1 ring-inset ring-white/40">
                  <Icon className="h-5 w-5" strokeWidth={2.3} />
                </span>
                <ArrowUpRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-90 group-hover:translate-x-0 transition-all" />
              </div>

              {loading ? (
                <div className="relative mt-4 h-9 w-16 rounded-lg bg-white/30 animate-pulse" />
              ) : (
                <p className="relative mt-4 text-3xl font-black tabular-nums drop-shadow-sm">
                  {fmtNum(c.value)}
                </p>
              )}
              <p className="relative mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/85">
                {c.label}
              </p>

              {/* breakdown chips — e.g. how many Persons vs Vehicles are waiting */}
              {c.chips && !loading && (
                <div className="relative mt-2.5 flex flex-wrap gap-1.5">
                  {c.chips.map((ch) => {
                    const ChIcon = ch.icon;
                    return (
                      <span
                        key={ch.label}
                        title={`${fmtNum(ch.value)} ${ch.label}`}
                        className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-900 ring-1 ring-inset ring-white/60 shadow-sm"
                      >
                        <ChIcon className="h-3 w-3" strokeWidth={2.4} />
                        {fmtNum(ch.value)} {ch.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* ══════════ PENDING PASS QUEUE ══════════ */}
      <Panel
        title="Pending Pass Queue"
        subtitle="What kind of entry is awaiting approval"
        action="Review Queue"
        actionHref="/traffic_approval/passes"
        icon={Clock}
        tone="amber"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat
            label="Pending Passes"
            value={data.pass.pending}
            tone="amber"
            icon={FileText}
            loading={loading}
            href="/traffic_approval/passes?tab=pending"
          />
          <MiniStat
            label="Persons Awaiting"
            value={data.pendingQueue.persons}
            tone="blue"
            icon={Users}
            loading={loading}
            href="/traffic_approval/passes?tab=pending"
          />
          <MiniStat
            label="Vehicles Awaiting"
            value={data.pendingQueue.vehicles}
            tone="violet"
            icon={Car}
            loading={loading}
            href="/traffic_approval/passes?tab=pending"
          />
          <MiniStat
            label="Companies Involved"
            value={data.pendingQueue.companies}
            tone="emerald"
            icon={Building2}
            loading={loading}
            href="/traffic_approval/companies"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-dashed border-slate-200/70">
          {loading ? (
            <SkeletonRows />
          ) : data.pendingQueue.list.length === 0 ? (
            <EmptyRow label="No passes awaiting approval" />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px] text-left whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-200/70">
                    <th className="py-2 pr-2 font-extrabold">Ref No</th>
                    <th className="py-2 px-2 font-extrabold">Company / Agent</th>
                    <th className="py-2 px-2 font-extrabold">Entities Included</th>
                    <th className="py-2 px-2 font-extrabold">Applied On</th>
                    <th className="py-2 pl-2 font-extrabold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {data.pendingQueue.list.slice(0, 6).map((p, i) => {
                    const persons = p.persons?.length || 0;
                    const vehicles = p.vehicles?.length || 0;
                    const status = String(p.status || "PENDING").toUpperCase();
                    return (
                      <tr
                        key={p.id ?? p.referenceNo ?? i}
                        {...rowLinkProps(
                          "/traffic_approval/passes?tab=pending",
                          `Review ${p.referenceNo || "pass request"}`
                        )}
                        className="cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-blue-50"
                      >
                        <td className="py-2.5 pr-2 font-mono font-bold text-slate-700">
                          {p.referenceNo || (p.id ? `REQ-${p.id}` : "—")}
                        </td>
                        <td className="py-2.5 px-2">
                          <p className="font-bold text-slate-700 truncate max-w-[180px]">
                            {p.entityName || "—"}
                          </p>
                          {p.email && (
                            <p className="text-[9px] text-slate-400 truncate max-w-[180px]">
                              {p.email}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 px-2 py-0.5 font-bold ring-1 ring-inset ring-white/40">
                              <Users className="h-3 w-3" /> {persons}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-700 px-2 py-0.5 font-bold ring-1 ring-inset ring-white/40">
                              <Car className="h-3 w-3" /> {vehicles}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-slate-500">
                          {fmtDate(p.createdAt)}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] border ${PASS_STATUS_TONE[status] ||
                              "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Be explicit when the numbers above are based on a capped list */}
              {data.pendingQueue.counted < data.pass.pending && (
                <p className="mt-3 text-[10px] font-medium text-amber-600">
                  Breakdown covers the {fmtNum(data.pendingQueue.counted)} most
                  recent of {fmtNum(data.pass.pending)} pending passes.
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* ══════════ ROW: Company | Pass Approval ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Company Registration Summary */}
        <Panel
          title="Company Registration"
          subtitle="Onboarding pipeline"
          action="View All"
          actionHref="/traffic_approval/companies"
          icon={Building2}
          tone="violet"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat
              label="Total"
              value={data.company.total}
              tone="blue"
              icon={Building2}
              loading={loading}
              href="/traffic_approval/companies"
            />
            <MiniStat
              label="Approved"
              value={data.company.approved}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/companies?tab=processed"
            />
            <MiniStat
              label="Pending"
              value={data.company.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/companies?tab=pending"
            />
            <MiniStat
              label="Rejected"
              value={data.company.rejected}
              tone="rose"
              icon={Ban}
              loading={loading}
              href="/traffic_approval/companies?tab=processed"
            />
            <MiniStat
              label="Blacklisted"
              value={data.blType.COMPANY}
              tone="red"
              icon={ShieldBan}
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <MiniStat
              label="Profile Reqs"
              value={data.profileUpdates}
              tone="sky"
              icon={ClipboardList}
              loading={loading}
              href="/traffic_approval/companies?tab=profile_updates"
            />
          </div>
        </Panel>

        {/* Pass Approval Section Summary */}
        <Panel
          title="Pass Approval Section"
          subtitle="Live queue & overstay"
          action="View All"
          actionHref="/traffic_approval/passes"
          icon={FileText}
          tone="blue"
          className="lg:col-span-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat
              label="Pending"
              value={data.pass.pending}
              tone="amber"
              icon={Clock}
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <MiniStat
              label="Processed"
              value={data.pass.processed}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <MiniStat
              label="Total Passes"
              value={data.pass.total}
              tone="blue"
              icon={FileText}
              loading={loading}
              href="/traffic_approval/passes"
            />
            <MiniStat
              label="By Me"
              value={data.passMine}
              tone="violet"
              icon={ClipboardCheck}
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-4 border-t border-dashed border-slate-200">
            <MiniStat
              label="Overstay Pending"
              value={data.overstay.pending}
              tone="rose"
              icon={Timer}
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <MiniStat
              label="Overstay Amount"
              value={data.overstay.pendingAmount}
              tone="red"
              icon={CircleDollarSign}
              money
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <MiniStat
              label="Exceptions"
              value={data.overstay.exceptions}
              tone="amber"
              icon={AlertTriangle}
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <MiniStat
              label="Settled"
              value={data.overstay.paid}
              tone="emerald"
              icon={CheckCircle2}
              loading={loading}
              href="/traffic_approval/overstay"
            />
          </div>
        </Panel>
      </div>

      {/* ══════════ ROW: Bar-chart analytics ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass Approval Pipeline */}
        <Panel
          title="Pass Approval"
          subtitle="Pending vs processed volume"
          action="View All"
          actionHref="/traffic_approval/passes"
          icon={BarChart3}
          tone="blue"
        >
          {loading ? (
            <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={passBars}
                  margin={{ top: 20, right: 8, left: -18, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#eef2f7"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(37,99,235,0.06)" }}
                    content={<CustomBarTooltip />}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {passBars.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      className="fill-slate-700"
                      style={{ fontSize: 12, fontWeight: 800 }}
                      formatter={(v) => fmtNum(v)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Company Registration Status */}
        <Panel
          title="Company Registration Status"
          subtitle="Onboarding outcomes"
          action="View All"
          actionHref="/traffic_approval/companies"
          icon={Building2}
          tone="violet"
        >
          {loading ? (
            <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companyBars}
                  margin={{ top: 20, right: 8, left: -18, bottom: 0 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#eef2f7"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(124,58,237,0.06)" }}
                    content={<CustomBarTooltip />}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {companyBars.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      className="fill-slate-700"
                      style={{ fontSize: 12, fontWeight: 800 }}
                      formatter={(v) => fmtNum(v)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* ══════════ ROW: My Work | Blacklist | Donut | Overstay ══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* My Work */}
        <Panel
          title="My Work"
          subtitle="Your activity"
          action="View All"
          actionHref="/traffic_approval/passes"
          icon={ClipboardCheck}
          tone="emerald"
        >
          <div className="space-y-1">
            <IconStatRow
              label="Processed by Me"
              value={data.passMine}
              icon={CheckCircle2}
              tone="emerald"
              loading={loading}
              href="/traffic_approval/passes?tab=processed"
            />
            <IconStatRow
              label="Pending in Queue"
              value={data.pass.pending}
              icon={Clock}
              tone="amber"
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <IconStatRow
              label="Persons Awaiting"
              value={data.pendingQueue.persons}
              icon={Users}
              tone="blue"
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <IconStatRow
              label="Vehicles Awaiting"
              value={data.pendingQueue.vehicles}
              icon={Car}
              tone="violet"
              loading={loading}
              href="/traffic_approval/passes?tab=pending"
            />
            <IconStatRow
              label="Company Reg. Pending"
              value={data.company.pending}
              icon={Building2}
              tone="blue"
              loading={loading}
              href="/traffic_approval/companies?tab=pending"
            />
            <IconStatRow
              label="Profile Update Reqs"
              value={data.profileUpdates}
              icon={ClipboardList}
              tone="sky"
              loading={loading}
              href="/traffic_approval/companies?tab=profile_updates"
            />
          </div>
        </Panel>

        {/* Blacklist / Restriction Visibility */}
        <Panel
          title="Blacklist / Restriction"
          subtitle="By entity type"
          action="View All"
          actionHref="/traffic_approval/blacklist"
          icon={ShieldBan}
          tone="red"
        >
          <div className="space-y-1">
            <IconStatRow
              label="Companies"
              value={data.blType.COMPANY}
              icon={Building2}
              tone="red"
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <IconStatRow
              label="Persons"
              value={data.blType.PERSON}
              icon={Users}
              tone="red"
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <IconStatRow
              label="Drivers"
              value={data.blType.DRIVER}
              icon={UserCircle}
              tone="red"
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <IconStatRow
              label="Vehicles"
              value={data.blType.VEHICLE}
              icon={Car}
              tone="red"
              loading={loading}
              href="/traffic_approval/blacklist"
            />
            <IconStatRow
              label="Unblock Requests"
              value={data.bl.pending_unblacklist}
              icon={HelpCircle}
              tone="amber"
              loading={loading}
              href="/traffic_approval/blacklist"
            />
          </div>
        </Panel>

        {/* Blacklisted by Entity Type (donut) */}
        <Panel
          title="Blacklisted by Type"
          subtitle="Distribution"
          action="Report"
          actionHref="/traffic_approval/blacklist"
          icon={BarChart3}
          tone="orange"
        >
          {loading ? (
            <div className="h-[150px] rounded-2xl bg-slate-100 animate-pulse" />
          ) : donut.total === 0 ? (
            <div className="h-[150px] flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-xs font-semibold text-slate-500">
                No active blacklisted entities
              </p>
            </div>
          ) : (
            <div className="relative h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut.rows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="none"
                  >
                    {donut.rows.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total
                </span>
                <span className="text-2xl font-black text-[#0a1e4d] tabular-nums">
                  {fmtNum(donut.total)}
                </span>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {donut.rows.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name}
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {fmtNum(d.value)}{" "}
                  <span className="text-slate-400 font-medium">({d.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Overstay Snapshot */}
        <Panel
          title="Overstay Snapshot"
          subtitle="Penalties & exceptions"
          action="View List"
          actionHref="/traffic_approval/overstay"
          icon={Timer}
          tone="amber"
        >
          <div className="space-y-1">
            <IconStatRow
              label="Pending Charges"
              value={data.overstay.pending}
              icon={Clock}
              tone="rose"
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Pending Amount"
              value={data.overstay.pendingAmount}
              icon={CircleDollarSign}
              tone="red"
              money
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Exception Requests"
              value={data.overstay.exceptions}
              icon={AlertTriangle}
              tone="amber"
              loading={loading}
              href="/traffic_approval/overstay"
            />
            <IconStatRow
              label="Settled / Paid"
              value={data.overstay.paid}
              icon={CheckCircle2}
              tone="emerald"
              loading={loading}
              href="/traffic_approval/overstay"
            />
          </div>
        </Panel>
      </div>

      {/* ══════════ ROW: Recent BL | Pending BL | Quick Actions ══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Blacklist Activity */}
        <Panel
          title="Recent Blacklist Activity"
          subtitle="Latest 6 records"
          action="View All"
          actionHref="/traffic_approval/blacklist"
          icon={ClipboardList}
          tone="navy"
          className="xl:col-span-5"
        >
          {loading ? (
            <SkeletonRows />
          ) : data.blRecent.length === 0 ? (
            <EmptyRow label="No blacklist records yet" />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px] text-left whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-100">
                    <th className="py-2 pr-2 font-extrabold">Entity</th>
                    <th className="py-2 px-2 font-extrabold">Type</th>
                    <th className="py-2 px-2 font-extrabold">Status</th>
                    <th className="py-2 pl-2 font-extrabold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.blRecent.map((e, i) => {
                    const EIcon = ENTITY_ICON[e.entity_type] || ShieldBan;
                    return (
                      <tr
                        key={e.id ?? i}
                        {...rowLinkProps(
                          "/traffic_approval/blacklist",
                          `View ${e.identifier || "blacklist entry"}`
                        )}
                        className="cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-blue-50"
                      >
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-slate-700 font-mono uppercase">
                            {e.identifier}
                          </p>
                          {e.entity_name && e.entity_name !== e.identifier && (
                            <p className="text-[9px] text-slate-400">
                              {e.entity_name}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                            <EIcon className="h-3 w-3" /> {e.entity_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] border ${BL_STATUS_TONE[e.status] ||
                              "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                          >
                            {String(e.status || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold text-slate-500">
                          {fmtDate(e.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Pending Blacklist Approvals */}
        <Panel
          title="Pending Blacklist Approvals"
          subtitle="Awaiting review"
          action="Review"
          actionHref="/traffic_approval/blacklist"
          icon={AlertTriangle}
          tone="amber"
          className="xl:col-span-4"
        >
          {loading ? (
            <SkeletonRows />
          ) : data.blPending.length === 0 ? (
            <EmptyRow label="No pending blacklist requests" />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px] text-left whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-100">
                    <th className="py-2 pr-2 font-extrabold">Entity</th>
                    <th className="py-2 px-2 font-extrabold">Type</th>
                    <th className="py-2 pl-2 font-extrabold text-right">
                      Requested
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.blPending.map((e, i) => {
                    const EIcon = ENTITY_ICON[e.entity_type] || ShieldBan;
                    return (
                      <tr
                        key={e.id ?? i}
                        {...rowLinkProps(
                          "/traffic_approval/blacklist",
                          `View ${e.identifier || "blacklist entry"}`
                        )}
                        className="cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-blue-50"
                      >
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-slate-700 font-mono uppercase">
                            {e.identifier}
                          </p>
                          {e.entity_name && e.entity_name !== e.identifier && (
                            <p className="text-[9px] text-slate-400">
                              {e.entity_name}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                            <EIcon className="h-3 w-3" /> {e.entity_type}
                          </span>
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold text-slate-500">
                          {fmtDate(e.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Quick Actions */}
        <Panel
          title="Quick Actions"
          subtitle="Jump to a workflow"
          icon={TrendingUp}
          tone="orange"
          className="xl:col-span-3"
        >
          <div className="grid grid-cols-1 gap-2.5">
            {[
              {
                label: "Pending Passes",
                icon: FileText,
                href: "/traffic_approval/passes",
                tone: "blue",
              },
              {
                label: "Company Approvals",
                icon: Building2,
                href: "/traffic_approval/companies",
                tone: "emerald",
              },
              {
                label: "Blacklist Management",
                icon: ShieldBan,
                href: "/traffic_approval/blacklist",
                tone: "violet",
              },
              {
                label: "Overstay Exceptions",
                icon: Timer,
                href: "/traffic_approval/overstay",
                tone: "red",
              },
              {
                label: "Bulk Pass",
                icon: Layers,
                href: "/traffic_approval/bulk-pass",
                tone: "sky",
              },
            ].map((a) => {
              const t = TONE[a.tone] || TONE.blue;
              const Icon = a.icon;
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`relative overflow-hidden flex items-center gap-3 rounded-2xl border ${t.border} ${t.bg} px-3 py-2.5 transition-all duration-200 hover:shadow-[0_10px_24px_-12px_rgba(10,30,77,0.3)] hover:border-slate-300 hover:-translate-y-0.5 group`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.chip} shrink-0`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <span className={`text-xs font-bold ${t.text} flex-1`}>
                    {a.label}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 ${t.text} opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all`}
                  />
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-1">
        <Ban className="h-3 w-3" />
        Figures are live from Pass Section services. Click any card or panel
        action to drill in. Auto-refreshes every 3 minutes.
      </div>
    </div>
  );
}

/* ─── tiny presentational helpers ─── */
function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyRow({ label }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
