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
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// Origin of user_service (without /api) — used to build URLs for statically
// served uploaded documents/photos (served at /uploads by user_service, also
// proxied by next.config.mjs rewrites).
const FILE_BASE = AGENT_API.replace(/\/api\/?$/, "");
const fileUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${FILE_BASE}/${String(p).replace(/^\/+/, "")}`;
};

// ID-proof type code → label (matches the apply form's mapping)
const ID_PROOF_LABELS = { 1: "Driving Licence", 2: "PAN", 3: "Passport" };

// Per-entity status (lowercase) → label + badge colour
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
// Pure helpers (kept outside the component so they don't get recreated)
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

// Map a pass_request status (uppercase) to a label + badge colour.
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
  // SUBMITTED / UNDER_REVIEW / anything else → pending review
  return { label: s ? s.replace(/_/g, " ") : "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" };
};

// ---------------------------------------------------------------------------
// Shared "shady" card shells
// ---------------------------------------------------------------------------
const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "hover:-translate-y-1 hover:scale-[1.01] " +
  "hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_28px_56px_-20px_rgba(15,23,42,0.28)] " +
  "dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.65),0_36px_72px_-24px_rgba(0,0,0,0.85)] " +
  "transition-all duration-300 ease-in-out";

const cardShellPrimary =
  "rounded-3xl border-0 overflow-hidden relative text-white " +
  "bg-gradient-to-br from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] " +
  "ring-1 ring-amber-400/15 " +
  "shadow-[0_2px_6px_rgba(245,158,11,0.10),0_24px_56px_-20px_rgba(245,158,11,0.30)] " +
  "hover:-translate-y-1 hover:scale-[1.01] " +
  "hover:shadow-[0_4px_15px_rgba(245,158,11,0.16),0_36px_72px_-20px_rgba(245,158,11,0.42)] " +
  "transition-all duration-300 ease-in-out";

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
// Sub-components
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
}) {
  const isPrimary = accent === "primary";
  return (
    <Card className={isPrimary ? cardShellPrimary : cardShell}>
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
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <div
            className={
              "flex h-12 w-12 items-center justify-center rounded-2xl " +
              (isPrimary
                ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30"
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
      <CardContent className="relative">
        <p
          className={
            isPrimary
              ? "text-stone-300 text-sm md:text-base font-medium mb-1 uppercase tracking-wider"
              : "text-sm md:text-base text-stone-500 dark:text-stone-400 font-semibold mb-1 uppercase tracking-wider"
          }
        >
          {label}
        </p>
        <p
          className={
            "text-3xl md:text-4xl font-bold tabular-nums " +
            (isPrimary ? "text-white" : "text-stone-900 dark:text-stone-100")
          }
        >
          {value}
        </p>
        {typeof progress === "number" && (
          <Progress value={progress} className="mt-4 h-2.5" />
        )}
        {footnote && (
          <p
            className={
              "text-sm font-semibold mt-3 inline-flex items-center gap-1.5 " +
              (footnoteTone === "danger"
                ? "text-red-600 dark:text-red-400"
                : footnoteTone === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-stone-500 dark:text-stone-400")
            }
          >
            <span className={"h-1.5 w-1.5 rounded-full " + (footnoteTone === "danger" ? "bg-red-500" : footnoteTone === "warning" ? "bg-amber-500" : "bg-stone-400")} />
            {footnote}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

// Live status banner — clock is real-time; the chips now show the company's
// OWN real metrics (no mock port-ops / weather data).
const LivePortStatus = memo(function LivePortStatus({ now, stats, loading }) {
  const timeStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now),
    [now],
  );
  const dateStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now),
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
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-16 w-full text-amber-400/15"
      >
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
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                Live Account Overview
              </span>
            </div>
            <p className="text-xs text-stone-300 truncate">
              <span className="font-semibold text-white">Chennai Port</span>{" "}
              <span className="text-stone-500">• Harbour Entry Permits</span>
            </p>
          </div>
        </div>

        <span className="hidden md:inline-block h-6 w-px bg-white/10" />

        {/* Real company metrics */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {chip(CheckCircle, "Active", stats.activePasses, "text-emerald-300")}
          {chip(Clock, "Pending", stats.pendingApprovals, "text-amber-300")}
          {chip(Truck, "Vehicles", stats.vehicleCount, "text-orange-300")}
          {chip(Users, "Persons", stats.personnelCount + stats.driverCount, "text-fuchsia-300")}
        </div>

        <div className="ml-auto text-right leading-tight">
          <p className="font-mono text-base md:text-lg font-bold tabular-nums text-amber-200">
            {timeStr}
          </p>
          <p className="text-[10px] text-stone-400">{dateStr}</p>
        </div>
      </div>
    </div>
  );
});

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
              Persons vs vehicles you submitted (last 6 months)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                trendUp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              }`}
            >
              {trendUp ? "\u2191" : "\u2193"} {Math.abs(trendPct)}% MoM
            </span>
            <Badge className="bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-0 font-semibold rounded-full">
              6 months
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Peak month</p>
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

