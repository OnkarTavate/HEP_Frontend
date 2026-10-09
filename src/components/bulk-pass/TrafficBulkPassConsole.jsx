"use client";

/**
 * TrafficBulkPassConsole.jsx — the bulk pass screen for traffic approval and
 * traffic manager (same data, same permissions; only the route base differs).
 *
 * Views: Approval queue (default) · All batches (status filter) · Overview.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Inbox, LayoutDashboard, List, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getApprovalQueue, rejectBulkBatch, listBulkBatches } from "@/lib/bulkPassApi";
import { computeBulkPassStats } from "@/lib/bulkPassStats";
import BulkPassDashboard from "./BulkPassDashboard.jsx";
import { BatchFilterSelects, ReviewQueueTable } from "./BatchesTable.jsx";
import {
  BATCH_SORTERS, EMPTY_BATCH_FILTERS, applyBatchFilters, batchFilterChips, batchFilterOptions, nextSort, sortRows,
} from "@/lib/bulkPassFilters";
import {
  Button, Card, FieldLabel, Modal, PageHeader, Pagination, RefreshButton, ResultSummary, SearchInput,
  StatusFilterCards, TableCard, Toolbar, ViewTabs, batchStatusCards, fieldCls, statusMeta, usePaged,
} from "./ui.jsx";

const ACCENT = "orange";

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
    <Modal
      title="Reject batch"
      description={<><b className="text-stone-700 dark:text-stone-200">{batch.refNo}</b> — {batch.companyName}. The applicant will see your reason.</>}
      icon={XCircle}
      tone="red"
      onClose={onClose}
      busy={loading}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={loading}>{loading ? "Rejecting…" : "Reject batch"}</Button>
        </>
      }
    >
      <FieldLabel required>Reason for rejection</FieldLabel>
      <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Describe why this batch cannot be approved…"
        className={`${fieldCls} resize-none focus:ring-red-400/50`} />
    </Modal>
  );
}

const matches = (b, q) => {
  if (!q) return true;
  const s = q.toLowerCase();
  return [b.refNo, b.companyName, b.departmentName, b.visitorType].some((v) => String(v || "").toLowerCase().includes(s));
};

/**
 * @param base   route base, e.g. "/traffic_approval/bulk-pass"
 * @param title  page title
 */
