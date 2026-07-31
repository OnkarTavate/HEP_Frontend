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

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

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

  const handleApprove = async (id) => {
    if (!confirm("Approve this overstay exception request? The charge will be marked as EXCEPTION_APPROVED.")) return;
    setProcessingId(id);
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${id}/approve-exception`, {}, {
        headers: getAuthHeaders(),
      });
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
    if (!confirm("Reject this overstay exception request? The charge will remain payable by the agent.")) return;
    setProcessingId(id);
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${id}/reject-exception`, {}, {
        headers: getAuthHeaders(),
      });
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
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d] flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            Overstay Exception Approvals
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Review and decide on agent appeals for levied overstay charges (§5.6.7)
          </p>
        </div>
        <button
          onClick={fetchExceptions}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/50 hover:bg-white/75 font-semibold text-xs shadow-[0_8px_24px_-10px_rgba(10,30,77,0.25),inset_0_1px_0_0_rgba(255,255,255,0.7)] transition-all active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative overflow-hidden flex justify-between items-center bg-white/55 backdrop-blur-2xl backdrop-saturate-150 p-4 rounded-2xl border border-white/60 ring-1 ring-inset ring-white/50 shadow-[0_8px_32px_-10px_rgba(10,30,77,0.18),inset_0_1px_0_0_rgba(255,255,255,0.7)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <span className="relative text-xs font-bold text-slate-500 uppercase tracking-wider">
          Pending Appeals: {requests.length}
        </span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, ID, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 ring-1 ring-inset ring-white/40 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0a1e4d]/25 focus:bg-white/70 transition-all w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-white/55 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl border border-white/60 ring-1 ring-inset ring-white/50 shadow-[0_8px_32px_-10px_rgba(10,30,77,0.18),inset_0_1px_0_0_rgba(255,255,255,0.7)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            Loading pending exception requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-bold text-slate-600">No Pending Exception Requests</p>
            <p className="text-xs text-slate-400">All submitted agent overstay appeals have been processed.</p>
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
                    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  };
                  const daysNum = parseInt(req.overstay_days || 0, 10);
                  return (
                    <tr key={req.id} className="hover:bg-white/55 hover:backdrop-blur-sm transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-500 text-xs">#{req.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-xs">{req.company_name || "—"}</p>
                        <p className="text-[10px] text-slate-400">{req.agent_email || "Agent ID " + req.agent_id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          {req.entity_type}
                        </span>
                        <p className="font-bold text-[#0a1e4d] uppercase text-xs">{req.identifier}</p>
                        {req.entity_name && req.entity_name !== req.identifier && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{req.entity_name}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">{req.pass_no || "—"}</td>
                      <td className="px-5 py-4 text-xs font-medium text-emerald-700">
                        {fmtD(req.date_from)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-red-600">
                        {fmtD(req.date_to)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-red-600 text-xs">{req.overstay_days} day{daysNum !== 1 ? "s" : ""} overstay</p>
                        <p className="text-xs text-slate-400">₹{req.daily_rate}/day</p>
                        <p className="font-black text-slate-900 text-sm mt-0.5">
                          ₹{parseFloat(req.total_amount).toLocaleString("en-IN")}
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
