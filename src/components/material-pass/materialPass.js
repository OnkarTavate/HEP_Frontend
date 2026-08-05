"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle2,
  Search,
  History,
  ShieldAlert,
  Clock,
  XCircle,
  X,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  MapPinned,
  Package,
  Recycle,
  CornerUpLeft,
  Pencil,
  Eye,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// NOTE: confirm/replace this with your actual backend endpoint for material
// pass decisions. This mirrors the pattern used by the normal pass page's
// `agent-pass-request-action` endpoint but is a material-pass-specific guess.
const MATERIAL_ACTION_URL = `${ADMIN_API}/material-pass/material-pass-request-action`;

// --- Static metadata describing the two possible material pass types ---
const PASS_TYPE_META = {
  returnable: {
    key: "returnable",
    dataKey: "returnablePass",
    apiValue: "RETURNABLE",
    label: "Returnable pass",
    icon: Recycle,
  },
  nonReturnable: {
    key: "nonReturnable",
    dataKey: "nonReturnablePass",
    apiValue: "NON_RETURNABLE",
    label: "Non-returnable pass",
    icon: Package,
  },
};

const STATUS_STYLES = {
  APPROVED: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    header: "bg-emerald-50",
    headerText: "text-emerald-700",
    border: "border-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    header: "bg-red-50",
    headerText: "text-red-700",
    border: "border-red-400",
    icon: XCircle,
  },
  REVERTED: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    header: "bg-amber-50",
    headerText: "text-amber-700",
    border: "border-amber-400 border-dashed",
    icon: CornerUpLeft,
  },
};

const REVIEWED_STATUSES = ["APPROVED", "REJECTED", "REVERTED"];

