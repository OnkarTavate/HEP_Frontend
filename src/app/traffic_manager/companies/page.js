"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import axios from "axios";
import { toast } from "sonner";
import ProfileUpdateDiffModal from "@/components/ProfileUpdateDiffModal";
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
  Sparkles,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  AlertCircle,
  ChevronRight,
  Filter,
  X,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

// ── API constants ────────────────────────────────────────────────────────────
const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const formatISOToDDMMYYYY = (isoStr) => {
  if (!isoStr) return "";
  if (isoStr.includes("/")) return isoStr;
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return isoStr;
};

import { useSearchParams } from "next/navigation";

export default function TrafficCompanyApprovals() {
  const searchParams = useSearchParams();
  const tabQuery = searchParams ? searchParams.get("tab") : null;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchVal, setSearchVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (tabQuery) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);
  const [isViewMode, setIsViewMode] = useState(false);
  const [processedByMe, setProcessedByMe] = useState(false);

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
  const [operatorTypeFilter, setOperatorTypeFilter] = useState("ALL");

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");

  // Profile Update Requests State
  const [profileUpdateRequests, setProfileUpdateRequests] = useState([]);
  const [profileUpdatesCount, setProfileUpdatesCount] = useState(0);
  const [selectedProfileUpdateRequest, setSelectedProfileUpdateRequest] = useState(null);
  const [isProfileUpdateModalOpen, setIsProfileUpdateModalOpen] = useState(false);

  // Concurrency locking state
  const [activeLocks, setActiveLocks] = useState({});

  const fetchActiveLocks = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const response = await axios.get(`${AGENT_API}/locks/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.success) {
        const newLocks = response.data.data;
        setActiveLocks((prev) =>
          JSON.stringify(newLocks) === JSON.stringify(prev) ? prev : newLocks
        );
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
    const interval = setInterval(fetchActiveLocks, 900); // every 900ms (< 1s)
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
    }, 500);
    return () => clearTimeout(handler);
  }, [searchVal]);

  useEffect(() => {
    if (viewingDocUrl) setIframeLoading(true);
  }, [viewingDocUrl]);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch profile update count separately
      axios
        .get(`${ADMIN_API}/user/profile-update-requests`, {
          headers,
          params: { status: "pending", limit: 1 },
        })
        .then((res) => {
          if (res.data?.pagination) {
            setProfileUpdatesCount(res.data.pagination.totalRecords || 0);
          }
        })
        .catch(() => { });

      if (activeTab === "profile_updates") {
        const response = await axios.get(`${ADMIN_API}/user/profile-update-requests`, {
          headers,
          params: {
            page: currentPage,
            limit: pageSize,
            search: searchQuery || undefined,
          },
        });

        if (response.data?.data) {
          const newReqs = response.data.data;
          setProfileUpdateRequests((prev) =>
            JSON.stringify(newReqs) === JSON.stringify(prev) ? prev : newReqs
          );
          if (response.data.pagination) {
            setPaginationMeta(response.data.pagination);
          }
        }
      } else {
        const response = await axios.get(`${ADMIN_API}/user/agent-users`, {
          headers,
          params: {
            page: currentPage,
            limit: pageSize,
            status: activeTab,
            search: searchQuery || undefined,
            processedByMe: processedByMe ? "true" : undefined,
          },
        });

        if (response.data?.data) {
          const newRequests = response.data.data;
          const newMeta = response.data.pagination || {
            totalRecords: response.data.data.length,
            totalPages: 1,
            currentPage: 1,
            pageSize: pageSize,
          };
          const newCounts = response.data.counts || {
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
          };

          setRequests((prev) =>
            JSON.stringify(newRequests) === JSON.stringify(prev) ? prev : newRequests
          );
          setPaginationMeta((prev) =>
            JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta
          );
          setGlobalCounts((prev) =>
            JSON.stringify(newCounts) === JSON.stringify(prev) ? prev : newCounts
          );
        } else {
          setRequests((prev) => (prev.length === 0 ? prev : []));
        }
      }
    } catch (error) {
      console.error(
        "Failed to fetch company requests:",
        error.response || error.message,
      );
      if (!isPoll) toast.error("Failed to load data. Check backend connection.");
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [currentPage, pageSize, activeTab, searchQuery, processedByMe]);

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => fetchDashboardData(true), 5000); // Poll every 5 seconds without showing loading spinner
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
  const approvedCount = globalCounts.approved;
  const rejectedCount = globalCounts.rejected;

  const availableOperatorTypes = useMemo(() => {
    const set = new Set();
    requests.forEach((r) => {
      if (r.userTypeName) set.add(r.userTypeName);
    });
    return Array.from(set);
  }, [requests]);

  const displayedRequests = useMemo(() => {
    if (operatorTypeFilter === "ALL") return requests;
    return requests.filter((r) => r.userTypeName === operatorTypeFilter);
  }, [requests, operatorTypeFilter]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full space-y-5 p-6 bg-slate-50 min-h-screen">
        <div className="h-20 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-200 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5 font-sans text-slate-800 p-6 pb-8 bg-slate-50 min-h-screen">
      {/* ── HEADER STRIP ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] ring-1 ring-inset ring-white/15 px-6 py-5 text-white shadow-[0_8px_24px_-10px_rgba(10,30,77,0.55)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-1 ring-white/30 shrink-0">
              <Building2 className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-200/80">
                Traffic Authority · Chennai Port Authority
              </p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                COMPANY REGISTRATION &amp; OPERATOR APPROVALS
              </h2>
              <p className="text-xs text-blue-200/70 font-medium mt-0.5">
                Verify licenses, tax identification, and approve commercial harbor operators
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-inset ring-white/15">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="leading-tight">
                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-200/70 block">
                  Registry Status
                </span>
                <span className="text-xs font-black text-emerald-300">
                  Live Port Registry Active
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchDashboardData();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
              Sync Data
            </button>
          </div>
        </div>
      </div>

      {/* ── 5 VIBRANT KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {/* Total */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-4 sm:p-5 text-white shadow-lg shadow-blue-500/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100">
              Total Operators
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm">
              <Users className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums drop-shadow-sm mt-2">
            {globalCounts.total}
          </p>
          <p className="text-[10px] font-semibold text-blue-200/80 mt-0.5">All registered entities</p>
        </div>

        {/* Pending */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-4 sm:p-5 text-white shadow-lg shadow-orange-500/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-100">
              Pending Clearance
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm">
              <Clock className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-white tabular-nums drop-shadow-sm">
              {pendingCount}
            </p>
            {pendingCount > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-orange-600 shadow-sm animate-pulse">
                Action Needed
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-orange-100 mt-0.5">Awaiting authority verification</p>
        </div>

        {/* Approved */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-4 sm:p-5 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
              Active &amp; Approved
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums drop-shadow-sm mt-2">
            {approvedCount}
          </p>
          <p className="text-[10px] font-semibold text-emerald-100 mt-0.5">Authorized for port access</p>
        </div>

        {/* Rejected / Reverted */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 p-4 sm:p-5 text-white shadow-lg shadow-rose-500/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-100">
              Rejected / Reverted
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm">
              <XCircle className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums drop-shadow-sm mt-2">
            {rejectedCount}
          </p>
          <p className="text-[10px] font-semibold text-rose-100 mt-0.5">Actioned with remarks</p>
        </div>

        {/* Profile Updates */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 p-4 sm:p-5 text-white shadow-lg shadow-purple-500/25 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-1 col-span-2 sm:col-span-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-100">
              Profile Updates
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm">
              <History className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
          </div>
          <p className="text-3xl font-black text-white tabular-nums drop-shadow-sm mt-2">
            {profileUpdatesCount}
          </p>
          <p className="text-[10px] font-semibold text-violet-100 mt-0.5">Pending modification diffs</p>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-0 overflow-x-auto">
        {[
          { id: "pending", label: "Pending Verification", count: pendingCount, icon: Clock, tone: "amber" },
          { id: "processed", label: "Processed Operators", count: processedCount, icon: CheckCircle2, tone: "emerald" },
          { id: "profile_updates", label: "Profile Update Requests", count: profileUpdatesCount, icon: History, tone: "violet" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setProcessedByMe(false);
                setOperatorTypeFilter("ALL");
                setCurrentPage(1);
              }}
              className={`relative flex items-center gap-2 px-5 py-3 text-xs font-black rounded-t-2xl transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? "bg-[#0a1e4d] text-white shadow-[0_-2px_12px_rgba(10,30,77,0.15)] scale-[1.02]"
                  : "bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-white border-t border-x border-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-orange-400" : "text-slate-400"}`} />
              {tab.label}
              <span
                className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-[0_8px_28px_-10px_rgba(10,30,77,0.12)] overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-col gap-3 p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                {activeTab === "pending" ? (
                  <ShieldAlert className="h-4 w-4" />
                ) : activeTab === "processed" ? (
                  <History className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </span>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                {activeTab === "pending"
                  ? "Awaiting Authority Verification & Clearance"
                  : activeTab === "processed"
                    ? "Processed Port Operator Records"
                    : "Company Profile Update Review Queue"}
              </h3>
              <span className="text-[11px] font-extrabold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                {displayedRequests.length} loaded
              </span>
            </div>

            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
              {activeTab === "processed" && (
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors select-none shadow-sm">
                  <input
                    type="checkbox"
                    id="processed-by-me-filter"
                    checked={processedByMe}
                    onChange={(e) => {
                      setProcessedByMe(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                  />
                  <span>Processed By Me</span>
                </label>
              )}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search company name, ref, email..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 shadow-sm transition"
                />
                {searchVal && (
                  <button
                    onClick={() => setSearchVal("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Operator Type Quick Filter Pills */}
          {activeTab !== "profile_updates" && availableOperatorTypes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Type:
              </span>
              <button
                onClick={() => setOperatorTypeFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                  operatorTypeFilter === "ALL"
                    ? "bg-[#0a1e4d] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Types
              </button>
              {availableOperatorTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setOperatorTypeFilter(type)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                    operatorTypeFilter === type
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === "profile_updates" ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200">
                  {["Ref No", "Company / Agent Name", "Submitted Date", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[11px] font-black text-slate-600 uppercase tracking-wider ${h === "Action" || h === "Status" ? "text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profileUpdateRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-semibold">No profile update requests found.</p>
                    </td>
                  </tr>
                ) : (
                  profileUpdateRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-amber-50/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedProfileUpdateRequest(req);
                        setIsProfileUpdateModalOpen(true);
                      }}
                    >
                      <td className="px-5 py-4 text-xs font-mono font-black text-slate-900">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {req.referenceNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-extrabold text-slate-900">
                          {req.currentEntityName || req.currentProfile?.entityName || req.entityName || `Agent ID #${req.agentId}`}
                        </div>
                        {req.remarks && req.remarks.trim() !== "" && req.remarks.trim() !== "-" && req.remarks.trim() !== "—" && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Remarks: {req.remarks}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                        {new Date(req.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${req.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : req.status === "reverted"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : req.status === "rejected"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfileUpdateRequest(req);
                            setIsProfileUpdateModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Review Diff &amp; Process
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200">
                  {(activeTab === "processed"
                    ? ["Ref No", "Company / Operator Name", "Operator Type", "Approved By", "Status", "Action"]
                    : ["Ref No", "Company / Operator Name", "Operator Type", "Status", "Action"]
                  ).map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[11px] font-black text-slate-600 uppercase tracking-wider ${h === "Action" || h === "Status" ? "text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "processed" ? 6 : 5}
                      className="py-16 text-center text-slate-400"
                    >
                      <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-semibold">No company registration records found.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing search or filter parameters</p>
                    </td>
                  </tr>
                ) : (
                  displayedRequests.map((req) => {
                    const statusColors = {
                      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      reverted: "bg-amber-50 text-amber-700 border-amber-200",
                      rejected: "bg-rose-50 text-rose-700 border-rose-200",
                    };
                    const statusClass =
                      statusColors[req.status] || "bg-blue-50 text-blue-700 border-blue-200";

                    const lock = activeLocks.company?.find((l) => String(l.applicationId) === String(req.id));
                    const isLocked = !!lock;

                    const rowClass = isLocked
                      ? "bg-amber-50/70 hover:bg-amber-100/70 transition-colors cursor-pointer group"
                      : "hover:bg-orange-50/40 transition-colors cursor-pointer group";

                    const handleOpenModal = async () => {
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

                      // On-demand fetch of complete agent profile for verification modal
                      try {
                        const token = localStorage.getItem("accessToken");
                        const profileRes = await axios.get(`${ADMIN_API}/user/agent/${req.id}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (profileRes.data?.data) {
                          setSelectedRequest({ ...req, ...profileRes.data.data });
                        } else {
                          setSelectedRequest(req);
                        }
                      } catch (err) {
                        setSelectedRequest(req);
                      }

                      setIsViewMode(viewOnly);
                      setRemarks(req.rejectedReason || "");
                    };

                    return (
                      <tr
                        key={req.id}
                        onClick={handleOpenModal}
                        className={rowClass}
                      >
                        <td className="px-5 py-4 text-xs font-mono font-black text-slate-900">
                          <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 group-hover:bg-white transition-colors">
                            {req.referenceNumber || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0">
                              {(req.entityName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                                {req.entityName || "—"}
                                <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {req.email || "No email provided"}
                                {req.mobileNo ? ` · ${req.mobileNo}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-block">
                            {req.userTypeName || "Commercial Operator"}
                          </span>
                        </td>
                        {activeTab === "processed" && (
                          <td className="px-5 py-4 text-xs font-bold text-slate-700">
                            {req.approvedBy || "Traffic Authority"}
                          </td>
                        )}
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusClass}`}
                            >
                              {(req.status || "PENDING").toUpperCase()}
                            </span>
                            {isLocked && (
                              <span className="text-[9px] text-amber-700 font-black bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                                <AlertCircle className="h-2.5 w-2.5" />
                                IN-USE: {lock.userName.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal();
                            }}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-1 mx-auto active:scale-95 ${
                              activeTab === "pending"
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-400/25"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {activeTab === "pending" ? "Verify" : "Details"}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        <div className="px-5 py-4 border-t border-white/50 dark:border-white/10 bg-white/25 dark:bg-white/5 backdrop-blur-xl">
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
                      label: "Company Email",
                      value: selectedRequest.email,
                      span: 1,
                    },
                    {
                      label: "Company Mobile No.",
                      value: selectedRequest.mobileNo,
                      span: 1,
                    },
                    {
                      label: "Address",
                      value: [
                        selectedRequest.addressLine,
                        selectedRequest.city,
                        selectedRequest.state,
                        selectedRequest.country,
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

              {/* License & Authorized Contact */}
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  License & Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: "License Number",
                      value: selectedRequest.licenseNumber || "N/A",
                    },
                    {
                      label: "License Expiry Date",
                      value: selectedRequest.isLifetimeLicense
                        ? "Lifetime Validity (No Expiry)"
                        : formatISOToDDMMYYYY(selectedRequest.licenseValidityDate) || "N/A",
                    },
                    {
                      label: "Contact Person",
                      value: [selectedRequest.firstName, selectedRequest.lastName]
                        .filter(Boolean)
                        .join(" ") || "—",
                    },
                    {
                      label: "Contact Person Email",
                      value: selectedRequest.contactEmail || "—",
                    },
                    {
                      label: "Contact Person Mobile No.",
                      value: selectedRequest.contactMobile || "—",
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
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
                      value: selectedRequest.gstinNumber || selectedRequest.gstinNo,
                    },
                    { label: "PAN Number", value: selectedRequest.panNumber || selectedRequest.panNo },
                    { label: "TAN Number", value: selectedRequest.tanNumber || selectedRequest.tanNo },
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
                      show: Boolean((selectedRequest.requisitionLetter || selectedRequest.requisitionLetterPath || "").trim()),
                    },
                    {
                      label: "Work Order",
                      type: "workOrder",
                      show: Boolean((selectedRequest.workOrder || selectedRequest.workOrderPath || "").trim()),
                    },
                    {
                      label: "License Copy",
                      type: "licenseDoc",
                      show: Boolean((selectedRequest.licenseDoc || selectedRequest.licenseDocPath || "").trim()),
                    },
                    {
                      label: "GSTIN Document",
                      type: "gst",
                      show: Boolean((selectedRequest.gstinDoc || selectedRequest.gstinDocPath || "").trim()),
                    },
                    {
                      label: "PAN Document",
                      type: "pan",
                      show: Boolean((selectedRequest.panDoc || selectedRequest.panDocPath || "").trim()),
                    },
                    {
                      label: "TAN Document",
                      type: "tan",
                      show: Boolean((selectedRequest.tanDoc || selectedRequest.tanDocPath || "").trim()),
                    },
                  ]
                    .filter((d) => d.show)
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

      {/* ── Profile Update Diff Modal ── */}
      <ProfileUpdateDiffModal
        request={selectedProfileUpdateRequest}
        isOpen={isProfileUpdateModalOpen}
        onClose={() => {
          setIsProfileUpdateModalOpen(false);
          setSelectedProfileUpdateRequest(null);
        }}
        onActionSuccess={() => fetchDashboardData()}
      />
    </div>
  );
}
