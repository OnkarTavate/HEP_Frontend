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
function formatToDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

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
  const istFormatted = `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;

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
  { value: "custom", label: "Custom Range" },
];

export default function DataIngestionProvidersMatrix() {
  const [appliedTimeRange, setAppliedTimeRange] = useState("today");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

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
    async (isManualRefresh = false, overrideParams = null) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const tr = overrideParams ? overrideParams.timeRange : appliedTimeRange;
        const sDate = overrideParams ? overrideParams.startDate : appliedStartDate;
        const eDate = overrideParams ? overrideParams.endDate : appliedEndDate;

        const params = { timeRange: tr };
        if (tr === "custom") {
          if (sDate) params.startDate = sDate;
          if (eDate) params.endDate = eDate;
        }

        const res = await axios.get("/api/providers/summary", {
          params,
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
    [appliedTimeRange, appliedStartDate, appliedEndDate]
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (appliedTimeRange === "custom" && !appliedStartDate && !appliedEndDate) {
        setLoading(false);
        return;
      }
      try {
        const params = { timeRange: appliedTimeRange };
        if (appliedTimeRange === "custom") {
          if (appliedStartDate) params.startDate = appliedStartDate;
          if (appliedEndDate) params.endDate = appliedEndDate;
        }
        const res = await axios.get("/api/providers/summary", {
          params,
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

    const interval = setInterval(() => {
      if (appliedTimeRange !== "custom") {
        fetchProviders(false);
      }
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [appliedTimeRange, appliedStartDate, appliedEndDate, fetchProviders]);

  const activeRangeLabel =
    TIME_RANGES.find((r) => r.value === appliedTimeRange)?.label || "Today";

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
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold tracking-wide uppercase border shadow-sm ${badgeClass}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
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

        {/* Controls: Preset selector + Custom Date Range Button + Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Quick preset dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
            <select
              value={appliedTimeRange === "custom" ? "custom" : appliedTimeRange}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setShowCustomPicker(true);
                } else {
                  setShowCustomPicker(false);
                  setDraftStartDate("");
                  setDraftEndDate("");
                  setAppliedStartDate("");
                  setAppliedEndDate("");
                  setAppliedTimeRange(val);
                }
              }}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
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

          {/* Dedicated Custom Date Range Button next to Refresh */}
          <button
            type="button"
            id="btn-custom-date-range"
            onClick={() => {
              setShowCustomPicker((prev) => !prev);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black border transition-all shadow-sm active:scale-95 ${appliedTimeRange === "custom" || showCustomPicker
              ? "bg-cyan-600 text-white border-cyan-700 ring-2 ring-cyan-500/30"
              : "bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/80 border-cyan-400 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200"
              }`}
            title="Pick Custom Date Range"
          >
            <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="tracking-wide">
              {appliedTimeRange === "custom" && appliedStartDate && appliedEndDate
                ? `${formatToDDMMYYYY(appliedStartDate)} → ${formatToDDMMYYYY(appliedEndDate)}`
                : "Custom Date Range"}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showCustomPicker ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* Refresh button */}
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

      {/* ── Custom Date Range Selection Bar (Toggled by Custom Date Range button) ── */}
      {showCustomPicker && (
        <div className="bg-slate-50 dark:bg-slate-800/90 border border-cyan-500/30 dark:border-cyan-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Filter By Date:
            </span>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase">From:</span>
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
            <span className="text-slate-400 font-bold text-xs">—</span>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase">To:</span>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => {
                if (!draftStartDate && !draftEndDate) return;
                setAppliedStartDate(draftStartDate);
                setAppliedEndDate(draftEndDate);
                setAppliedTimeRange("custom");
              }}
              disabled={loading || refreshing || (!draftStartDate && !draftEndDate)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              Apply Filter
            </button>
          </div>
          <button
            onClick={() => {
              setDraftStartDate("");
              setDraftEndDate("");
              setAppliedStartDate("");
              setAppliedEndDate("");
              setAppliedTimeRange("today");
              setShowCustomPicker(false);
            }}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline transition-colors"
          >
            Reset to Today
          </button>
        </div>
      )}

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
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-stone-100 tracking-tight leading-tight">
                  TOS Service — Terminal Data Senders
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-stone-400 mt-0.5">
                  Pushing Form-13 & EIR Container Records (CITPL & CCTPL)
                </p>
              </div>
            </div>

            {/* Quick KPI stats pills */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                  All-Time:
                </span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                  {formatNumber(data.tos.totalAllTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">
                  <th className="py-4 px-4 sm:px-5 rounded-l-xl font-black text-slate-950 dark:text-white">Terminal</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Form-13 (Forms / Containers)</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">EIR Records</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">All-Time Total</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Last Transmission (IST)</th>
                  <th className="py-4 pr-4 pl-4 sm:pr-5 sm:pl-5 text-right rounded-r-xl font-black text-slate-950 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-sm sm:text-base">
                      <div className="flex items-center justify-center gap-2.5">
                        <RefreshCw className="h-5 w-5 animate-spin text-cyan-500" />
                        <span className="font-medium">Loading TOS terminal providers...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.tos.terminals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-400 italic text-sm sm:text-base"
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
                        <td className="py-4 px-4 sm:px-5">
                          <span
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm sm:text-base font-mono font-black tracking-normal border shadow-sm ${isCitpl
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                              }`}
                          >
                            <Container className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                            {term.terminal}
                          </span>
                        </td>

                        {/* Form-13 (Forms / Containers) */}
                        <td className="py-4 px-4 sm:px-5 font-mono">
                          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-stone-100">
                            {formatNumber(term.form13InRange)}{" "}
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                              forms
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                            ({formatNumber(term.containersInRange)} containers)
                          </div>
                        </td>

                        {/* EIR Records */}
                        <td className="py-4 px-4 sm:px-5 font-mono font-black text-purple-600 dark:text-purple-400 text-base sm:text-lg">
                          {formatNumber(term.eirInRange)}
                        </td>

                        {/* All-Time Total */}
                        <td className="py-4 px-4 sm:px-5 font-mono">
                          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-stone-100">
                            {formatNumber(term.allTimeTotal)}{" "}
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                              records
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              {formatNumber(term.allTimeForm13)} Forms
                            </span>{" "}
                            ({formatNumber(term.allTimeContainers)} cont.) •{" "}
                            <span className="text-purple-600 dark:text-purple-400 font-bold">
                              {formatNumber(term.allTimeEir)} EIR
                            </span>
                          </div>
                        </td>

                        {/* Last Transmission (IST) */}
                        <td className="py-4 px-4 sm:px-5">
                          <div className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-stone-200 flex items-center flex-wrap gap-1.5">
                            <span>{ist.text}</span>
                            <span className="text-xs font-black text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
                              IST
                            </span>
                          </div>
                          {ist.rel && (
                            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              ({ist.rel})
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 pr-4 pl-4 sm:pr-5 sm:pl-5 text-right">
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
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-stone-100 tracking-tight leading-tight">
                  IPortman Service — Weighbridge Operators
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-stone-400 mt-0.5">
                  Vehicle Weighment Tickets (Gross, Tare, Net Weight & Cargo Records)
                </p>
              </div>
            </div>

            {/* Quick KPI stats pills */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                  All-Time:
                </span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                  {formatNumber(data.weighbridge.totalAllTimeRecords)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                  Weight (T):
                </span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-base">
                  {formatWeight(data.weighbridge.totalInRangeWeight)}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">
                  <th className="py-4 px-4 sm:px-5 rounded-l-xl font-black text-slate-950 dark:text-white">Weighbridge / Company Name</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Records Sent (Date Filter)</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Movement (Exp / Imp)</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Net Cargo Weight (Total / Avg)</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Total Records (All-Time)</th>
                  <th className="py-4 px-4 sm:px-5 font-black text-slate-950 dark:text-white">Last Weighment (IST)</th>
                  <th className="py-4 pr-4 pl-4 sm:pr-5 sm:pl-5 text-right rounded-r-xl font-black text-slate-950 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-sm sm:text-base">
                      <div className="flex items-center justify-center gap-2.5">
                        <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="font-medium">Loading Weighbridge operators...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.weighbridge.operators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 italic text-sm sm:text-base"
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
                        <td className="py-4 px-4 sm:px-5">
                          <div className="font-black text-slate-900 dark:text-stone-100 text-base sm:text-lg tracking-tight">
                            {op.weighBridgeName}
                          </div>
                        </td>

                        {/* Records in range */}
                        <td className="py-4 px-4 sm:px-5 font-mono font-black text-cyan-600 dark:text-cyan-400 text-base sm:text-lg">
                          {formatNumber(op.recordsInRange)}
                        </td>

                        {/* Movement (Exp / Imp) */}
                        <td className="py-4 px-4 sm:px-5 font-mono text-sm sm:text-base">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold">
                            Exp:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                              {formatNumber(op.exportCountInRange)}
                            </strong>{" "}
                            / Imp:{" "}
                            <strong className="text-cyan-600 dark:text-cyan-400 font-black">
                              {formatNumber(op.importCountInRange)}
                            </strong>
                          </span>
                        </td>

                        {/* Net Cargo Weight (Date Filter & All-Time) */}
                        <td className="py-4 px-4 sm:px-5 font-mono">
                          <div className="font-black text-amber-600 dark:text-amber-400 text-base sm:text-lg">
                            {formatWeight(op.totalWeightInRange)}{" "}
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">

                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                            All-Time:{" "}
                            <strong className="text-amber-500 dark:text-amber-300 font-bold">
                              {formatWeight(op.allTimeWeight)}
                            </strong>
                            {op.avgWeightInRange > 0 && (
                              <span className="text-slate-400 text-xs ml-1.5">
                                (Avg: {formatWeight(op.avgWeightInRange)}/Vehicle)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total records all time */}
                        <td className="py-4 px-4 sm:px-5 font-mono text-slate-900 dark:text-stone-100 font-black text-base sm:text-lg">
                          {formatNumber(op.allTimeRecords)}
                        </td>

                        {/* Last Weighment (IST) */}
                        <td className="py-4 px-4 sm:px-5">
                          <div className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-stone-200 flex items-center flex-wrap gap-1.5">
                            <span>{ist.text}</span>
                            {ist.raw && (
                              <span className="text-xs font-black text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
                                IST
                              </span>
                            )}
                          </div>
                          {ist.rel && (
                            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              ({ist.rel})
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 pr-4 pl-4 sm:pr-5 sm:pl-5 text-right">
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
