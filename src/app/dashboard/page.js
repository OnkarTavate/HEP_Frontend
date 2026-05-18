"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
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
  Waves,
  Radar,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  Wind,
  Droplets,
} from "lucide-react";

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
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Mock data (frozen — these are pure constants, freezing avoids accidental
// mutation and signals to the reader they are not state).
// ---------------------------------------------------------------------------
const mockStats = Object.freeze({
  walletBalance: 45250,
  activePasses: 89,
  pendingApprovals: 23,
  expiringSoon: 12,
});

const mockUserStatus = Object.freeze({
  isBlacklisted: true,
  blacklistReason: "Multiple violations of port security protocols",
  blacklistDate: "2024-03-10",
  hasPenalties: true,
  totalPenalties: 3,
  totalPenaltyAmount: 15000,
  penalties: [
    { reason: "Unauthorized parking in restricted zone", amount: 5000, date: "2024-03-05" },
    { reason: "Late pass renewal", amount: 2000, date: "2024-02-28" },
    { reason: "Vehicle speed violation", amount: 8000, date: "2024-02-15" },
  ],
});

const recentPasses = [
  { id: "MH04AB1234", passId: "PASS-2024-001", type: "Vehicle",   name: "MH04AB1234", validUntil: "2024-04-15", status: "active"  },
  { id: "Raj Kumar",  passId: "PASS-2024-002", type: "Personnel", name: "Raj Kumar",  validUntil: "2024-03-20", status: "pending" },
  { id: "Amit Shah",  passId: "PASS-2024-003", type: "Personnel", name: "Amit Shah",  validUntil: "2024-05-01", status: "active"  },
];

const recentTransactions = [
  { type: "credit", amount: 10000, description: "Wallet Top-up",                  date: "2024-03-15" },
  { type: "debit",  amount: 1500,  description: "Vehicle Pass - MH04AB1234",      date: "2024-03-14" },
  { type: "debit",  amount: 750,   description: "Personnel Pass - Raj Kumar",     date: "2024-03-13" },
  { type: "debit",  amount: 2000,  description: "Monthly Pass Renewal",           date: "2024-03-12" },
];

// Inbound vs Outbound monthly throughput — more meaningful for a gate system
// than a single "passes" series.
const throughputData = [
  { month: "Jan", inbound: 28, outbound: 17 },
  { month: "Feb", inbound: 33, outbound: 19 },
  { month: "Mar", inbound: 30, outbound: 18 },
  { month: "Apr", inbound: 41, outbound: 20 },
  { month: "May", inbound: 35, outbound: 20 },
  { month: "Jun", inbound: 44, outbound: 23 },
];

const passTypeData = [
  { name: "Vehicle",   value: 45, color: "#f59e0b" }, // amber-500
  { name: "Personnel", value: 35, color: "#14b8a6" }, // teal-500
  { name: "Driver",    value: 20, color: "#a855f7" }, // purple-500
];

// Simulated live gate feed (the actual app would stream this over websocket)
const gateFeed = [
  { gate: "Gate 1", plate: "MH04AB1234", type: "Vehicle",   direction: "in",  time: "14:32" },
  { gate: "Gate 2", plate: "GJ05CD9082", type: "Container", direction: "out", time: "14:28" },
  { gate: "Gate 1", plate: "—",          type: "Personnel", direction: "in",  time: "14:24" },
  { gate: "Gate 3", plate: "MH12XY4455", type: "Vehicle",   direction: "out", time: "14:19" },
];

// ---------------------------------------------------------------------------
// Chennai Port live info — compact summary used by the LivePortStatus strip.
// In production these would come from VTS / IMD / port-operations APIs.
// ---------------------------------------------------------------------------
const chennaiPortInfo = Object.freeze({
  location: { name: "Chennai Port" },
  current: {
    temp: 32,
    condition: "Partly Cloudy",
    icon: "cloud-sun",
    humidity: 78,
    wind: { speed: 14, direction: "SSW" },
  },
  tides: {
    nextHigh: { time: "13:42", height: 1.2 },
  },
});

// ---------------------------------------------------------------------------
// Pure helpers (kept outside the component so they don't get recreated)
// ---------------------------------------------------------------------------
const getStatusColor = (status) => {
  if (status === "active")  return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "pending") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
};

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
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
};

