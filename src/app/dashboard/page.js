"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Truck,
  Calendar,
  Ship,
  ChevronRight,
  Plus,
  ShieldAlert,
  Ban,
  DollarSign,
  Anchor,
  Container,
  Radar,
  Activity,
  RefreshCw,
  CreditCard,
  AlertCircle,
  X,
  FileText,
  Eye,
  Hash,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Timer,
  User,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Building2,
  GripVertical,
  RotateCcw,
  Zap,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const FILE_BASE = AGENT_API.replace(/\/api\/?$/, "");
const fileUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${FILE_BASE}/${String(p).replace(/^\/+/, "")}`;
};

const ID_PROOF_LABELS = { 1: "Driving Licence", 2: "PAN", 3: "Passport" };

const getEntityStatusMeta = (raw) => {
  const s = String(raw || "").toLowerCase();
  if (s === "approved") return { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (s === "rejected") return { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" };
  if (s === "reverted") return { label: "Reverted", color: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" };
};

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatCurrency = (n) => currencyFmt.format(n);

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
};

const getGreeting = (hour) => {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getRequestStatusMeta = (rawStatus) => {
  const s = String(rawStatus || "").toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED" || s === "ACTIVE")
    return { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (s === "REVERTED")
    return { label: "Reverted", color: "bg-orange-100 text-orange-700 border-orange-200" };
  if (s === "REJECTED")
    return { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" };
  if (s === "DRAFT")
    return { label: "Draft", color: "bg-stone-100 text-stone-600 border-stone-200" };
  return { label: s ? s.replace(/_/g, " ") : "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" };
};

const daysUntil = (iso) => {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const diff = Math.ceil((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const filterPassesByDate = (passes, filter) => {
  if (filter === "all") return passes;
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOf(now);
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  return passes.filter((p) => {
    const created = new Date(p.createdAt || p.submittedAt || 0);
    if (filter === "today") return created >= today && created <= endOfToday;
    if (filter === "week") {
      const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      return created >= weekAgo;
    }
    if (filter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return created >= monthStart;
    }
    return true;
  });
};

// ---------------------------------------------------------------------------
// Card shells
// ---------------------------------------------------------------------------
const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] h-full flex flex-col justify-between " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "hover:-translate-y-1 hover:scale-[1.01] " +
  "hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_28px_56px_-20px_rgba(15,23,42,0.28)] " +
  "dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.65),0_36px_72px_-24px_rgba(0,0,0,0.85)] " +
  "transition-all duration-300 ease-in-out relative group";

const cardShellPrimary =
  "rounded-3xl border-0 overflow-hidden relative text-white h-full flex flex-col justify-between " +
  "bg-gradient-to-br from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] " +
  "ring-1 ring-amber-400/15 " +
  "shadow-[0_2px_6px_rgba(245,158,11,0.10),0_24px_56px_-20px_rgba(245,158,11,0.30)] " +
  "hover:-translate-y-1 hover:scale-[1.01] " +
  "hover:shadow-[0_4px_15px_rgba(245,158,11,0.16),0_36px_72px_-20px_rgba(245,158,11,0.42)] " +
  "transition-all duration-300 ease-in-out group";

const cardShellAlertRed =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] overflow-hidden " +
  "ring-1 ring-red-200 dark:ring-red-500/30 " +
  "shadow-[0_1px_3px_rgba(244,63,94,0.06),0_18px_40px_-20px_rgba(244,63,94,0.22)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_28px_60px_-24px_rgba(244,63,94,0.30)] " +
  "transition-all duration-300 ease-in-out";

const cardShellAlertAmber =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] overflow-hidden " +
  "ring-1 ring-amber-200 dark:ring-amber-400/30 " +
  "shadow-[0_1px_3px_rgba(245,158,11,0.06),0_18px_40px_-20px_rgba(245,158,11,0.22)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_28px_60px_-24px_rgba(245,158,11,0.30)] " +
  "transition-all duration-300 ease-in-out";

// ---------------------------------------------------------------------------
// Date filter chips component
// ---------------------------------------------------------------------------
const DATE_FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const DateFilterChips = memo(function DateFilterChips({ value, onChange, counts }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-stone-400 shrink-0" />
      {DATE_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 " +
            (value === f.key
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
              : "bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:bg-amber-100 dark:hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-300")
          }
        >
          {f.label}
          {counts?.[f.key] !== undefined && (
            <span className={
              "text-[10px] rounded-full px-1.5 py-0.5 font-extrabold tabular-nums " +
              (value === f.key ? "bg-white/20 text-white" : "bg-stone-200 dark:bg-white/10 text-stone-500 dark:text-stone-400")
            }>
              {counts[f.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Enhanced Movable StatCard
// ---------------------------------------------------------------------------
const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  accent = "default",
  badge,
  progress,
  footnote,
  footnoteTone,
  subItems,
  onClick,
}) {
  const isPrimary = accent === "primary";
  return (
    <Card
      className={(isPrimary ? cardShellPrimary : cardShell) + (onClick ? " cursor-pointer" : "")}
      onClick={onClick}
    >
      {isPrimary && (
        <svg
          aria-hidden
          viewBox="0 0 400 240"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute bottom-0 right-0 h-32 w-3/4 text-white/25"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
        >
          <path d="M150,70 q22,-22 44,0 t44,0 t44,0 t44,0" />
          <path d="M150,120 q22,-22 44,0 t44,0 t44,0 t44,0" />
          <path d="M150,170 q22,-22 44,0 t44,0 t44,0 t44,0" />
        </svg>
      )}

      {/* Grip drag handle icon (visible on hover) */}
      <div className="absolute top-3 right-3 text-stone-300 dark:text-stone-600 group-hover:text-stone-400 dark:group-hover:text-stone-400 transition-colors cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-stone-50 dark:hover:bg-white/5 shrink-0 z-10">
        <GripVertical className="h-4 w-4" />
      </div>

      <CardHeader className="pb-3 relative pr-8">
        <div className="flex items-center justify-between">
          <div
            className={
              "flex h-12 w-12 items-center justify-center rounded-2xl " +
              (accent === "primary"
                ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30"
                : accent === "success"
                  ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-650 dark:text-emerald-400"
                  : accent === "warning"
                    ? "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400"
                    : accent === "danger"
                      ? "bg-red-50 dark:bg-red-400/10 text-red-650 dark:text-red-400"
                      : accent === "info"
                        ? "bg-blue-50 dark:bg-blue-400/10 text-blue-650 dark:text-blue-400"
                        : "bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-amber-300")
            }
          >
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          {badge && (
            <Badge
              className={
                isPrimary
                  ? "bg-amber-400/20 text-amber-200 border-0 text-xs font-bold px-3 py-1 rounded-full"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 border-0 text-xs font-bold px-3 py-1 rounded-full"
              }
              variant={isPrimary ? "default" : "secondary"}
            >
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative flex-1 flex flex-col justify-between">
        <div>
          <p className={
            isPrimary
              ? "text-stone-300 text-xs font-medium mb-1 uppercase tracking-wider"
              : "text-xs text-stone-500 dark:text-stone-400 font-semibold mb-1 uppercase tracking-wider"
          }>
            {label}
          </p>
          <p className={
            "text-3xl font-extrabold tabular-nums tracking-tight " +
            (isPrimary ? "text-white" : "text-stone-900 dark:text-stone-100")
          }>
            {value}
          </p>
        </div>

        <div>
          {typeof progress === "number" && (
            <Progress value={progress} className="mt-3 h-2" />
          )}

          {/* Sub-items */}
          {subItems && subItems.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {subItems.map((si) => (
                <span
                  key={si.label}
                  className={
                    "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full " +
                    (isPrimary ? "bg-white/10 text-white/80" : "bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400")
                  }
                >
                  {si.icon && <si.icon className="h-2.5 w-2.5" />}
                  {si.label}: <span className={isPrimary ? "text-amber-200" : "text-stone-800 dark:text-stone-100"}>{si.value}</span>
                </span>
              ))}
            </div>
          )}
          {footnote && (
            <p className={
              "text-xs font-semibold mt-2 inline-flex items-center gap-1.5 " +
              (footnoteTone === "danger"
                ? "text-red-650 dark:text-red-400"
                : footnoteTone === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : footnoteTone === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : footnoteTone === "info"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-stone-500 dark:text-stone-400")
            }>
              <span className={"h-1.5 w-1.5 rounded-full " + (
                footnoteTone === "danger" ? "bg-red-500" :
                  footnoteTone === "warning" ? "bg-amber-500" :
                    footnoteTone === "success" ? "bg-emerald-500" :
                      footnoteTone === "info" ? "bg-blue-500" : "bg-stone-400"
              )} />
              {footnote}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Live status banner
// ---------------------------------------------------------------------------
const LivePortStatus = memo(function LivePortStatus({ now, stats, loading }) {
  const timeStr = useMemo(
    () => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now),
    [now],
  );
  const dateStr = useMemo(
    () => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now),
    [now],
  );
  const chip = (Icon, label, value, tone) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
      <Icon className={`h-3 w-3 ${tone}`} />
      <span className="text-stone-400">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{loading ? "…" : value}</span>
    </span>
  );
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black text-white ring-1 ring-white/5 shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_56px_-20px_rgba(15,23,42,0.40)]">
      <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full text-amber-400/15">
        <path fill="currentColor" d="M0,64 C240,128 480,0 720,32 C960,64 1200,128 1440,64 L1440,120 L0,120 Z" />
        <path fill="currentColor" opacity="0.5" d="M0,80 C240,40 480,120 720,80 C960,40 1200,96 1440,72 L1440,120 L0,120 Z" />
      </svg>
      <div className="relative px-4 py-3 md:px-5 md:py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40 shrink-0">
            <Radar className="h-4 w-4 text-emerald-400" />
            <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/50 animate-ping" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Live Account Overview</span>
            </div>
            <p className="text-xs text-stone-300 truncate">
              <span className="font-semibold text-white">Chennai Port</span>
              <span className="text-stone-500"> • Harbour Entry Permits</span>
            </p>
          </div>
        </div>
        <span className="hidden md:inline-block h-6 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {chip(CheckCircle, "Active", stats.activePasses, "text-emerald-300")}
          {chip(Clock, "Pending", stats.pendingApprovals, "text-amber-300")}
          {chip(Truck, "Vehicles", stats.vehicleCount, "text-orange-300")}
          {chip(Users, "Persons", stats.personnelCount + stats.driverCount, "text-fuchsia-300")}
          {chip(Timer, "Expiring", stats.expiringSoon, stats.expiringSoon > 0 ? "text-red-300" : "text-stone-400")}
        </div>
        <div className="ml-auto text-right leading-tight">
          <p className="font-mono text-base md:text-lg font-bold tabular-nums text-amber-200">{timeStr}</p>
          <p className="text-[10px] text-stone-400">{dateStr}</p>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Expiring Soon detail card
// ---------------------------------------------------------------------------
const ExpiringSoonCard = memo(function ExpiringSoonCard({ items, loading }) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? items : items.slice(0, 5);

  return (
    <Card className={cardShell + " !hover:translate-y-0 !hover:scale-100 !flex-col"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-400/15 text-red-600 dark:text-red-400">
              <Timer className="h-5 w-5" />
            </span>
            Expiring Soon
          </CardTitle>
          <Badge className="bg-red-100 dark:bg-red-400/15 text-red-600 dark:text-red-400 border-0 font-bold rounded-full">
            Within 7 days · {items.length}
          </Badge>
        </div>
        <CardDescription className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Passes/entities that will expire within the next 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-stone-100 dark:bg-white/5 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400">
            <CheckCircle className="h-9 w-9 mb-2 text-emerald-400 opacity-80" />
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All passes are safe!</p>
            <p className="text-xs mt-1">No passes expiring in the next 7 days</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayed.map((item, i) => {
                const days = daysUntil(item.dateTo);
                const urgency = days !== null && days <= 1 ? "red" : days !== null && days <= 3 ? "orange" : "amber";
                const urgencyClasses = {
                  red: { bg: "bg-red-50 dark:bg-red-400/10", ring: "ring-red-200/70 dark:ring-red-400/20", badge: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-300", icon: "text-red-500" },
                  orange: { bg: "bg-orange-50 dark:bg-orange-400/10", ring: "ring-orange-200/70 dark:ring-orange-400/20", badge: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300", icon: "text-orange-500" },
                  amber: { bg: "bg-amber-50/60 dark:bg-amber-400/5", ring: "ring-amber-200/60 dark:ring-amber-400/10", badge: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300", icon: "text-amber-500" },
                };
                const u = urgencyClasses[urgency];
                return (
                  <div key={item.id || i} className={`flex items-center gap-3 rounded-xl ${u.bg} ring-1 ${u.ring} px-3 py-2.5`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${item.type === "vehicle" ? "bg-amber-100 dark:bg-amber-400/15" : "bg-teal-100 dark:bg-teal-400/15"}`}>
                      {item.type === "vehicle"
                        ? <Truck className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        : <User className="h-4 w-4 text-teal-600 dark:text-teal-300" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                        {item.name || item.registrationNo || "—"}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                        {item.passNo || ""} · Expires {formatDate(item.dateTo)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${u.badge}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
            {items.length > 5 && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-400/10"
              >
                {expanded ? <><ChevronUp className="h-4 w-4" /> Show Less</> : <><ChevronDown className="h-4 w-4" /> Show {items.length - 5} More</>}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Entity breakdown card
// ---------------------------------------------------------------------------
const EntityBreakdownCard = memo(function EntityBreakdownCard({ stats, loading }) {
  const rows = [
    { key: "vehicleCount", label: "Vehicles", icon: Truck, color: "#f59e0b", tint: "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300" },
    { key: "personnelCount", label: "Personnel", icon: Users, color: "#14b8a6", tint: "bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300" },
    { key: "driverCount", label: "Drivers", icon: CreditCard, color: "#a855f7", tint: "bg-purple-100 dark:bg-purple-400/15 text-purple-700 dark:text-purple-300" },
  ];
  const total = stats.totalEntities || 0;

  return (
    <Card className={cardShell + " !flex-col"}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-amber-300">
              <Building2 className="h-5 w-5" />
            </span>
            Entity Breakdown
          </CardTitle>
          <Badge className="bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-0 font-bold rounded-full">
            {total} total
          </Badge>
        </div>
        <CardDescription className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Detailed count of all registered entity types
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-stone-100 dark:bg-white/5 animate-pulse" />)
        ) : (
          rows.map((r) => {
            const val = stats[r.key] || 0;
            const pct = total ? Math.round((val / total) * 100) : 0;
            return (
              <div key={r.key} className="flex items-center gap-3 rounded-2xl bg-stone-50 dark:bg-white/5 p-3.5">
                <div className={"flex h-11 w-11 items-center justify-center rounded-xl shrink-0 " + r.tint}>
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold text-stone-800 dark:text-stone-100">{r.label}</p>
                    <p className="text-sm font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
                      {val}
                      <span className="ml-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">{pct}%</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200/70 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});

// Quick insights cards are now rendered directly inside the main stat card grid

// ---------------------------------------------------------------------------
// Pass detail modal fields
// ---------------------------------------------------------------------------
const PassDetailModalDocs = ({ docs }) => {
  const available = docs.filter((d) => d.path);
  if (available.length === 0) return <p className="text-xs text-stone-400 italic">No documents uploaded</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((d) => (
        <a key={d.label} href={fileUrl(d.path)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/70 dark:ring-amber-400/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-400/20 transition-colors">
          <FileText className="h-3.5 w-3.5" />{d.label}<Eye className="h-3.5 w-3.5 opacity-70" />
        </a>
      ))}
    </div>
  );
};

// Tooltip for the application-trend chart
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const persons = payload.find((p) => p.dataKey === "persons")?.value ?? 0;
  const vehicles = payload.find((p) => p.dataKey === "vehicles")?.value ?? 0;
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-[#1f232d]/95 backdrop-blur-md ring-1 ring-stone-200 dark:ring-white/10 shadow-xl px-4 py-3 text-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
        {label}
      </p>
      <div className="flex items-center justify-between gap-6 mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
          <Users className="h-3.5 w-3.5 text-amber-500" /> Persons
        </span>
        <span className="font-extrabold tabular-nums text-amber-600 dark:text-amber-300">{persons}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
          <Truck className="h-3.5 w-3.5 text-teal-500" /> Vehicles
        </span>
        <span className="font-extrabold tabular-nums text-teal-600 dark:text-teal-300">{vehicles}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-stone-200/70 dark:border-white/10 flex items-center justify-between gap-6">
        <span className="text-stone-500 dark:text-stone-400">Total</span>
        <span className="font-extrabold tabular-nums text-stone-900 dark:text-stone-100">{persons + vehicles}</span>
      </div>
    </div>
  );
};

// Real application-trend chart (last 6 months of THIS company's submissions).
const ApplicationTrendChart = memo(function ApplicationTrendChart({ data }) {
  const totalPersons = data.reduce((s, d) => s + d.persons, 0);
  const totalVehicles = data.reduce((s, d) => s + d.vehicles, 0);
  const totalAll = totalPersons + totalVehicles;
  const peak = data.reduce(
    (acc, d) => (d.persons + d.vehicles > acc.total ? { month: d.month, total: d.persons + d.vehicles } : acc),
    { month: "—", total: 0 },
  );
  const last = data[data.length - 1] || { persons: 0, vehicles: 0 };
  const prev = data[data.length - 2] || { persons: 0, vehicles: 0 };
  const lastTotal = last.persons + last.vehicles;
  const prevTotal = prev.persons + prev.vehicles;
  const trendPct = prevTotal ? Math.round(((lastTotal - prevTotal) / prevTotal) * 100) : (lastTotal ? 100 : 0);
  const trendUp = trendPct >= 0;

  return (
    <Card className={cardShell}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                <Activity className="h-5 w-5" />
              </span>
              Application Trend
            </CardTitle>
            <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
              Persons vs vehicles you submitted (last 10 days)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${trendUp
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                }`}
            >
              {trendUp ? "↑" : "↓"} {Math.abs(trendPct)}% DoD
            </span>
            <Badge className="bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-0 font-semibold rounded-full">
              10 days
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-400/10 ring-1 ring-amber-200/60 dark:ring-amber-400/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              <Users className="h-3.5 w-3.5" /> Persons
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">{totalPersons}</p>
          </div>
          <div className="rounded-2xl bg-teal-50/70 dark:bg-teal-400/10 ring-1 ring-teal-200/60 dark:ring-teal-400/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">
              <Truck className="h-3.5 w-3.5" /> Vehicles
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">{totalVehicles}</p>
          </div>
          <div className="rounded-2xl bg-stone-100/70 dark:bg-white/5 ring-1 ring-stone-200/60 dark:ring-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Total entities</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">{totalAll}</p>
          </div>
          <div className="rounded-2xl bg-stone-100/70 dark:bg-white/5 ring-1 ring-stone-200/60 dark:ring-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Peak day</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
              {peak.month}
              <span className="ml-1 text-sm font-semibold text-stone-500 dark:text-stone-400">({peak.total})</span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="personsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7} />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vehiclesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.65} />
                <stop offset="60%" stopColor="#14b8a6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="personsStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <linearGradient id="vehiclesStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke="currentColor" className="text-stone-200 dark:text-white/10" vertical={false} />
            <XAxis dataKey="month" stroke="currentColor" className="text-stone-500 dark:text-stone-400" fontSize={12} tickLine={false} axisLine={false} dy={6} />
            <YAxis stroke="currentColor" className="text-stone-500 dark:text-stone-400" fontSize={12} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip cursor={{ stroke: "#f59e0b", strokeWidth: 1, strokeDasharray: "3 3" }} content={<TrendTooltip />} />
            <Area type="monotone" dataKey="persons" stroke="url(#personsStroke)" strokeWidth={3} fill="url(#personsGrad)" name="Persons" activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#f59e0b" }} />
            <Area type="monotone" dataKey="vehicles" stroke="url(#vehiclesStroke)" strokeWidth={3} fill="url(#vehiclesGrad)" name="Vehicles" activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#14b8a6" }} />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-200">
            <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" /> Persons
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-200">
            <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-teal-500 to-teal-600" /> Vehicles
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

const PassTypeChart = memo(function PassTypeChart({ passTypeData }) {
  const total = passTypeData?.reduce((s, d) => s + d.value, 0) || 0;
  const top = total
    ? passTypeData.reduce((a, b) => (a.value >= b.value ? a : b))
    : { name: "None", value: 0, color: "#cccccc" };
  const topPct = total ? Math.round((top.value / total) * 100) : 0;

  const [activeIndex, setActiveIndex] = useState(null);
  const activeSlice = activeIndex !== null && passTypeData ? passTypeData[activeIndex] : null;

  return (
    <Card className={cardShell}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300">
                <Container className="h-5 w-5" />
              </span>
              Pass Type Distribution
            </CardTitle>
            <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
              Breakdown of your entities by category
            </CardDescription>
          </div>
          <Badge className="bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 border-0 font-bold rounded-full">
            {total} total
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Container className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-semibold">No passes to chart yet</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    <linearGradient id="sliceVehicle" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="slicePersonnel" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                    <linearGradient id="sliceDriver" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#9333ea" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={passTypeData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={72}
                    outerRadius={104}
                    paddingAngle={4}
                    cornerRadius={10}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {passTypeData.map((entry, idx) => {
                      const grad =
                        entry.name === "Vehicle"
                          ? "url(#sliceVehicle)"
                          : entry.name === "Personnel"
                            ? "url(#slicePersonnel)"
                            : "url(#sliceDriver)";
                      return (
                        <Cell
                          key={entry.name}
                          fill={grad}
                          opacity={activeIndex === null || activeIndex === idx ? 1 : 0.45}
                          style={{ transition: "opacity 200ms ease" }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  {activeSlice ? activeSlice.name : "Top type"}
                </p>
                <p className="text-3xl md:text-4xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100 leading-none mt-1">
                  {activeSlice ? `${Math.round((activeSlice.value / total) * 100)}%` : `${topPct}%`}
                </p>
                <p
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: activeSlice ? activeSlice.color : top.color }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeSlice ? activeSlice.color : top.color }} />
                  {activeSlice ? `${activeSlice.value} passes` : top.name}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {passTypeData.map((item) => {
                const pct = total ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-stone-50 dark:bg-white/5 ring-1 ring-stone-200/70 dark:ring-white/10 px-3 py-2.5">
                    <span
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)` }}
                    >
                      {item.name === "Vehicle" ? (
                        <Truck className="h-4 w-4 text-white" strokeWidth={2.5} />
                      ) : item.name === "Driver" ? (
                        <CreditCard className="h-4 w-4 text-white" strokeWidth={2.5} />
                      ) : (
                        <Users className="h-4 w-4 text-white" strokeWidth={2.5} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-bold text-stone-800 dark:text-stone-100 truncate">{item.name}</p>
                        <p className="text-sm font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
                          {item.value}
                          <span className="ml-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">{pct}%</span>
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200/70 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

// Real status overview (replaces the mock "Live Gate Activity" feed).
const StatusOverview = memo(function StatusOverview({ statusCounts, loading }) {
  const rows = [
    { key: "approved", label: "Approved", icon: CheckCircle, color: "#10b981", tint: "bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300" },
    { key: "pending", label: "Pending Review", icon: Clock, color: "#f59e0b", tint: "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300" },
    { key: "reverted", label: "Reverted", icon: RefreshCw, color: "#fb923c", tint: "bg-orange-100 dark:bg-orange-400/15 text-orange-700 dark:text-orange-300" },
    { key: "rejected", label: "Rejected", icon: XCircle, color: "#ef4444", tint: "bg-red-100 dark:bg-red-400/15 text-red-700 dark:text-red-300" },
  ];
  const total = rows.reduce((s, r) => s + (statusCounts[r.key] || 0), 0);

  return (
    <Card className={cardShell}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
            <Anchor className="h-5 w-5" />
          </span>
          Application Status Overview
        </CardTitle>
        <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
          Live breakdown of all your person &amp; vehicle entities ({total})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-2xl bg-stone-100 dark:bg-white/5 animate-pulse" />)
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
            <Anchor className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-semibold">No entities submitted yet</p>
          </div>
        ) : (
          rows.map((r) => {
            const val = statusCounts[r.key] || 0;
            const pct = total ? Math.round((val / total) * 100) : 0;
            return (
              <div key={r.key} className="flex items-center gap-3 rounded-2xl bg-stone-50 dark:bg-white/5 p-3.5">
                <div className={"flex h-11 w-11 items-center justify-center rounded-xl shrink-0 " + r.tint}>
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold text-stone-800 dark:text-stone-100">{r.label}</p>
                    <p className="text-sm font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
                      {val}
                      <span className="ml-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">{pct}%</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200/70 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Pass detail modal — full breakdown of one pass request (persons + vehicles)
// ---------------------------------------------------------------------------
const Field = ({ label, value, mono }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={"text-sm font-semibold text-stone-800 dark:text-stone-100 break-words " + (mono ? "font-mono" : "")}>
      {value === null || value === undefined || value === "" ? "—" : value}
    </p>
  </div>
);

const DocLinks = ({ docs }) => {
  const available = docs.filter((d) => d.path);
  if (available.length === 0) {
    return <p className="text-xs text-stone-400 italic">No documents uploaded</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((d) => (
        <a
          key={d.label}
          href={fileUrl(d.path)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/70 dark:ring-amber-400/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-400/20 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          {d.label}
          <Eye className="h-3.5 w-3.5 opacity-70" />
        </a>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [dateFilter, setDateFilter] = useState("today");

  const [profileData, setProfileData] = useState(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showBlacklistPopup, setShowBlacklistPopup] = useState(false);
  const [blacklistedVehicles, setBlacklistedVehicles] = useState([]);
  const [showVehicleWarningPopup, setShowVehicleWarningPopup] = useState(false);

  const [statsLoading, setStatsLoading] = useState(true);
  const [apiStats, setApiStats] = useState({
    activePasses: 0,
    pendingApprovals: 0,
    expiringSoon: 0,
    totalEntities: 0,
    vehicleCount: 0,
    personnelCount: 0,
    driverCount: 0,
    todayVehicles: 0,
    todayPersons: 0,
    todayPassRequests: 0,
  });
  const [statusCounts, setStatusCounts] = useState({ approved: 0, pending: 0, rejected: 0, reverted: 0 });
  const [allPasses, setAllPasses] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [hepTypes, setHepTypes] = useState({});
  const [selectedPass, setSelectedPass] = useState(null);
  const [passTypeData, setPassTypeData] = useState([
    { name: "Vehicle", value: 0, color: "#f59e0b" },
    { name: "Personnel", value: 0, color: "#14b8a6" },
    { name: "Driver", value: 0, color: "#a855f7" },
  ]);

  // ── Drag & Drop Ordering state for the stat cards ──────────────────────────
  const [cardOrder, setCardOrder] = useState([
    "todayVehicles",
    "todayPasses",
    "approvalRate",
    "pendingAge",
    "totalSubmitted",
    "activePasses",
    "pendingApprovals",
    "totalEntities"
  ]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Load layout order from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-card-order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          setCardOrder(parsed);
        }
      } catch (e) { }
    }
  }, []);

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newOrder = [...cardOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(idx, 0, draggedItem);
    setCardOrder(newOrder);
    localStorage.setItem("dashboard-card-order", JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const resetCardOrder = () => {
    const defaultOrder = [
      "todayVehicles",
      "todayPasses",
      "approvalRate",
      "pendingAge",
      "totalSubmitted",
      "activePasses",
      "pendingApprovals",
      "totalEntities"
    ];
    setCardOrder(defaultOrder);
    localStorage.removeItem("dashboard-card-order");
    toast.success("Card layout reset to default!");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    else router.push("/");
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch all dashboard data ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAllPasses = async (headers) => {
      const first = await axios.get(`${AGENT_API}/pass-request/my-pass-requests?page=1&limit=100`, { headers });
      if (!first.data?.success) return [];
      let all = first.data.data || [];
      const totalPages = first.data.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const reqs = [];
        for (let p = 2; p <= totalPages; p++) {
          reqs.push(axios.get(`${AGENT_API}/pass-request/my-pass-requests?page=${p}&limit=100`, { headers }));
        }
        const rest = await Promise.allSettled(reqs);
        rest.forEach((r) => { if (r.status === "fulfilled" && r.value.data?.success) all = all.concat(r.value.data.data || []); });
      }
      return all;
    };

    const fetchDashboardData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) { setStatsLoading(false); return; }
      const authHeaders = { Authorization: `Bearer ${token}` };

      try {
        const profileRes = await axios.get(`${AGENT_API}/agents/profile`, { headers: authHeaders });
        if (profileRes.data?.success) {
          const data = profileRes.data.data;
          setProfileData(data);
          if (data.isBlacklisted) { setIsBlacklisted(true); setBlacklistReason(data.blacklistReason || "Suspended due to port violations."); setShowBlacklistPopup(true); }
          if (data.blacklistedVehicles?.length > 0) { setBlacklistedVehicles(data.blacklistedVehicles); setShowVehicleWarningPopup(true); }
        }
      } catch (err) { console.warn("Profile fetch failed:", err?.message); }

      const hepMap = {};
      try {
        const hepRes = await axios.get(`${AGENT_API}/pass-request/get-hep-types`, { headers: authHeaders });
        (hepRes.data?.data || []).forEach((h) => { hepMap[h.id] = String(h.hepType || h.name || h.type || h.hep_type || "").toLowerCase(); });
      } catch { /* fallback */ }
      setHepTypes(hepMap);

      try {
        const passes = await fetchAllPasses(authHeaders);
        console.log("%c[Dashboard] Raw passes from API — full data", "color:#f59e0b;font-weight:bold;font-size:13px", passes);

        const nowTs = new Date();
        const in7 = new Date(nowTs.getTime() + 7 * 24 * 60 * 60 * 1000);

        let vehicleCount = 0, personnelCount = 0, driverCount = 0;
        let approved = 0, pending = 0, rejected = 0, reverted = 0, expiringSoon = 0;

        // Today start and end timestamps
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

        let todayVehicles = 0;
        let todayPersons = 0;
        let todayPassRequests = 0;

        // Daily buckets — last 10 days
        const dayKey = (d) => {
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yy}-${mm}-${dd}`;
        };
        const days = [];
        for (let i = 9; i >= 0; i--) {
          const d = new Date(nowTs);
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          days.push({
            key: dayKey(d),
            month: `${d.toLocaleString("en-IN", { month: "short" })} ${d.getDate()}`,
            persons: 0,
            vehicles: 0,
          });
        }
        const dayIdx = new Map(days.map((d, idx) => [d.key, idx]));

        const expItems = [];

        const tallyEntity = (status) => {
          const s = String(status || "").toLowerCase();
          if (s === "approved") approved++;
          else if (s === "rejected") rejected++;
          else if (s === "reverted") reverted++;
          else pending++;
        };

        passes.forEach((pr) => {
          const persons = Array.isArray(pr.persons) ? pr.persons : [];
          const vehicles = Array.isArray(pr.vehicles) ? pr.vehicles : [];
          vehicleCount += vehicles.length;

          // Check if request was created today
          const cd = new Date(pr.createdAt || pr.submittedAt);
          const isToday = !Number.isNaN(cd.getTime()) && cd >= startOfToday && cd <= endOfToday;

          if (isToday) {
            todayPassRequests++;
            todayVehicles += vehicles.length;
            todayPersons += persons.length;
          }

          persons.forEach((p) => {
            const isDriver = (hepMap[p.hepTypeId] || "").includes("driver");
            if (isDriver) driverCount++; else personnelCount++;
            tallyEntity(p.status);
            if (String(p.status || "").toLowerCase() === "approved" && p.dateTo) {
              const dt = new Date(p.dateTo);
              if (!Number.isNaN(dt.getTime()) && dt >= nowTs && dt <= in7) {
                expiringSoon++;
                expItems.push({ id: p.id, type: "person", name: p.name || "—", passNo: p.personPassNo, dateTo: p.dateTo, refNo: pr.referenceNo });
              }
            }
          });

          vehicles.forEach((v) => {
            tallyEntity(v.status);
            if (String(v.status || "").toLowerCase() === "approved" && v.dateTo) {
              const dt = new Date(v.dateTo);
              if (!Number.isNaN(dt.getTime()) && dt >= nowTs && dt <= in7) {
                expiringSoon++;
                expItems.push({ id: v.id, type: "vehicle", name: v.registrationNo || "—", passNo: v.vehiclePassNo, dateTo: v.dateTo, refNo: pr.referenceNo });
              }
            }
          });

          if (!Number.isNaN(cd.getTime())) {
            const idx = dayIdx.get(dayKey(cd));
            if (idx !== undefined) {
              days[idx].persons += persons.length;
              days[idx].vehicles += vehicles.length;
            }
          }
        });

        expItems.sort((a, b) => new Date(a.dateTo) - new Date(b.dateTo));

        const totalEntities = approved + pending + rejected + reverted;
        const computedStats = {
          activePasses: approved,
          pendingApprovals: pending,
          expiringSoon,
          totalEntities,
          vehicleCount,
          personnelCount,
          driverCount,
          todayVehicles,
          todayPersons,
          todayPassRequests,
        };
        console.log("%c[Dashboard] Computed apiStats", "color:#14b8a6;font-weight:bold", computedStats);
        console.log("%c[Dashboard] Status counts", "color:#a855f7;font-weight:bold", { approved, pending, rejected, reverted });
        setApiStats(computedStats);
        setStatusCounts({ approved, pending, rejected, reverted });
        setMonthlyData(days);
        setExpiringItems(expItems);
        setPassTypeData([
          { name: "Vehicle", value: vehicleCount, color: "#f59e0b" },
          { name: "Personnel", value: personnelCount, color: "#14b8a6" },
          { name: "Driver", value: driverCount, color: "#a855f7" },
        ]);
        setAllPasses(passes);
      } catch (err) { console.warn("Pass requests fetch failed:", err?.message); }

      try {
        const penaltyRes = await axios.get(`${ADMIN_API}/blacklist/my-blacklist?limit=100`, { headers: authHeaders });
        if (penaltyRes.data?.success) {
          const rows = penaltyRes.data.data || [];
          setPenalties(rows.filter((r) => r.has_penalty && String(r.penalty_status || "").toUpperCase() === "PENDING"));
        }
      } catch { /* skip */ }

      setStatsLoading(false);
    };

    fetchDashboardData();
  }, []);

  const filteredPasses = useMemo(() => filterPassesByDate(allPasses, dateFilter), [allPasses, dateFilter]);
  const recentFilteredPasses = useMemo(() => filteredPasses.slice(0, 10), [filteredPasses]);

  const filterCounts = useMemo(() => ({
    today: filterPassesByDate(allPasses, "today").length,
    week: filterPassesByDate(allPasses, "week").length,
    month: filterPassesByDate(allPasses, "month").length,
    all: allPasses.length,
  }), [allPasses]);

  const username = useMemo(() => profileData?.entityName || user?.username?.split("@")[0] || "Applicant", [user, profileData]);
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);

  const oldestPendingDays = useMemo(() => {
    if (apiStats.pendingApprovals === 0) {
      console.log("%c[Dashboard] oldestPendingDays → null (no pending approvals)", "color:#6b7280");
      return null;
    }
    let max = null;
    for (const pr of allPasses) {
      const entities = [...(pr.persons || []), ...(pr.vehicles || [])];
      for (const e of entities) {
        if (String(e.status || "").toLowerCase() === "pending" || !e.status) {
          const ts = new Date(pr.submittedAt || pr.createdAt || null).getTime();
          if (!ts || isNaN(ts)) continue;                  // skip if no valid date
          const days = Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
          if (max === null || days > max) max = days;
        }
      }
    }
    console.log("%c[Dashboard] oldestPendingDays", "color:#ef4444;font-weight:bold", max, "days | pendingApprovals:", apiStats.pendingApprovals);
    return max;
  }, [allPasses, apiStats.pendingApprovals]);

  // ── Age formatter: days → "Today" / "3 days" / "2 wks 1d" / "1 mo 15d" / "1 yr 2mo" ──
  const fmtAge = (days) => {
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    if (days < 7)  return `${days} days`;
    if (days < 30) {
      const wks = Math.floor(days / 7);
      const rem = days % 7;
      return rem === 0 ? `${wks} wk${wks > 1 ? "s" : ""}` : `${wks} wk${wks > 1 ? "s" : ""} ${rem}d`;
    }
    if (days < 365) {
      const mo = Math.floor(days / 30);
      const rem = days % 30;
      return rem === 0 ? `${mo} mo` : `${mo} mo ${rem}d`;
    }
    const yr = Math.floor(days / 365);
    const mo = Math.floor((days % 365) / 30);
    return mo === 0 ? `${yr} yr` : `${yr} yr ${mo}mo`;
  };

  // ── Render functions for Drag & Drop ──────────────────────────────────────
  const renderCard = (cardKey) => {
    switch (cardKey) {
      case "todayVehicles":
        return (
          <StatCard
            key="todayVehicles"
            icon={Truck}
            label="Today's Vehicles"
            value={statsLoading ? "—" : apiStats.todayVehicles}
            accent="primary"
            footnote="Vehicle passes applied today"
          />
        );
      case "todayPasses":
        return (
          <StatCard
            key="todayPasses"
            icon={FileText}
            label="Today's Total Passes"
            value={statsLoading ? "—" : apiStats.todayPassRequests}
            footnote={statsLoading ? "—" : `${apiStats.todayPersons} persons & ${apiStats.todayVehicles} vehicles`}
          />
        );
      case "approvalRate":
        const appRate = statsLoading ? 0 : (apiStats.totalEntities > 0 ? Math.round((apiStats.activePasses / apiStats.totalEntities) * 100) : 0);
        return (
          <StatCard
            key="approvalRate"
            icon={appRate >= 70 ? TrendingUp : TrendingDown}
            label="Approval Rate"
            value={statsLoading ? "—" : `${appRate}%`}
            accent={appRate >= 70 ? "success" : "warning"}
            footnote={statsLoading ? "—" : `${apiStats.activePasses} approved of ${apiStats.totalEntities}`}
            footnoteTone={appRate >= 70 ? "success" : "warning"}
          />
        );
      case "pendingAge": {
        const pendingAccent =
          oldestPendingDays === null ? "warning"
          : oldestPendingDays === 0  ? "success"
          : oldestPendingDays <= 14  ? "warning"
          : "danger";
        const pendingFootnote = statsLoading
          ? "—"
          : oldestPendingDays === null
            ? "No pending entities"
            : oldestPendingDays === 0
              ? "Submitted today"
              : `Awaiting review for ${fmtAge(oldestPendingDays)}`;
        return (
          <StatCard
            key="pendingAge"
            icon={Clock}
            label="Oldest Pending"
            value={statsLoading ? "—" : (oldestPendingDays !== null ? fmtAge(oldestPendingDays) : "N/A")}
            accent={pendingAccent}
            footnote={pendingFootnote}
            footnoteTone={pendingAccent}
          />
        );
      }

      case "totalSubmitted":
        return (
          <StatCard
            key="totalSubmitted"
            icon={BarChart3}
            label="Total Submitted"
            value={statsLoading ? "—" : allPasses.length}
            accent="info"
            footnote="All-time pass requests"
          />
        );
      case "activePasses":
        return (
          <StatCard
            key="activePasses"
            icon={CheckCircle}
            label="Active Passes"
            value={statsLoading ? "—" : apiStats.activePasses}
            badge={apiStats.totalEntities > 0 ? `${Math.round((apiStats.activePasses / apiStats.totalEntities) * 100)}%` : null}
            subItems={[
              { icon: Users, label: "Persons", value: apiStats.personnelCount },
              { icon: CreditCard, label: "Drivers", value: apiStats.driverCount },
              { icon: Truck, label: "Vehicles", value: apiStats.vehicleCount },
            ]}
          />
        );
      case "pendingApprovals":
        return (
          <StatCard
            key="pendingApprovals"
            icon={Clock}
            label="Pending Approvals"
            value={statsLoading ? "—" : apiStats.pendingApprovals}
            footnote={apiStats.pendingApprovals > 0
              ? (oldestPendingDays !== null ? `Oldest: ${fmtAge(oldestPendingDays)} ago` : "Awaiting review")
              : "All up to date"}
            footnoteTone={apiStats.pendingApprovals > 0 ? "warning" : undefined}
          />
        );

      case "totalEntities":
        return (
          <StatCard
            key="totalEntities"
            icon={Users}
            label="Total Entities"
            value={statsLoading ? "—" : apiStats.totalEntities}
            subItems={apiStats.totalEntities > 0 ? [
              { icon: Truck, label: "V", value: apiStats.vehicleCount },
              { icon: Users, label: "P", value: apiStats.personnelCount },
              { icon: CreditCard, label: "D", value: apiStats.driverCount },
            ] : undefined}
            footnote={`${statusCounts.approved} approved · ${statusCounts.pending} pending`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full font-sans">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-12 h-[420px] bg-gradient-to-b from-amber-200/40 via-amber-50/10 to-transparent dark:from-amber-400/[0.05] dark:via-transparent dark:to-transparent blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-orange-300/20 dark:bg-orange-500/[0.04] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-[30%] h-80 w-80 rounded-full bg-teal-300/20 dark:bg-teal-500/[0.04] blur-3xl" />

      <div className="relative space-y-6">

        {/* 1 ─ Live overview banner */}
        <LivePortStatus now={now} stats={apiStats} loading={statsLoading} />

        {/* 2 ─ Welcome row */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white dark:bg-white/5 px-4 py-1.5 rounded-full text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-400/20">
              <Ship className="h-4 w-4" />{greeting}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
              Welcome Company,{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-300 dark:to-orange-400">{username}</span>
            </h1>
            <p className="text-base md:text-lg text-stone-600 dark:text-stone-400 max-w-2xl">
              Here&rsquo;s your live port-pass overview &amp; compliance summary.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => isBlacklisted ? (setShowBlacklistPopup(true), toast.error("Blocked: Your company is blacklisted.")) : router.push("/dashboard/pass_request")}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl h-11 px-6 font-bold shadow-lg shadow-orange-500/30"
            >
              <Plus className="mr-2 h-4 w-4" />Apply New Pass
            </Button>
          </div>
        </div>

        {/* 💡 Drag Instruction & Reset row */}
        <div className="flex items-center justify-between gap-3 text-xs bg-amber-500/5 rounded-2xl px-4 py-2 border border-amber-500/10">
          <p className="text-stone-600 dark:text-amber-400/80 font-medium flex items-center gap-1.5">
            <Zap className="h-4 w-4 animate-bounce text-amber-500" />
            Drag and drop card handles (grip icon) to arrange stats. Persistence saved!
          </p>
          <button
            onClick={resetCardOrder}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 transition-colors shrink-0"
            title="Reset layout to default"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Order
          </button>
        </div>

        {/* 4 ─ Stat cards (5 Columns on large monitors, 3 on standard, 2 on tablet, 1 on mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
          {cardOrder.map((cardKey, index) => {
            const isDragged = draggedIndex === index;
            const isOver = dragOverIndex === index;
            return (
              <div
                key={cardKey}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={
                  "transition-all duration-200 " +
                  (isDragged ? "opacity-35 scale-95" : "") +
                  (isOver ? " border-2 border-dashed border-amber-500 rounded-3xl p-1 bg-amber-500/5 shadow-inner scale-[1.02]" : "")
                }
              >
                {renderCard(cardKey)}
              </div>
            );
          })}
        </div>

        {/* 5 ─ Compliance alerts */}
        {(isBlacklisted || penalties.length > 0) && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {isBlacklisted && (
              <Card className={cardShellAlertRed + " lg:col-span-2"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
                      <Ban className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg md:text-xl text-red-700 dark:text-red-300 font-bold truncate">Account Blacklisted</CardTitle>
                        <Badge className="bg-red-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0 rounded-full">RESTRICTED</Badge>
                      </div>
                      <CardDescription className="text-red-600/80 dark:text-red-300/80 text-sm font-medium">Security violation detected</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl ring-1 ring-red-200/60 dark:ring-red-500/20">
                    <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed line-clamp-2">{blacklistReason || "Suspended due to port violations."}</p>
                  </div>
                  <div className="flex items-center justify-end text-sm">
                    <Button size="sm" onClick={() => router.push("/dashboard/blacklist_penalties")} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold h-9 px-4">View &amp; Resolve</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {penalties.length > 0 && (
              <Card className={cardShellAlertAmber + " lg:col-span-2"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30 flex-shrink-0">
                      <ShieldAlert className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg md:text-xl text-amber-700 dark:text-amber-300 font-bold truncate">Pending Penalties</CardTitle>
                        <Badge className="bg-amber-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0 rounded-full">{penalties.length} VIOLATION{penalties.length !== 1 ? "S" : ""}</Badge>
                      </div>
                      <CardDescription className="text-amber-600/80 dark:text-amber-300/80 text-sm font-medium">Outstanding payments required</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-400/10 p-3 rounded-2xl ring-1 ring-amber-200/60 dark:ring-amber-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">Total Due:</span>
                      <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(penalties.reduce((sum, p) => sum + parseFloat(p.penalty_amount || 0), 0))}</span>
                    </div>
                    <p className="text-amber-600/80 dark:text-amber-300/80 text-sm line-clamp-1">{penalties[0]?.reason || penalties[0]?.reason_code || "Penalty violation"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => router.push("/dashboard/blacklist_penalties")} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold h-9 shadow-md shadow-amber-500/20">
                      <DollarSign className="mr-1 h-4 w-4" />Pay Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/blacklist_penalties")} className="flex-1 rounded-xl border border-amber-300 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-400/10 text-sm font-semibold h-9 bg-transparent">Details</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 6 ─ Expiring Soon detail + Entity Breakdown (side by side) */}
        {(expiringItems.length > 0 || !statsLoading) && (
          <div className="grid lg:grid-cols-2 gap-6">
            <ExpiringSoonCard items={expiringItems} loading={statsLoading} />
            <EntityBreakdownCard stats={apiStats} loading={statsLoading} />
          </div>
        )}

        {/* 7 ─ Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ApplicationTrendChart data={monthlyData} />
          <PassTypeChart passTypeData={passTypeData} />
        </div>

        {/* 8 ─ Status overview + Pass list */}
        <div className="grid lg:grid-cols-2 gap-6">
          <StatusOverview statusCounts={statusCounts} loading={statsLoading} />

          <Card className={cardShell + " !hover:translate-y-0 !hover:scale-100"}>
            <CardHeader className="pb-4">
              <div className="flex flex-row items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                      <Ship className="h-5 w-5" />
                    </span>
                    Pass Applications
                  </CardTitle>
                  <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
                    {filteredPasses.length} {dateFilter === "today" ? "today" : dateFilter === "week" ? "this week" : dateFilter === "month" ? "this month" : "total"} · click any to view details
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => router.push("/dashboard/pass_request")} className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-400/10 font-bold rounded-xl">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <DateFilterChips value={dateFilter} onChange={setDateFilter} counts={filterCounts} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-white/5 animate-pulse" />)}</div>
              ) : recentFilteredPasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                  <Ship className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-semibold">
                    {dateFilter === "today" ? "No passes applied today" : dateFilter === "week" ? "No passes this week" : "No pass applications yet"}
                  </p>
                  <p className="text-xs mt-1">
                    {dateFilter !== "all" ? <button onClick={() => setDateFilter("all")} className="text-amber-600 dark:text-amber-400 underline font-semibold">View all passes</button> : "Click \"Apply New Pass\" to get started"}
                  </p>
                </div>
              ) : (
                recentFilteredPasses.map((pass, idx) => {
                  const persons = Array.isArray(pass.persons) ? pass.persons : [];
                  const vehicles = Array.isArray(pass.vehicles) ? pass.vehicles : [];
                  const isVehicleHeavy = vehicles.length > persons.length;
                  const meta = getRequestStatusMeta(pass.status);
                  const allDates = [...persons, ...vehicles].map((e) => (e.dateTo ? new Date(e.dateTo).getTime() : NaN)).filter((t) => !Number.isNaN(t));
                  const latestTo = allDates.length ? new Date(Math.max(...allDates)) : null;
                  const daysLeft = latestTo ? daysUntil(latestTo.toISOString()) : null;
                  const hasExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                  return (
                    <div
                      key={pass.id || idx}
                      onClick={() => setSelectedPass(pass)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPass(pass); }}
                      className={"flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-400/10 hover:ring-1 hover:ring-amber-300/50 transition-all gap-3 cursor-pointer group " + (hasExpiring ? "bg-red-50/50 dark:bg-red-400/5 ring-1 ring-red-200/60 dark:ring-red-400/10" : "bg-stone-50 dark:bg-white/5")}
                    >
                      <div className="flex items-center gap-4">
                        <div className={"w-12 h-12 rounded-2xl flex items-center justify-center " + (isVehicleHeavy ? "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300" : "bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300")}>
                          {isVehicleHeavy ? <Truck className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 dark:text-stone-100">{pass.referenceNo || `PASS-${idx + 1}`}</p>
                          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                            {persons.length} person{persons.length !== 1 ? "s" : ""} &bull; {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 font-semibold">Submitted {formatDate(pass.createdAt || pass.submittedAt)}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <Badge className={`${meta.color} border text-xs font-bold px-3 py-1 rounded-full`}>
                          {meta.label.toUpperCase()}
                        </Badge>
                        {hasExpiring ? (
                          <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1.5 flex items-center gap-1 justify-end">
                            <Timer className="h-3 w-3 animate-pulse" />Expires in {daysLeft === 0 ? "today" : `${daysLeft}d`}
                          </p>
                        ) : latestTo ? (
                          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-1.5">Valid until {formatDate(latestTo)}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* 9 ─ Penalty breakdown */}
        {penalties.length > 0 && (
          <Card className={cardShell + " !hover:translate-y-0 !hover:scale-100"}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                Blacklist Penalty Details
              </CardTitle>
              <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">All outstanding penalties associated with your company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {penalties.map((pen, i) => (
                  <div key={pen.id || i} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-white/5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-400/15 text-red-700 dark:text-red-300">
                        <Ban className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">{pen.entity_type || "ENTITY"} — {pen.identifier || ""}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">{pen.reason || pen.reason_code || "Violation"} · {pen.penalty_status || "PENDING"}</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg tabular-nums text-red-600 dark:text-red-400">₹{parseFloat(pen.penalty_amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* PASS DETAIL MODAL */}
      {selectedPass && <PassDetailModal pass={selectedPass} hepTypes={hepTypes} onClose={() => setSelectedPass(null)} />}

      {/* COMPANY BLACKLIST POPUP */}
      {showBlacklistPopup && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl border border-red-500/30 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl" />
            <button onClick={() => setShowBlacklistPopup(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 ring-4 ring-red-50 dark:ring-red-500/5 mb-4 shrink-0 shadow-lg shadow-red-500/20">
              <Ban className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white leading-tight mb-2 tracking-tight">Company Access Blocked</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20 text-xs font-bold uppercase tracking-wider mb-4">
              <AlertCircle className="h-3.5 w-3.5" /> Suspended Status
            </div>
            <p className="text-sm md:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mb-6">
              Your company profile (<span className="font-bold text-stone-900 dark:text-white">{username}</span>) has been blacklisted from Chennai Port.
            </p>
            <div className="w-full bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200/60 dark:border-white/5 text-left mb-6">
              <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1.5">Official Reason</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 leading-relaxed">{blacklistReason || "Reason not specified. Please contact administration."}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={() => { setShowBlacklistPopup(false); router.push("/dashboard/blacklist_penalties"); }} className="flex-1 rounded-2xl h-12 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 text-white font-bold">View Penalties</Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-50 dark:hover:bg-white/5" onClick={() => window.open("mailto:support@chennaiport.gov.in")}>Contact Support</Button>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE BLACKLIST POPUP */}
      {showVehicleWarningPopup && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl border border-amber-500/30 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl" />
            <button onClick={() => setShowVehicleWarningPopup(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-500/5 mb-4 shrink-0 shadow-lg shadow-amber-500/20">
              <Truck className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white leading-tight mb-2 tracking-tight">Company Vehicle Blacklisted</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-4">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Vehicle Suspensions
            </div>
            <p className="text-sm md:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mb-6">
              The following vehicle(s) registered under your company have been blacklisted and will be excluded from new pass requests.
            </p>
            <div className="w-full max-h-48 overflow-y-auto space-y-3 mb-6 pr-1 [scrollbar-width:thin]">
              {blacklistedVehicles.map((veh, i) => (
                <div key={i} className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200/60 dark:border-white/5 text-left">
                  <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-2 mb-2">
                    <span className="text-sm font-extrabold text-stone-800 dark:text-stone-100 font-mono">{veh.identifier}</span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200/50 uppercase tracking-wide">{veh.status}</span>
                  </div>
                  <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Reason</p>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 leading-normal">{veh.reason || "Suspended due to traffic violation."}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={() => setShowVehicleWarningPopup(false)} className="flex-1 rounded-2xl h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold">Close Alert</Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-50 dark:hover:bg-white/5" onClick={() => router.push("/dashboard/blacklist_penalties")}>View Penalties</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure Sub-component helpers
// ---------------------------------------------------------------------------
const PassDetailModal = memo(function PassDetailModal({ pass, hepTypes, onClose }) {
  if (!pass) return null;
  const persons = Array.isArray(pass.persons) ? pass.persons : [];
  const vehicles = Array.isArray(pass.vehicles) ? pass.vehicles : [];
  const reqMeta = getRequestStatusMeta(pass.status);
  const dateRange = (from, to) => (!from && !to) ? "—" : `${formatDate(from)} → ${formatDate(to)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1f232d] w-full max-w-3xl rounded-3xl shadow-2xl ring-1 ring-stone-200/60 dark:ring-white/10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30 shrink-0"><Ship className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{pass.referenceNo || "Pass Request"}</h2>
              <p className="text-xs text-stone-400">{persons.length} person{persons.length !== 1 ? "s" : ""} • {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${reqMeta.color}`}>{reqMeta.label.toUpperCase()}</span>
            <button onClick={onClose} className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 [scrollbar-width:thin]">
          {/* Request summary */}
          <div className="rounded-2xl bg-stone-50 dark:bg-white/5 ring-1 ring-stone-200/70 dark:ring-white/10 p-4">
            <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4" /> Request Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Reference No" value={pass.referenceNo} mono />
              <Field label="Status" value={reqMeta.label} />
              <Field label="Payment Mode" value={pass.paymentMode} />
              <Field label="Submitted" value={formatDate(pass.submittedAt || pass.createdAt)} />
              <Field label="Gross Total" value={pass.grossTotal != null ? formatCurrency(parseFloat(pass.grossTotal)) : "—"} />
              <Field label="GST" value={pass.gstAmount != null ? formatCurrency(parseFloat(pass.gstAmount)) : "—"} />
              <Field label="Net Amount" value={pass.netAmount != null ? formatCurrency(parseFloat(pass.netAmount)) : "—"} />
            </div>
            {pass.requisitionLetterFilePath && (
              <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-white/10">
                <PassDetailModalDocs docs={[{ label: pass.requisitionLetterFileName || "Requisition Letter", path: pass.requisitionLetterFilePath }]} />
              </div>
            )}
          </div>

          {/* Persons */}
          {persons.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="h-4 w-4" /> Persons ({persons.length})
              </h3>
              {persons.map((p, i) => {
                const meta = getEntityStatusMeta(p.status);
                const hep = hepTypes[p.hepTypeId];
                const days = daysUntil(p.dateTo);
                return (
                  <div key={p.id || i} className="rounded-2xl bg-white dark:bg-white/[0.03] ring-1 ring-stone-200/70 dark:ring-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 shrink-0"><Users className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{p.name || "—"}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{p.personPassNo || "Pass no. pending"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color}`}>{meta.label.toUpperCase()}</span>
                        {days !== null && days >= 0 && days <= 7 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300">
                            <Timer className="h-3 w-3" />{days === 0 ? "Expires today" : `${days}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="HEP Type" value={hep ? hep.charAt(0).toUpperCase() + hep.slice(1) : (p.hepTypeId ?? "—")} />
                      <Field label="Aadhaar / ID" value={p.aadharNo} mono />
                      <Field label="Mobile" value={p.mobile} />
                      <Field label="Email" value={p.email} />
                      <Field label="Nationality" value={p.nationality} />
                      <Field label="Pass Type" value={p.passType} />
                      <Field label="Validity" value={dateRange(p.dateFrom, p.dateTo)} />
                      <Field label="Amount" value={p.amount != null ? formatCurrency(parseFloat(p.amount)) : "—"} />
                      <Field label="ID Proof" value={p.idProofType ? `${ID_PROOF_LABELS[p.idProofType] || p.idProofType}: ${p.idProofNumber || "—"}` : (p.idProofNumber || "—")} />
                      {p.visaNo ? <Field label="Visa No" value={p.visaNo} mono /> : null}
                      {p.cardNumber ? <Field label="RFID Card" value={p.cardNumber} mono /> : null}
                      {p.withTwoWheeler ? <Field label="Two-Wheeler" value={p.vehicleNo || "Yes"} mono /> : null}
                    </div>
                    {p.status === "reverted" && p.rejectedReason && (
                      <div className="mt-3 rounded-xl bg-orange-50 dark:bg-orange-400/10 ring-1 ring-orange-200/70 dark:ring-orange-400/20 p-2.5">
                        <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-wider mb-0.5">Revert / Reject Reason</p>
                        <p className="text-xs text-orange-700 dark:text-orange-200">{p.rejectedReason}</p>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-white/10">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Documents</p>
                      <PassDetailModalDocs docs={[
                        { label: "Photo", path: p.photoFilePath },
                        { label: "Aadhaar PDF", path: p.aadharPDFFilePATH },
                        { label: "ID Proof", path: p.idProofFilePath },
                        { label: "Driver Licence", path: p.driverLicensePath },
                        { label: "Police Verification", path: p.policeVerificationPath },
                        { label: "Employment Proof", path: p.employmentProofPath },
                        { label: "CHA Licence", path: p.chaLicensePath },
                        { label: "Passport", path: p.passportPath },
                        { label: "Visa", path: p.visaDocPath },
                        { label: "Immigration Clearance", path: p.immigrationDocPath },
                      ]} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vehicles */}
          {vehicles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <Truck className="h-4 w-4" /> Vehicles ({vehicles.length})
              </h3>
              {vehicles.map((v, i) => {
                const meta = getEntityStatusMeta(v.status);
                const days = daysUntil(v.dateTo);
                return (
                  <div key={v.id || i} className="rounded-2xl bg-white dark:bg-white/[0.03] ring-1 ring-stone-200/70 dark:ring-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 shrink-0"><Truck className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-stone-100 truncate font-mono">{v.registrationNo || "—"}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{v.vehiclePassNo || "Pass no. pending"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color}`}>{meta.label.toUpperCase()}</span>
                        {days !== null && days >= 0 && days <= 7 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300">
                            <Timer className="h-3 w-3" />{days === 0 ? "Expires today" : `${days}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Vehicle Type" value={v.vehicleTypeId} />
                      <Field label="RFID Card" value={v.rfidCardNumber} mono />
                      <Field label="Pass Type" value={v.passType} />
                      <Field label="Validity" value={dateRange(v.dateFrom, v.dateTo)} />
                      <Field label="Amount" value={v.amount != null ? formatCurrency(parseFloat(v.amount)) : "—"} />
                      <Field label="Insurance Expiry" value={formatDate(v.insuranceExpiry)} />
                      <Field label="RC Validity" value={formatDate(v.rcValidity)} />
                    </div>
                    {v.status === "reverted" && v.rejectedReason && (
                      <div className="mt-3 rounded-xl bg-orange-50 dark:bg-orange-400/10 ring-1 ring-orange-200/70 dark:ring-orange-400/20 p-2.5">
                        <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-wider mb-0.5">Revert / Reject Reason</p>
                        <p className="text-xs text-orange-700 dark:text-orange-200">{v.rejectedReason}</p>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-white/10">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Documents</p>
                      <PassDetailModalDocs docs={[
                        { label: "RC / Scanned Copy", path: v.scannedCopyFilePath },
                        { label: "Insurance", path: v.insuranceFilePath },
                        { label: "Permit", path: v.permitFilePath },
                        { label: "Fitness", path: v.fitnessFilePath },
                        { label: "Request Letter", path: v.requestLetterPath },
                        { label: "Tax", path: v.taxDocPath },
                        { label: "Emission", path: v.emissionCertPath },
                      ]} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {persons.length === 0 && vehicles.length === 0 && (
            <div className="py-10 text-center text-stone-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No persons or vehicles on this request</p>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-stone-200/70 dark:border-white/10 bg-stone-50 dark:bg-white/[0.02] shrink-0 flex justify-end">
          <Button onClick={onClose} className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 text-white font-bold px-6">Close</Button>
        </div>
      </div>
    </div>
  );
});
