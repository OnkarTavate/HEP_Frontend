"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Layers, LayoutDashboard, List, CornerUpLeft } from "lucide-react";
import { toast } from "sonner";
import { listBulkBatches, returnToApplicant } from "@/lib/bulkPassApi";
import { computeBulkPassStats } from "@/lib/bulkPassStats";
import BulkPassDashboard from "@/components/bulk-pass/BulkPassDashboard.jsx";
import { BatchesTable, BatchFilterSelects } from "@/components/bulk-pass/BatchesTable.jsx";
import {
  BATCH_SORTERS, EMPTY_BATCH_FILTERS, applyBatchFilters, batchFilterChips, batchFilterOptions, nextSort, sortRows,
} from "@/lib/bulkPassFilters";
import {
  Button, DateRange, FieldLabel, Modal, PageHeader, Pagination, RefreshButton, ResultSummary,
  SearchInput, Spinner, StatusFilterCards, TableCard, Toolbar, ViewTabs, batchStatusCards, fieldCls, statusMeta,
  usePaged,
} from "@/components/bulk-pass/ui.jsx";

const BASE = "/dashboard/bulk_pass";

// Departments allowed to create bulk passes (General Administration = 6, Traffic = 9–15)
const BULK_PASS_CREATOR_DEPT_IDS = [6, 9, 10, 11, 12, 13, 14, 15];

function canCreateBulkPass(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "administrator" || role === "super admin" || role === "superadmin") return true;
  return BULK_PASS_CREATOR_DEPT_IDS.includes(Number(user.departmentId));
}

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
    <Modal
      title="Return to applicant"
      description={<>Batch <b className="text-stone-700 dark:text-stone-200">{refNo}</b> will be sent back with a fresh link.</>}
      icon={CornerUpLeft}
      tone="violet"
      onClose={onClose}
      busy={loading}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="violet" onClick={handleSubmit} disabled={loading}>{loading ? "Returning…" : "Return to applicant"}</Button>
        </>
      }
    >
      <FieldLabel required>What needs to be corrected?</FieldLabel>
      <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Photos for rows 3 and 7 are blurred."
        className={`${fieldCls} resize-none`} />
    </Modal>
  );
}

const actionFor = (batch) => {
  if (batch.status === "RETURNED_TO_APPLICANT") return { label: "Edit & resubmit", kind: "fix" };
  if (batch.status === "COMPLETED") return { label: "View pass", kind: "view" };
  return { label: "View", kind: "view" };
};

function BulkPassListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState(searchParams.get("tab") === "dashboard" ? "overview" : "list");
  const changeView = (next) => {
    setView(next);
    router.replace(next === "overview" ? `${BASE}?tab=dashboard` : BASE, { scroll: false });
  };

  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);

  const canCreate = canCreateBulkPass(user);

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filters, setFilters] = useState(EMPTY_BATCH_FILTERS);
  const [sort, setSort] = useState({ key: "updated", direction: "desc" });
  const [returnModal, setReturnModal] = useState(null);

  // Status cards describe batches; a reusable pass is the container they arrive
  // into, so counting it here would inflate every column. Mirrors /admin.
  const stats = useMemo(
    () => computeBulkPassStats(allBatches.filter((b) => !b.multipleSubmissionsEnabled)),
    [allBatches]
  );
  const summary = stats?.summary || {};

  const fetchAllBatches = useCallback(async () => {
    try { const data = await listBulkBatches(); setAllBatches(Array.isArray(data) ? data : []); } catch {}
    finally { setAllLoading(false); }
  }, []);

  // `quiet` refreshes keep the table on screen instead of flashing skeletons.
  const fetchBatches = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (status !== "ALL") filters.status = status;
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      const data = await listBulkBatches(filters);
      setBatches(Array.isArray(data) ? data : []);
      setUpdatedAt(Date.now());
    } catch { if (!quiet) { toast.error("Failed to load bulk passes."); setBatches([]); } }
    finally { if (!quiet) setLoading(false); }
  }, [search, status, fromDate, toDate]);

  useEffect(() => { fetchAllBatches(); }, [fetchAllBatches]);
  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // Real-time polling for submission count updates
  useEffect(() => {
    const intervalId = setInterval(() => fetchBatches(true), 8000);
    return () => clearInterval(intervalId);
  }, [fetchBatches]);

  const handleRefresh = () => { fetchBatches(); fetchAllBatches(); };

  const filterOptions = useMemo(() => batchFilterOptions(batches, filters), [batches, filters]);
  const visible = useMemo(
    () => sortRows(applyBatchFilters(batches, filters), sort, BATCH_SORTERS),
    [batches, filters, sort]
  );
  const paged = usePaged(visible);
  const resetPage = paged.reset;
  useEffect(() => { resetPage(); }, [search, status, fromDate, toDate, filters, sort, resetPage]);

  const hasExtraFilters = Object.values(filters).some(Boolean);
  const hasFilters = !!(search || fromDate || toDate || hasExtraFilters || status !== "ALL");
  const clearAll = () => { setSearch(""); setFromDate(""); setToDate(""); setFilters(EMPTY_BATCH_FILTERS); setStatus("ALL"); };
  const chips = [
    status !== "ALL" && { key: "status", label: statusMeta(status).label, onClear: () => setStatus("ALL") },
    search && { key: "search", label: `“${search}”`, onClear: () => setSearch("") },
    (fromDate || toDate) && { key: "date", label: `${fromDate || "…"} → ${toDate || "…"}`, onClear: () => { setFromDate(""); setToDate(""); } },
    ...batchFilterChips(filters, filterOptions, setFilters),
  ].filter(Boolean);

  const newPass = canCreate ? (
    <Button variant="primary" icon={Plus} onClick={() => router.push(`${BASE}/create`)}>New bulk pass</Button>
  ) : null;

  return (
    <div className="pt-6 pb-10 flex flex-col gap-6">
      <PageHeader
        icon={Layers}
        eyebrow="Bulk Pass"
        title="Bulk Pass Management"
        subtitle="Create bulk passes, track applicant submissions and download approved passes."
        actions={<>
          <RefreshButton onClick={handleRefresh} loading={loading} updatedAt={updatedAt} />
          {newPass}
        </>}
      />

      <ViewTabs
        value={view}
        onChange={changeView}
        tabs={[
          { key: "overview", label: "Overview", icon: LayoutDashboard },
          { key: "list", label: "All batches", icon: List, count: summary.underReview, countTone: "bg-amber-500 text-white" },
        ]}
      />

      {view === "overview" ? (
        allLoading ? <Spinner label="Loading overview…" /> : (
          <BulkPassDashboard
            stats={stats}
            loading={false}
            hideHeader
            queueLabel="Show pending batches"
            detailHrefBase={BASE}
            onCardClick={(key) => { setStatus(key); changeView("list"); }}
          />
        )
      ) : (
        <>
          <StatusFilterCards
            items={batchStatusCards(summary)}
            value={status}
            onChange={setStatus}
            total={summary.totalBatches}
          />

          <div className="flex flex-col gap-3">
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="Search by reference number or company…" />
              <DateRange from={fromDate} to={toDate} onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} />
              <BatchFilterSelects filters={filters} options={filterOptions} onChange={setFilters} show={["visitorType", "validity", "passType"]} />
            </Toolbar>
            <ResultSummary count={visible.length} noun="batch" chips={chips} onClearAll={clearAll} />
          </div>

          <TableCard
            footer={!loading && visible.length > 0 && (
              <Pagination page={paged.page} pageSize={paged.pageSize} total={paged.total} onPage={paged.setPage} onPageSize={paged.setPageSize} />
            )}
          >
            <BatchesTable
              rows={paged.rows}
              loading={loading}
              onOpen={(b) => router.push(`${BASE}/${b.id}`)}
              getAction={actionFor}
              sort={sort}
              onSort={(key) => setSort((cur) => nextSort(cur, key))}
              empty={hasFilters ? {
                title: "No batches match your filters",
                message: "Try a different search or clear the filters.",
                action: <Button onClick={clearAll}>Clear filters</Button>,
              } : {
                title: "No bulk passes yet",
                message: canCreate ? "Create your first bulk pass — the applicant gets a link to upload visitor details." : "Bulk passes created for your department will appear here.",
                action: newPass,
              }}
            />
          </TableCard>
        </>
      )}

      {returnModal && (
        <ReturnModal batchId={returnModal.batchId} refNo={returnModal.refNo}
          onClose={() => setReturnModal(null)}
          onSuccess={() => { setReturnModal(null); fetchBatches(); fetchAllBatches(); }} />
      )}
    </div>
  );
}

export default function BulkPassListPage() {
  return (
    <Suspense fallback={<Spinner label="Loading bulk passes…" />}>
      <BulkPassListPageContent />
    </Suspense>
  );
}