// --- One card per pass type: expanded (needs review) or collapsed (decided) ---
function MaterialPassCard({
  meta,
  pass,
  decision,
  isViewMode,
  onDecision,
  onRemarksChange,
  onReopen,
  cardRef,
}) {
  const Icon = meta.icon;
  const materials = pass?.materials || [];
  const isDecided = REVIEWED_STATUSES.includes(
    (decision.status || "").toUpperCase()
  );
  const style = isDecided ? STATUS_STYLES[decision.status] : null;

  // --- Collapsed summary strip (decided pass, or view mode default) ---
  if (decision.collapsed) {
    const StatusIcon = style.icon;
    return (
      <div
        ref={cardRef}
        className={`bg-white rounded-xl border ${style.border} border-l-4 ${style.bar.replace(
          "bg-",
          "border-l-",
        )} shadow-sm flex items-center justify-between px-5 py-4 mb-3 transition-all duration-200`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#0a1e4d] truncate">
              {meta.label}
            </div>
            <div className="text-xs text-slate-500">
              {materials.length} item{materials.length === 1 ? "" : "s"}
              {decision.remarks ? " · has remarks" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${style.badge}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {decision.status}
          </span>
          <button
            onClick={() => onReopen(meta.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {isViewMode ? (
              <>
                <Eye className="h-3.5 w-3.5" /> View details
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Re-verify
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Expanded card: full materials table + remarks + decision buttons ---
  return (
    <div
      ref={cardRef}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-3"
    >
      <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {meta.label}
        </h4>
        {isDecided ? (
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${style.badge}`}
          >
            {decision.status}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Not reviewed
          </span>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="p-3 font-semibold text-slate-600 uppercase text-xs">S.No.</th>
            <th className="p-3 font-semibold text-slate-600 uppercase text-xs">Item Name</th>
            <th className="p-3 font-semibold text-slate-600 uppercase text-xs">Quantity</th>
            <th className="p-3 font-semibold text-slate-600 uppercase text-xs">Unit</th>
            <th className="p-3 font-semibold text-slate-600 uppercase text-xs">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {materials.map((item, index) => (
            <tr key={index}>
              <td className="p-3 text-slate-800 font-mono font-bold text-xs">{index + 1}</td>
              <td className="p-3 font-bold text-[#0a1e4d]">{item.name}</td>
              <td className="p-3 text-slate-600 font-mono text-xs">{item.quantity}</td>
              <td className="p-3 text-slate-800 font-mono font-bold text-xs">{item.unit}</td>
              <td className="p-3 text-slate-600">{item.description || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(!isViewMode || ["Rejected", "Reverted"].includes(pass?.status)) && (
        <div className="bg-orange-50 p-5 border-t border-orange-100">
          <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">
            {isViewMode
              ? "Authority remarks"
              : "Authority remarks (required for reject or revert)"}
          </label>

          <textarea
            value={decision.remarks || ""}
            onChange={(e) => onRemarksChange(meta.key, e.target.value)}
            disabled={isViewMode}
            rows={3}
            className="w-full border border-orange-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
            placeholder="Enter authority remarks..."
          />
        </div>
      )}

      {!isViewMode && (
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white">
          <button
            onClick={() => onDecision(meta.key, "REJECTED")}
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors"
          >
            <XCircle className="h-5 w-5" /> Reject
          </button>
          <button
            onClick={() => onDecision(meta.key, "REVERTED")}
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 transition-colors"
          >
            <CornerUpLeft className="h-5 w-5" /> Revert
          </button>
          <button
            onClick={() => onDecision(meta.key, "APPROVED")}
            className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle2 className="h-5 w-5" /> Approve
          </button>
        </div>
      )}
    </div>
  );
}

export default function MaterialPassPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [cardFilter, setCardFilter] = useState("ALL");
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [processedByMe, setProcessedByMe] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({ total: 0, pending: 0, processed: 0 });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [passDecision, setPassDecision] = useState({
    returnable: { status: "", remarks: "", collapsed: false },
    nonReturnable: { status: "", remarks: "", collapsed: false },
  });
  const [justCompleted, setJustCompleted] = useState(false);
  const wasAllReviewedRef = useRef(false);
  const cardRefs = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPassRequests = useCallback(
    async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${ADMIN_API}/material-pass/material-pass-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: currentPage,
              limit: pageSize,
              search: debouncedSearch || undefined,
              status: activeTab || undefined,
              sortOrder:
                sortBy === "DATE_ASC" ? "ASC" : sortBy === "EXPIRY_SOON" ? "EXPIRY_SOON" : "DESC",
              processedByMe: processedByMe ? "true" : undefined,
            },
          },
        );

        if (response.data && response.data.success) {
          const newRequests = response.data.data || [];
          const newMeta = response.data.pagination || {};
          const newCounts = response.data.counts || { total: 0, pending: 0, processed: 0 };

          setRequests((prev) =>
            JSON.stringify(newRequests) === JSON.stringify(prev) ? prev : newRequests,
          );
          setPaginationMeta((prev) =>
            JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta,
          );
          setGlobalCounts((prev) =>
            JSON.stringify(newCounts) === JSON.stringify(prev) ? prev : newCounts,
          );
        } else {
          setRequests((prev) => (prev.length === 0 ? prev : []));
        }
      } catch (error) {
        console.error("Failed to fetch requests", error);
        if (!isPoll) toast.error("Failed to load pass requests.");
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, activeTab, sortBy, processedByMe],
  );

  useEffect(() => {
    fetchPassRequests(false);
    const interval = setInterval(() => fetchPassRequests(true), 5000);
    return () => clearInterval(interval);
  }, [fetchPassRequests]);

  // --- Which pass types actually exist on the selected request
  const getApplicablePassKeys = useCallback((request) => {
    if (!request) return [];

    return Object.values(PASS_TYPE_META)
      .filter((meta) => !!request[meta.dataKey])
      .map((meta) => meta.key);
  }, []);

  const applicablePassKeys = getApplicablePassKeys(selectedRequest);

  const allReviewed =
    applicablePassKeys.length > 0 &&
    applicablePassKeys.every((key) =>
      REVIEWED_STATUSES.includes(
        (passDecision[key]?.status || "").toUpperCase()
      )
    );

  // Trigger a brief "just completed" pulse on the submit button the moment
  // the last remaining pass type gets decided.
  useEffect(() => {
    if (allReviewed && !wasAllReviewedRef.current && !isViewMode) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 900);
      wasAllReviewedRef.current = true;
      return () => clearTimeout(t);
    }
    if (!allReviewed) wasAllReviewedRef.current = false;
  }, [allReviewed, isViewMode]);

  const handleRemarksChange = (key, value) => {
    setPassDecision((prev) => ({
      ...prev,
      [key]: { ...prev[key], remarks: value },
    }));
  };

  const handlePassDecision = (key, decision) => {
    const current = passDecision[key];
    if ((decision === "REJECTED" || decision === "REVERTED") && !current.remarks?.trim()) {
      toast.error("Remarks are mandatory.", {
        description:
          decision === "REVERTED"
            ? "Explain what needs to be corrected before reverting."
            : "Explain why this pass is being rejected.",
      });
      return;
    }

    setPassDecision((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: decision, collapsed: true },
    }));

    // // Scroll the next pending card into view once this one collapses.
    // setTimeout(() => {
    //   const remaining = applicablePassKeys.filter(
    //     (k) => k !== key && !passDecision[k]?.collapsed,
    //   );
    //   const nextKey = remaining[0];
    //   if (nextKey && cardRefs.current[nextKey]) {
    //     cardRefs.current[nextKey].scrollIntoView({ behavior: "smooth", block: "nearest" });
    //   }
    // }, 220);
  };

  const handleReopen = (key) => {
    setPassDecision((prev) => ({
      ...prev,
      [key]: { ...prev[key], collapsed: false },
    }));
  };

  const handleSubmitReview = async () => {
    if (!allReviewed) {
      toast.warning("Incomplete Verification", {
        description: "Review every material pass on this request before submitting.",
      });
      return;
    }

    const loadingToastId = toast.loading("Submitting review to backend...");

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      const passesPayload = applicablePassKeys.map((key) => {
        const meta = PASS_TYPE_META[key];
        const decision = passDecision[key];
        return {
          passType: meta.apiValue,
          decision: decision.status,
          remarks: decision.remarks || undefined,
        };
      });

      const response = await axios.patch(
        MATERIAL_ACTION_URL,
        {
          passRequestId: selectedRequest.id,
          passes: passesPayload,
          decision: "complete-review",
        },
        { headers },
      );

      const responseMessage = response.data?.data?.message;

      toast.success("Review Submitted", {
        id: loadingToastId,
        description: responseMessage || "Material pass review processed successfully.",
      });

      setIsModalOpen(false);
      fetchPassRequests();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        id: loadingToastId,
        description:
          error.response?.data?.message || "Failed to submit review to backend.",
      });
    }
  };

  const openReviewModal = (pass, viewOnly = false) => {
    setSelectedRequest(pass);

    const buildDecision = (passData) => {
      const status = (passData?.status || "").toUpperCase();

      const reviewedStatuses = ["APPROVED", "REJECTED", "REVERTED"];

      return {
        status,
        remarks: passData?.remarks || passData?.rejectedReason || "",
        collapsed: reviewedStatuses.includes(status),
      };
    };

    setPassDecision({
      returnable: buildDecision(pass.returnablePass),
      nonReturnable: buildDecision(pass.nonReturnablePass),
    });

    setIsViewMode(viewOnly);
    setIsModalOpen(true);
  };

  const filteredData = requests;

  const handleCardClick = (tab, filter) => {
    setActiveTab(tab);
    setCardFilter(filter);
    setSearchInput("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans relative">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        <div
          onClick={() => handleCardClick("pending", "ALL")}
          className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Passes
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800">
              <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[#0a1e4d] dark:text-stone-100 tabular-nums">
            {globalCounts.total}
          </p>
        </div>

        <div
          onClick={() => handleCardClick("pending", "ALL")}
          className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              Pending
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
            {globalCounts.pending}
          </p>
        </div>

        <div
          onClick={() => handleCardClick("processed", "ALL")}
          className="col-span-2 sm:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Processed
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
            {globalCounts.processed}
          </p>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1e4d] dark:text-stone-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#ff6b00]" strokeWidth={2.5} />
            Material Pass Approvals
          </h2>
          <p className="text-sm text-slate-500 dark:text-stone-400 mt-0.5">
            Review and authorize Material passes
          </p>
        </div>
        <button
          onClick={() => fetchPassRequests(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1e4d] hover:bg-blue-900 text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-0">
        {[
          { id: "pending", label: "Pending Approvals", count: globalCounts.pending },
          { id: "processed", label: "Processed Passes", count: globalCounts.processed },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCardFilter("ALL");
              setSearchInput("");
              setProcessedByMe(false);
              setCurrentPage(1);
            }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-[#0a1e4d] text-white shadow"
                : "text-slate-500 hover:text-[#0a1e4d] hover:bg-slate-100"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl ring-1 ring-slate-200/60 dark:ring-white/5 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="font-bold text-slate-800 dark:text-stone-100 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <>
                <ShieldAlert className="h-4 w-4 text-[#ff6b00]" /> Awaiting Review
              </>
            ) : (
              <>
                <History className="h-4 w-4 text-emerald-500" /> Processed Passes
              </>
            )}
          </h3>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            {activeTab === "processed" && (
              <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  id="processed-by-me-filter"
                  checked={processedByMe}
                  onChange={(e) => {
                    setProcessedByMe(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <span>Processed By Me</span>
              </label>
            )}

            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-[#ff6b00] appearance-none cursor-pointer"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
                <option value="EXPIRY_SOON">Expiring Soon</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Ref ID, Name, Reg No..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#ff6b00]"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear Search"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-700/40">
                {(activeTab === "processed"
                  ? ["Ref No", "Company Details", "Pass Types", "Applied On", "Approved By", "Status"]
                  : ["Ref No", "Company Details", "Pass Types", "Applied On", "Status"]
                ).map((h) => {
                  const vis =
                    h === "Pass Types"
                      ? "hidden sm:table-cell"
                      : h === "Applied On"
                        ? "hidden md:table-cell"
                        : h === "Approved By"
                          ? "hidden lg:table-cell"
                          : "";
                  return (
                    <th
                      key={h}
                      className={`px-4 sm:px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                        h === "Status" ? "text-center" : ""
                      } ${vis}`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found for the current filter/search.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => {
                  const statusColors = {
                    approved:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    processed:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
                    reverted:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
                    rejected:
                      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
                  };
                  const statusKey = (pass.status || "").toLowerCase();
                  const statusClass =
                    statusColors[statusKey] ||
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";

                  const passTypeLabel = pass.surplusPass
                    ? "Surplus"
                    : pass.debrisPass
                      ? "Debris"
                      : pass.auctionPass
                        ? "Auction"
                        : pass.returnablePass || pass.nonReturnablePass
                          ? "Regular"
                          : "-";

                  return (
                    <tr
                      key={pass?.originType === "VENDOR" ? `vpr-${pass.id}` : pass.id}
                      onClick={() => openReviewModal(pass, activeTab === "processed")}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-[#0a1e4d] dark:text-stone-200 font-mono">
                        {pass.referenceNo || `REQ-${pass.id}`}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                            {(pass.companyName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 dark:text-stone-100 truncate">
                              {pass.companyName || "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {pass.email || "—"}
                            </div>
                            <div className="sm:hidden mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                {passTypeLabel}
                              </span>
                              <span>{new Date(pass.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                        <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200 dark:border-blue-500/20">
                          {passTypeLabel}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {new Date(pass.createdAt).toLocaleDateString()}
                      </td>
                      {activeTab === "processed" && (
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                          {pass.approvedBy || "—"}
                        </td>
                      )}
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusClass}`}>
                          {(pass.status || "PENDING").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 pb-4">
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

      {/* ============================================================== */}
      {/* MAIN REQUEST VERIFICATION MODAL */}
      {/* ============================================================== */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold tracking-wide truncate">
                  {isViewMode ? "View Processed Pass" : "Review Submissions"}:{" "}
                  {selectedRequest.referenceNo || `REQ-${selectedRequest.id}`}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-2 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Company Details
                    </h3>
                  </div>
                  <h2 className="text-lg font-bold text-[#0a1e4d] break-words mb-5">
                    {selectedRequest.companyName || "N/A"}
                  </h2>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Email</span>
                      <span className="text-sm font-medium text-slate-800 break-all sm:text-right">
                        {selectedRequest.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Phone</span>
                      <span className="text-sm font-medium text-slate-800">
                        {selectedRequest.mobileNo || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">GST</span>
                      <span className="text-sm font-medium text-slate-800 break-all sm:text-right">
                        {selectedRequest.gstinNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">PAN</span>
                      <span className="text-sm font-medium text-slate-800">
                        {selectedRequest.panNumber || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <MapPinned className="h-5 w-5 text-green-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Movement Details
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Location</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.locationOther || selectedRequest.locationFrom || selectedRequest.locationTo || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Movement</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.returnablePass?.movement ||
                          selectedRequest.nonReturnablePass?.movement ||
                          selectedRequest.surplusPass?.movement ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Purpose</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.purposeOther || selectedRequest.purpose || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Entry Date</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.entryDate
                          ? new Date(selectedRequest.entryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Package className="h-5 w-5 text-orange-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Pass Type
                    </h3>
                  </div>
                  <div className="space-y-5">
                    <div className="text-lg font-bold text-[#0a1e4d]">
                      {selectedRequest.surplusPass ? "SURPLUS" : "REGULAR"}
                    </div>
                    {!selectedRequest.surplusPass && (
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.returnablePass && (
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                            Returnable
                          </span>
                        )}
                        {selectedRequest.nonReturnablePass && (
                          <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                            Non-Returnable
                          </span>
                        )}
                      </div>
                    )}
                    {selectedRequest.surplusPass && (
                      <div className="text-sm text-slate-500">Surplus Pass</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Material review: stacked, collapse-on-decide cards ── */}
              {applicablePassKeys.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                      <Package className="h-4 w-4" /> Material Review
                    </h4>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        allReviewed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {allReviewed ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {applicablePassKeys.filter((k) => passDecision[k]?.collapsed).length} of{" "}
                      {applicablePassKeys.length} reviewed
                    </span>
                  </div>

                  {applicablePassKeys.map((key) => (
                    <MaterialPassCard
                      key={key}
                      meta={PASS_TYPE_META[key]}
                      pass={selectedRequest[PASS_TYPE_META[key].dataKey]}
                      decision={passDecision[key]}
                      isViewMode={isViewMode}
                      onDecision={handlePassDecision}
                      onRemarksChange={handleRemarksChange}
                      onReopen={handleReopen}
                      cardRef={(el) => (cardRefs.current[key] = el)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                {isViewMode
                  ? "Historical record — read only."
                  : allReviewed
                    ? "All passes reviewed — ready to submit."
                    : "Review every material pass to enable submission."}
              </span>
              {!isViewMode && (
                <button
                  onClick={handleSubmitReview}
                  disabled={!allReviewed}
                  className={`px-8 py-2.5 rounded-xl font-bold transition-all ${
                    allReviewed
                      ? `bg-orange-600 text-white hover:bg-orange-700 ${
                          justCompleted ? "ring-4 ring-orange-300" : ""
                        }`
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Submit Complete Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
