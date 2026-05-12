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
  MapPin,
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
  { name: "Vehicle",   value: 45, color: "#f97316" }, // orange-500
  { name: "Personnel", value: 35, color: "#0ea5e9" }, // sky-500
  { name: "Driver",    value: 20, color: "#14b8a6" }, // teal-500
];

// Simulated live gate feed (the actual app would stream this over websocket)
const gateFeed = [
  { gate: "Gate 1", plate: "MH04AB1234", type: "Vehicle",   direction: "in",  time: "14:32" },
  { gate: "Gate 2", plate: "GJ05CD9082", type: "Container", direction: "out", time: "14:28" },
  { gate: "Gate 1", plate: "—",          type: "Personnel", direction: "in",  time: "14:24" },
  { gate: "Gate 3", plate: "MH12XY4455", type: "Vehicle",   direction: "out", time: "14:19" },
];

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
    <Card
      className={
        isPrimary
          ? "border-0 shadow-lg shadow-orange-600/20 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white overflow-hidden relative"
          : "border-0 shadow-md hover:shadow-lg transition-shadow bg-white"
      }
    >
      {isPrimary && (
        <Waves
          aria-hidden
          className="pointer-events-none absolute -bottom-3 -right-3 h-28 w-28 text-white/15"
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Icon
            className={
              isPrimary
                ? "h-10 w-10 drop-shadow"
                : "h-10 w-10 text-slate-700"
            }
          />
          {badge && (
            <Badge
              className={
                isPrimary
                  ? "bg-white/20 text-white border-0 text-sm font-semibold px-3 py-1"
                  : "text-sm font-semibold px-3 py-1"
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
              ? "text-orange-50/90 text-base md:text-lg font-medium mb-1"
              : "text-base md:text-lg text-gray-600 font-medium mb-1"
          }
        >
          {label}
        </p>
        <p
          className={
            "text-3xl md:text-4xl font-bold " +
            (isPrimary ? "" : "text-gray-900")
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
              "text-sm md:text-base font-medium mt-2 " +
              (footnoteTone === "danger"
                ? "text-red-500"
                : footnoteTone === "warning"
                  ? "text-amber-600"
                  : "text-slate-500")
            }
          >
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
      {/* Decorative wave SVG — pure CSS/SVG, no extra deps */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-16 w-full text-cyan-500/20"
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

      <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40">
            <Radar className="h-6 w-6 text-emerald-400" />
            <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/60 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                Port Operational
              </span>
            </div>
            <p className="text-sm text-slate-300">
              <MapPin className="inline h-3.5 w-3.5 -mt-0.5 mr-1" />
              JNPT • Berths 1–14 active • Tide: High 13:42
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Gates</p>
            <p className="text-lg font-bold text-white">4 / 4</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">In Queue</p>
            <p className="text-lg font-bold text-amber-300">12</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Vessels</p>
            <p className="text-lg font-bold text-cyan-300">7</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-2xl font-bold tabular-nums">{timeStr}</p>
          <p className="text-xs text-slate-400">{dateStr}</p>
        </div>
      </div>
    </div>
  );
});

const ThroughputChart = memo(function ThroughputChart() {
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Gate Throughput
            </CardTitle>
            <CardDescription className="text-base">
              Monthly inbound vs outbound movements
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-semibold">6 months</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#f97316" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#0ea5e9" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
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
            <Area type="monotone" dataKey="inbound"  stroke="#f97316" strokeWidth={3} fill="url(#inboundGrad)"  name="Inbound" />
            <Area type="monotone" dataKey="outbound" stroke="#0ea5e9" strokeWidth={3} fill="url(#outboundGrad)" name="Outbound" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

const PassTypeChart = memo(function PassTypeChart() {
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Container className="h-5 w-5 text-sky-600" />
          Pass Type Distribution
        </CardTitle>
        <CardDescription className="text-base">Breakdown by category</CardDescription>
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
              <p className="font-bold text-xl md:text-2xl">{item.value}</p>
              <p className="text-sm md:text-base text-gray-600 font-medium">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const GateActivityFeed = memo(function GateActivityFeed() {
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Anchor className="h-5 w-5 text-orange-600" />
              Live Gate Activity
            </CardTitle>
            <CardDescription className="text-base">
              Real-time entries & exits across port gates
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700">LIVE</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gateFeed.map((row, i) => {
          const isIn = row.direction === "in";
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 hover:border-orange-200 hover:bg-orange-50/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    "flex h-11 w-11 items-center justify-center rounded-lg " +
                    (isIn ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")
                  }
                >
                  {isIn ? (
                    <ArrowDownCircle className="h-6 w-6" />
                  ) : (
                    <ArrowUpCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {row.plate}{" "}
                    <span className="text-slate-400 text-sm font-normal">
                      • {row.type}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {row.gate} • {isIn ? "Entry" : "Exit"}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm text-slate-500 tabular-nums">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 p-4 md:p-6 lg:p-8 font-sans">
      {/* 1 ─ Live Port Status banner */}
      <div className="mb-6">
        <LivePortStatus now={now} />
      </div>

      {/* 2 ─ Welcome row */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm font-medium text-orange-600 mb-3 shadow-sm border border-orange-100">
            <Ship className="h-4 w-4" />
            {greeting}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-2">
            Welcome aboard,{" "}
            <span className="text-orange-600">{username}</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl">
            Here&rsquo;s your port-pass overview and live gate activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-5 font-medium border-2">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button
            onClick={() => router.push("/dashboard/pass_request")}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-5 font-semibold shadow-lg shadow-orange-600/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Apply New Pass
          </Button>
        </div>
      </div>

      {/* 3 ─ Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {mockUserStatus.isBlacklisted && (
            <Card className="border-2 border-red-400 shadow-lg bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <Ban className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-red-900 font-bold truncate">
                        Account Blacklisted
                      </CardTitle>
                      <Badge className="bg-red-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0">
                        RESTRICTED
                      </Badge>
                    </div>
                    <CardDescription className="text-red-700 text-sm md:text-base font-medium">
                      Security violation detected
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm md:text-base leading-relaxed line-clamp-2">
                    {mockUserStatus.blacklistReason}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700 font-medium">
                    Date: {formatDate(mockUserStatus.blacklistDate)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-red-500 text-red-700 hover:bg-red-500 hover:text-white text-sm font-semibold h-9 px-4"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {mockUserStatus.hasPenalties && (
            <Card className="border-2 border-amber-400 shadow-lg bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <ShieldAlert className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg md:text-xl text-amber-900 font-bold truncate">
                        Pending Penalties
                      </CardTitle>
                      <Badge className="bg-amber-600 text-white border-0 text-xs font-bold px-2 py-0.5 flex-shrink-0">
                        {mockUserStatus.totalPenalties} VIOLATIONS
                      </Badge>
                    </div>
                    <CardDescription className="text-amber-700 text-sm md:text-base font-medium">
                      Outstanding payments required
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-900 font-bold text-sm">Total Due:</span>
                    <span className="text-2xl font-bold text-amber-600">
                      {formatCurrency(mockUserStatus.totalPenaltyAmount)}
                    </span>
                  </div>
                  <p className="text-amber-700 text-sm line-clamp-1">
                    {mockUserStatus.penalties[0].reason}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold h-9"
                  >
                    <DollarSign className="mr-1 h-4 w-4" />
                    Pay Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-2 border-amber-500 text-amber-700 hover:bg-amber-50 text-sm font-semibold h-9"
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
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ThroughputChart />
        <PassTypeChart />
      </div>

      {/* 6 ─ Live gate feed + Recent passes */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <GateActivityFeed />

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Ship className="h-5 w-5 text-orange-600" />
                Recent Pass Applications
              </CardTitle>
              <CardDescription className="text-base">
                Your latest pass requests and their status
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPasses.map((pass) => (
              <div
                key={pass.passId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/60 border border-slate-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                    {pass.type === "Vehicle" ? (
                      <Truck className="h-6 w-6 text-orange-600" />
                    ) : (
                      <Users className="h-6 w-6 text-sky-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{pass.name}</p>
                    <p className="text-sm text-slate-600 font-medium">
                      {pass.passId} • {pass.type} Pass
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <Badge className={`${getStatusColor(pass.status)} border text-xs font-bold px-3 py-1`}>
                    {pass.status.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-slate-600 font-medium mt-1.5">
                    Valid until {formatDate(pass.validUntil)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 7 ─ Transactions */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-600" />
            Recent Transactions
          </CardTitle>
          <CardDescription className="text-base">Your recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 bg-slate-50/60 border border-slate-100 rounded-xl hover:bg-slate-100/60 transition-colors"
              >
                <div>
                  <p className="font-semibold text-slate-900">{tx.description}</p>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {formatDate(tx.date)}
                  </p>
                </div>
                <p
                  className={
                    "font-bold text-lg md:text-xl tabular-nums " +
                    (tx.type === "credit" ? "text-emerald-600" : "text-red-600")
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
  );
}