export default function TrafficBulkPassConsole({ base, title = "Bulk Pass Approvals" }) {
  const router = useRouter();

  const [view, setView] = useState("queue");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_BATCH_FILTERS);
  // Each list keeps its own order: the queue oldest-waiting first, the rest newest first.
  const [sorts, setSorts] = useState({
    queue: { key: "wait", direction: "desc" },
    all: { key: "updated", direction: "desc" },
  });
  const sort = sorts[view] || sorts.all;
  const onSort = (key) => setSorts((cur) => ({ ...cur, [view]: nextSort(cur[view], key) }));

  // Queue (approval-admin-service, UNDER_REVIEW only)
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);

  // Every batch (user_service) — backs the overview and the status view
  const [allBatches, setAllBatches] = useState([]);
  const [allLoading, setAllLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [user, setUser] = useState(null);
  // One clock for the whole table, refreshed on a timer, so render stays pure.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);
  const canApprove = Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const data = await getApprovalQueue();
      setQueue(Array.isArray(data) ? data : []);
      setUpdatedAt(Date.now());
    } catch {
      toast.error("Failed to load group pass applications.");
      setQueue([]);
    } finally { setQueueLoading(false); }
  }, []);

  const fetchAllBatches = useCallback(async () => {
    setAllLoading(true);
    try {
      // Full population: the tiles must reflect every batch; views filter it client-side.
      const data = await listBulkBatches({});
      setAllBatches(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load dashboard data.");
      setAllBatches([]);
    } finally { setAllLoading(false); }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchAllBatches();
  }, [fetchQueue, fetchAllBatches]);

  const stats = useMemo(() => computeBulkPassStats(allBatches), [allBatches]);
  const summary = stats.summary;

  // The rows the dropdowns count over: this view's list after search/status.
  const baseRows = useMemo(
    () => (view === "queue" ? queue : allBatches).filter((b) =>
      matches(b, search) && (view === "queue" || status === "ALL" || b.status === status)),
    [view, queue, allBatches, search, status]
  );
  const filterOptions = useMemo(() => batchFilterOptions(baseRows, filters), [baseRows, filters]);
  const rows = useMemo(
    () => sortRows(applyBatchFilters(baseRows, filters), sort, BATCH_SORTERS),
    [baseRows, filters, sort]
  );
  const paged = usePaged(rows);
  const resetPage = paged.reset;
  useEffect(() => { resetPage(); }, [view, status, search, filters, sort, resetPage]);

  const handleRefresh = () => { fetchQueue(); fetchAllBatches(); };
  const openBatch = (b) => router.push(`${base}/${b.id}`);
  const clearAll = () => { setSearch(""); setFilters(EMPTY_BATCH_FILTERS); setStatus("ALL"); };
  const chips = [
    view === "all" && status !== "ALL" && { key: "status", label: statusMeta(status).label, onClear: () => setStatus("ALL") },
    search && { key: "search", label: `“${search}”`, onClear: () => setSearch("") },
    ...batchFilterChips(filters, filterOptions, setFilters),
  ].filter(Boolean);
  const filtered = chips.length > 0;

  return (
    <div className="pt-6 pb-10 flex flex-col gap-6">
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Bulk Pass"
        title={title}
        subtitle="Review group port-entry passes submitted by applicants — oldest first."
        accent={ACCENT}
        actions={<RefreshButton onClick={handleRefresh} loading={queueLoading || allLoading} updatedAt={updatedAt} accent={ACCENT} />}
      />

      <ViewTabs
        accent={ACCENT}
        value={view}
        onChange={setView}
        tabs={[
          { key: "queue", label: "Approval queue", icon: Inbox, count: queue.length },
          { key: "all", label: "All batches", icon: List },
          { key: "overview", label: "Overview", icon: LayoutDashboard },
        ]}
      />

      {view === "overview" ? (
        <BulkPassDashboard
          stats={stats}
          loading={allLoading}
          variant="traffic"
          hideHeader
          queueLabel="Open approval queue"
          onOpenQueue={() => setView("queue")}
          detailHrefBase={base}
          onCardClick={(key) => { setStatus(key); setView("all"); }}
        />
      ) : (
        <>
          {view === "all" && (
            <StatusFilterCards items={batchStatusCards(summary)} value={status} onChange={setStatus} total={summary.totalBatches} accent={ACCENT} />
          )}

          {view === "queue" && !queueLoading && queue.length > 0 && (
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-sm text-stone-600 dark:text-stone-300">
              <span><b className="text-stone-900 dark:text-stone-50">{queue.length}</b> waiting for review</span>
              <span className="inline-flex items-center gap-2 text-xs text-stone-500">
                <span className="inline-flex px-1.5 rounded bg-amber-100 text-amber-800 font-bold dark:bg-amber-400/15 dark:text-amber-300">8 h+</span> getting old
                <span className="inline-flex px-1.5 rounded bg-red-100 text-red-700 font-bold dark:bg-red-400/15 dark:text-red-300">3 d+</span> overdue
              </span>
              {!canApprove && (
                <span className="text-xs text-stone-500 sm:ml-auto">You can view batches; approving is limited to the Traffic department.</span>
              )}
            </Card>
          )}

          <div className="flex flex-col gap-3">
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="Search by reference, company or department…" accent={ACCENT} />
              <BatchFilterSelects accent={ACCENT} filters={filters} options={filterOptions} onChange={setFilters} />
            </Toolbar>
            <ResultSummary count={rows.length} noun="batch" chips={chips} onClearAll={clearAll} />
          </div>

          <TableCard
            footer={rows.length > 0 && !(view === "queue" ? queueLoading : allLoading) && (
              <Pagination accent={ACCENT} page={paged.page} pageSize={paged.pageSize} total={paged.total} onPage={paged.setPage} onPageSize={paged.setPageSize} />
            )}
          >
            <ReviewQueueTable
              accent={ACCENT}
              rows={paged.rows}
              loading={view === "queue" ? queueLoading : allLoading}
              onOpen={openBatch}
              onReject={canApprove && view === "queue" ? setRejectModal : undefined}
              showStatus={view === "all"}
              nowMs={nowMs}
              sort={sort}
              onSort={onSort}
              empty={filtered ? {
                title: "No batches match your filters",
                message: "Try a different search or clear the filters.",
              } : view === "queue" ? {
                title: "You're all caught up",
                message: "No batches are waiting for approval. New submissions will appear here.",
              } : {
                title: "No batches with this status",
              }}
            />
          </TableCard>
        </>
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
