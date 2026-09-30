"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Ship,
  Scale,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Container,
  ArrowUpRight,
  Radio,
  FileText,
  Truck,
  Activity,
  ChevronDown,
} from "lucide-react";

/**
 * Format timestamp helper strictly in Indian Standard Time (IST - Asia/Kolkata)
 * Exactly mirrors formatIST from api_metrics_dashboard
 */
function formatIST(dateStr) {
  if (!dateStr) return { text: "No records yet", rel: "", raw: null };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { text: "—", rel: "", raw: null };

  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(date);
  const p = {};
  parts.forEach(({ type, value }) => {
    p[type] = value;
  });
  const istFormatted = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;

  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let rel = "";
  if (diffSecs < 45) rel = "Just now";
  else if (diffMins < 60) rel = `${diffMins}m ago`;
  else if (diffHours < 24) rel = `${diffHours}h ago`;
  else if (diffDays <= 7) rel = `${diffDays}d ago`;

  return { text: istFormatted, rel, raw: date };
}

/**
 * Helper formatting for weights (kg to tonnes)
 */
function formatWeight(kg) {
  if (!kg || isNaN(kg)) return "0 kg";
  const num = Number(kg);
  if (num >= 1000) {
    const tonnes = (num / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
    return `${tonnes} T`;
  }
  return `${Math.round(num).toLocaleString()} kg`;
}

const formatNumber = (num) => (num ? Number(num).toLocaleString() : "0");

const TIME_RANGES = [
  { value: "today", label: "Today" },
  { value: "15m", label: "Last 15 Minutes" },
  { value: "1h", label: "Last 1 Hour" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

export default function DataIngestionProvidersMatrix() {
  const [timeRange, setTimeRange] = useState("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    tos: { totalInRange: 0, totalAllTime: 0, terminals: [] },
    weighbridge: {
      totalInRangeRecords: 0,
      totalInRangeWeight: 0,
      totalAllTimeRecords: 0,
      operators: [],
    },
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchProviders = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await axios.get("/api/providers/summary", {
          params: { timeRange },
          validateStatus: (s) => s < 500,
        });

        if (res.data && res.data.success) {
          setData({
            tos: res.data.tos || { totalInRange: 0, totalAllTime: 0, terminals: [] },
            weighbridge: res.data.weighbridge || {
              totalInRangeRecords: 0,
              totalInRangeWeight: 0,
              totalAllTimeRecords: 0,
              operators: [],
            },
          });
          setLastUpdated(new Date());
        } else {
          setError(res.data?.error || "Failed to load providers summary");
        }
      } catch (err) {
        console.error("Data providers fetch error:", err);
        setError("Unable to reach providers telemetry service");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeRange]
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await axios.get("/api/providers/summary", {
          params: { timeRange },
          validateStatus: (s) => s < 500,
        });
        if (ignore) return;
        if (res.data && res.data.success) {
          setData({
            tos: res.data.tos || { totalInRange: 0, totalAllTime: 0, terminals: [] },
            weighbridge: res.data.weighbridge || {
              totalInRangeRecords: 0,
              totalInRangeWeight: 0,
              totalAllTimeRecords: 0,
              operators: [],
            },
          });
          setLastUpdated(new Date());
          setError(null);
        } else {
          setError(res.data?.error || "Failed to load providers summary");
        }
      } catch (err) {
        if (!ignore) {
          console.error("Data providers fetch error:", err);
          setError("Unable to reach providers telemetry service");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [timeRange]);

  const activeRangeLabel =
    TIME_RANGES.find((r) => r.value === timeRange)?.label || "Today";

  const renderStatusBadge = (status) => {
    const s = String(status || "UNKNOWN").toUpperCase();
    let badgeClass =
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    let dotClass = "bg-slate-400";

    if (s === "ACTIVE" || s === "ONLINE") {
      badgeClass =
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
      dotClass = "bg-emerald-500 animate-pulse";
    } else if (s === "READY") {
      badgeClass =
        "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
      dotClass = "bg-amber-500";
    } else if (s === "IDLE" || s === "STANDBY") {
      badgeClass =
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60";
      dotClass = "bg-slate-400";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {s}
      </span>
    );
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
                <Layers className="h-4 w-4" />
              </span>
              Data Ingestion Providers Matrix
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/50">
              <Radio className="h-3 w-3 animate-pulse text-cyan-500" />
              TOS Terminals & IPortman Weighbridges
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-stone-400 mt-1">
            Real-time status of entities transmitting data into APACS: TOS
            Terminals (CITPL, CCTPL) & IPortman Weighbridge Operators
          </p>
        </div>

        {/* Controls: Range selector + Refresh button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
            >
              {TIME_RANGES.map((r) => (
                <option
                  key={r.value}
                  value={r.value}
                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchProviders(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing || loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchProviders(true)}
            className="underline font-bold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Providers Grid (2 Cards) ── */}
      <div className="space-y-4">
        {/* ======================================================== */}
        {/* CARD 1: TOS Terminal Providers (CITPL & CCTPL)           */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:shadow-lg transition-all duration-200">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm shrink-0">
                <Ship className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-stone-100 tracking-tight leading-tight">
                  TOS Service — Terminal Data Senders
                </h3>
                <p className="text-xs text-slate-500 dark:text-stone-400 mt-0.5">
                  Pushing Form-13 & EIR Container Records (CITPL & CCTPL)
                </p>
              </div>
            </div>

            {/* Quick KPI stats pills */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-3 py-1 rounded-xl text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                  In Range:
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {formatNumber(data.tos.totalInRange)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-3 py-1 rounded-xl text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                  All-Time:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(data.tos.totalAllTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-800/70 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                  <th className="py-3 px-3.5 rounded-l-xl font-black text-slate-950 dark:text-white">Terminal</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Login ID</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Form-13 (Forms / Containers)</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">EIR Records</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">All-Time Total</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Last Transmission (IST)</th>
                  <th className="py-3 pr-3.5 pl-4 text-right rounded-r-xl font-black text-slate-950 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-cyan-500" />
                        <span>Loading TOS terminal providers...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.tos.terminals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-slate-400 italic"
                    >
                      No TOS terminal providers found.
                    </td>
                  </tr>
                ) : (
                  data.tos.terminals.map((term) => {
                    const isCitpl = term.terminal === "CITPL";
                    const ist = formatIST(term.lastTransmission);

                    return (
                      <tr
                        key={term.terminal}
                        className="hover:bg-slate-50/75 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Terminal Name Badge */}
                        <td className="py-3.5 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-tight border ${
                              isCitpl
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                            }`}
                          >
                            <Container className="h-3.5 w-3.5" />
                            {term.terminal}
                          </span>
                        </td>

                        {/* Login ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {term.loginId || "—"}
                        </td>

                        {/* Form-13 (Forms / Containers) */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-800 dark:text-stone-200">
                            {formatNumber(term.form13InRange)}{" "}
                            <span className="text-[10px] text-slate-400 font-medium">
                              forms
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold">
                            ({formatNumber(term.containersInRange)} containers)
                          </div>
                        </td>

                        {/* EIR Records */}
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                          {formatNumber(term.eirInRange)}
                        </td>

                        {/* All-Time Total */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          <div className="font-bold text-slate-800 dark:text-stone-200">
                            {formatNumber(term.allTimeTotal)}{" "}
                            <span className="text-[10px] text-slate-400 font-medium">
                              records
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({formatNumber(term.allTimeForm13)} forms /{" "}
                            {formatNumber(term.allTimeContainers)} cont.)
                          </div>
                        </td>

                        {/* Last Transmission (IST) */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-700 dark:text-stone-300">
                            {ist.text}{" "}
                            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                              IST
                            </span>
                          </div>
                          {ist.rel && (
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              ({ist.rel})
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 pr-3.5 pl-4 text-right">
                          {renderStatusBadge(term.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 2: IPortman Weighbridge Operators                   */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:shadow-lg transition-all duration-200">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm shrink-0">
                <Scale className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-stone-100 tracking-tight leading-tight">
                  IPortman Service — Weighbridge Operators
                </h3>
                <p className="text-xs text-slate-500 dark:text-stone-400 mt-0.5">
                  Vehicle Weighment Tickets (Gross, Tare, Net Weight & Cargo Records)
                </p>
              </div>
            </div>

            {/* Quick KPI stats pills */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-3 py-1 rounded-xl text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                  In Range:
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {formatNumber(data.weighbridge.totalInRangeRecords)}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-3 py-1 rounded-xl text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                  Weight (T):
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatWeight(data.weighbridge.totalInRangeWeight)}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-800/70 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                  <th className="py-3 px-3.5 rounded-l-xl font-black text-slate-950 dark:text-white">Weighbridge / Company Name</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Records Sent (Date Filter)</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Movement (Exp / Imp)</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Cargo Weight (Total / Avg)</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Total Records (All-Time)</th>
                  <th className="py-3 px-4 font-black text-slate-950 dark:text-white">Last Weighment (IST)</th>
                  <th className="py-3 pr-3.5 pl-4 text-right rounded-r-xl font-black text-slate-950 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span>Loading Weighbridge operators...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.weighbridge.operators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-slate-400 italic"
                    >
                      No Weighbridge operators found.
                    </td>
                  </tr>
                ) : (
                  data.weighbridge.operators.map((op) => {
                    const ist = formatIST(op.lastWeighment);

                    return (
                      <tr
                        key={op.id}
                        className="hover:bg-slate-50/75 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Operator / Weighbridge Name */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-extrabold text-slate-800 dark:text-stone-100">
                            {op.weighBridgeName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                            Operator ID: #{op.id} • {op.loginId}
                          </div>
                        </td>

                        {/* Records in range */}
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                          {formatNumber(op.recordsInRange)}
                        </td>

                        {/* Movement (Exp / Imp) */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Exp:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatNumber(op.exportCountInRange)}
                            </strong>{" "}
                            / Imp:{" "}
                            <strong className="text-cyan-600 dark:text-cyan-400">
                              {formatNumber(op.importCountInRange)}
                            </strong>
                          </span>
                        </td>

                        {/* Cargo Weight (Total / Avg) */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-amber-600 dark:text-amber-400">
                            {formatWeight(op.totalWeightInRange)}{" "}
                            <span className="text-[10px] text-slate-400 font-medium">
                              total
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            Avg:{" "}
                            <strong className="text-cyan-600 dark:text-cyan-400">
                              {formatWeight(op.avgWeightInRange)}
                            </strong>{" "}
                            <span className="text-slate-400 text-[10px]">
                              / veh
                            </span>
                          </div>
                        </td>

                        {/* Total records all time */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 font-semibold">
                          {formatNumber(op.allTimeRecords)}
                        </td>

                        {/* Last Weighment (IST) */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-700 dark:text-stone-300">
                            {ist.text}{" "}
                            {ist.raw && (
                              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                IST
                              </span>
                            )}
                          </div>
                          {ist.rel && (
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              ({ist.rel})
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 pr-3.5 pl-4 text-right">
                          {renderStatusBadge(op.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
