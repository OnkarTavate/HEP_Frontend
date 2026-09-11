"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  User,
  Truck,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { clonePageVaryPathWithNewSearchParams } from "next/dist/client/components/segment-cache/vary-path";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const getAuthHeaders = () => {
  let token = localStorage.getItem("accessToken");
  if (!token) return {};
  token = token.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${token}` };
};

export default function TrafficOverstayExceptionsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/exception-requests`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch exception requests error:", err);
      toast.error("Failed to load overstay exception requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  console.log(fetchExceptions);

  const handleApprove = async (id) => {
    if (
      !confirm(
        "Approve this overstay exception request? The charge will be marked as EXCEPTION_APPROVED.",
      )
    )
      return;
    setProcessingId(id);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/overstay/${id}/approve-exception`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );
      if (res.data?.success) {
        toast.success("Exception approved successfully");
        fetchExceptions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve exception");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (
      !confirm(
        "Reject this overstay exception request? The charge will remain payable by the agent.",
      )
    )
      return;
    setProcessingId(id);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/overstay/${id}/reject-exception`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );
      if (res.data?.success) {
        toast.success("Exception request rejected");
        fetchExceptions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject exception");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.identifier?.toLowerCase().includes(q) ||
      r.company_name?.toLowerCase().includes(q) ||
      r.pass_no?.toLowerCase().includes(q) ||
      r.exception_reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans text-slate-800">

      {/* ── PREMIUM GRADIENT PAGE HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-6 text-white shadow-[0_12px_32px_-10px_rgba(10,30,77,0.65)] ring-1 ring-inset ring-white/15">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-teal-500/15 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/30 shrink-0">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Traffic Authority · §5.6.7
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight mt-0.5">
                OVERSTAY EXCEPTION APPROVALS
              </h1>
              <p className="text-[11px] text-blue-200/70 mt-0.5">Review and decide on agent appeals for levied overstay charges</p>
            </div>
          </div>
          <button
            onClick={fetchExceptions}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold ring-1 ring-inset ring-white/15 transition self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 shrink-0">
        {/* Card 1: Pending Appeals */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#78350f] via-[#d97706] to-[#b45309] p-6 text-white shadow-xl shadow-amber-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <Clock className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
                <Clock className="h-4 w-4 text-amber-200" strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200/80 leading-tight">Pending Appeals</span>
            </div>
            {requests.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-amber-700 shadow-md animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" /> Urgent
              </span>
            )}
          </div>
          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-9 w-16 rounded-lg bg-white/20 animate-pulse" /> : requests.length}
            </p>
            <p className="text-[11px] font-semibold text-amber-200/70 mt-1.5 leading-snug">Exception requests awaiting decision</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 transition-all duration-700" style={{ width: requests.length > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        </div>

        {/* Card 2: Total Records */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#0f766e] to-[#0e7490] p-6 text-white shadow-xl shadow-emerald-900/40 ring-1 ring-inset ring-white/15 min-h-[148px] flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-3 bottom-3 opacity-[0.08]">
            <ShieldCheck className="h-20 w-20 text-white" strokeWidth={1.2} />
          </div>
          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-inner shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-200" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200/80 leading-tight">Exception Requests</span>
          </div>
          <div className="relative mt-3">
            <p className="text-4xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-md">
              {loading ? <span className="block h-9 w-16 rounded-lg bg-white/20 animate-pulse" /> : filteredRequests.length}
            </p>
            <p className="text-[11px] font-semibold text-emerald-200/70 mt-1.5 leading-snug">Matching current filter</p>
          </div>
          <div className="relative mt-4">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 transition-all duration-700" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/60 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Pending Appeals
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
              {requests.length}
            </span>
          </span>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            Loading pending exception requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-bold text-slate-600">
              No Pending Exception Requests
            </p>
            <p className="text-xs text-slate-400">
              All submitted agent overstay appeals have been processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-[#0a1e4d]/95 via-[#12275f]/92 to-[#1b1856]/95 backdrop-blur-xl text-white text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Ref #</th>
                  <th className="px-5 py-3.5">Company / Agent</th>
                  <th className="px-5 py-3.5">Entity & Identifier</th>
                  <th className="px-5 py-3.5">Pass No</th>
                  <th className="px-5 py-3.5">Entry Date</th>
                  <th className="px-5 py-3.5">Expiry Date</th>
                  <th className="px-5 py-3.5">Overstay / Fine</th>
                  <th className="px-5 py-3.5 max-w-sm">Agent Justification</th>
                  <th className="px-5 py-3.5 text-center">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/50 text-sm">
                {filteredRequests.map((req) => {
                  const fmtD = (d) => {
                    if (!d) return "—";
                    return new Date(d).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  };
                  const daysNum = parseInt(req.overstay_days || 0, 10);
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-white/55 hover:backdrop-blur-sm transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-slate-500 text-xs">
                        #{req.id}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-xs">
                          {req.company_name || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {req.agent_email || "Agent ID " + req.agent_id}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          {req.entity_type}
                        </span>
                        <p className="font-bold text-[#0a1e4d] uppercase text-xs">
                          {req.identifier}
                        </p>
                        {req.entity_name &&
                          req.entity_name !== req.identifier && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {req.entity_name}
                            </p>
                          )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">
                        {req.pass_no || "—"}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-emerald-700">
                        {fmtD(req.date_from)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-red-600">
                        {fmtD(req.date_to)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-red-600 text-xs">
                          {req.overstay_days} day{daysNum !== 1 ? "s" : ""}{" "}
                          overstay
                        </p>
                        <p className="text-xs text-slate-400">
                          ₹{req.daily_rate}/day
                        </p>
                        <p className="font-black text-slate-900 text-sm mt-0.5">
                          ₹
                          {parseFloat(req.total_amount).toLocaleString("en-IN")}
                        </p>
                      </td>
                      <td className="px-5 py-4 max-w-sm">
                        <div className="bg-gradient-to-br from-amber-100/70 via-white/40 to-amber-50/30 backdrop-blur-xl backdrop-saturate-150 border border-amber-200/60 ring-1 ring-inset ring-white/40 rounded-xl p-3 text-xs text-amber-900 leading-relaxed font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
                          &ldquo;{req.exception_reason}&rdquo;
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={processingId === req.id}
                            onClick={() => handleApprove(req.id)}
                            className="px-3.5 py-2 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold ring-1 ring-inset ring-white/30 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55),inset_0_1px_0_0_rgba(255,255,255,0.4)] transition-all flex items-center gap-1 active:scale-95 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            disabled={processingId === req.id}
                            onClick={() => handleReject(req.id)}
                            className="px-3.5 py-2 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white rounded-xl text-xs font-bold ring-1 ring-inset ring-white/30 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.55),inset_0_1px_0_0_rgba(255,255,255,0.4)] transition-all flex items-center gap-1 active:scale-95 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
