"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Plus, Download, ChevronRight, ChevronLeft,
  RefreshCw, RotateCcw, Edit3, Users, X,
  CheckSquare, FileStack, FileText, Car,
  CalendarDays, Eye, Globe, Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listBulkBatches, returnToApplicant, downloadBulkPdf,
  listPublicRequests, approvePublicRequest, rejectPublicRequest,
} from "@/lib/bulkPassApi";
import { computeBulkPassStats } from "@/lib/bulkPassStats";
import RequestsTable from "@/components/bulk-pass/RequestsTable.jsx";

const BASE = "/admin/bulk_pass";
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

// ── Department Batch Status Config ─────────────────────────────────────────────
const BATCH_STATUS_CFG = {
  DRAFT: {
    label: "Sent to User",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
  UNDER_REVIEW: {
    label: "Pending Approval",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  RETURNED_TO_APPLICANT: {
    label: "Returned",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    dot: "bg-purple-500",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

const fmtDateShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? v : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};
const visitorLabel = (v) => v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";

function BatchStatusBadge({ status }) {
  const cfg = BATCH_STATUS_CFG[status] || { label: status || "Unknown", badge: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
}

// ── Batch Action Button ───────────────────────────────────────────────────────
function BatchActionBtn({ batch, onEdit }) {
  const { status } = batch;
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition whitespace-nowrap border";
  if (status === "DRAFT")
    return <button onClick={() => onEdit(batch)} className={`${base} border-slate-200 text-slate-700 bg-white hover:bg-slate-50`}><Eye className="h-3.5 w-3.5" />View</button>;
  if (status === "RETURNED_TO_APPLICANT")
    return <button onClick={() => onEdit(batch)} className={`${base} border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100`}><Edit3 className="h-3.5 w-3.5" />Review Now</button>;
  if (status === "UNDER_REVIEW")
    return <button onClick={() => onEdit(batch)} className={`${base} border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100`}><CheckSquare className="h-3.5 w-3.5" />Review Now</button>;
  if (status === "REJECTED")
    return <button onClick={() => onEdit(batch)} className={`${base} border-red-200 text-red-700 bg-red-50 hover:bg-red-100`}><FileText className="h-3.5 w-3.5" />View Details</button>;
  if (status === "COMPLETED")
    return <button onClick={() => onEdit(batch)} className={`${base} border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}><Eye className="h-3.5 w-3.5" />View Pass</button>;
  return <button onClick={() => onEdit(batch)} className={`${base} border-slate-200 text-slate-600 bg-white hover:bg-slate-50`}><ChevronRight className="h-3.5 w-3.5" />View</button>;
}

// ── Return Modal for Department Batches ───────────────────────────────────────
function ReturnModal({ batchId, refNo, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please enter a return reason."); return; }
    setLoading(true);
    try { await returnToApplicant(batchId, reason.trim()); toast.success(`Batch ${refNo} returned.`); onSuccess(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to return batch."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Return to Applicant</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Batch: <span className="font-semibold text-slate-700">{refNo}</span></p>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
          Return Reason <span className="text-red-500">*</span>
        </label>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what needs to be corrected…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-400/50 resize-none transition" />
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition">
            {loading ? "Returning…" : "Return to Applicant"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Approval Modal for Public Requests ─────────────────────────────────
function QuickApprovalModal({ request, onClose, onApprove }) {
  const [validityFrom, setValidityFrom] = useState("");
  const [validityUpto, setValidityUpto] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      const today = new Date().toISOString().split("T")[0];
      setValidityFrom(today);
      setValidityUpto(request.validity_upto ? request.validity_upto.split("T")[0] : "");
    }
  }, [request]);

  const handleSubmit = async () => {
    if (!validityFrom || !validityUpto) { toast.error("Please select validity dates."); return; }
    if (new Date(validityFrom) >= new Date(validityUpto)) { toast.error("Validity from date must be before validity upto date."); return; }
    setLoading(true);
    try {
      await onApprove(request.id, { validityFrom, validityUpto, remarks: remarks.trim() || undefined });
      onClose();
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Approve Public Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Company: <span className="font-semibold text-slate-700">{request.company_name}</span></p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Validity From <span className="text-red-500">*</span>
            </label>
            <input type="date" value={validityFrom} onChange={(e) => setValidityFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Validity Upto <span className="text-red-500">*</span>
            </label>
            <input type="date" value={validityUpto} onChange={(e) => setValidityUpto(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Approval Remarks (Optional)</label>
            <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks for this approval…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none transition" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition">
            {loading ? "Approving…" : "Approve Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Rejection Modal for Public Requests ─────────────────────────────────
function QuickRejectionModal({ request, onClose, onReject }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please enter a rejection reason (minimum 10 characters).");
      return;
    }
    setLoading(true);
    try {
      await onReject(request.id, reason.trim());
      onClose();
    } catch (err) {
      console.error("Rejection error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Reject Public Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Company: <span className="font-semibold text-slate-700">{request.company_name}</span></p>
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed reason for rejecting this request (minimum 10 characters)…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400/50 resize-none transition" />
          <p className="text-xs text-slate-400 mt-1">Characters: {reason.length} / 10 minimum</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition">
            {loading ? "Rejecting…" : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Pass Combined Page Inner Component ───────────────────────────────────
function AdminBulkPassPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // User state
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const r = localStorage.getItem("user");
      if (r) setUser(JSON.parse(r));
    } catch {}
  }, []);

  const isAdmin = user && (user.role?.toLowerCase() === "admin" || user.role?.toLowerCase() === "administrator");
  const isGenAdmin = isAdmin || (user?.departmentName || user?.department_name || "").toLowerCase().trim() === "general administration" || Number(user?.departmentId || user?.department_id) === 6;

  // Main navigation tab ("DEPARTMENT" vs "PUBLIC")
  const initialMainTab = searchParams.get("tab") === "public" && isGenAdmin ? "PUBLIC" : "DEPARTMENT";
  const [mainTab, setMainTab] = useState(initialMainTab);

  // Update tab in URL state cleanly
  const handleMainTabChange = (newTab) => {
    setMainTab(newTab);
    const url = newTab === "PUBLIC" ? `${BASE}?tab=public` : BASE;
    router.replace(url, { scroll: false });
  };

  // ── DEPARTMENT BATCHES STATE ──
  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchActiveTab, setBatchActiveTab] = useState("ALL");
  const [batchSearch, setBatchSearch] = useState("");
  const [batchFromDate, setBatchFromDate] = useState("");
  const [batchToDate, setBatchToDate] = useState("");
  const [batchPageSize, setBatchPageSize] = useState(15);
  const [batchPage, setBatchPage] = useState(1);
  const [returnModal, setReturnModal] = useState(null);
  const [multipleSubmissionsFilter, setMultipleSubmissionsFilter] = useState(null);

  // ── PUBLIC REQUESTS STATE ──
  const [publicRequests, setPublicRequests] = useState([]);
  const [allPublicRequests, setAllPublicRequests] = useState([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicActiveTab, setPublicActiveTab] = useState("ALL");
  const [publicSearch, setPublicSearch] = useState("");
  const [publicFromDate, setPublicFromDate] = useState("");
  const [publicToDate, setPublicToDate] = useState("");
  const [publicPageSize, setPublicPageSize] = useState(15);
  const [publicPage, setPublicPage] = useState(1);
  const [quickApproveReq, setQuickApproveReq] = useState(null);
  const [quickRejectReq, setQuickRejectReq] = useState(null);

  // ── Access Guards ──
  const BULK_PASS_CREATOR_DEPT_IDS = [6, 9, 10, 11, 12, 13, 14, 15];
  const canCreateBatch = (() => {
    if (!user) return false;
    const role = (user.role || "").toLowerCase();
    if (role === "admin" || role === "administrator" || role === "super admin" || role === "superadmin") return true;
    return BULK_PASS_CREATOR_DEPT_IDS.includes(Number(user.departmentId));
  })();

  // Department Batches Stats
  const batchStats = useMemo(() => computeBulkPassStats(allBatches), [allBatches]);
  const batchSummary = batchStats?.summary || {};

  // Public Requests Stats
  const publicSummary = useMemo(() => {
    const total = allPublicRequests.length;
    const pending = allPublicRequests.filter(r => r.status === "PENDING_ADMIN_APPROVAL").length;
    const active = allPublicRequests.filter(r => r.status === "ACTIVE").length;
    const rejected = allPublicRequests.filter(r => r.status === "REJECTED_BY_ADMIN").length;
    const expired = allPublicRequests.filter(r => r.status === "EXPIRED").length;
    return { total, pending, active, rejected, expired };
  }, [allPublicRequests]);

  // ── Fetch Department Batches ──
  const fetchAllBatches = useCallback(async () => {
    try {
      const filters = {};
      if (multipleSubmissionsFilter !== null) filters.multipleSubmissionsEnabled = multipleSubmissionsFilter;
      const data = await listBulkBatches(filters);
      setAllBatches(Array.isArray(data) ? data : []);
    } catch {}
  }, [multipleSubmissionsFilter]);

  const fetchBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const filters = {};
      if (batchSearch.trim()) filters.search = batchSearch.trim();
      if (batchActiveTab !== "ALL") filters.status = batchActiveTab;
      if (batchFromDate) filters.fromDate = batchFromDate;
      if (batchToDate) filters.toDate = batchToDate;
      if (multipleSubmissionsFilter !== null) filters.multipleSubmissionsEnabled = multipleSubmissionsFilter;
      const data = await listBulkBatches(filters);
      setBatches(Array.isArray(data) ? data : []);
      setBatchPage(1);
    } catch { toast.error("Failed to load department bulk passes."); setBatches([]); }
    finally { setBatchLoading(false); }
  }, [batchSearch, batchActiveTab, batchFromDate, batchToDate, multipleSubmissionsFilter]);

  // ── Fetch Public Requests ──
  const fetchAllPublicRequests = useCallback(async () => {
    if (!isGenAdmin) return;
    try {
      const data = await listPublicRequests();
      setAllPublicRequests(Array.isArray(data) ? data : []);
    } catch {}
  }, [isGenAdmin]);

  const fetchPublicRequests = useCallback(async () => {
    if (!isGenAdmin) return;
    setPublicLoading(true);
    try {
      const filters = {};
      if (publicSearch.trim()) filters.search = publicSearch.trim();
      if (publicActiveTab !== "ALL") filters.status = publicActiveTab;
      if (publicFromDate) filters.fromDate = publicFromDate;
      if (publicToDate) filters.toDate = publicToDate;
      const data = await listPublicRequests(filters);
      setPublicRequests(Array.isArray(data) ? data : []);
      setPublicPage(1);
    } catch { toast.error("Failed to load public website requests."); setPublicRequests([]); }
    finally { setPublicLoading(false); }
  }, [publicSearch, publicActiveTab, publicFromDate, publicToDate, isGenAdmin]);

  useEffect(() => {
    fetchAllBatches();
    if (isGenAdmin) fetchAllPublicRequests();
  }, [fetchAllBatches, fetchAllPublicRequests, isGenAdmin]);

  useEffect(() => {
    if (mainTab === "DEPARTMENT") fetchBatches();
    else if (mainTab === "PUBLIC") fetchPublicRequests();
  }, [mainTab, fetchBatches, fetchPublicRequests]);

  // Real-time polling
  useEffect(() => {
    if (mainTab === "DEPARTMENT" && multipleSubmissionsFilter !== null) {
      const intervalId = setInterval(() => { fetchBatches(); }, 8000);
      return () => clearInterval(intervalId);
    }
  }, [mainTab, multipleSubmissionsFilter, fetchBatches]);

  const handleRefresh = () => {
    if (mainTab === "DEPARTMENT") { fetchBatches(); fetchAllBatches(); }
    else { fetchPublicRequests(); fetchAllPublicRequests(); }
  };

  // Public quick actions
  const handleQuickApprove = async (id, data) => {
    try {
      await approvePublicRequest(id, data);
      toast.success("Public request approved successfully");
      fetchPublicRequests();
      fetchAllPublicRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve public request.");
      throw err;
    }
  };

  const handleQuickReject = async (id, reason) => {
    try {
      await rejectPublicRequest(id, reason);
      toast.success("Public request rejected");
      fetchPublicRequests();
      fetchAllPublicRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject public request.");
      throw err;
    }
  };

  // Department Batches Pagination
  const batchTotalPages = Math.max(1, Math.ceil(batches.length / batchPageSize));
  const batchPaginated = batches.slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize);
  const batchHasFilters = batchSearch || batchFromDate || batchToDate;

  // Public Requests Pagination
  const publicTotalPages = Math.max(1, Math.ceil(publicRequests.length / publicPageSize));
  const publicPaginated = publicRequests.slice((publicPage - 1) * publicPageSize, publicPage * publicPageSize);
  const publicHasFilters = publicSearch || publicFromDate || publicToDate;

  return (
    <div className="pt-6 pb-10 flex flex-col gap-6" style={{ fontFamily: "'Inter', 'Montserrat', Arial, sans-serif" }}>

      {/* ── TOP HEADER & SUB-NAVIGATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bulk Pass Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage internal department bulk pass batches and public website applications
          </p>
        </div>

        {/* Sub-nav Pill Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => handleMainTabChange("DEPARTMENT")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                mainTab === "DEPARTMENT"
                  ? "bg-white text-slate-900 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileStack className="h-3.5 w-3.5 text-amber-500" />
              Department Batches
              {batchSummary.underReview > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[10px]">
                  {batchSummary.underReview}
                </span>
              )}
            </button>

            {isGenAdmin && (
              <button
                onClick={() => handleMainTabChange("PUBLIC")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                  mainTab === "PUBLIC"
                    ? "bg-white text-slate-900 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-sky-500" />
                Public Website Requests
                {publicSummary.pending > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-sky-500 text-white text-[10px]">
                    {publicSummary.pending}
                  </span>
                )}
              </button>
            )}
          </div>

          <button onClick={handleRefresh} title="Refresh Data"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-500 shadow-sm shrink-0">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: DEPARTMENT BATCHES ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === "DEPARTMENT" && (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                key: "ALL", label: "Total Batches", value: batchSummary.totalBatches ?? 0,
                active: "bg-slate-900 text-white shadow-lg shadow-slate-900/20",
                inactive: "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm",
                countCls: { active: "bg-white/20 text-white", inactive: "bg-slate-100 text-slate-600" },
                valueCls: { active: "text-white", inactive: "text-slate-900" },
                labelCls: { active: "text-slate-300", inactive: "text-slate-400" },
              },
              {
                key: "UNDER_REVIEW", label: "Pending Approval", value: batchSummary.underReview ?? 0,
                active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
                inactive: "bg-amber-50 border border-amber-200 text-amber-800 hover:border-amber-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-amber-100 text-amber-700" },
                valueCls: { active: "text-white", inactive: "text-amber-700" },
                labelCls: { active: "text-amber-100", inactive: "text-amber-500" },
              },
              {
                key: "RETURNED_TO_APPLICANT", label: "Returned", value: batchSummary.returned ?? 0,
                active: "bg-purple-600 text-white shadow-lg shadow-purple-600/30",
                inactive: "bg-purple-50 border border-purple-200 text-purple-800 hover:border-purple-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-purple-100 text-purple-700" },
                valueCls: { active: "text-white", inactive: "text-purple-700" },
                labelCls: { active: "text-purple-100", inactive: "text-purple-500" },
              },
              {
                key: "REJECTED", label: "Rejected", value: batchSummary.rejected ?? 0,
                active: "bg-red-500 text-white shadow-lg shadow-red-500/30",
                inactive: "bg-red-50 border border-red-200 text-red-800 hover:border-red-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-red-100 text-red-700" },
                valueCls: { active: "text-white", inactive: "text-red-600" },
                labelCls: { active: "text-red-100", inactive: "text-red-400" },
              },
              {
                key: "COMPLETED", label: "Approved", value: batchSummary.completed ?? 0,
                active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                inactive: "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-emerald-100 text-emerald-700" },
                valueCls: { active: "text-white", inactive: "text-emerald-700" },
                labelCls: { active: "text-emerald-100", inactive: "text-emerald-500" },
              },
              {
                key: "DRAFT", label: "Sent to Applicant", value: batchSummary.draft ?? 0,
                active: "bg-sky-500 text-white shadow-lg shadow-sky-500/30",
                inactive: "bg-sky-50 border border-sky-200 text-sky-800 hover:border-sky-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-sky-100 text-sky-700" },
                valueCls: { active: "text-white", inactive: "text-sky-700" },
                labelCls: { active: "text-sky-100", inactive: "text-sky-500" },
              },
            ].map((card) => {
              const isActive = batchActiveTab === card.key;
              return (
                <button key={card.key} onClick={() => { setBatchActiveTab(card.key); setBatchPage(1); }}
                  className={`relative flex flex-col gap-2 px-4 py-4 rounded-2xl text-left transition-all duration-150 active:scale-[0.97] ${
                    isActive ? card.active : card.inactive
                  }`}>
                  <div className="flex items-start justify-between">
                    <p className={`text-3xl font-extrabold tabular-nums leading-none ${isActive ? card.valueCls.active : card.valueCls.inactive}`}>
                      {card.value}
                    </p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${isActive ? card.countCls.active : card.countCls.inactive}`}>
                      {card.value}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold leading-tight ${isActive ? card.labelCls.active : card.labelCls.inactive}`}>
                    {card.label}
                  </p>
                  {isActive && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-white/40" />}
                </button>
              );
            })}
          </div>

          {/* FILTER ROW */}
          <div className="flex flex-wrap items-center gap-3">
            {canCreateBatch && (
              <button onClick={() => router.push(`${BASE}/create`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#1f1f1f] font-bold text-sm transition shadow-sm shrink-0">
                <Plus className="h-4 w-4" strokeWidth={2.5} />New Bulk Pass
              </button>
            )}

            <button
              onClick={() => setMultipleSubmissionsFilter(multipleSubmissionsFilter === null ? true : null)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                multipleSubmissionsFilter !== null ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Multiple Submissions
              {multipleSubmissionsFilter !== null && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                  {allBatches.filter((b) => b.multipleSubmissionsEnabled).length}
                </span>
              )}
            </button>

            <div className="h-8 w-px bg-slate-200 shrink-0" />

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by ref number or company…" value={batchSearch}
                onChange={(e) => { setBatchSearch(e.target.value); setBatchPage(1); }}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition placeholder:text-slate-400 text-slate-800 shadow-sm" />
              {batchSearch && (
                <button onClick={() => { setBatchSearch(""); setBatchPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input type="date" value={batchFromDate} onChange={(e) => { setBatchFromDate(e.target.value); setBatchPage(1); }}
                className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
            </div>
            <span className="text-slate-300 text-xs font-medium">to</span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input type="date" value={batchToDate} onChange={(e) => { setBatchToDate(e.target.value); setBatchPage(1); }}
                className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
            </div>

            {batchHasFilters && (
              <button onClick={() => { setBatchSearch(""); setBatchFromDate(""); setBatchToDate(""); setBatchPage(1); }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
                <X className="h-3.5 w-3.5" />Clear
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400 hidden sm:inline">{batches.length} result{batches.length !== 1 ? "s" : ""}</span>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {batchLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="h-9 w-9 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400">Loading department batches…</p>
              </div>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileStack className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-slate-700">
                  {batchHasFilters || batchActiveTab !== "ALL" ? "No batches match your filters" : "No department bulk pass batches yet"}
                </p>
                <p className="text-sm text-slate-400">
                  {batchHasFilters || batchActiveTab !== "ALL" ? "Try adjusting your search or filters." : "Create your first bulk pass to get started."}
                </p>
                {!batchHasFilters && batchActiveTab === "ALL" && canCreateBatch && (
                  <button onClick={() => router.push(`${BASE}/create`)}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#1f1f1f] font-bold text-sm transition">
                    <Plus className="h-4 w-4" />New Bulk Pass
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Status", "Batch ID", "Company", "Persons", "Vehicles", "Submitted On", "Action"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {batchPaginated.map((batch) => (
                        <tr key={batch.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          onClick={() => router.push(`${BASE}/${batch.id}`)}>
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <BatchStatusBadge status={batch.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm font-mono group-hover:text-amber-600 transition-colors">
                                {batch.refNo || "—"}
                              </p>
                              {batch.multipleSubmissionsEnabled && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">
                                  Multi
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{visitorLabel(batch.visitorType)}</p>
                          </td>
                          <td className="px-5 py-3.5 max-w-[200px]">
                            <p className="font-medium text-slate-800 truncate" title={batch.companyName}>{batch.companyName || "—"}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700 tabular-nums">{batch.noOfPersons ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700 tabular-nums">{batch.noOfVehicles ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-xs">
                            {fmtDateShort(batch.updatedAt || batch.createdAt)}
                          </td>
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <BatchActionBtn batch={batch} onEdit={(b) => router.push(`${BASE}/${b.id}`)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Rows per page:</span>
                    <select value={batchPageSize} onChange={(e) => { setBatchPageSize(Number(e.target.value)); setBatchPage(1); }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                      {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="ml-2 font-semibold text-slate-700">
                      {(batchPage - 1) * batchPageSize + 1}–{Math.min(batchPage * batchPageSize, batches.length)} of {batches.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button disabled={batchPage === 1} onClick={() => setBatchPage(1)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">«</button>
                    <button disabled={batchPage === 1} onClick={() => setBatchPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">
                      <ChevronLeft className="h-3.5 w-3.5" />Previous
                    </button>
                    <button disabled={batchPage === batchTotalPages} onClick={() => setBatchPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">
                      Next<ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button disabled={batchPage === batchTotalPages} onClick={() => setBatchPage(batchTotalPages)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">»</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: PUBLIC WEBSITE REQUESTS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === "PUBLIC" && isGenAdmin && (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                key: "ALL", label: "Total Requests", value: publicSummary.total,
                active: "bg-slate-900 text-white shadow-lg shadow-slate-900/20",
                inactive: "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm",
                countCls: { active: "bg-white/20 text-white", inactive: "bg-slate-100 text-slate-600" },
                valueCls: { active: "text-white", inactive: "text-slate-900" },
                labelCls: { active: "text-slate-300", inactive: "text-slate-400" },
              },
              {
                key: "PENDING_ADMIN_APPROVAL", label: "Pending Review", value: publicSummary.pending,
                active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
                inactive: "bg-amber-50 border border-amber-200 text-amber-800 hover:border-amber-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-amber-100 text-amber-700" },
                valueCls: { active: "text-white", inactive: "text-amber-700" },
                labelCls: { active: "text-amber-100", inactive: "text-amber-500" },
              },
              {
                key: "ACTIVE", label: "Approved", value: publicSummary.active,
                active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                inactive: "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-emerald-100 text-emerald-700" },
                valueCls: { active: "text-white", inactive: "text-emerald-700" },
                labelCls: { active: "text-emerald-100", inactive: "text-emerald-500" },
              },
              {
                key: "REJECTED_BY_ADMIN", label: "Rejected", value: publicSummary.rejected,
                active: "bg-red-500 text-white shadow-lg shadow-red-500/30",
                inactive: "bg-red-50 border border-red-200 text-red-800 hover:border-red-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-red-100 text-red-700" },
                valueCls: { active: "text-white", inactive: "text-red-600" },
                labelCls: { active: "text-red-100", inactive: "text-red-400" },
              },
              {
                key: "EXPIRED", label: "Expired", value: publicSummary.expired,
                active: "bg-slate-600 text-white shadow-lg shadow-slate-600/30",
                inactive: "bg-slate-100 border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm",
                countCls: { active: "bg-white/25 text-white", inactive: "bg-slate-200 text-slate-700" },
                valueCls: { active: "text-white", inactive: "text-slate-700" },
                labelCls: { active: "text-slate-200", inactive: "text-slate-500" },
              },
            ].map((card) => {
              const isActive = publicActiveTab === card.key;
              return (
                <button key={card.key} onClick={() => { setPublicActiveTab(card.key); setPublicPage(1); }}
                  className={`relative flex flex-col gap-2 px-4 py-4 rounded-2xl text-left transition-all duration-150 active:scale-[0.97] ${
                    isActive ? card.active : card.inactive
                  }`}>
                  <div className="flex items-start justify-between">
                    <p className={`text-3xl font-extrabold tabular-nums leading-none ${isActive ? card.valueCls.active : card.valueCls.inactive}`}>
                      {card.value}
                    </p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${isActive ? card.countCls.active : card.countCls.inactive}`}>
                      {card.value}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold leading-tight ${isActive ? card.labelCls.active : card.labelCls.inactive}`}>
                    {card.label}
                  </p>
                  {isActive && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-white/40" />}
                </button>
              );
            })}
          </div>

          {/* FILTER ROW */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search tracking no, email, company…" value={publicSearch}
                onChange={(e) => { setPublicSearch(e.target.value); setPublicPage(1); }}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition text-slate-800 shadow-sm" />
              {publicSearch && (
                <button onClick={() => { setPublicSearch(""); setPublicPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input type="date" value={publicFromDate} onChange={(e) => { setPublicFromDate(e.target.value); setPublicPage(1); }}
                className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
            </div>
            <span className="text-slate-300 text-xs font-medium">to</span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input type="date" value={publicToDate} onChange={(e) => { setPublicToDate(e.target.value); setPublicPage(1); }}
                className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
            </div>

            {publicHasFilters && (
              <button onClick={() => { setPublicSearch(""); setPublicFromDate(""); setPublicToDate(""); setPublicPage(1); }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
                <X className="h-3.5 w-3.5" />Clear
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400 hidden sm:inline">{publicRequests.length} result{publicRequests.length !== 1 ? "s" : ""}</span>
          </div>

          {/* REQUESTS TABLE */}
          <RequestsTable
            requests={publicPaginated}
            loading={publicLoading}
            onView={(req) => router.push(`/admin/public-requests/${req.id}`)}
            onQuickApprove={(req) => setQuickApproveReq(req)}
            onQuickReject={(req) => setQuickRejectReq(req)}
            hasFilters={publicHasFilters || publicActiveTab !== "ALL"}
          />

          {/* PUBLIC PAGINATION */}
          {!publicLoading && publicRequests.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-2xl border">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows per page:</span>
                <select value={publicPageSize} onChange={(e) => { setPublicPageSize(Number(e.target.value)); setPublicPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-2 font-semibold text-slate-700">
                  {(publicPage - 1) * publicPageSize + 1}–{Math.min(publicPage * publicPageSize, publicRequests.length)} of {publicRequests.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button disabled={publicPage === 1} onClick={() => setPublicPage(1)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">«</button>
                <button disabled={publicPage === 1} onClick={() => setPublicPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" />Previous
                </button>
                <button disabled={publicPage === publicTotalPages} onClick={() => setPublicPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">
                  Next<ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button disabled={publicPage === publicTotalPages} onClick={() => setPublicPage(publicTotalPages)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 disabled:opacity-40">»</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {returnModal && (
        <ReturnModal batchId={returnModal.batchId} refNo={returnModal.refNo}
          onClose={() => setReturnModal(null)}
          onSuccess={() => { setReturnModal(null); fetchBatches(); fetchAllBatches(); }} />
      )}

      {quickApproveReq && (
        <QuickApprovalModal request={quickApproveReq} onClose={() => setQuickApproveReq(null)} onApprove={handleQuickApprove} />
      )}

      {quickRejectReq && (
        <QuickRejectionModal request={quickRejectReq} onClose={() => setQuickRejectReq(null)} onReject={handleQuickReject} />
      )}
    </div>
  );
}

export default function AdminBulkPassListPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-9 w-9 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Loading Bulk Pass Console…</p>
      </div>
    }>
      <AdminBulkPassPageContent />
    </Suspense>
  );
}
