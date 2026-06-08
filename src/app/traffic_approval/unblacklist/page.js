"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  ShieldBan,
  ShieldCheck,
  Search,
  X,
  Eye,
  Truck,
  User,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  FileText,
  Loader2,
  CircleDot,
  Ban,
} from "lucide-react";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

/* ─────────── Entity type config ─────────── */
const ENTITY_TYPES = [
  { value: "VEHICLE", label: "Vehicle", icon: Truck },
  { value: "PERSON", label: "Person", icon: User },
  { value: "DRIVER", label: "Driver", icon: CreditCard },
  { value: "COMPANY", label: "Company", icon: Building2 },
];

const STATUS_CONFIG = {
  BLACKLISTED: { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Blacklisted" },
  UNBLACKLIST_REQUESTED: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Pending Review" },
  UNBLACKLISTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Unblacklisted" },
};

const PENALTY_STATUS = {
  NOT_APPLICABLE: { color: "text-slate-400", label: "N/A" },
  PENDING: { color: "text-amber-600 font-bold", label: "Pending" },
  PAID: { color: "text-emerald-600 font-bold", label: "Paid" },
};

export default function UnblacklistApprovalsPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchInput, setSearchInput] = useState("");

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === "pending" ? "UNBLACKLIST_REQUESTED" : "UNBLACKLISTED";
      const params = new URLSearchParams({ status, limit: "100" });
      if (searchInput) params.set("search", searchInput);

      const res = await axios.get(`${ADMIN_API}/blacklist/list?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load unblacklist requests");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchInput]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const res = await axios.get(`${ADMIN_API}/blacklist/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) setDetailEntry(res.data.data);
    } catch {
      toast.error("Failed to load entry details");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/approve-unblacklist`,
        { remarks: "Approved by Traffic Department" },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Unblacklist approved — entity is now clear");
        setIsDetailOpen(false);
        setDetailEntry(null);
        fetchEntries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectRemarks.trim()) {
      toast.warning("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/reject-unblacklist`,
        { remarks: rejectRemarks },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Unblacklist request rejected");
        setIsDetailOpen(false);
        setDetailEntry(null);
        setRejectRemarks("");
        fetchEntries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const getEntityConfig = (type) =>
    ENTITY_TYPES.find((t) => t.value === type) || ENTITY_TYPES[0];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1e4d] tracking-tight flex items-center gap-2">
            <ShieldBan className="h-6 w-6 text-[#ff6b00]" strokeWidth={2.5} />
            Unblacklist Approvals
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and approve/reject unblacklist requests from ATM
          </p>
        </div>
        <button
          onClick={fetchEntries}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1e4d] hover:bg-blue-900 text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { id: "pending", label: "Pending Review" },
          { id: "history", label: "Approved (History)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchInput(""); }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-[#0a1e4d] text-white shadow"
                : "text-slate-500 hover:text-[#0a1e4d] hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/60 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <><Clock className="h-4 w-4 text-amber-500" /> Awaiting Your Review</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Approved Entries</>
            )}
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by ID, Name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#ff6b00]"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {["Type", "Identifier", "Name", "Reason", "Penalty", "Status", "Requested On"].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider ${h === "Status" ? "text-center" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <ShieldCheck className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">
                      {activeTab === "pending" ? "No pending unblacklist requests" : "No approved entries found"}
                    </p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const eConf = getEntityConfig(entry.entity_type);
                  const sConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.UNBLACKLIST_REQUESTED;
                  const pConf = PENALTY_STATUS[entry.penalty_status] || PENALTY_STATUS.NOT_APPLICABLE;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => openDetail(entry.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-50">
                            <eConf.icon className="h-4 w-4 text-amber-600" strokeWidth={2} />
                          </span>
                          <span className="text-xs font-bold text-slate-600 uppercase">{eConf.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800 font-mono">{entry.identifier}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{entry.entity_name || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[200px] truncate">{entry.reason}</td>
                      <td className="px-5 py-3.5">
                        {entry.has_penalty ? (
                          <div>
                            <p className="text-sm font-bold text-slate-800">₹{parseFloat(entry.penalty_amount || 0).toLocaleString("en-IN")}</p>
                            <span className={`text-[10px] ${pConf.color}`}>{pConf.label}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${sConf.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sConf.dot}`} />
                          {sConf.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">
                        {new Date(entry.blacklisted_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* DETAIL + APPROVAL MODAL                      */}
      {/* ════════════════════════════════════════════ */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-[#0a1e4d] text-white shrink-0">
              <div className="flex items-center gap-3">
                <ShieldBan className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-bold">Review Unblacklist Request #{detailEntry?.id || "..."}</h2>
              </div>
              <button
                onClick={() => { setIsDetailOpen(false); setDetailEntry(null); setRejectRemarks(""); }}
                className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : detailEntry ? (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Entity Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const eConf = getEntityConfig(detailEntry.entity_type);
                      return (
                        <span className="flex items-center justify-center h-12 w-12 rounded-xl bg-amber-50">
                          <eConf.icon className="h-6 w-6 text-amber-600" />
                        </span>
                      );
                    })()}
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 font-mono">{detailEntry.identifier}</p>
                      <p className="text-sm text-slate-500">{detailEntry.entity_name || "—"} • {detailEntry.entity_type}</p>
                    </div>
                  </div>
                  {(() => {
                    const sConf = STATUS_CONFIG[detailEntry.status] || STATUS_CONFIG.UNBLACKLIST_REQUESTED;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${sConf.color}`}>
                        <span className={`w-2 h-2 rounded-full ${sConf.dot}`} />
                        {sConf.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Scenario</p>
                    <p className="text-sm font-semibold text-slate-700">{detailEntry.scenario ? detailEntry.scenario.replace(/_/g, " ") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Blacklisted On</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(detailEntry.blacklisted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Blacklisted By</p>
                    <p className="text-sm font-semibold text-slate-700">{detailEntry.blacklisted_by_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Penalty</p>
                    {detailEntry.has_penalty ? (
                      <p className="text-sm font-bold text-slate-800">₹{parseFloat(detailEntry.penalty_amount || 0).toLocaleString("en-IN")} — <span className={PENALTY_STATUS[detailEntry.penalty_status]?.color}>{PENALTY_STATUS[detailEntry.penalty_status]?.label}</span></p>
                    ) : (
                      <p className="text-sm text-slate-400">No Penalty</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reason for Blacklisting</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{detailEntry.reason}</p>
                  </div>
                  {detailEntry.compliance_notes && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Compliance / Corrective Actions</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-white p-2 rounded border border-slate-100">{detailEntry.compliance_notes}</p>
                    </div>
                  )}
                </div>

                {/* Audit Trail */}
                {detailEntry.auditLog && detailEntry.auditLog.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Audit Trail
                    </h4>
                    <div className="space-y-0 relative">
                      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
                      {detailEntry.auditLog.map((log, i) => (
                        <div key={log.id || i} className="relative flex items-start gap-3 py-2">
                          <span className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 shrink-0 ${
                            log.action.includes("BLACKLISTED") && !log.action.includes("UN") ? "bg-red-50 border-red-300" :
                            log.action.includes("PAID") ? "bg-amber-50 border-amber-300" :
                            log.action.includes("COMPLIANCE") ? "bg-blue-50 border-blue-300" :
                            log.action.includes("APPROVED") || log.action === "UNBLACKLISTED" ? "bg-emerald-50 border-emerald-300" :
                            log.action.includes("REJECTED") ? "bg-red-50 border-red-300" :
                            "bg-slate-50 border-slate-300"
                          }`}>
                            <CircleDot className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700">{log.action.replace(/_/g, " ")}</p>
                            <p className="text-xs text-slate-500">{log.performed_by_name || "System"} • {new Date(log.createdAt).toLocaleString("en-IN")}</p>
                            {log.remarks && (
                              <p className="text-xs text-slate-600 mt-0.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.remarks}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Approval Actions (only for pending requests) ── */}
                {detailEntry.status === "UNBLACKLIST_REQUESTED" && (
                  <div className="border-t border-slate-200 pt-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Decision</h4>

                    {/* Reject reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Rejection Reason (required only if rejecting)
                      </label>
                      <textarea
                        rows={2}
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                        placeholder="Provide reason if rejecting this request..."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#ff6b00] resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="flex-1 py-3 bg-white border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl hover:bg-red-50 hover:border-red-400 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve Unblacklist
                      </button>
                    </div>
                  </div>
                )}

                {detailEntry.status === "UNBLACKLISTED" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      This entity has been successfully unblacklisted
                    </div>
                    {detailEntry.unblacklisted_by_name && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Approved by {detailEntry.unblacklisted_by_name} on {detailEntry.unblacklisted_at ? new Date(detailEntry.unblacklisted_at).toLocaleDateString("en-IN") : "—"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
