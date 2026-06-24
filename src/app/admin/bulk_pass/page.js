"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Download, ChevronRight, ChevronLeft,
  RefreshCw, RotateCcw, Edit3, Users, X,
  CheckSquare, FileStack, FileText, Car,
  CalendarDays, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  listBulkBatches, returnToApplicant, downloadBulkPdf,
} from "@/lib/bulkPassApi";
import { computeBulkPassStats } from "@/lib/bulkPassStats";

const BASE = "/admin/bulk_pass";
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
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

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});
const fmtDate = (v) => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? v : fmt.format(d); };
const fmtDateShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? v : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
};
const visitorLabel = (v) => v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status || "Unknown", badge: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
}

// ── Return modal ──────────────────────────────────────────────────────────────
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

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ batch, downloadingId, onReturn, onEdit, onDownloadPdf }) {
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBulkPassListPage() {
  const router = useRouter();

  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);

  const [downloadingId, setDownloadingId] = useState(null);
  const [returnModal, setReturnModal] = useState(null);

  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);

  const isTrafficApprover =
    Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;
  const stats = useMemo(() => computeBulkPassStats(allBatches), [allBatches]);
  const summary = stats?.summary || {};

  // Unfiltered — for summary counts only
  const fetchAllBatches = useCallback(async () => {
    try { const data = await listBulkBatches(); setAllBatches(Array.isArray(data) ? data : []); } catch {}
  }, []);

  // Filtered — for table
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (activeTab !== "ALL") filters.status = activeTab;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      const data = await listBulkBatches(filters);
      setBatches(Array.isArray(data) ? data : []);
      setPage(1);
    } catch { toast.error("Failed to load bulk passes."); setBatches([]); }
    finally { setLoading(false); }
  }, [search, activeTab, fromDate, toDate]);

  useEffect(() => { fetchAllBatches(); }, []); // eslint-disable-line
  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleRefresh = () => { fetchBatches(); fetchAllBatches(); };

  const totalPages = Math.max(1, Math.ceil(batches.length / pageSize));
  const paginated = batches.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = search || fromDate || toDate;

  const handleDownloadPdf = async (batch) => {
    setDownloadingId(batch.id);
    try {
      const blob = await downloadBulkPdf(batch.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${batch.refNo}_QR.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err?.response?.data?.message || "Failed."); }
    finally { setDownloadingId(null); }
  };



  return (
    <div className="pt-6 pb-10 flex flex-col gap-5" style={{ fontFamily: "'Inter', 'Montserrat', Arial, sans-serif" }}>

      {/* ── PAGE TITLE ROW ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bulk Pass Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage and review all bulk pass requests</p>
        </div>
        <button onClick={handleRefresh}
          title="Refresh"
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-500">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── COMBINED STAT CARDS + TABS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            key: "ALL",
            label: "Total Requests",
            value: summary.totalBatches ?? 0,
            active: "bg-slate-900 text-white shadow-lg shadow-slate-900/20",
            inactive: "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm",
            countCls: { active: "bg-white/20 text-white", inactive: "bg-slate-100 text-slate-600" },
            valueCls: { active: "text-white", inactive: "text-slate-900" },
            labelCls: { active: "text-slate-300", inactive: "text-slate-400" },
          },
          {
            key: "UNDER_REVIEW",
            label: "Pending Approval",
            value: summary.underReview ?? 0,
            active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
            inactive: "bg-amber-50 border border-amber-200 text-amber-800 hover:border-amber-300 hover:shadow-sm",
            countCls: { active: "bg-white/25 text-white", inactive: "bg-amber-100 text-amber-700" },
            valueCls: { active: "text-white", inactive: "text-amber-700" },
            labelCls: { active: "text-amber-100", inactive: "text-amber-500" },
          },
          {
            key: "RETURNED_TO_APPLICANT",
            label: "Returned",
            value: summary.returned ?? 0,
            active: "bg-purple-600 text-white shadow-lg shadow-purple-600/30",
            inactive: "bg-purple-50 border border-purple-200 text-purple-800 hover:border-purple-300 hover:shadow-sm",
            countCls: { active: "bg-white/25 text-white", inactive: "bg-purple-100 text-purple-700" },
            valueCls: { active: "text-white", inactive: "text-purple-700" },
            labelCls: { active: "text-purple-100", inactive: "text-purple-500" },
          },
          {
            key: "REJECTED",
            label: "Rejected",
            value: summary.rejected ?? 0,
            active: "bg-red-500 text-white shadow-lg shadow-red-500/30",
            inactive: "bg-red-50 border border-red-200 text-red-800 hover:border-red-300 hover:shadow-sm",
            countCls: { active: "bg-white/25 text-white", inactive: "bg-red-100 text-red-700" },
            valueCls: { active: "text-white", inactive: "text-red-600" },
            labelCls: { active: "text-red-100", inactive: "text-red-400" },
          },
          {
            key: "COMPLETED",
            label: "Approved",
            value: summary.completed ?? 0,
            active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
            inactive: "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:border-emerald-300 hover:shadow-sm",
            countCls: { active: "bg-white/25 text-white", inactive: "bg-emerald-100 text-emerald-700" },
            valueCls: { active: "text-white", inactive: "text-emerald-700" },
            labelCls: { active: "text-emerald-100", inactive: "text-emerald-500" },
          },
          {
            key: "DRAFT",
            label: "Sent to Applicant",
            value: summary.draft ?? 0,
            active: "bg-sky-500 text-white shadow-lg shadow-sky-500/30",
            inactive: "bg-sky-50 border border-sky-200 text-sky-800 hover:border-sky-300 hover:shadow-sm",
            countCls: { active: "bg-white/25 text-white", inactive: "bg-sky-100 text-sky-700" },
            valueCls: { active: "text-white", inactive: "text-sky-700" },
            labelCls: { active: "text-sky-100", inactive: "text-sky-500" },
          },
        ].map((card) => {
          const isActive = activeTab === card.key;
          return (
            <button
              key={card.key}
              onClick={() => { setActiveTab(card.key); setPage(1); }}
              className={`relative flex flex-col gap-2 px-4 py-4 rounded-2xl text-left transition-all duration-150 active:scale-[0.97] ${
                isActive ? card.active : card.inactive
              }`}
            >
              {/* Count badge top-right + big number + label */}
              <div className="flex items-start justify-between">
                <p className={`text-3xl font-extrabold tabular-nums leading-none ${
                  isActive ? card.valueCls.active : card.valueCls.inactive
                }`}>
                  {card.value}
                </p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                  isActive ? card.countCls.active : card.countCls.inactive
                }`}>
                  {card.value}
                </span>
              </div>
              {/* Label */}
              <p className={`text-[11px] font-semibold leading-tight ${
                isActive ? card.labelCls.active : card.labelCls.inactive
              }`}>
                {card.label}
              </p>
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-white/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── FILTER ROW ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* New Bulk Pass — primary CTA, always visible */}
        <button onClick={() => router.push(`${BASE}/create`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#1f1f1f] font-bold text-sm transition shadow-sm shrink-0">
          <Plus className="h-4 w-4" strokeWidth={2.5} />New Bulk Pass
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 shrink-0" />
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search by ref number or company…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition placeholder:text-slate-400 text-slate-800 shadow-sm" />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Date from */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
        </div>
        <span className="text-slate-300 text-xs font-medium">to</span>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="outline-none bg-transparent text-sm text-slate-600 w-[130px]" />
        </div>
        {(hasFilters) && (
          <button onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">
            <X className="h-3.5 w-3.5" />Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 hidden sm:inline">{batches.length} result{batches.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-9 w-9 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400">Loading requests…</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileStack className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              {hasFilters || activeTab !== "ALL" ? "No requests match your filters" : "No bulk pass requests yet"}
            </p>
            <p className="text-sm text-slate-400">
              {hasFilters || activeTab !== "ALL" ? "Try adjusting your search or filters." : "Create your first bulk pass to get started."}
            </p>
            {!hasFilters && activeTab === "ALL" && (
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
                  {paginated.map((batch) => (
                    <tr key={batch.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`${BASE}/${batch.id}`)}>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 text-sm font-mono group-hover:text-amber-600 transition-colors">
                          {batch.refNo || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {visitorLabel(batch.visitorType)}
                        </p>
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
                        <ActionBtn
                          batch={batch}
                          downloadingId={downloadingId}
                          onReturn={(b) => setReturnModal({ batchId: b.id, refNo: b.refNo })}
                          onEdit={(b) => router.push(`${BASE}/${b.id}`)}
                          onDownloadPdf={handleDownloadPdf}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ── */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows per page:</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/40 cursor-pointer">
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-2">
                  <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, batches.length)}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-slate-700">{batches.length}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button disabled={page === 1} onClick={() => setPage(1)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <ChevronLeft className="h-3.5 w-3.5" />Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                  .map((n, i) => n === "…"
                    ? <span key={`g${i}`} className="px-2 text-slate-400 text-xs">…</span>
                    : <button key={n} onClick={() => setPage(n)}
                        className={`min-w-[30px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                          page === n ? "bg-slate-900 text-white border border-slate-900" : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                        }`}>{n}</button>
                  )}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Next<ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {returnModal && (
        <ReturnModal batchId={returnModal.batchId} refNo={returnModal.refNo}
          onClose={() => setReturnModal(null)}
          onSuccess={() => { setReturnModal(null); fetchBatches(); fetchAllBatches(); }} />
      )}
    </div>
  );
}
