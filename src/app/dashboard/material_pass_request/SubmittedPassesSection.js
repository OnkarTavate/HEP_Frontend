"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import PaginationBar from "@/components/ui/PaginationBar";
import MaterialPassDetailsModal from "./MaterialPassDetailsModal";
import EditRevertedPassModal from "./EditRevertedPassModal";
import { toast } from "sonner";
import {
  FileText,
  X,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  AlertCircle,
  Edit3,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  CornerUpLeft,
  QrCode,
  Loader2,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API;
const QR_SERVICE_URL = process.env.NEXT_PUBLIC_QR_API || "http://localhost:5007/api";

const cleanRemarks = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const parts = raw.split(/\s*\|\s*/);
  const cleaned = [];
  for (let part of parts) {
    const stripped = part.replace(/^(RETURNABLE|NON[-_]RETURNABLE)\s*:\s*/i, "").trim();
    if (stripped && !cleaned.includes(stripped)) {
      cleaned.push(stripped);
    }
  }
  return cleaned.join(" | ") || raw.trim();
};

export default function SubmittedPassesSection({
  isActive,
  mode = "all",
  onCountsUpdate,
}) {
  const isRevertedMode = mode === "reverted";
  const [submittedPasses, setSubmittedPasses] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [selectedPassDetails, setSelectedPassDetails] = useState(null);
  const [editingRevertedMaterialPass, setEditingRevertedMaterialPass] = useState(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState("RETURNABLE");
  const [printingPassId, setPrintingPassId] = useState(null);

  const handlePrintQR = async (pass) => {
    const passRequestId = pass.id || pass.passId;
    if (!passRequestId) {
      toast.error("Missing pass reference ID. Cannot generate QR.");
      return;
    }

    setPrintingPassId(passRequestId);
    toast.info("Generating unified Material Movement Pass QR...");

    try {
      let token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) token = token.replace(/^["']|["']$/g, "");

      const response = await axios.get(
        `${QR_SERVICE_URL}/qr/generate-material-pass/${passRequestId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfUrl);
        }, 60000);
      };
    } catch (error) {
      let errorMessage = "Failed to generate QR pass.";
      if (error.response && error.response.data) {
        if (error.response.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            errorMessage = json.message || errorMessage;
          } catch (e) {
            errorMessage = text;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      toast.error(errorMessage);
    } finally {
      setPrintingPassId(null);
    }
  };

  // ── filters (now drive the request, not client-side slicing) ──
  const [statusFilter, setStatusFilter] = useState(isRevertedMode ? "REVERTED" : "ALL");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Movement filter
  const [movementFilter, setMovementFilter] = useState("ALL");

  // ── pagination (server-driven) ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });
  const [counts, setCounts] = useState({
    total: 0, submitted: 0, underReview: 0, completed: 0, reverted: 0, rejected: 0,
  });

  // Debounce search, reset to page 1 on change
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever any other filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFilter, customFrom, customTo, movementFilter]);

  // Translate the quick date-filter buttons into actual from/to dates
  const resolveDateRange = () => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const toISO = (d) => d.toISOString().split("T")[0];

    switch (dateFilter) {
      case "today":
        return { dateFrom: toISO(startToday), dateTo: toISO(now) };
      case "7days":
        return { dateFrom: toISO(new Date(startToday.getTime() - 6 * 864e5)), dateTo: toISO(now) };
      case "30days":
        return { dateFrom: toISO(new Date(startToday.getTime() - 29 * 864e5)), dateTo: toISO(now) };
      case "month":
        return { dateFrom: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toISO(now) };
      case "custom":
        return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
      default:
        return {};
    }
  };

  const hasMountedRef = useRef(false);

	const fetchSubmittedPasses = useCallback(async (isBackgroundRefresh = false) => {
		if (!isBackgroundRefresh) setLoadingPasses(true);
		try {
			let token = typeof window !== "undefined"
				? (localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("hep_token"))
				: null;
			if (token) token = token.replace(/^["']|["']$/g, "").trim();
			if (!token) {
				setSubmittedPasses([]);
				return;
			}

			const { dateFrom, dateTo } = resolveDateRange();

			const response = await axios.get(
				`${AGENT_API}/material-pass/materialPassRequests`,
				{
					headers: { Authorization: `Bearer ${token}` },
					params: {
            page,
            limit: pageSize,
            search: debouncedSearch || undefined,
            status: isRevertedMode ? "REVERTED" : statusFilter !== "ALL" ? statusFilter : undefined,
            movement: movementFilter !== "ALL" ? movementFilter : undefined,
            dateFrom,
            dateTo,
          },
				}
			);

			if (response.data?.success) {
				setSubmittedPasses(response.data.data || []);
				setPaginationMeta(response.data.pagination || {});
				setCounts(response.data.counts || {});
				onCountsUpdate?.(response.data.counts || {});
			} else {
				setSubmittedPasses([]);
			}
		} catch (error) {
			console.error("Error fetching material pass requests:", error);
			setSubmittedPasses([]);
		} finally {
			if (!isBackgroundRefresh) setLoadingPasses(false);
		}
	}, [page, pageSize, debouncedSearch, statusFilter, dateFilter, customFrom, customTo, movementFilter, isRevertedMode, onCountsUpdate]);

	// Fetch only when this tab is actually active
	useEffect(() => {
		if (isActive) {
			fetchSubmittedPasses(!hasMountedRef.current ? false : true);
			hasMountedRef.current = true;
		}
	}, [isActive, fetchSubmittedPasses]);


  const returnableMaterials = selectedPassDetails?.returnablePass?.materials || [];
  const nonReturnableMaterials = selectedPassDetails?.nonReturnablePass?.materials || [];
  const currentMaterialPass =
    selectedMaterialType === "RETURNABLE"
      ? selectedPassDetails?.returnablePass
      : selectedPassDetails?.nonReturnablePass;

  const currentPassIsReverted =
    String(selectedPassDetails?.status || "").toUpperCase() === "REVERTED";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          isRevertedMode
            ? "border-amber-200 bg-amber-50/70"
            : "border-slate-100 bg-slate-50"
        }`}>
          <div>
            <h3 className={`font-black flex items-center gap-2 uppercase text-sm tracking-wider ${
              isRevertedMode ? "text-amber-900" : "text-[#0a1e4d]"
            }`}>
              {isRevertedMode ? (
                <>
                  <CornerUpLeft className="h-5 w-5 text-amber-600" /> Reverted Pass Requests
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-orange-500" /> My Pass Requests
                </>
              )}
            </h3>
            {isRevertedMode && (
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Review remarks, alter quantities/items, and resubmit to restart approval workflow
              </p>
            )}
          </div>
          <button
						onClick={() => fetchSubmittedPasses(false)}
						disabled={loadingPasses}
						className="bg-white text-[#0a1e4d] px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
					>
						<RefreshCw className={`h-4 w-4 ${loadingPasses ? "animate-spin" : ""}`} />
						{loadingPasses ? "Refreshing..." : "Refresh List"}
					</button>
        </div>

        {/* ── Banner for reverted mode, or status count cards for normal mode ── */}
        {isRevertedMode ? (
          <div className="px-6 py-4 bg-amber-50/40 border-b border-amber-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Workflow Reset Notice: </span>
              When you edit and resubmit a reverted pass, its state resets to default (Concerned Department review).
              The pass will progress through: <strong>Concerned Dept &rarr; (if hazardous: DC / Fire Safety) &rarr; (if included: Traffic) &rarr; CISF &rarr; QR Generation</strong>.
            </div>
          </div>
        ) : (
          <div className="px-6 pt-5 pb-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: "ALL", label: "Total", value: counts.total, icon: FileText, color: "text-[#0a1e4d]", ring: "ring-[#0a1e4d]/30", bg: "bg-[#0a1e4d]/5" },
              { key: "SUBMITTED", label: "Submitted", value: counts.submitted, icon: Send, color: "text-blue-600", ring: "ring-blue-300", bg: "bg-blue-50" },
              { key: "COMPLETED", label: "Completed", value: counts.completed, icon: CheckCircle, color: "text-emerald-600", ring: "ring-emerald-300", bg: "bg-emerald-50" },
              { key: "REVERTED", label: "Reverted", value: counts.reverted, icon: RefreshCw, color: "text-orange-600", ring: "ring-orange-300", bg: "bg-orange-50" },
              { key: "REJECTED", label: "Rejected", value: counts.rejected, icon: XCircle, color: "text-red-600", ring: "ring-red-300", bg: "bg-red-50" },
            ].map((c) => {
              const active = statusFilter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setStatusFilter(active && c.key !== "ALL" ? "ALL" : c.key)}
                  className={`text-left rounded-xl p-3 ring-1 transition-all active:scale-[0.98] ${active ? `${c.bg} ${c.ring} shadow-sm` : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? c.color : "text-slate-500"}`}>{c.label}</span>
                    <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Date filter toolbar ── */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            <Filter className="h-3.5 w-3.5" /> Filter by date
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: "all", l: "All Time" },
              { k: "today", l: "Today" },
              { k: "7days", l: "Last 7 Days" },
              { k: "30days", l: "Last 30 Days" },
              { k: "month", l: "This Month" },
              { k: "custom", l: "Custom" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setDateFilter(o.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === o.k ? "bg-[#0a1e4d] text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 lg:ml-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input type="date" value={customFrom} max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-orange-500" />
              </div>
              <span className="text-slate-400 text-xs">to</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input type="date" value={customTo} min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          )}
          {(dateFilter !== "all" || statusFilter !== "ALL" || movementFilter !== "ALL"  || debouncedSearch) && (
            <button
              onClick={() => { setDateFilter("all"); setStatusFilter("ALL"); setMovementFilter("ALL"); setCustomFrom(""); setCustomTo(""); setSearchInput(""); }}
              className="lg:ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>

        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            <Filter className="h-3.5 w-3.5" /> Movement
          </span>
          <div className="flex gap-1.5">
            {[
              { k: "ALL", l: "All" },
              { k: "IN", l: "IN" },
              { k: "OUT", l: "OUT" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setMovementFilter(o.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  movementFilter === o.k
                    ? "bg-[#0a1e4d] text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search + record count summary ── */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing {paginationMeta.totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, paginationMeta.totalRecords)} of {paginationMeta.totalRecords} records
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Ref ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0a1e4d] text-white">
              {isRevertedMode ? (
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">Application Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">Reverted Pass</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">Reviewer Remarks</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-center uppercase tracking-wider">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider">Application Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">Passes</th>
                  <th className="px-6 py-4 text-[10px] font-bold border-r border-white/10 uppercase tracking-wider text-center">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPasses ? (
                <tr><td colSpan={isRevertedMode ? 5 : 4} className="p-12 text-center text-sm font-bold text-slate-400">
                  <span className="animate-pulse">Loading pass records...</span>
                </td></tr>
              ) : submittedPasses.length === 0 ? (
                <tr><td colSpan={isRevertedMode ? 5 : 4} className="p-12 text-center text-sm font-medium text-slate-400 italic">
                  {isRevertedMode
                    ? "No reverted passes found. All your applications are either approved or in active review."
                    : counts.total === 0
                    ? "No pass requests found."
                    : "No pass requests match the current filters."}
                </td></tr>
              ) : (
                submittedPasses.map((pass, idx) => {
                  const passIdStr = pass.referenceNo ? pass.referenceNo : pass.id ? `REQ-${pass.id}` : pass.passId || `MREQ-0001`;
                  const createdAtStr = pass.submittedAt || pass.createdAt;
                  const currentStatus = (pass.status || "PENDING").toUpperCase();
                  const currentStage = (pass.currentStage || "").toUpperCase();
                  const passList = [pass.returnablePass, pass.nonReturnablePass].filter(Boolean);

                  const revertedPassCount = passList.filter(
                    (p) => String(p?.status || "").toUpperCase() === "REVERTED"
                  ).length;

                  const rejectedPassCount = passList.filter(
                    (p) => String(p?.status || "").toUpperCase() === "REJECTED"
                  ).length;

                  const isRejected =
                    currentStatus === "REJECTED" ||
                    currentStage === "REJECTED" ||
                    (passList.length > 0 && rejectedPassCount === passList.length);
                  const isCompleted =
                    (currentStatus === "COMPLETED" || currentStage === "COMPLETED") && !isRejected;
                  const displayStatus = pass.isResubmitted
                    ? "RESUBMITTED"
                    : isRejected
                    ? "REJECTED"
                    : currentStatus;

                  const passesLabel =
                    revertedPassCount === 0 && rejectedPassCount === 0
                      ? "All Approved"
                      : [
                          revertedPassCount > 0 ? `${revertedPassCount} Reverted` : null,
                          rejectedPassCount > 0 ? `${rejectedPassCount} Rejected` : null,
                        ]
                          .filter(Boolean)
                          .join(" | ");

                  const rawRemarks =
                    pass.rejectedReason ||
                    pass.remarks ||
                    (pass.returnablePass?.status === "Reverted" ? pass.returnablePass?.remarks || pass.returnablePass?.rejectedReason : null) ||
                    (pass.nonReturnablePass?.status === "Reverted" ? pass.nonReturnablePass?.remarks || pass.nonReturnablePass?.rejectedReason : null) ||
                    "";
                  const displayRemarks = cleanRemarks(rawRemarks) || "Reverted for revision";

                  if (isRevertedMode) {
                    return (
                      <tr
                        key={pass.id || idx}
                        onClick={() => { setSelectedMaterialType("RETURNABLE"); setSelectedPassDetails(pass); }}
                        className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] border-r border-slate-100">
                          {passIdStr}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium border-r border-slate-100">
                          {createdAtStr ? new Date(createdAtStr).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-100">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {passesLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-amber-800 border-r border-slate-100 max-w-xs truncate font-medium" title={displayRemarks}>
                          {displayRemarks}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMaterialType("RETURNABLE");
                                setSelectedPassDetails(pass);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRevertedMaterialPass(pass);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit & Resubmit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={pass.id || idx}
                      onClick={() => { setSelectedMaterialType("RETURNABLE"); setSelectedPassDetails(pass); }}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] border-r border-slate-100">{passIdStr}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium border-r border-slate-100">
                        {createdAtStr ? new Date(createdAtStr).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-100">
                        {currentStatus === "SUBMITTED" ? (
                          <span className="text-xs text-slate-400">-</span>
                        ) : (
                          <span className={`text-xs font-normal ${
                            revertedPassCount === 0 && rejectedPassCount === 0
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }`}>
                            {passesLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            pass.isResubmitted ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : isRejected ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                            : currentStatus === "SUBMITTED" ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {displayStatus}
                          </span>
                          {isCompleted && !isRejected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintQR(pass);
                              }}
                              disabled={printingPassId === (pass.id || pass.passId)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                              title="Print Unified Material Pass QR"
                            >
                              {printingPassId === (pass.id || pass.passId) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <QrCode className="h-3.5 w-3.5" />
                              )}
                              Print QR
                            </button>
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

        <div className="px-6 py-4 border-t border-slate-100">
          <PaginationBar
            currentPage={paginationMeta.currentPage || page}
            totalPages={paginationMeta.totalPages || 1}
            totalRecords={paginationMeta.totalRecords || 0}
            pageSize={paginationMeta.pageSize || pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(limit) => { setPageSize(limit); setPage(1); }}
            loading={loadingPasses}
          />
        </div>
      </section>

      {selectedPassDetails && (
        <MaterialPassDetailsModal
          pass={selectedPassDetails}
          onClose={() => setSelectedPassDetails(null)}
          onEditReverted={(pass) => setEditingRevertedMaterialPass(pass)}
        />
      )}

      {editingRevertedMaterialPass && (
        <EditRevertedPassModal
          pass={editingRevertedMaterialPass}
          onClose={() => setEditingRevertedMaterialPass(null)}
          onResubmitSuccess={() => {
            setEditingRevertedMaterialPass(null); // close edit modal
            setSelectedPassDetails(null);          // close now-stale details modal
            fetchSubmittedPasses(false);           // reload the table (with loader)
          }}
        />
      )}
    </div>
  );
}