const getGreeting = (hour) => {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Maps a weather-condition key from chennaiPortInfo to a Lucide icon component.
const weatherIconFor = (key) => {
  switch (key) {
    case "sun":          return Sun;
    case "cloud":        return Cloud;
    case "cloud-sun":    return CloudSun;
    case "cloud-rain":   return CloudRain;
    case "cloud-drizzle":return CloudDrizzle;
    default:             return Cloud;
  }
};

// ---------------------------------------------------------------------------
// Shared "shady" card shells — soft layered drop-shadows, refined ring,
// gives every panel a lifted, premium feel against the page halo.
// ---------------------------------------------------------------------------
const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "hover:shadow-[0_4px_10px_rgba(15,23,42,0.06),0_28px_56px_-20px_rgba(15,23,42,0.28)] " +
  "dark:hover:shadow-[0_4px_10px_rgba(0,0,0,0.65),0_36px_72px_-24px_rgba(0,0,0,0.85)] " +
  "transition-all duration-300";

const cardShellPrimary =
  "rounded-3xl border-0 overflow-hidden relative text-white " +
  "bg-gradient-to-br from-[#1f1f1f] via-[#2a2520] to-[#3a2f1f] " +
  "ring-1 ring-amber-400/15 " +
  "shadow-[0_2px_6px_rgba(245,158,11,0.10),0_24px_56px_-20px_rgba(245,158,11,0.30)] " +
  "hover:shadow-[0_4px_12px_rgba(245,158,11,0.16),0_36px_72px_-20px_rgba(245,158,11,0.42)] " +
  "transition-all duration-300";

const cardShellAlertRed =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] overflow-hidden " +
  "ring-1 ring-red-200 dark:ring-red-500/30 " +
  "shadow-[0_1px_3px_rgba(244,63,94,0.06),0_18px_40px_-20px_rgba(244,63,94,0.22)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_28px_60px_-24px_rgba(244,63,94,0.30)] " +
  "transition-all duration-300";

const cardShellAlertAmber =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] overflow-hidden " +
  "ring-1 ring-amber-200 dark:ring-amber-400/30 " +
  "shadow-[0_1px_3px_rgba(245,158,11,0.06),0_18px_40px_-20px_rgba(245,158,11,0.22)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_28px_60px_-24px_rgba(245,158,11,0.30)] " +
  "transition-all duration-300";

