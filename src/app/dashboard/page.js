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

const ThroughputChart = memo(function ThroughputChart() {
  return (
    <Card className={cardShell}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
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
          <Badge className="bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-0 font-semibold rounded-full">6 months</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#14b8a6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={13} />
            <YAxis stroke="#64748b" fontSize={13} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Area type="monotone" dataKey="inbound"  stroke="#f59e0b" strokeWidth={3} fill="url(#inboundGrad)"  name="Inbound" />
            <Area type="monotone" dataKey="outbound" stroke="#14b8a6" strokeWidth={3} fill="url(#outboundGrad)" name="Outbound" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

const PassTypeChart = memo(function PassTypeChart() {
  return (
    <Card className={cardShell}>
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300">
            <Container className="h-5 w-5" />
          </span>
          Pass Type Distribution
        </CardTitle>
        <CardDescription className="text-base text-stone-500 dark:text-stone-400 mt-1">Breakdown by category</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={passTypeData}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={110}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
            >
              {passTypeData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-6 mt-4 w-full">
          {passTypeData.map((item) => (
            <div key={item.name} className="text-center">
              <div className="flex justify-center mb-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
              <p className="font-bold text-xl md:text-2xl text-stone-900 dark:text-stone-100">{item.value}</p>
              <p className="text-sm md:text-base text-stone-500 dark:text-stone-400 font-medium">{item.name}</p>
            </div>
          ))}
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
