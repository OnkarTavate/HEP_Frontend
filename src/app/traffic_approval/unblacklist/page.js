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
  ClipboardCheck,
} from "lucide-react";

// Inline IndianRupee SVG icon component to match Lucide style
const IndianRupee = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M6 3h12M6 8h12M6 13h4a5.5 5.5 0 0 0 0-11M9 13l9 9" />
  </svg>
);

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl ring-1 ring-slate-200/50 shadow-md">
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a1e4d] hover:bg-blue-900 text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 pb-0 overflow-x-auto no-scrollbar scroll-smooth shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "pending", label: "Pending Review" },
          { id: "history", label: "Approved (History)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchInput(""); }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <><Clock className="h-4 w-4 text-amber-500" /> Awaiting Your Review</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Approved Entries</>
            )}
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by ID, Name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#ff6b00]"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-150 bg-white">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 mx-auto text-slate-350 mb-3 animate-spin" />
              <p className="text-sm font-semibold">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ShieldCheck className="h-8 w-8 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">
                {activeTab === "pending" ? "No pending unblacklist requests" : "No approved entries found"}
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const eConf = getEntityConfig(entry.entity_type);
              const sConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.UNBLACKLIST_REQUESTED;
              const pConf = PENALTY_STATUS[entry.penalty_status] || PENALTY_STATUS.NOT_APPLICABLE;
              return (
                <div
                  key={entry.id}
                  onClick={() => openDetail(entry.id)}
                  className="p-4 space-y-3 hover:bg-slate-50/50 active:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center h-8.5 w-8.5 rounded-xl bg-amber-50">
                        <eConf.icon className="h-4.5 w-4.5 text-amber-600" strokeWidth={2} />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 font-mono tracking-wide">
                          {entry.identifier}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {eConf.label} {entry.entity_name ? `• ${entry.entity_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${sConf.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sConf.dot}`} />
                      {sConf.label}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason</span>
                      <p className="font-semibold text-slate-700 leading-snug">{entry.reason}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/50">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penalty</span>
                        {entry.has_penalty ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-extrabold text-slate-700">₹{parseFloat(entry.penalty_amount || 0).toLocaleString("en-IN")}</span>
                            <span className={`text-[10px] font-extrabold ${pConf.color}`}>{pConf.label}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-450 block mt-0.5">No Penalty</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Requested On</span>
                        <span className="font-bold text-slate-650 block mt-0.5">
                          {new Date(entry.blacklisted_at || entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* DETAIL + APPROVAL MODAL                      */}
      {/* ════════════════════════════════════════════ */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-4.5 bg-gradient-to-r from-slate-950 via-red-950 to-slate-950 text-white shrink-0 border-b border-red-500/20 shadow-md">
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
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-100">
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
                      {detailEntry.auditLog.map((log, i) => {
                        const isFirst = i === 0;
                        const action = log.action;
                        let IconComp = CircleDot;
                        let iconColor = "text-slate-550";
                        let bgBorderClass = "bg-slate-50 border-slate-300";

                        if (action.includes("BLACKLISTED") && !action.includes("UN")) {
                          IconComp = ShieldBan;
                          iconColor = "text-red-650";
                          bgBorderClass = "bg-red-50 border-red-200";
                        } else if (action.includes("PAID")) {
                          IconComp = IndianRupee;
                          iconColor = "text-amber-600";
                          bgBorderClass = "bg-amber-50 border-amber-200";
                        } else if (action.includes("COMPLIANCE")) {
                          IconComp = ClipboardCheck;
                          iconColor = "text-blue-600";
                          bgBorderClass = "bg-blue-50 border-blue-200";
                        } else if (action.includes("APPROVED") || action === "UNBLACKLISTED" || action === "REINSTATED") {
                          IconComp = ShieldCheck;
                          iconColor = "text-emerald-600";
                          bgBorderClass = "bg-emerald-50 border-emerald-200";
                        } else if (action.includes("REJECTED")) {
                          IconComp = XCircle;
                          iconColor = "text-red-500";
                          bgBorderClass = "bg-red-50 border-red-200";
                        } else if (action.includes("CREATED") || action.includes("PENDING")) {
                          IconComp = Clock;
                          iconColor = "text-indigo-600";
                          bgBorderClass = "bg-indigo-50 border-indigo-200";
                        }

                        return (
                          <div key={log.id || i} className="relative flex items-start gap-4 py-2.5">
                            <div className="relative shrink-0">
                              {isFirst && (
                                <span className="absolute -inset-1 rounded-full bg-slate-400/20 animate-ping" />
                              )}
                              <span className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 ${bgBorderClass}`}>
                                <IconComp className={`h-4 w-4 ${iconColor}`} strokeWidth={2.5} />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700">
                                {action.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {log.performed_by_name || "System"} • {new Date(log.createdAt).toLocaleString("en-IN")}
                              </p>
                              {log.remarks && (
                                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100/80 leading-relaxed">{log.remarks}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