// ---------------------------------------------------------------------------
// Sub-components (memoised — they receive only primitives / stable refs,
// so they will not re-render when the parent's live clock ticks).
// ---------------------------------------------------------------------------

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  accent = "default", // "primary" | "default"
  badge,
  progress,
  footnote,
  footnoteTone,
}) {
  const isPrimary = accent === "primary";
  return (
    <Card className={isPrimary ? cardShellPrimary : cardShell}>
      {isPrimary && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl"
          />
          <Waves
            aria-hidden
            className="pointer-events-none absolute -bottom-3 -right-3 h-28 w-28 text-amber-300/20"
          />
        </>
      )}
      <CardHeader className="pb-3">
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
      <CardContent>
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

const LivePortStatus = memo(function LivePortStatus({ now }) {
  // `now` changes once a second from the parent; everything else here is
  // derived from it so the only DOM nodes that re-render are the clock spans.
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

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black text-white ring-1 ring-white/5 shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_56px_-20px_rgba(15,23,42,0.40)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.6),0_36px_72px_-20px_rgba(0,0,0,0.85)]">
      {/* Decorative wave SVG — pure CSS/SVG, no extra deps */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-16 w-full text-amber-400/15"
      >
        <path
          fill="currentColor"
          d="M0,64 C240,128 480,0 720,32 C960,64 1200,128 1440,64 L1440,120 L0,120 Z"
        />
        <path
          fill="currentColor"
          opacity="0.5"
          d="M0,80 C240,40 480,120 720,80 C960,40 1200,96 1440,72 L1440,120 L0,120 Z"
        />
      </svg>

      {(() => {
        const w = chennaiPortInfo.current;
        const CurrentIcon = weatherIconFor(w.icon);
        return (
          <div className="relative px-4 py-3 md:px-5 md:py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {/* Status pill + location */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40 shrink-0">
                <Radar className="h-4 w-4 text-emerald-400" />
                <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/50 animate-ping" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                    Port Operational
                  </span>
                </div>
                <p className="text-xs text-stone-300 truncate">
                  <span className="font-semibold text-white">
                    {chennaiPortInfo.location.name}
                  </span>{" "}
                  <span className="text-stone-500">• Bay of Bengal</span>
                </p>
              </div>
            </div>

            <span className="hidden md:inline-block h-6 w-px bg-white/10" />

            {/* Compact ops chips — only the 3 most-used */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
                <CheckCircle className="h-3 w-3 text-emerald-300" />
                <span className="text-stone-400">Gates</span>
                <span className="font-semibold text-emerald-300 tabular-nums">4/4</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
                <Anchor className="h-3 w-3 text-amber-300" />
                <span className="text-stone-400">Vessels</span>
                <span className="font-semibold text-amber-300 tabular-nums">7</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
                <Clock className="h-3 w-3 text-orange-300" />
                <span className="text-stone-400">Queue</span>
                <span className="font-semibold text-orange-300 tabular-nums">12</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
                <Container className="h-3 w-3 text-fuchsia-300" />
                <span className="text-stone-400">TEU</span>
                <span className="font-semibold text-fuchsia-300 tabular-nums">1,284</span>
              </span>
            </div>

            <span className="hidden md:inline-block h-6 w-px bg-white/10" />

            {/* Weather chip */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 ring-1 ring-sky-400/20 px-2.5 py-1 text-[11px]">
              <CurrentIcon className="h-4 w-4 text-amber-300" />
              <span className="font-bold text-white tabular-nums">{w.temp}°C</span>
              <span className="text-stone-300">{w.condition}</span>
              <span className="text-stone-500">·</span>
              <Wind className="h-3 w-3 text-sky-300" />
              <span className="text-stone-300 tabular-nums">
                {w.wind.speed} {w.wind.direction}
              </span>
              <span className="text-stone-500">·</span>
              <Droplets className="h-3 w-3 text-sky-300" />
              <span className="text-stone-300 tabular-nums">{w.humidity}%</span>
            </div>

            {/* Tide chip */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 ring-1 ring-cyan-400/20 px-2.5 py-1 text-[11px]">
              <ArrowUpCircle className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-stone-400">High</span>
              <span className="font-semibold text-cyan-300 tabular-nums">
                {chennaiPortInfo.tides.nextHigh.time}
              </span>
              <span className="text-stone-500 tabular-nums">
                {chennaiPortInfo.tides.nextHigh.height}m
              </span>
            </div>

            {/* Push clock to the right */}
            <div className="ml-auto text-right leading-tight">
              <p className="font-mono text-base md:text-lg font-bold tabular-nums text-amber-200">
                {timeStr}
              </p>
              <p className="text-[10px] text-stone-400">{dateStr}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

// Custom glassy tooltip used by the throughput chart
const ThroughputTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const inbound = payload.find((p) => p.dataKey === "inbound")?.value ?? 0;
  const outbound = payload.find((p) => p.dataKey === "outbound")?.value ?? 0;
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-[#1f232d]/95 backdrop-blur-md ring-1 ring-stone-200 dark:ring-white/10 shadow-xl px-4 py-3 text-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
        {label}
      </p>
      <div className="flex items-center justify-between gap-6 mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
          <ArrowDownCircle className="h-3.5 w-3.5 text-amber-500" /> Inbound
        </span>
        <span className="font-extrabold tabular-nums text-amber-600 dark:text-amber-300">
          {inbound}
        </span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
          <ArrowUpCircle className="h-3.5 w-3.5 text-teal-500" /> Outbound
        </span>
        <span className="font-extrabold tabular-nums text-teal-600 dark:text-teal-300">
          {outbound}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t border-stone-200/70 dark:border-white/10 flex items-center justify-between gap-6">
        <span className="text-stone-500 dark:text-stone-400">Total</span>
        <span className="font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
          {inbound + outbound}
        </span>
      </div>
    </div>
  );
};

const ThroughputChart = memo(function ThroughputChart() {
  // Derived KPIs — computed once at module-evaluation time of the component
  const totalInbound = throughputData.reduce((s, d) => s + d.inbound, 0);
  const totalOutbound = throughputData.reduce((s, d) => s + d.outbound, 0);
  const totalAll = totalInbound + totalOutbound;
  const peak = throughputData.reduce(
    (acc, d) => (d.inbound + d.outbound > acc.total ? { month: d.month, total: d.inbound + d.outbound } : acc),
    { month: "—", total: 0 },
  );
  const last = throughputData[throughputData.length - 1];
  const prev = throughputData[throughputData.length - 2];
  const lastTotal = last.inbound + last.outbound;
  const prevTotal = prev.inbound + prev.outbound;
  const trendPct = prevTotal
    ? Math.round(((lastTotal - prevTotal) / prevTotal) * 100)
    : 0;
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
              Gate Throughput
            </CardTitle>
            <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
              Monthly inbound vs outbound movements
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

        {/* KPI strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-400/10 ring-1 ring-amber-200/60 dark:ring-amber-400/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              <ArrowDownCircle className="h-3.5 w-3.5" /> Inbound
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
              {totalInbound}
            </p>
          </div>
          <div className="rounded-2xl bg-teal-50/70 dark:bg-teal-400/10 ring-1 ring-teal-200/60 dark:ring-teal-400/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">
              <ArrowUpCircle className="h-3.5 w-3.5" /> Outbound
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
              {totalOutbound}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100/70 dark:bg-white/5 ring-1 ring-stone-200/60 dark:ring-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Total moves
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
              {totalAll}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100/70 dark:bg-white/5 ring-1 ring-stone-200/60 dark:ring-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Peak month
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
              {peak.month}
              <span className="ml-1 text-sm font-semibold text-stone-500 dark:text-stone-400">
                ({peak.total})
              </span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={throughputData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7} />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.65} />
                <stop offset="60%" stopColor="#14b8a6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="inboundStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <linearGradient id="outboundStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 6"
              stroke="currentColor"
              className="text-stone-200 dark:text-white/10"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="currentColor"
              className="text-stone-500 dark:text-stone-400"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="currentColor"
              className="text-stone-500 dark:text-stone-400"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "#f59e0b", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={<ThroughputTooltip />}
            />
            <Area
              type="monotone"
              dataKey="inbound"
              stroke="url(#inboundStroke)"
              strokeWidth={3}
              fill="url(#inboundGrad)"
              name="Inbound"
              activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#f59e0b" }}
            />
            <Area
              type="monotone"
              dataKey="outbound"
              stroke="url(#outboundStroke)"
              strokeWidth={3}
              fill="url(#outboundGrad)"
              name="Outbound"
              activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: "#14b8a6" }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Custom legend */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-200">
            <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
            Inbound
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-200">
            <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-teal-500 to-teal-600" />
            Outbound
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

// Glassy tooltip for the donut chart
const PassTypeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-2xl bg-white/95 dark:bg-[#1f232d]/95 backdrop-blur-md ring-1 ring-stone-200 dark:ring-white/10 shadow-xl px-4 py-3 text-sm">
      <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        {item.payload.name}
      </div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
        {item.value}
        <span className="ml-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
          passes
        </span>
      </p>
    </div>
  );
};

const PassTypeChart = memo(function PassTypeChart() {
  const total = passTypeData.reduce((s, d) => s + d.value, 0);
  const top = passTypeData.reduce((a, b) => (a.value >= b.value ? a : b));
  const topPct = total ? Math.round((top.value / total) * 100) : 0;

  // Pre-compute the mid-angle of each slice so we can decide whether the
  // hover tooltip should anchor to the left or right of the donut.
  // Recharts pies start at 90° (12 o'clock) and sweep clockwise by default.
  const sliceSides = useMemo(() => {
    let cumulative = 0;
    return passTypeData.map((d) => {
      const startAngle = 90 - (cumulative / total) * 360;
      cumulative += d.value;
      const endAngle = 90 - (cumulative / total) * 360;
      const mid = (startAngle + endAngle) / 2;
      // cos(mid) > 0 ⇒ right half, ≤ 0 ⇒ left half
      const x = Math.cos((mid * Math.PI) / 180);
      return x >= 0 ? "right" : "left";
    });
  }, []);

  const [activeIndex, setActiveIndex] = useState(null);
  const activeSlice = activeIndex !== null ? passTypeData[activeIndex] : null;
  const activeSide = activeIndex !== null ? sliceSides[activeIndex] : null;

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
              Breakdown by category
            </CardDescription>
          </div>
          <Badge className="bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 border-0 font-bold rounded-full">
            {total} total
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
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
                <filter id="sliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Outer faint ring */}
              <Pie
                data={passTypeData}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={112}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {passTypeData.map((entry) => (
                  <Cell key={`ring-${entry.name}`} fill={entry.color} fillOpacity={0.15} />
                ))}
              </Pie>
              {/* Main donut */}
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
                filter="url(#sliceGlow)"
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
                      opacity={
                        activeIndex === null || activeIndex === idx ? 1 : 0.45
                      }
                      style={{ transition: "opacity 200ms ease, transform 200ms ease" }}
                    />
                  );
                })}
              </Pie>
              {/* Recharts default tooltip disabled — we render our own. */}
            </PieChart>
          </ResponsiveContainer>

          {/* Centre label overlay — shows hovered slice details, otherwise top type */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              {activeSlice ? activeSlice.name : "Top type"}
            </p>
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100 leading-none mt-1">
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
                style={{ backgroundColor: activeSlice ? activeSlice.color : top.color }}
              />
              {activeSlice ? `${activeSlice.value} passes` : top.name}
            </p>
          </div>

          {/* Side-anchored hover card — appears on the LEFT when hovering a
              left-half slice, on the RIGHT when hovering a right-half slice. */}
          {activeSlice && (
            <div
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 transition-all duration-200 ${
                activeSide === "left"
                  ? "left-2 sm:left-4"
                  : "right-2 sm:right-4"
              }`}
            >
              <div className="rounded-2xl bg-white/95 dark:bg-[#1f232d]/95 backdrop-blur-md ring-1 ring-stone-200 dark:ring-white/10 shadow-xl px-4 py-3 text-sm min-w-[140px]">
                <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: activeSlice.color }}
                  />
                  {activeSlice.name}
                </div>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-stone-100 leading-none">
                  {activeSlice.value}
                  <span className="ml-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                    passes
                  </span>
                </p>
                <p className="mt-1 text-xs font-bold tabular-nums text-stone-500 dark:text-stone-400">
                  {Math.round((activeSlice.value / total) * 100)}% of total
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend rows with progress bars */}
        <div className="mt-5 space-y-2.5">
          {passTypeData.map((item) => {
            const pct = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-2xl bg-stone-50 dark:bg-white/5 ring-1 ring-stone-200/70 dark:ring-white/10 px-3 py-2.5"
              >
                <span
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                  }}
                >
                  <Container className="h-4 w-4 text-white" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold text-stone-800 dark:text-stone-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-sm font-extrabold tabular-nums text-stone-900 dark:text-stone-100">
                      {item.value}
                      <span className="ml-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                        {pct}%
                      </span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200/70 dark:bg-white/10 overflow-hidden">
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
      </CardContent>
    </Card>
  );
});

const GateActivityFeed = memo(function GateActivityFeed() {
  return (
    <Card className={cardShell}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                <Anchor className="h-5 w-5" />
              </span>
              Live Gate Activity
            </CardTitle>
            <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">
              Real-time entries & exits across port gates
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1 ring-1 ring-emerald-200 dark:ring-emerald-400/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">LIVE</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gateFeed.map((row, i) => {
          const isIn = row.direction === "in";
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl bg-stone-50 dark:bg-white/5 p-4 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    "flex h-11 w-11 items-center justify-center rounded-xl " +
                    (isIn
                      ? "bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-orange-100 dark:bg-orange-400/15 text-orange-700 dark:text-orange-300")
                  }
                >
                  {isIn ? (
                    <ArrowDownCircle className="h-6 w-6" />
                  ) : (
                    <ArrowUpCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-stone-900 dark:text-stone-100">
                    {row.plate}{" "}
                    <span className="text-stone-400 dark:text-stone-500 text-sm font-normal">
                      • {row.type}
                    </span>
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                    {row.gate} • {isIn ? "Entry" : "Exit"}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                {row.time}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    else router.push("/");
  }, [router]);

  // Live clock — 1 Hz. Memoised children mean only the clock spans re-render.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const username = useMemo(
    () => user?.username?.split("@")[0] || "Applicant",
    [user],
  );
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);

  return (
    <div className="relative w-full font-sans">
      {/* Soft amber halo behind the page — gives every card a "lifted" feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-12 h-[420px] bg-gradient-to-b from-amber-200/40 via-amber-50/10 to-transparent dark:from-amber-400/[0.05] dark:via-transparent dark:to-transparent blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-orange-300/20 dark:bg-orange-500/[0.04] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-[30%] h-80 w-80 rounded-full bg-teal-300/20 dark:bg-teal-500/[0.04] blur-3xl"
      />

      <div className="relative space-y-6">
      {/* 1 ─ Live Port Status banner */}
      <LivePortStatus now={now} />

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
            Here&rsquo;s your port-pass overview and live gate activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-5 font-semibold bg-white dark:bg-white/5 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/10">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button
            onClick={() => router.push("/dashboard/pass_request")}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl h-11 px-6 font-bold shadow-lg shadow-orange-500/30"
          >
            <Plus className="mr-2 h-4 w-4" />
            Apply New Pass
          </Button>
        </div>
      </div>

      {/* 3 ─ Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={formatCurrency(mockStats.walletBalance)}
          accent="primary"
          badge="+12%"
        />
        <StatCard
          icon={CheckCircle}
          label="Active Passes"
          value={mockStats.activePasses}
          badge="57%"
          progress={57}
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={mockStats.pendingApprovals}
          footnote="Requires attention"
          footnoteTone="warning"
        />
        <StatCard
          icon={XCircle}
          label="Expiring Soon"
          value={mockStats.expiringSoon}
          footnote="Within 7 days"
          footnoteTone="danger"
        />
      </div>

      {/* 4 ─ Compliance alerts */}
      {(mockUserStatus.isBlacklisted || mockUserStatus.hasPenalties) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {mockUserStatus.isBlacklisted && (
            <Card className={cardShellAlertRed + " lg:col-span-2"}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
                    <Ban className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-red-700 dark:text-red-300 font-bold truncate">
                        Account Blacklisted
                      </CardTitle>
                      <Badge className="bg-red-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0 rounded-full">
                        RESTRICTED
                      </Badge>
                    </div>
                    <CardDescription className="text-red-600/80 dark:text-red-300/80 text-sm md:text-base font-medium">
                      Security violation detected
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl ring-1 ring-red-200/60 dark:ring-red-500/20">
                  <p className="text-red-700 dark:text-red-300 text-sm md:text-base leading-relaxed line-clamp-2">
                    {mockUserStatus.blacklistReason}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600/80 dark:text-red-300/80 font-medium">
                    Date: {formatDate(mockUserStatus.blacklistDate)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500 hover:text-white text-sm font-semibold h-9 px-4 bg-transparent"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {mockUserStatus.hasPenalties && (
            <Card className={cardShellAlertAmber + " lg:col-span-2"}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30 flex-shrink-0">
                    <ShieldAlert className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-amber-700 dark:text-amber-300 font-bold truncate">
                        Pending Penalties
                      </CardTitle>
                      <Badge className="bg-amber-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0 rounded-full">
                        {mockUserStatus.totalPenalties} VIOLATIONS
                      </Badge>
                    </div>
                    <CardDescription className="text-amber-600/80 dark:text-amber-300/80 text-sm md:text-base font-medium">
                      Outstanding payments required
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-400/10 p-3 rounded-2xl ring-1 ring-amber-200/60 dark:ring-amber-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">Total Due:</span>
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                      {formatCurrency(mockUserStatus.totalPenaltyAmount)}
                    </span>
                  </div>
                  <p className="text-amber-600/80 dark:text-amber-300/80 text-sm line-clamp-1">
                    {mockUserStatus.penalties[0].reason}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold h-9 shadow-md shadow-amber-500/20"
                  >
                    <DollarSign className="mr-1 h-4 w-4" />
                    Pay Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
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

      {/* 5 ─ Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ThroughputChart />
        <PassTypeChart />
      </div>

      {/* 6 ─ Live gate feed + Recent passes */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GateActivityFeed />

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
              className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-400/10 font-bold rounded-xl"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPasses.map((pass) => (
              <div
                key={pass.passId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-stone-50 dark:bg-white/5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors gap-3"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={
                      "w-12 h-12 rounded-2xl flex items-center justify-center " +
                      (pass.type === "Vehicle"
                        ? "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300"
                        : "bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300")
                    }
                  >
                    {pass.type === "Vehicle" ? (
                      <Truck className="h-6 w-6" />
                    ) : (
                      <Users className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{pass.name}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                      {pass.passId} • {pass.type} Pass
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <Badge className={`${getStatusColor(pass.status)} border-0 text-xs font-bold px-3 py-1 rounded-full`}>
                    {pass.status.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-1.5">
                    Valid until {formatDate(pass.validUntil)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 7 ─ Transactions */}
      <Card className={cardShell}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
              <Wallet className="h-5 w-5" />
            </span>
            Recent Transactions
          </CardTitle>
          <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">Your recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 bg-stone-50 dark:bg-white/5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-xl " +
                      (tx.type === "credit"
                        ? "bg-emerald-100 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100 dark:bg-red-400/15 text-red-700 dark:text-red-300")
                    }
                  >
                    {tx.type === "credit" ? (
                      <ArrowDownCircle className="h-5 w-5" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{tx.description}</p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <p
                  className={
                    "font-bold text-lg md:text-xl tabular-nums " +
                    (tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                  }
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
