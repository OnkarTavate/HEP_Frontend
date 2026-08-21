"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  XCircle,
  X,
  Eye,
  Inbox,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { getApprovalQueue, rejectBulkBatch, listBulkBatches } from "@/lib/bulkPassApi";
import { computeBulkPassStats } from "@/lib/bulkPassStats";
import BulkPassDashboard from "@/components/bulk-pass/BulkPassDashboard";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : fmt.format(d);
};

const STATUS_META = {
  DRAFT:                 { label: "Sent to User",       cls: "bg-stone-100 text-stone-600 border border-stone-300",   dot: "bg-stone-400" },
  UNDER_REVIEW:          { label: "Pending Approval",   cls: "bg-amber-100 text-amber-700 border border-amber-300",   dot: "bg-amber-500" },
  RETURNED_TO_APPLICANT: { label: "Returned",           cls: "bg-purple-100 text-purple-700 border border-purple-300",dot: "bg-purple-500" },
  REJECTED:              { label: "Rejected",           cls: "bg-red-100 text-red-700 border border-red-300",         dot: "bg-red-500" },
  COMPLETED:             { label: "Approved",           cls: "bg-emerald-100 text-emerald-700 border border-emerald-300", dot: "bg-emerald-500" },
};

function StatusChip({ status }) {
  const cfg = STATUS_META[status] || { label: status || "Unknown", cls: "bg-stone-100 text-stone-500 border border-stone-200", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ batch, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please enter a rejection reason."); return; }
    setLoading(true);
    try {
      await rejectBulkBatch(batch.id, reason.trim());
      toast.success(`Batch ${batch.refNo} rejected.`);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject batch.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Reject Batch</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Batch: <span className="font-semibold text-slate-700">{batch.refNo}</span> — {batch.companyName}
        </p>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the reason for rejection…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-400/50 resize-none"
        />
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {loading ? "Rejecting…" : "Reject Batch"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Batches table — shared for both queue and status-filtered views ────────────

function BatchTable({ rows, loading, emptyMessage, emptySubMessage, canApprove, onReject, router, showStatus = false }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Inbox className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-slate-700">{emptyMessage}</p>
        <p className="text-sm text-slate-400">{emptySubMessage}</p>
      </div>
    );
  }

  const headers = showStatus
    ? ["Ref Number", "Company", "Visitor Type", "Persons", "Valid Until", "Submitted", "Status"]
    : ["Ref Number", "Company", "Visitor Type", "Persons", "Valid Until", "Submitted", "Actions"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map((h) => (
              <th key={h} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
            ))}
            {!showStatus && (
              <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Multiple Submissions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((batch, idx) => (
            <tr
              key={batch.id}
              className={`border-b border-slate-50 hover:bg-amber-50/40 transition-colors cursor-pointer ${idx === rows.length - 1 ? "border-b-0" : ""}`}
              onClick={() => router.push(`/traffic_approval/bulk-pass/${batch.id}`)}
            >
              <td className="px-5 py-4">
                <span className="font-bold text-[#ff6b00] whitespace-nowrap">{batch.refNo || "—"}</span>
              </td>
              <td className="px-5 py-4 max-w-[180px]">
                <span className="block truncate font-medium text-slate-800" title={batch.companyName}>
                  {batch.companyName || "—"}
                </span>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                {batch.visitorType
                  ? batch.visitorType.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "—"}
              </td>
              <td className="px-5 py-4 text-center tabular-nums font-semibold text-slate-700">
                {batch.noOfPersons ?? "—"}
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-slate-600">{fmtDate(batch.validityUpto)}</td>
              <td className="px-5 py-4 whitespace-nowrap text-slate-500">{fmtDate(batch.updatedAt || batch.createdAt)}</td>
              <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                {showStatus ? (
                  <StatusChip status={batch.status} />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => router.push(`/traffic_approval/bulk-pass/${batch.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#ff6b00] bg-orange-50 hover:bg-orange-100 border border-orange-200 transition whitespace-nowrap"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </button>
                    {canApprove && (
                      <button
                        onClick={() => onReject(batch)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 transition whitespace-nowrap"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                  </div>
                )}
              </td>
              {batch.multipleSubmissionsEnabled && (
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Enabled
                    </span>
                    {batch.childSubmissionsCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                        {batch.childSubmissionsCount}
                      </span>
                    )}
                  </div>
                </td>
              )}
              {!batch.multipleSubmissionsEnabled && (
                <td className="px-5 py-4">
                  <span className="text-[10px] text-slate-400">—</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrafficBulkPassPage() {
  const router = useRouter();

  // activeTab: "dashboard" | "queue" | "filter"
  const [activeTab, setActiveTab] = useState("queue");
  // statusFilter: null | "DRAFT" | "UNDER_REVIEW" | "RETURNED_TO_APPLICANT" | "REJECTED" | "COMPLETED"
  const [statusFilter, setStatusFilter] = useState(null);
  // multipleSubmissionsFilter: null | true
  const [multipleSubmissionsFilter, setMultipleSubmissionsFilter] = useState(null);

  // ── Queue state (approval-admin-service, UNDER_REVIEW only) ──
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);

  // ── All batches (user_service, all statuses — used for dashboard + status filtering) ──
  const [allBatches, setAllBatches] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  // ── User / permissions ──
  const [user, setUser] = useState(null);
  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);
  const canApprove = Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApprovalQueue();
      setBatches(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load approval queue.");
      setBatches([]);
    } finally { setLoading(false); }
  }, []);

  const fetchAllBatches = useCallback(async () => {
    setDashLoading(true);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (multipleSubmissionsFilter !== null) filters.multipleSubmissionsEnabled = multipleSubmissionsFilter;
      const data = await listBulkBatches(filters);
      setAllBatches(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load dashboard data.");
      setAllBatches([]);
    } finally { setDashLoading(false); }
  }, [statusFilter, multipleSubmissionsFilter]);

  useEffect(() => {
    fetchQueue();
    fetchAllBatches();
  }, [fetchQueue, fetchAllBatches]);

  const stats = useMemo(() => computeBulkPassStats(allBatches), [allBatches]);

  // Batches filtered by the status card the user clicked on the dashboard
  const filteredBatches = useMemo(() => {
    let filtered = allBatches;
    if (statusFilter) filtered = filtered.filter((b) => b.status === statusFilter);
    if (multipleSubmissionsFilter !== null) {
      filtered = filtered.filter((b) => b.multipleSubmissionsEnabled === multipleSubmissionsFilter);
    }
    return filtered;
  }, [allBatches, statusFilter, multipleSubmissionsFilter]);

  const handleRefresh = () => {
    fetchQueue();
    fetchAllBatches();
  };

  // Called when a status card on the dashboard is clicked
  const handleCardClick = (statusKey) => {
    setStatusFilter(statusKey);
    setActiveTab("filter");
  };

  const filterMeta = statusFilter ? STATUS_META[statusFilter] : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bulk Pass Approvals</h2>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve group port-entry pass batches</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMultipleSubmissionsFilter(multipleSubmissionsFilter === null ? true : null)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              multipleSubmissionsFilter !== null
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Multiple Submissions
            {multipleSubmissionsFilter !== null && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                {allBatches.filter((b) => b.multipleSubmissionsEnabled).length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl self-start w-fit">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "dashboard"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Analytics Dashboard
        </button>
        <button
          onClick={() => { setActiveTab("queue"); setStatusFilter(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "queue"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Approval Queue
          {batches.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff6b00] text-white text-[10px] font-bold">
              {batches.length}
            </span>
          )}
        </button>
        {/* Dynamic tab shown only when a status card is clicked */}
        {activeTab === "filter" && filterMeta && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-stone-900 shadow-sm`}>
            <span className={`h-2 w-2 rounded-full ${filterMeta.dot}`} />
            {filterMeta.label}
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
              {filteredBatches.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {activeTab === "dashboard" ? (
        <BulkPassDashboard
          stats={stats}
          loading={dashLoading}
          onRefresh={fetchAllBatches}
          variant="traffic"
          title="Traffic Approval Dashboard"
          subtitle="Operational metrics for bulk port-entry permit applications"
          onCardClick={handleCardClick}
          hideHeader
        />
      ) : activeTab === "filter" ? (
        /* ── Status-filtered view (from dashboard card click) ── */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sub-header showing which status is being filtered */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                title="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {filterMeta && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${filterMeta.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${filterMeta.dot}`} />
                  {filterMeta.label}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                {filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""}
              </span>
            </div>
          </div>
          <BatchTable
            rows={filteredBatches}
            loading={dashLoading}
            emptyMessage="No batches with this status"
            emptySubMessage="There are no batches matching this filter."
            canApprove={canApprove && statusFilter === "UNDER_REVIEW"}
            onReject={setRejectModal}
            router={router}
            showStatus={statusFilter !== "UNDER_REVIEW"}
          />
          {filteredBatches.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-[#ff6b00]">{filteredBatches.length}</span> batch{filteredBatches.length !== 1 ? "es" : ""} — click any row to view full details.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Approval Queue (UNDER_REVIEW only) ── */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <BatchTable
            rows={batches}
            loading={loading}
            emptyMessage="No batches pending approval"
            emptySubMessage="New submissions will appear here for review."
            canApprove={canApprove}
            onReject={setRejectModal}
            router={router}
            showStatus={false}
          />
          {batches.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-[#ff6b00]">{batches.length}</span> batch{batches.length !== 1 ? "es" : ""} pending review — click any row or use <span className="font-semibold">Review</span> to open full details before approving.
              </p>
            </div>
          )}
        </div>
      )}

      {rejectModal && (
        <RejectModal
          batch={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={() => { setRejectModal(null); fetchQueue(); fetchAllBatches(); }}
        />
      )}
    </div>
  );
}