const PassDetailModal = memo(function PassDetailModal({ pass, hepTypes, onClose }) {
  if (!pass) return null;
  const persons = Array.isArray(pass.persons) ? pass.persons : [];
  const vehicles = Array.isArray(pass.vehicles) ? pass.vehicles : [];
  const reqMeta = getRequestStatusMeta(pass.status);

  const dateRange = (from, to) => {
    if (!from && !to) return "—";
    return `${formatDate(from)} → ${formatDate(to)}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1f232d] w-full max-w-3xl rounded-3xl shadow-2xl ring-1 ring-stone-200/60 dark:ring-white/10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 bg-gradient-to-r from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30 shrink-0">
              <Ship className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{pass.referenceNo || "Pass Request"}</h2>
              <p className="text-xs text-stone-400">
                {persons.length} person{persons.length !== 1 ? "s" : ""} • {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${reqMeta.color}`}>
              {reqMeta.label.toUpperCase()}
            </span>
            <button onClick={onClose} className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
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
                <DocLinks docs={[{ label: pass.requisitionLetterFileName || "Requisition Letter", path: pass.requisitionLetterFilePath }]} />
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
                return (
                  <div key={p.id || i} className="rounded-2xl bg-white dark:bg-white/[0.03] ring-1 ring-stone-200/70 dark:ring-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 shrink-0">
                          <Users className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{p.name || "—"}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{p.personPassNo || "Pass no. pending"}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color} shrink-0`}>
                        {meta.label.toUpperCase()}
                      </span>
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
                      <DocLinks
                        docs={[
                          { label: "Photo", path: p.photoFilePath },
                          { label: "Aadhaar PDF", path: p.aadharPDFFilePATH },
                          { label: "ID Proof", path: p.idProofFilePath },
                          { label: "Driver Licence", path: p.driverLicensePath },
                          { label: "Police Verification", path: p.policeVerificationPath },
                          { label: "Employment Proof", path: p.employmentProofPath },
                          { label: "CHA Licence", path: p.chaLicensePath },
                          { label: "Passport", path: p.passportPath },
                        ]}
                      />
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
                return (
                  <div key={v.id || i} className="rounded-2xl bg-white dark:bg-white/[0.03] ring-1 ring-stone-200/70 dark:ring-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 shrink-0">
                          <Truck className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-stone-100 truncate font-mono">{v.registrationNo || "—"}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{v.vehiclePassNo || "Pass no. pending"}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color} shrink-0`}>
                        {meta.label.toUpperCase()}
                      </span>
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
                      <DocLinks
                        docs={[
                          { label: "RC / Scanned Copy", path: v.scannedCopyFilePath },
                          { label: "Insurance", path: v.insuranceFilePath },
                          { label: "Permit", path: v.permitFilePath },
                          { label: "Fitness", path: v.fitnessFilePath },
                          { label: "Request Letter", path: v.requestLetterPath },
                          { label: "Tax", path: v.taxDocPath },
                          { label: "Emission", path: v.emissionCertPath },
                        ]}
                      />
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

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-stone-200/70 dark:border-white/10 bg-stone-50 dark:bg-white/[0.02] shrink-0 flex justify-end">
          <Button onClick={onClose} className="rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 text-white font-bold px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [now, setNow] = useState(() => new Date());

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
  });
  const [statusCounts, setStatusCounts] = useState({ approved: 0, pending: 0, rejected: 0, reverted: 0 });
  const [recentPasses, setRecentPasses] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [hepTypes, setHepTypes] = useState({});
  const [selectedPass, setSelectedPass] = useState(null);
  const [passTypeData, setPassTypeData] = useState([
    { name: "Vehicle", value: 0, color: "#f59e0b" },
    { name: "Personnel", value: 0, color: "#14b8a6" },
    { name: "Driver", value: 0, color: "#a855f7" },
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    else router.push("/");
  }, [router]);

  // Live clock — 1 Hz
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch ALL real dashboard data ──────────────────────────────────────
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
        rest.forEach((r) => {
          if (r.status === "fulfilled" && r.value.data?.success) all = all.concat(r.value.data.data || []);
        });
      }
      return all;
    };

    const fetchDashboardData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setStatsLoading(false);
        return;
      }
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Profile / blacklist (independent of passes)
      try {
        const profileRes = await axios.get(`${AGENT_API}/agents/profile`, { headers: authHeaders });
        if (profileRes.data?.success) {
          const data = profileRes.data.data;
          setProfileData(data);
          if (data.isBlacklisted) {
            setIsBlacklisted(true);
            setBlacklistReason(data.blacklistReason || "Suspended due to port violations.");
            setShowBlacklistPopup(true);
          }
          if (data.blacklistedVehicles?.length > 0) {
            setBlacklistedVehicles(data.blacklistedVehicles);
            setShowVehicleWarningPopup(true);
          }
        }
      } catch (err) {
        console.warn("Profile fetch failed:", err?.message);
      }

      // hep-type id → name map (to split Personnel vs Driver accurately)
      const hepMap = {};
      try {
        const hepRes = await axios.get(`${AGENT_API}/pass-request/get-hep-types`, { headers: authHeaders });
        (hepRes.data?.data || []).forEach((h) => {
          hepMap[h.id] = String(h.hepType || h.name || h.type || h.hep_type || "").toLowerCase();
        });
      } catch {
        /* fall back to treating all persons as personnel */
      }
      setHepTypes(hepMap);

      // All pass requests
      try {
        const passes = await fetchAllPasses(authHeaders);

        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        let vehicleCount = 0;
        let personnelCount = 0;
        let driverCount = 0;
        let approved = 0;
        let pending = 0;
        let rejected = 0;
        let reverted = 0;
        let expiringSoon = 0;

        // Build last-6-months buckets
        const base = new Date();
        base.setDate(1);
        const months = [];
        const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
        for (let i = 5; i >= 0; i--) {
          const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
          months.push({ key: monthKey(d), month: d.toLocaleString("en-IN", { month: "short" }), persons: 0, vehicles: 0 });
        }
        const monthIdx = new Map(months.map((m, idx) => [m.key, idx]));

        const tallyEntity = (status) => {
          const s = String(status || "").toLowerCase();
          if (s === "approved") approved++;
          else if (s === "rejected") rejected++;
          else if (s === "reverted") reverted++;
          else pending++; // pending / blank / under-review
        };

        passes.forEach((pr) => {
          const persons = Array.isArray(pr.persons) ? pr.persons : [];
          const vehicles = Array.isArray(pr.vehicles) ? pr.vehicles : [];

          personnelCount += 0; // computed per-person below
          vehicleCount += vehicles.length;

          persons.forEach((p) => {
            const isDriver = (hepMap[p.hepTypeId] || "").includes("driver");
            if (isDriver) driverCount++;
            else personnelCount++;
            tallyEntity(p.status);
            if (String(p.status || "").toLowerCase() === "approved" && p.dateTo) {
              const dt = new Date(p.dateTo);
              if (!Number.isNaN(dt.getTime()) && dt >= now && dt <= in7) expiringSoon++;
            }
          });

          vehicles.forEach((v) => {
            tallyEntity(v.status);
            if (String(v.status || "").toLowerCase() === "approved" && v.dateTo) {
              const dt = new Date(v.dateTo);
              if (!Number.isNaN(dt.getTime()) && dt >= now && dt <= in7) expiringSoon++;
            }
          });

          // Monthly trend by request creation date
          const cd = new Date(pr.createdAt || pr.submittedAt);
          if (!Number.isNaN(cd.getTime())) {
            const idx = monthIdx.get(monthKey(cd));
            if (idx !== undefined) {
              months[idx].persons += persons.length;
              months[idx].vehicles += vehicles.length;
            }
          }
        });

        const totalEntities = approved + pending + rejected + reverted;

        setApiStats({
          activePasses: approved,
          pendingApprovals: pending,
          expiringSoon,
          totalEntities,
          vehicleCount,
          personnelCount,
          driverCount,
        });
        setStatusCounts({ approved, pending, rejected, reverted });
        setMonthlyData(months);
        setPassTypeData([
          { name: "Vehicle", value: vehicleCount, color: "#f59e0b" },
          { name: "Personnel", value: personnelCount, color: "#14b8a6" },
          { name: "Driver", value: driverCount, color: "#a855f7" },
        ]);

        // Recent applications — backend already sorts by createdAt DESC
        setRecentPasses(passes.slice(0, 5));
      } catch (err) {
        console.warn("Pass requests fetch failed:", err?.message);
      }

      // Penalties — agent's own blacklist entries with a pending penalty
      try {
        const penaltyRes = await axios.get(`${ADMIN_API}/blacklist/my-blacklist?limit=100`, { headers: authHeaders });
        if (penaltyRes.data?.success) {
          const rows = penaltyRes.data.data || [];
          setPenalties(
            rows.filter((r) => r.has_penalty && String(r.penalty_status || "").toUpperCase() === "PENDING"),
          );
        }
      } catch {
        /* blacklist service may be unreachable — skip silently */
      }

      setStatsLoading(false);
    };

    fetchDashboardData();
  }, []);

  const username = useMemo(
    () => profileData?.entityName || user?.username?.split("@")[0] || "Applicant",
    [user, profileData],
  );
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);

  return (
    <div className="relative w-full font-sans">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-12 h-[420px] bg-gradient-to-b from-amber-200/40 via-amber-50/10 to-transparent dark:from-amber-400/[0.05] dark:via-transparent dark:to-transparent blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-orange-300/20 dark:bg-orange-500/[0.04] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-[30%] h-80 w-80 rounded-full bg-teal-300/20 dark:bg-teal-500/[0.04] blur-3xl" />

      <div className="relative space-y-6">
        {/* 1 ─ Live overview banner (real metrics + live clock) */}
        <LivePortStatus now={now} stats={apiStats} loading={statsLoading} />

        {/* 2 ─ Welcome row */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white dark:bg-white/5 px-4 py-1.5 rounded-full text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-400/20">
              <Ship className="h-4 w-4" />
              {greeting}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
              Welcome Company,{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-300 dark:to-orange-400">{username}</span>
            </h1>
            <p className="text-base md:text-lg text-stone-600 dark:text-stone-400 max-w-2xl">
              Here&rsquo;s your live port-pass overview.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl h-11 px-5 font-semibold bg-white dark:bg-white/5 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/10">
              <Calendar className="mr-2 h-4 w-4" />
              All Time
            </Button>
            <Button
              onClick={() => {
                if (isBlacklisted) {
                  setShowBlacklistPopup(true);
                  toast.error("Blocked: Your company is blacklisted and cannot apply for passes.");
                } else {
                  router.push("/dashboard/pass_request");
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl h-11 px-6 font-bold shadow-lg shadow-orange-500/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              Apply New Pass
            </Button>
          </div>
        </div>

        {/* 3 ─ Stat cards (real data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            icon={CheckCircle}
            label="Active Passes"
            value={statsLoading ? "—" : apiStats.activePasses}
            accent="primary"
            badge={apiStats.totalEntities > 0 ? `${Math.round((apiStats.activePasses / apiStats.totalEntities) * 100)}%` : null}
          />
          <StatCard
            icon={Clock}
            label="Pending Approvals"
            value={statsLoading ? "—" : apiStats.pendingApprovals}
            footnote={apiStats.pendingApprovals > 0 ? "Awaiting review" : "All up to date"}
            footnoteTone={apiStats.pendingApprovals > 0 ? "warning" : undefined}
          />
          <StatCard
            icon={XCircle}
            label="Expiring Soon"
            value={statsLoading ? "—" : apiStats.expiringSoon}
            footnote={apiStats.expiringSoon > 0 ? "Within 7 days" : "None expiring"}
            footnoteTone={apiStats.expiringSoon > 0 ? "danger" : undefined}
          />
          <StatCard
            icon={Users}
            label="Total Entities"
            value={statsLoading ? "—" : apiStats.totalEntities}
            badge={apiStats.totalEntities > 0 ? `${apiStats.vehicleCount}V · ${apiStats.personnelCount + apiStats.driverCount}P` : null}
          />
        </div>

        {/* 4 ─ Compliance alerts (real data) */}
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
                      <CardDescription className="text-red-600/80 dark:text-red-300/80 text-sm md:text-base font-medium">Security violation detected</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl ring-1 ring-red-200/60 dark:ring-red-500/20">
                    <p className="text-red-700 dark:text-red-300 text-sm md:text-base leading-relaxed line-clamp-2">
                      {blacklistReason || "Suspended due to port violations."}
                    </p>
                  </div>
                  <div className="flex items-center justify-end text-sm">
                    <Button
                      size="sm"
                      onClick={() => router.push("/dashboard/blacklist_penalties")}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold h-9 px-4"
                    >
                      View &amp; Resolve
                    </Button>
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
                        <Badge className="bg-amber-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0 rounded-full">
                          {penalties.length} VIOLATION{penalties.length !== 1 ? "S" : ""}
                        </Badge>
                      </div>
                      <CardDescription className="text-amber-600/80 dark:text-amber-300/80 text-sm md:text-base font-medium">Outstanding payments required</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-400/10 p-3 rounded-2xl ring-1 ring-amber-200/60 dark:ring-amber-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">Total Due:</span>
                      <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                        {formatCurrency(penalties.reduce((sum, p) => sum + parseFloat(p.penalty_amount || 0), 0))}
                      </span>
                    </div>
                    <p className="text-amber-600/80 dark:text-amber-300/80 text-sm line-clamp-1">
                      {penalties[0]?.reason || penalties[0]?.reason_code || "Penalty violation"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push("/dashboard/blacklist_penalties")}
                      className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold h-9 shadow-md shadow-amber-500/20"
                    >
                      <DollarSign className="mr-1 h-4 w-4" />
                      Pay Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/dashboard/blacklist_penalties")}
                      className="flex-1 rounded-xl border border-amber-300 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-400/10 text-sm font-semibold h-9 bg-transparent"
                    >
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 5 ─ Charts (real data) */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ApplicationTrendChart data={monthlyData} />
          <PassTypeChart passTypeData={passTypeData} />
        </div>

        {/* 6 ─ Status overview + Recent passes (real data) */}
        <div className="grid lg:grid-cols-2 gap-6">
          <StatusOverview statusCounts={statusCounts} loading={statsLoading} />

          <Card className={cardShell}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                    <Ship className="h-5 w-5" />
                  </span>
                  Recent Pass Applications
                </CardTitle>
                <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
                  Your latest pass requests and their status
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard/pass_request")}
                className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-400/10 font-bold rounded-xl"
              >
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : recentPasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                  <Ship className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-semibold">No pass applications yet</p>
                  <p className="text-xs mt-1">Click &quot;Apply New Pass&quot; to get started</p>
                </div>
              ) : (
                recentPasses.map((pass, idx) => {
                  const persons = Array.isArray(pass.persons) ? pass.persons : [];
                  const vehicles = Array.isArray(pass.vehicles) ? pass.vehicles : [];
                  const isVehicleHeavy = vehicles.length > persons.length;
                  const meta = getRequestStatusMeta(pass.status);
                  // Latest validity across entities (max dateTo)
                  const allDates = [...persons, ...vehicles]
                    .map((e) => (e.dateTo ? new Date(e.dateTo).getTime() : NaN))
                    .filter((t) => !Number.isNaN(t));
                  const latestTo = allDates.length ? new Date(Math.max(...allDates)) : null;
                  return (
                    <div
                      key={pass.id || idx}
                      onClick={() => setSelectedPass(pass)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPass(pass); }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-stone-50 dark:bg-white/5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-400/10 hover:ring-1 hover:ring-amber-300/50 transition-all gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={
                            "w-12 h-12 rounded-2xl flex items-center justify-center " +
                            (isVehicleHeavy
                              ? "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300"
                              : "bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300")
                          }
                        >
                          {isVehicleHeavy ? <Truck className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 dark:text-stone-100">{pass.referenceNo || `PASS-${idx + 1}`}</p>
                          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                            {persons.length} person{persons.length !== 1 ? "s" : ""} &bull; {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <Badge className={`${meta.color} border-0 text-xs font-bold px-3 py-1 rounded-full`}>
                          {meta.label.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-1.5">
                          {latestTo ? `Valid until ${formatDate(latestTo)}` : `Submitted ${formatDate(pass.submittedAt || pass.createdAt)}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* 7 ─ Penalty breakdown (real data) */}
        {penalties.length > 0 && (
          <Card className={cardShell}>
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
                        <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {pen.entity_type || "ENTITY"} — {pen.identifier || ""}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                          {pen.reason || pen.reason_code || "Violation"} · {pen.penalty_status || "PENDING"}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-lg tabular-nums text-red-600 dark:text-red-400">
                      ₹{parseFloat(pen.penalty_amount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PASS DETAIL MODAL */}
      {selectedPass && (
        <PassDetailModal pass={selectedPass} hepTypes={hepTypes} onClose={() => setSelectedPass(null)} />
      )}

      {/* COMPANY BLACKLIST POPUP OVERLAY */}
      {showBlacklistPopup && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl border border-red-500/30 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col items-center text-center">
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
              Your company profile (<span className="font-bold text-stone-900 dark:text-white">{username}</span>) has been blacklisted from Chennai Port. Pass requests and entries are currently restricted.
            </p>
            <div className="w-full bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200/60 dark:border-white/5 text-left mb-6">
              <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1.5">Official Reason</p>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 leading-relaxed">
                {blacklistReason || "Reason not specified. Please contact administration."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={() => { setShowBlacklistPopup(false); router.push("/dashboard/blacklist_penalties"); }} className="flex-1 rounded-2xl h-12 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 text-white font-bold transition-all shadow-lg">
                View Penalties
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-50 dark:hover:bg-white/5" onClick={() => window.open("mailto:support@chennaiport.gov.in")}>
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY VEHICLE BLACKLIST POPUP OVERLAY */}
      {showVehicleWarningPopup && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl border border-amber-500/30 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col items-center text-center">
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
              The following vehicle(s) registered under your company profile have been blacklisted and will be excluded from new pass requests. You can still apply for person-only passes.
            </p>
            <div className="w-full max-h-48 overflow-y-auto space-y-3 mb-6 pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]">
              {blacklistedVehicles.map((veh, i) => (
                <div key={i} className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-200/60 dark:border-white/5 text-left">
                  <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-2 mb-2">
                    <span className="text-sm font-extrabold text-stone-800 dark:text-stone-100 font-mono">{veh.identifier}</span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200/50 uppercase tracking-wide">{veh.status}</span>
                  </div>
                  <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Reason</p>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 leading-normal">
                    {veh.reason || "Suspended due to traffic violation."}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={() => setShowVehicleWarningPopup(false)} className="flex-1 rounded-2xl h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-lg">
                Close Alert
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-bold hover:bg-stone-50 dark:hover:bg-white/5" onClick={() => router.push("/dashboard/blacklist_penalties")}>
                View Penalties
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
