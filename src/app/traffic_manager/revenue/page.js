"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Wallet, TrendingUp, CircleDollarSign, ShieldBan, AlertTriangle, CheckCircle2,
  Clock, Activity, CalendarDays, ArrowUpRight, BadgeDollarSign, ReceiptText,
  Users, Car, ChevronRight, RefreshCw, FileText, Ban, Timer, Building2,
  Download, ArrowLeft
} from "lucide-react";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const getAuthHeaders = () => {
  let t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (!t) return {};
  t = t.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${t}` };
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtNum = (v) => num(v).toLocaleString("en-IN");
const fmtMoney = (v) => "₹" + num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = () => new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TONE = {
  emerald: { border: "border-emerald-100", bg: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-600" },
  amber: { border: "border-amber-100", bg: "bg-amber-50", text: "text-amber-700", chip: "bg-amber-100 text-amber-600" },
  rose: { border: "border-rose-100", bg: "bg-rose-50", text: "text-rose-700", chip: "bg-rose-100 text-rose-600" },
  blue: { border: "border-blue-100", bg: "bg-blue-50", text: "text-blue-700", chip: "bg-blue-100 text-blue-600" },
  slate: { border: "border-slate-200", bg: "bg-slate-50", text: "text-slate-700", chip: "bg-slate-100 text-slate-600" },
  orange: { border: "border-orange-100", bg: "bg-orange-50", text: "text-orange-700", chip: "bg-orange-100 text-orange-600" },
  violet: { border: "border-violet-100", bg: "bg-violet-50", text: "text-violet-700", chip: "bg-violet-100 text-violet-600" },
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-gray-800">{d.name}</p>
      <p className="text-gray-600 tabular-nums">{fmtMoney(d.value)}</p>
      {d.payload?.pct && <p className="text-gray-400">({d.payload.pct}%)</p>}
    </div>
  );
};

const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs">
      <p className="font-bold text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color }} className="tabular-nums">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function TrafficRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const [revenueData, setRevenueData] = useState({
    total: 0,
    accountTotal: 0,
    ecashTotal: 0,
    todayTotal: 0,
    monthTotal: 0,
    overstayTotal: 0,
    topCompanies: [],
    allPasses: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const [passesRes, overstayRes] = await Promise.allSettled([
        axios.get(`${AGENT_API}/pass-request/get-agent-pass-requests`, {
          headers,
          params: { limit: 200, page: 1 },
          validateStatus: (s) => s < 500,
        }),
        axios.get(`${ADMIN_API}/overstay/charges`, {
          headers,
          params: { limit: 200, page: 1 },
          validateStatus: (s) => s < 500,
        }),
      ]);

      const passes = passesRes.status === "fulfilled" && passesRes.value?.data?.data ? passesRes.value.data.data : [];
      const charges = overstayRes.status === "fulfilled" && overstayRes.value?.data?.data ? overstayRes.value.data.data : [];

      let total = 0, accountTotal = 0, ecashTotal = 0, todayTotal = 0, monthTotal = 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const companyMap = {};

      const getPassAmt = (p) => {
        const direct = parseFloat(p.netAmount ?? p.net_amount ?? p.baseTotal ?? p.grossTotal ?? 0);
        if (Number.isFinite(direct) && direct > 0) return direct;
        let sum = 0;
        (p.persons || []).forEach((x) => { sum += parseFloat(x.amount || 0) || 0; });
        (p.vehicles || []).forEach((x) => { sum += parseFloat(x.amount || 0) || 0; });
        return sum;
      };

      passes.forEach((p) => {
        const amt = getPassAmt(p);
        total += amt;
        const mode = String(p.paymentMode || "").toUpperCase();
        if (mode.includes("ECASH") || mode.includes("E-CASH") || mode.includes("CASH")) {
          ecashTotal += amt;
        } else {
          accountTotal += amt;
        }

        const d = new Date(p.createdAt || p.submittedAt);
        if (!isNaN(d.getTime())) {
          if (d >= todayStart) todayTotal += amt;
          if (d >= monthStart) monthTotal += amt;
        }

        const co = (p.entityName || p.agentName || "Authorized Agent").trim();
        if (!companyMap[co]) {
          companyMap[co] = { name: co, total: 0, count: 0, mode: mode || "ACCOUNT" };
        }
        companyMap[co].total += amt;
        companyMap[co].count += 1;
      });

      const overstayPaid = charges
        .filter((c) => c.status === "PAID")
        .reduce((sum, c) => sum + num(c.total_amount ?? c.amount), 0);

      const topCo = Object.values(companyMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setRevenueData({
        total,
        accountTotal,
        ecashTotal,
        todayTotal,
        monthTotal,
        overstayTotal: overstayPaid,
        topCompanies: topCo,
        allPasses: passes,
      });
      setLastUpdated(fmtDateTime());
    } catch (err) {
      console.error("Revenue fetch error:", err);
      toast.error("Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pieChartData = useMemo(() => {
    const data = [
      { name: "HEP Account (Direct)", value: revenueData.accountTotal, color: "#0a1e4d" },
      { name: "E-Cash / Gateway", value: revenueData.ecashTotal, color: "#f97316" },
      { name: "Overstay Port Dues", value: revenueData.overstayTotal, color: "#10b981" },
    ].filter((d) => d.value > 0);
    const totalVal = data.reduce((s, d) => s + d.value, 0) || 1;
    return data.map((d) => ({
      ...d,
      pct: Math.round((d.value / totalVal) * 100),
    }));
  }, [revenueData]);

  const PERIOD_TABS = [
    { key: "all", label: "All Time", icon: "🌐" },
    { key: "today", label: "Today", icon: "⚡" },
    { key: "week", label: "Last 7 Days", icon: "📅" },
    { key: "month", label: "This Month", icon: "🗓" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-6 text-white shadow-[0_12px_32px_-10px_rgba(10,30,77,0.65)] ring-1 ring-inset ring-white/15">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/traffic_manager"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-200">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                Port Financial Operations
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">REVENUE &amp; ACCOUNTS COLLECTIONS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold ring-1 ring-inset ring-white/15 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sync Financials
            </button>
          </div>
        </div>
      </div>

      {/* ── PREMIUM KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">

        {/* Card 1: Total Collections */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#3730a3] to-[#4c1d95] p-6 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <CircleDollarSign className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
              <CircleDollarSign className="h-4 w-4 text-blue-200" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200/80 leading-tight">Total Collections</span>
          </div>
          <div className="relative mt-3">
            <p className="text-3xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-8 w-32 rounded-lg bg-white/20 animate-pulse" /> : fmtMoney(revenueData.total + revenueData.overstayTotal)}
            </p>
            <p className="text-[11px] font-semibold text-blue-200/70 mt-1.5 leading-snug">HEP Fees + Overstay</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 transition-all duration-700" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Card 2: Account Billing (HEP) */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#0284c7] p-6 text-white shadow-xl shadow-sky-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <BadgeDollarSign className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
              <BadgeDollarSign className="h-4 w-4 text-sky-200" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200/80 leading-tight">Account Billing</span>
          </div>
          <div className="relative mt-3">
            <p className="text-3xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-8 w-28 rounded-lg bg-white/20 animate-pulse" /> : fmtMoney(revenueData.accountTotal)}
            </p>
            <p className="text-[11px] font-semibold text-sky-200/70 mt-1.5 leading-snug">Credit Ledger Invoices</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300 transition-all duration-700"
                style={{ width: revenueData.total > 0 ? `${Math.round((revenueData.accountTotal / (revenueData.total + revenueData.overstayTotal)) * 100)}%` : "0%" }} />
            </div>
          </div>
        </div>

        {/* Card 3: E-Cash Collections */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c2d12] via-[#c2410c] to-[#ea580c] p-6 text-white shadow-xl shadow-orange-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-orange-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <Wallet className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
              <Wallet className="h-4 w-4 text-orange-200" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-orange-200/80 leading-tight">E-Cash Collections</span>
          </div>
          <div className="relative mt-3">
            <p className="text-3xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-8 w-28 rounded-lg bg-white/20 animate-pulse" /> : fmtMoney(revenueData.ecashTotal)}
            </p>
            <p className="text-[11px] font-semibold text-orange-200/70 mt-1.5 leading-snug">Direct Counter &amp; Online</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 transition-all duration-700"
                style={{ width: revenueData.total > 0 ? `${Math.round((revenueData.ecashTotal / (revenueData.total + revenueData.overstayTotal)) * 100)}%` : "0%" }} />
            </div>
          </div>
        </div>

        {/* Card 4: Overstay Dues */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#0f766e] to-[#0e7490] p-6 text-white shadow-xl shadow-emerald-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <ReceiptText className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
              <ReceiptText className="h-4 w-4 text-emerald-200" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80 leading-tight">Overstay Dues</span>
          </div>
          <div className="relative mt-3">
            <p className="text-3xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-8 w-24 rounded-lg bg-white/20 animate-pulse" /> : fmtMoney(revenueData.overstayTotal)}
            </p>
            <p className="text-[11px] font-semibold text-emerald-200/70 mt-1.5 leading-snug">Penalties Settled</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-all duration-700"
                style={{ width: revenueData.overstayTotal > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Companies Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-xl">
          <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wider mb-4">
            Top Paying Companies &amp; Agents
          </h3>
          {revenueData.topCompanies.length > 0 ? (() => {
            const BAR_COLORS = [
              "#6366f1", // indigo
              "#f97316", // orange
              "#10b981", // emerald
              "#3b82f6", // blue
              "#f43f5e", // rose
              "#a855f7", // purple
              "#eab308", // yellow
              "#14b8a6", // teal
            ];
            const chartData = revenueData.topCompanies.slice(0, 6);
            return (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<BarTip />} />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  {chartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} />
                      <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })() : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400 font-bold">
              No transaction data available
            </div>
          )}
        </div>

        {/* Payment Mode Donut Chart */}
        <div className="p-6 rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-xl flex flex-col justify-between">
          <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wider mb-2">
            Payment Mode Distribution
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-2">
            {pieChartData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {fmtMoney(d.value)} ({d.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Company Breakdown Table */}
      <div className="p-6 rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-xl">
        <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wider mb-4">
          Company Revenue Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Company / Agent</th>
                <th className="pb-3 px-3">Passes Count</th>
                <th className="pb-3 px-3">Payment Mode</th>
                <th className="pb-3 px-3 text-right">Total Contributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {revenueData.topCompanies.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-bold text-[#0a1e4d] flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500 shrink-0" />
                    {c.name}
                  </td>
                  <td className="py-3 px-3">{c.count} applications</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      {c.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-700 tabular-nums text-sm">
                    {fmtMoney(c.total)}
                  </td>
                </tr>
              ))}
              {revenueData.topCompanies.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                    No revenue records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
