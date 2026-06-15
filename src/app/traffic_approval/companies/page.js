"use client";

import React, { useState, useEffect, useCallback } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import axios from "axios";
import { toast } from "sonner";
import {
  Search,
  Building2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  History,
  Maximize,
  Minimize,
  Loader2,
  RefreshCw,
  Clock,
  Users,
} from "lucide-react";

// ── API constants ────────────────────────────────────────────────────────────
const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

export default function TrafficCompanyApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchVal, setSearchVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeTab, setActiveTab] = useState("pending");
  const [isViewMode, setIsViewMode] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");

  // Concurrency locking state
  const [activeLocks, setActiveLocks] = useState({ pass: [], "vendor-pass": [], company: [] });

  const fetchActiveLocks = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const response = await axios.get(`${AGENT_API}/locks/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.success) {
        setActiveLocks(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching active locks:", err);
    }
  }, []);

  const acquireLock = async (appId, type) => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(`${AGENT_API}/locks/acquire`, {
        applicationId: appId,
        type,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, lock: res.data.lock };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to acquire lock";
      return { success: false, message };
    }
  };

  const releaseLock = async (appId, type) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${AGENT_API}/locks/release`, {
        applicationId: appId,
        type,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to release lock:", error);
    }
  };

  useEffect(() => {
    fetchActiveLocks();
    const interval = setInterval(fetchActiveLocks, 2000); // every 2 seconds
    return () => clearInterval(interval);
  }, [fetchActiveLocks]);

  useEffect(() => {
    if (!selectedRequest || isViewMode) return;

    const interval = setInterval(async () => {
      const lockRes = await acquireLock(selectedRequest.id, "company");
      if (!lockRes.success) {
        toast.error("Lock Lost", {
          description: "This application lock has expired or was taken by another user.",
        });
        setSelectedRequest(null);
      }
    }, 10000); // refresh every 10 seconds

    return () => {
      clearInterval(interval);
      releaseLock(selectedRequest.id, "company").then(() => {
        fetchActiveLocks();
      });
    };
  }, [selectedRequest, isViewMode]);
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    decision: null,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchVal]);

  useEffect(() => {
    if (viewingDocUrl) setIframeLoading(true);
  }, [viewingDocUrl]);

  // ── Data fetching — uses auth token + correct ADMIN_API ──────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${ADMIN_API}/user/agent-users`, {
        headers,
        params: {
          page: currentPage,
          limit: pageSize,
          status: activeTab,
          search: searchQuery || undefined,
        },
      });

      if (response.data?.data) {
        setRequests(response.data.data);
        setPaginationMeta(response.data.pagination || {
          totalRecords: response.data.data.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: pageSize,
        });
        setGlobalCounts(response.data.counts || {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        });
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error(
        "Failed to fetch company requests:",
        error.response || error.message,
      );
      toast.error("Failed to load company data. Check backend connection.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeTab, searchQuery]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // ── Action helpers ────────────────────────────────────────────────────────
  const handleRevertClick = () => {
    if (!remarks.trim()) {
      toast.warning("Remarks Required", {
        description: "Please specify which fields need updating.",
      });
      return;
    }
    setConfirmDialog({ isOpen: true, decision: "reverted" });
  };

  const handleActionClick = (decision) => {
    if (decision === "rejected" && !remarks.trim()) {
      toast.warning("Remarks Required", {
        description: "Please provide a reason for rejection.",
      });
      return;
    }
    setConfirmDialog({ isOpen: true, decision });
  };

  const processDecision = async () => {
    const { decision } = confirmDialog;
    setConfirmDialog({ isOpen: false, decision: null });
    const loadingToastId = toast.loading(`Processing ${decision} request...`);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.put(
        `${AGENT_API}/agents/action`,
        {
          agentId: selectedRequest.id,
          decision,
          rejectedReason:
            decision === "rejected" || decision === "reverted" ? remarks : null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.success) {
        toast.success(`Company ${decision.toUpperCase()}`, {
          id: loadingToastId,
          description: "Email notifications have been triggered successfully.",
        });
        setSelectedRequest(null);
        setRemarks("");
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Action failed:", error);
      toast.error("Action Failed", {
        id: loadingToastId,
        description:
          error.response?.data?.message || "Failed to process action.",
      });
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const pendingCount = globalCounts.pending;
  const processedCount = globalCounts.total - globalCounts.pending;
  const displayedRequests = requests;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full flex flex-col gap-4 p-2">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800/60 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800/40 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800/40 animate-pulse" />
        {/* Floating loader */}
        <div className="pointer-events-none absolute inset-x-0 top-[50%] flex justify-center">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md ring-1 ring-slate-200/70 dark:ring-white/10 shadow-lg">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
              <Building2 className="h-4 w-4" strokeWidth={2.5} />
              <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
            </span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">
              Loading company data
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-4 lg:gap-5">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        {/* Total */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-slate-200/60 dark:ring-white/5 shadow-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Users
                className="h-4 w-4 text-slate-600 dark:text-slate-300"
                strokeWidth={2.5}
              />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-stone-100 tabular-nums">
            {globalCounts.total}
          </p>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-amber-200/60 dark:ring-amber-500/10 shadow-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              Pending
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Clock
                className="h-4 w-4 text-amber-600 dark:text-amber-400"
                strokeWidth={2.5}
              />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
            {pendingCount}
          </p>
        </div>

        {/* Processed */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-emerald-200/60 dark:ring-emerald-500/10 shadow-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Processed
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
              />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
            {processedCount}
          </p>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-stone-100 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-500" strokeWidth={2.5} />
            Company Registration Approvals
          </h2>
          <p className="text-sm text-slate-500 dark:text-stone-400 mt-0.5">
            Verify documents and approve new port operators
          </p>
        </div>
        <button
          onClick={() => {
            setCurrentPage(1);
            fetchDashboardData();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-0">
        {[
          { id: "pending", label: "Pending", count: pendingCount },
          {
            id: "processed",
            label: "Processed",
            count: processedCount,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 shadow"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-stone-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id
                  ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl ring-1 ring-slate-200/60 dark:ring-white/5 shadow-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="font-bold text-slate-800 dark:text-stone-100 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-500" /> Awaiting
                Approval
              </>
            ) : (
              <>
                <History className="h-4 w-4 text-emerald-500" /> Processed
                Companies
              </>
            )}
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search company or ref..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-700/40">
                {(activeTab === "processed"
                  ? ["Ref No", "Company Name", "Operator Type", "Approved By", "Status"]
                  : ["Ref No", "Company Name", "Operator Type", activeTab === "pending" ? "Action" : "Status"]
                ).map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${h === "Action" || h === "Status" ? "text-center" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {displayedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 5 : 4}
                    className="py-16 text-center text-slate-400 dark:text-slate-500"
                  >
                    <Building2 className="h-10 w-10 mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-sm font-medium">No records found.</p>
                  </td>
                </tr>
              ) : (
                displayedRequests.map((req) => {
                  const statusColors = {
                    approved:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    reverted:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
                    rejected:
                      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
                  };
                  const statusClass =
                    statusColors[req.status] ||
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
                  
                  const lock = activeLocks.company?.find(l => String(l.applicationId) === String(req.id));
                  const isLocked = !!lock;

                  const rowClass = isLocked
                    ? "bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 transition-colors cursor-pointer group"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group";

                  return (
                    <tr
                      key={req.id}
                      onClick={async () => {
                        const viewOnly = activeTab === "processed";
                        if (!viewOnly) {
                          const lockRes = await acquireLock(req.id, "company");
                          if (!lockRes.success) {
                            toast.error("Application In-Use", {
                              description: lockRes.message,
                            });
                            return;
                          }
                        }
                        setSelectedRequest(req);
                        setIsViewMode(viewOnly);
                        setRemarks(req.rejectedReason || "");
                      }}
                      className={rowClass}
                    >
                      <td className="px-5 py-4 text-sm font-bold text-slate-800 dark:text-stone-200 font-mono">
                        {req.referenceNumber || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                            {(req.entityName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-stone-100">
                              {req.entityName || "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {req.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200 dark:border-blue-500/20">
                          {req.userTypeName || "Agent"}
                        </span>
                      </td>
                      {activeTab === "processed" && (
                        <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {req.approvedBy || "—"}
                        </td>
                      )}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusClass}`}
                          >
                            {(req.status || "PENDING").toUpperCase()}
                          </span>
                          {isLocked && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900 animate-pulse">
                              IN-USE BY {lock.userName.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/20 dark:bg-slate-800/10">
          <PaginationBar
            currentPage={paginationMeta.currentPage || currentPage}
            totalPages={paginationMeta.totalPages || 1}
            totalRecords={paginationMeta.totalRecords || 0}
            pageSize={paginationMeta.pageSize || pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Review / View Modal ── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
            {/* Modal header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white">
              <h2 className="text-lg font-bold tracking-wide flex items-center gap-2.5">
                <Building2
                  className="text-amber-400 h-5 w-5"
                  strokeWidth={2.5}
                />
                {isViewMode
                  ? "Company Details (Read Only)"
                  : "Company Verification"}
                {selectedRequest.referenceNumber && (
                  <span className="ml-1 text-amber-400 font-mono text-sm">
                    · {selectedRequest.referenceNumber}
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRemarks("");
                }}
                className="text-white/60 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50 space-y-5">
              {/* Company Info */}
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Reference Number",
                      value: selectedRequest.referenceNumber,
                      span: 1,
                    },
                    {
                      label: "Entity Name",
                      value: selectedRequest.entityName,
                      span: 2,
                    },
                    {
                      label: "Operator Type",
                      value: selectedRequest.userTypeName || "N/A",
                      span: 1,
                    },
                    {
                      label: "Contact Email",
                      value: selectedRequest.email,
                      span: 1,
                    },
                    {
                      label: "Mobile No.",
                      value: selectedRequest.mobileNo,
                      span: 1,
                    },
                    {
                      label: "Address",
                      value: [
                        selectedRequest.addressLine,
                        selectedRequest.city,
                        selectedRequest.state,
                        selectedRequest.pincode,
                      ]
                        .filter(Boolean)
                        .join(", "),
                      span: 2,
                    },
                  ].map(({ label, value, span }) => (
                    <div
                      key={label}
                      className={span > 1 ? `md:col-span-${span}` : ""}
                    >
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        {label}
                      </label>
                      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identification */}
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  Identification Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    {
                      label: "GSTIN Number",
                      value: selectedRequest.gstinNumber,
                    },
                    { label: "PAN Number", value: selectedRequest.panNumber },
                    { label: "TAN Number", value: selectedRequest.tanNumber },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        {label}
                      </label>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {value || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                  <CheckCircle2 className="text-amber-500 h-4 w-4" />{" "}
                  Verification Documents
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Requisition Letter",
                      type: "requisitionLetter",
                      always: true,
                    },
                    { label: "Work Order", type: "workOrder", always: true },
                    {
                      label: "GSTIN Document",
                      type: "gst",
                      show: !!selectedRequest.gstinNumber,
                    },
                    {
                      label: "PAN Document",
                      type: "pan",
                      show: !!selectedRequest.panNumber,
                    },
                    {
                      label: "TAN Document",
                      type: "tan",
                      show: !!selectedRequest.tanNumber,
                    },
                  ]
                    .filter((d) => d.always || d.show)
                    .map(({ label, type }) => (
                      <button
                        key={type}
                        onClick={() =>
                          setViewingDocUrl(
                            `${AGENT_API}/agents/viewAgentDocument?referenceNumber=${selectedRequest.referenceNumber}&documentType=${type}`,
                          )
                        }
                        className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-all group text-left"
                      >
                        <FileText className="text-amber-500 h-5 w-5 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                          {label}
                        </span>
                        <Eye className="h-4 w-4 ml-auto text-slate-400 group-hover:text-amber-500 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Remarks */}
              {(!isViewMode ||
                selectedRequest?.status !== "approved" ||
                remarks) && (
                <div className="bg-amber-50 dark:bg-amber-500/5 p-5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                    Authority Remarks / Reason for Rejection
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isViewMode}
                    className="w-full border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none resize-none disabled:opacity-60"
                    rows="3"
                    placeholder="Enter specific remarks if rejecting or reverting..."
                  />
                </div>
              )}
            </div>

            {/* Modal footer */}
            {!isViewMode && (
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
                <button
                  onClick={() => handleActionClick("rejected")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow hover:shadow-lg active:scale-95 transition-all"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={handleRevertClick}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-700 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm shadow hover:shadow-lg active:scale-95 transition-all"
                >
                  <RefreshCw className="h-4 w-4" /> Revert
                </button>
                <button
                  onClick={() => handleActionClick("approved")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow hover:shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
              </div>
            )}
          </div>

          {/* ── PDF Document Viewer ── */}
          {viewingDocUrl && (
            <div
              className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm ${isFullscreen ? "p-0" : "p-4 md:p-8"}`}
            >
              <div
                className={`bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isFullscreen ? "max-w-full rounded-none" : "max-w-5xl rounded-2xl ring-1 ring-slate-700"}`}
              >
                <div className="flex justify-between items-center px-4 py-3 bg-slate-900 text-white">
                  <h3 className="font-bold flex items-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-amber-400" /> Document
                    Viewer
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
                      title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setViewingDocUrl(null);
                        setIsFullscreen(false);
                      }}
                      className="bg-slate-800 hover:bg-red-500 p-2 rounded-lg transition-colors"
                      title="Close"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full bg-slate-100 relative">
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                      <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-3" />
                      <p className="text-slate-500 font-bold animate-pulse text-sm">
                        Fetching secure document...
                      </p>
                    </div>
                  )}
                  <iframe
                    src={viewingDocUrl}
                    className="w-full h-full border-none"
                    title="Document Viewer"
                    onLoad={() => setIframeLoading(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Confirm Dialog ── */}
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
                <div className="p-6 text-center space-y-4">
                  <div
                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${confirmDialog.decision === "approved" ? "bg-emerald-100 dark:bg-emerald-500/10" : "bg-red-100 dark:bg-red-500/10"}`}
                  >
                    {confirmDialog.decision === "approved" ? (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-stone-100">
                    Confirm Action
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Are you sure you want to{" "}
                    <strong
                      className={
                        confirmDialog.decision === "approved"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {confirmDialog.decision}
                    </strong>{" "}
                    this company?
                  </p>
                </div>
                <div className="flex border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() =>
                      setConfirmDialog({ isOpen: false, decision: null })
                    }
                    className="flex-1 px-4 py-4 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-r border-slate-100 dark:border-slate-800 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processDecision}
                    className={`flex-1 px-4 py-4 text-white font-bold transition-colors text-sm ${confirmDialog.decision === "approved" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
                  >
                    Yes, Proceed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
