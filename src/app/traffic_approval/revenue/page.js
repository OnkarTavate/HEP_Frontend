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
const fmtDateTime = () => new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-6 text-white shadow-xl">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/traffic_approval/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Port Financial Operations</p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Revenue &amp; Accounts Collections</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sync Financials
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Collections</p>
          <p className="text-2xl font-black text-[#0a1e4d] mt-1 tabular-nums">
            {loading ? "Syncing..." : fmtMoney(revenueData.total + revenueData.overstayTotal)}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
            HEP Fees + Overstay
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Billing (HEP)</p>
          <p className="text-2xl font-black text-blue-700 mt-1 tabular-nums">
            {loading ? "Syncing..." : fmtMoney(revenueData.accountTotal)}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-2">
            Credit Ledger Invoices
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-Cash Collections</p>
          <p className="text-2xl font-black text-orange-600 mt-1 tabular-nums">
            {loading ? "Syncing..." : fmtMoney(revenueData.ecashTotal)}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mt-2">
            Direct Counter &amp; Online
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overstay Dues Collected</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
            {loading ? "Syncing..." : fmtMoney(revenueData.overstayTotal)}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
            Penalties Settled
          </span>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Companies Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-[#0a1e4d] uppercase tracking-wider mb-4">
            Top Paying Companies &amp; Agents
          </h3>
          {revenueData.topCompanies.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.topCompanies.slice(0, 6)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="total" fill="#0a1e4d" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400 font-bold">
              No transaction data available
            </div>
          )}
        </div>

        {/* Payment Mode Donut Chart */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
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
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
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
