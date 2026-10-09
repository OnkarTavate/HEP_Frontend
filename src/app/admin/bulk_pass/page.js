"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, X, Layers, LayoutDashboard, FileStack, Globe, CheckCircle2, XCircle, Clock,
  CalendarClock, CornerUpLeft, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  listBulkBatches, returnToApplicant,
  listPublicRequests, approvePublicRequest, rejectPublicRequest,
} from "@/lib/bulkPassApi";
import { computeBulkPassStats, computeBulkPassOverview } from "@/lib/bulkPassStats";
import RequestsTable, { REQUEST_STATUS } from "@/components/bulk-pass/RequestsTable.jsx";
import BulkPassOverviewPanel from "@/components/bulk-pass/BulkPassOverviewPanel.jsx";
import BulkPassDashboard from "@/components/bulk-pass/BulkPassDashboard.jsx";
import { BatchesTable, BatchFilterSelects } from "@/components/bulk-pass/BatchesTable.jsx";
import {
  BATCH_SORTERS, EMPTY_BATCH_FILTERS, REQUEST_SORTERS, applyBatchFilters, batchFilterChips, batchFilterOptions,
  nextSort, sortRows,
} from "@/lib/bulkPassFilters";
import {
  Button, Card, DateRange, FieldLabel, Modal, PageHeader, Pagination, RefreshButton, ResultSummary,
  SearchInput, Spinner, StatusFilterCards, TableCard, Toolbar, ViewTabs, batchStatusCards, fieldCls, statusMeta,
  usePaged,
} from "@/components/bulk-pass/ui.jsx";
import {
  getValidityState, combineValidity, toIstDateKey, toValidityInputs,
  DEFAULT_VALIDITY_FROM_TIME,
} from "@/lib/bulkPassValidity";

const BASE = "/admin/bulk_pass";

const BULK_PASS_FILTER_LABEL = {
  ALL: "Bulk passes only",
  VALIDITY_ACTIVE: "Active bulk passes",
  VALIDITY_EXPIRED: "Expired bulk passes",
  VALIDITY_NOT_STARTED: "Bulk passes not started yet",
};

const batchAction = (batch) => {
  if (batch.status === "UNDER_REVIEW" || batch.status === "RETURNED_TO_APPLICANT") return { label: "Review now", kind: "review" };
  if (batch.status === "COMPLETED") return { label: "View pass", kind: "view" };
  return { label: "View", kind: "view" };
};

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
    <Modal
      title="Return to applicant"
      description={<>Batch <b className="text-stone-700 dark:text-stone-200">{refNo}</b> will be sent back with a fresh link.</>}
      icon={CornerUpLeft}
      tone="violet"
      onClose={onClose}
      busy={loading}
      footer={<>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="violet" onClick={handleSubmit} disabled={loading}>{loading ? "Returning…" : "Return to applicant"}</Button>
      </>}
    >
      <FieldLabel required>What needs to be corrected?</FieldLabel>
      <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Describe what needs to be corrected…" className={`${fieldCls} resize-none`} />
    </Modal>
  );
}

// ── Quick Approval Modal for Public Requests ─────────────────────────────────
function QuickApprovalModal({ request, onClose, onApprove }) {
  // Prefill: from today 06:00 IST, upto the requested end (18:00 default).
  const [validityFrom, setValidityFrom] = useState(() => toIstDateKey(new Date()));
  const [validityFromTime, setValidityFromTime] = useState(DEFAULT_VALIDITY_FROM_TIME);
  const [validityUpto, setValidityUpto] = useState(() => toValidityInputs(request?.validity_upto, { upto: true }).date);
  const [validityUptoTime, setValidityUptoTime] = useState(() => toValidityInputs(request?.validity_upto, { upto: true }).time);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!validityFrom || !validityUpto) { toast.error("Please select validity dates."); return; }
    const fromAt = combineValidity(validityFrom, validityFromTime);
    const uptoAt = combineValidity(validityUpto, validityUptoTime, { upto: true });
    if (!fromAt || !uptoAt) { toast.error("Please enter valid validity dates and times."); return; }
    if (fromAt >= uptoAt) { toast.error("Validity from must be before validity upto."); return; }
    setLoading(true);
    try {
      await onApprove(request.id, {
        validityFrom, validityUpto, validityFromTime, validityUptoTime,
        remarks: remarks.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;
  const pair = "flex gap-2";
  const dateCls = `${fieldCls} flex-1 min-w-0 focus:ring-emerald-400/50`;
  const timeCls = `${fieldCls} w-32 focus:ring-emerald-400/50`;

  return (
    <Modal
      title="Approve public request"
      description={<>{request.company_name} · <span className="font-mono">{request.tracking_number}</span></>}
      icon={CheckCircle2}
      tone="emerald"
      onClose={onClose}
      busy={loading}
      footer={<>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="success" onClick={handleSubmit} disabled={loading}>{loading ? "Approving…" : "Approve & send link"}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel required hint="IST">Valid from</FieldLabel>
          <div className={pair}>
            <input type="date" value={validityFrom} onChange={(e) => setValidityFrom(e.target.value)} className={dateCls} />
            <input type="time" value={validityFromTime} onChange={(e) => setValidityFromTime(e.target.value)} className={timeCls} />
          </div>
        </div>
        <div>
          <FieldLabel required hint="IST">Valid upto</FieldLabel>
          <div className={pair}>
            <input type="date" value={validityUpto} min={validityFrom || undefined} onChange={(e) => setValidityUpto(e.target.value)} className={dateCls} />
            <input type="time" value={validityUptoTime} onChange={(e) => setValidityUptoTime(e.target.value)} className={timeCls} />
          </div>
          <p className="mt-1.5 text-[11px] text-stone-400">Default window is 6:00 AM – 6:00 PM. The applicant can submit batches inside it.</p>
        </div>
        <div>
          <FieldLabel hint="Optional">Approval remarks</FieldLabel>
          <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any remarks for this approval…" className={`${fieldCls} resize-none focus:ring-emerald-400/50`} />
        </div>
      </div>
    </Modal>
  );
}

// ── Quick Rejection Modal for Public Requests ─────────────────────────────────
function QuickRejectionModal({ request, onClose, onReject }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const enough = reason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!enough) {
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
    <Modal
      title="Reject public request"
      description={<>{request.company_name} · <span className="font-mono">{request.tracking_number}</span></>}
      icon={XCircle}
      tone="red"
      onClose={onClose}
      busy={loading}
      footer={<>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={handleSubmit} disabled={loading || !enough}>{loading ? "Rejecting…" : "Reject request"}</Button>
      </>}
    >
      <FieldLabel required hint={`${reason.trim().length} / 10 min`}>Reason for rejection</FieldLabel>
      <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Explain why this request cannot be approved — the applicant will see it."
        className={`${fieldCls} resize-none focus:ring-red-400/50`} />
    </Modal>
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

  // Main view: "OVERVIEW" | "DEPARTMENT" | "PUBLIC" (public is General Administration only)
  const tabParam = searchParams.get("tab");
  const initialMainTab = tabParam === "public" ? "PUBLIC" : tabParam === "overview" ? "OVERVIEW" : "DEPARTMENT";
  const [mainTabState, setMainTab] = useState(initialMainTab);
  // `user` loads after mount; until then a ?tab=public link must not show a forbidden view.
  const mainTab = mainTabState === "PUBLIC" && !isGenAdmin ? "DEPARTMENT" : mainTabState;
  const [updatedAt, setUpdatedAt] = useState(null);

  // Update tab in URL state cleanly
  const handleMainTabChange = (newTab) => {
    setMainTab(newTab);
    const url = newTab === "PUBLIC" ? `${BASE}?tab=public` : newTab === "OVERVIEW" ? `${BASE}?tab=overview` : BASE;
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
  const [returnModal, setReturnModal] = useState(null);
  // Visitor type · validity · pass type · department, applied to the loaded rows.
  const [batchFilters, setBatchFilters] = useState(EMPTY_BATCH_FILTERS);
  const [batchSort, setBatchSort] = useState({ key: "updated", direction: "desc" });
  // Bulk-Pass-level filter driven by the overview tiles:
  // null | "ALL" | "VALIDITY_ACTIVE" | "VALIDITY_EXPIRED" | "VALIDITY_NOT_STARTED"
  const [bulkPassFilter, setBulkPassFilter] = useState(null);

  // ── PUBLIC REQUESTS STATE ──
  const [publicRequests, setPublicRequests] = useState([]);
  const [allPublicRequests, setAllPublicRequests] = useState([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicActiveTab, setPublicActiveTab] = useState("ALL");
  const [publicSearch, setPublicSearch] = useState("");
  const [publicFromDate, setPublicFromDate] = useState("");
  const [publicToDate, setPublicToDate] = useState("");
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
  // Status cards describe batches. A reusable pass is the container those
  // batches arrive into, so counting it here would inflate every column.
  const batchStats = useMemo(
    () => computeBulkPassStats(allBatches.filter((b) => !b.multipleSubmissionsEnabled)),
    [allBatches]
  );
  const batchSummary = batchStats?.summary || {};

  // Bulk-Pass-level metrics (containers + the batches flowing through them).
  // Public requests are folded in so the totals cover the whole module.
  const bulkPassOverview = useMemo(
    () => computeBulkPassOverview(allBatches, allPublicRequests),
    [allBatches, allPublicRequests]
  );

  // Public Requests Stats
  const publicSummary = useMemo(() => {
    const total = allPublicRequests.length;
    const pending = allPublicRequests.filter(r => r.status === "PENDING_ADMIN_APPROVAL").length;
    const active = allPublicRequests.filter(r => r.status === "ACTIVE").length;
    const rejected = allPublicRequests.filter(r => r.status === "REJECTED_BY_ADMIN").length;
    const expired = allPublicRequests.filter(r => r.status === "EXPIRED").length;
    return { total, pending, active, rejected, expired };
  }, [allPublicRequests]);

  // ── Fetch Department Batches (stats/overview population) ──
  // This backs the status cards and the Bulk-Pass overview, which must always
  // reflect the FULL set. Applying the table's multipleSubmissions filter here
  // made every status card drop to 0 when the filter was toggled on.
  const fetchAllBatches = useCallback(async () => {
    try {
      const data = await listBulkBatches({});
      setAllBatches(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const filters = {};
      if (batchSearch.trim()) filters.search = batchSearch.trim();
      if (batchActiveTab !== "ALL") filters.status = batchActiveTab;
      if (batchFromDate) filters.fromDate = batchFromDate;
      if (batchToDate) filters.toDate = batchToDate;
      const data = await listBulkBatches(filters);
      setBatches(Array.isArray(data) ? data : []);
      setUpdatedAt(Date.now());
    } catch { toast.error("Failed to load department bulk passes."); setBatches([]); }
    finally { setBatchLoading(false); }
  }, [batchSearch, batchActiveTab, batchFromDate, batchToDate]);

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
      setUpdatedAt(Date.now());
    } catch { toast.error("Failed to load public website requests."); setPublicRequests([]); }
    finally { setPublicLoading(false); }
  }, [publicSearch, publicActiveTab, publicFromDate, publicToDate, isGenAdmin]);

  useEffect(() => {
    fetchAllBatches();
    if (isGenAdmin) fetchAllPublicRequests();
  }, [fetchAllBatches, fetchAllPublicRequests, isGenAdmin]);

  useEffect(() => {
    if (mainTab === "PUBLIC") fetchPublicRequests();
    else fetchBatches();
  }, [mainTab, fetchBatches, fetchPublicRequests]);

  // Real-time polling
  useEffect(() => {
    // Bulk passes fill up batch by batch — keep their counts live.
    if (mainTab === "DEPARTMENT" && batchFilters.passType === "PASS") {
      const intervalId = setInterval(() => { fetchBatches(); }, 8000);
      return () => clearInterval(intervalId);
    }
  }, [mainTab, batchFilters.passType, fetchBatches]);

  const handleRefresh = () => {
    if (mainTab === "PUBLIC") { fetchPublicRequests(); fetchAllPublicRequests(); }
    else { fetchBatches(); fetchAllBatches(); if (isGenAdmin) fetchAllPublicRequests(); }
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

  // Bulk-Pass-level filtering. Each tile narrows the table to the containers
  // (a reusable intake or a stand-alone batch) rather than the individual
  // submissions inside them, which is the level the tiles count at.
  const visibleBatches = useMemo(() => {
    if (!bulkPassFilter) return batches;
    const containers = batches.filter((b) => !b.parentRequestId);
    switch (bulkPassFilter) {
      case "VALIDITY_ACTIVE":
        return containers.filter((b) => getValidityState(b).state === "ACTIVE");
      case "VALIDITY_EXPIRED":
        return containers.filter((b) => getValidityState(b).state === "EXPIRED");
      case "VALIDITY_NOT_STARTED":
        return containers.filter((b) => getValidityState(b).state === "NOT_STARTED");
      case "ALL":
      default:
        return containers;
    }
  }, [batches, bulkPassFilter]);

  // Dropdown filters, then sort — both before paging so they cover every row.
  const batchFilterOpts = useMemo(() => batchFilterOptions(visibleBatches, batchFilters), [visibleBatches, batchFilters]);
  const shownBatches = useMemo(
    () => sortRows(applyBatchFilters(visibleBatches, batchFilters), batchSort, BATCH_SORTERS),
    [visibleBatches, batchFilters, batchSort]
  );

  // Public requests: visitor type + validity reuse the batch matchers.
  const [publicFilters, setPublicFilters] = useState(EMPTY_BATCH_FILTERS);
  const [publicSort, setPublicSort] = useState({ key: "received", direction: "desc" });
  const publicFilterOpts = useMemo(() => batchFilterOptions(publicRequests, publicFilters), [publicRequests, publicFilters]);
  const shownRequests = useMemo(
    () => sortRows(applyBatchFilters(publicRequests, publicFilters), publicSort, REQUEST_SORTERS),
    [publicRequests, publicFilters, publicSort]
  );

  const batchPaged = usePaged(shownBatches);
  const publicPaged = usePaged(shownRequests);
  const resetBatchPage = batchPaged.reset;
  const resetPublicPage = publicPaged.reset;
  useEffect(() => { resetBatchPage(); }, [batchSearch, batchActiveTab, batchFromDate, batchToDate, batchFilters, batchSort, bulkPassFilter, resetBatchPage]);
  useEffect(() => { resetPublicPage(); }, [publicSearch, publicActiveTab, publicFromDate, publicToDate, publicFilters, publicSort, resetPublicPage]);

  const clearBatchFilters = () => {
    setBatchSearch(""); setBatchFromDate(""); setBatchToDate("");
    setBatchFilters(EMPTY_BATCH_FILTERS); setBulkPassFilter(null); setBatchActiveTab("ALL");
  };
  const clearPublicFilters = () => {
    setPublicSearch(""); setPublicFromDate(""); setPublicToDate(""); setPublicFilters(EMPTY_BATCH_FILTERS); setPublicActiveTab("ALL");
  };
  const batchChips = [
    batchActiveTab !== "ALL" && { key: "status", label: statusMeta(batchActiveTab).label, onClear: () => setBatchActiveTab("ALL") },
    bulkPassFilter && { key: "pass", label: BULK_PASS_FILTER_LABEL[bulkPassFilter], onClear: () => setBulkPassFilter(null) },
    batchSearch && { key: "search", label: `“${batchSearch}”`, onClear: () => setBatchSearch("") },
    (batchFromDate || batchToDate) && { key: "date", label: `${batchFromDate || "…"} → ${batchToDate || "…"}`, onClear: () => { setBatchFromDate(""); setBatchToDate(""); } },
    ...batchFilterChips(batchFilters, batchFilterOpts, setBatchFilters),
  ].filter(Boolean);
  const publicChips = [
    publicActiveTab !== "ALL" && { key: "status", label: REQUEST_STATUS[publicActiveTab]?.label || publicActiveTab, onClear: () => setPublicActiveTab("ALL") },
    publicSearch && { key: "search", label: `“${publicSearch}”`, onClear: () => setPublicSearch("") },
    (publicFromDate || publicToDate) && { key: "date", label: `${publicFromDate || "…"} → ${publicToDate || "…"}`, onClear: () => { setPublicFromDate(""); setPublicToDate(""); } },
    ...batchFilterChips(publicFilters, publicFilterOpts, setPublicFilters),
  ].filter(Boolean);

  const newPassButton = canCreateBatch ? (
    <Button variant="primary" icon={Plus} onClick={() => router.push(`${BASE}/create`)}>New bulk pass</Button>
  ) : null;

  const publicCards = [
    { key: "ALL", label: "All requests", value: publicSummary.total, icon: Globe, bar: "bg-stone-800 dark:bg-stone-300" },
    { key: "PENDING_ADMIN_APPROVAL", label: "Pending review", value: publicSummary.pending, icon: Clock, soft: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300", bar: "bg-amber-500", hint: "Waiting for your approval" },
    { key: "ACTIVE", label: "Approved", value: publicSummary.active, icon: CheckCircle2, soft: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300", bar: "bg-emerald-500", hint: "Link sent — accepting batches" },
    { key: "REJECTED_BY_ADMIN", label: "Rejected", value: publicSummary.rejected, icon: XCircle, soft: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300", bar: "bg-red-500" },
    { key: "EXPIRED", label: "Expired", value: publicSummary.expired, icon: CalendarClock, soft: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300", bar: "bg-stone-400" },
  ];

  return (
    <div className="pt-6 pb-10 flex flex-col gap-6">
      <PageHeader
        icon={Layers}
        eyebrow="Bulk Pass"
        title="Bulk Pass Management"
        subtitle="Department bulk passes and public website applications in one place."
        actions={<>
          <RefreshButton onClick={handleRefresh} loading={mainTab === "PUBLIC" ? publicLoading : batchLoading} updatedAt={updatedAt} />
          {newPassButton}
        </>}
      />

      <ViewTabs
        value={mainTab}
        onChange={handleMainTabChange}
        tabs={[
          { key: "OVERVIEW", label: "Overview", icon: LayoutDashboard },
          { key: "DEPARTMENT", label: "Department batches", icon: FileStack, count: batchSummary.underReview, countTone: "bg-amber-500 text-white" },
          ...(isGenAdmin ? [{ key: "PUBLIC", label: "Public requests", icon: Globe, count: publicSummary.pending, countTone: "bg-sky-500 text-white" }] : []),
        ]}
      />

      {/* ── OVERVIEW ── */}
      {mainTab === "OVERVIEW" && (
        <div className="flex flex-col gap-6">
          {isGenAdmin && publicSummary.pending > 0 && (
            <Card className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
                <Globe className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
                  {publicSummary.pending} public request{publicSummary.pending === 1 ? "" : "s"} waiting for approval
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Approve to send the applicant an upload link with its validity window.</p>
              </div>
              <Button onClick={() => { setPublicActiveTab("PENDING_ADMIN_APPROVAL"); handleMainTabChange("PUBLIC"); }}>
                Review requests <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          )}

          <BulkPassOverviewPanel
            overview={bulkPassOverview}
            activeKey={bulkPassFilter}
            onFilter={(key) => {
              setBulkPassFilter(key);
              setBatchActiveTab("ALL");
              handleMainTabChange("DEPARTMENT");
            }}
          />

          <BulkPassDashboard
            stats={batchStats}
            loading={false}
            hideHeader
            queueLabel="Show pending batches"
            detailHrefBase={BASE}
            onCardClick={(key) => { setBulkPassFilter(null); setBatchActiveTab(key); handleMainTabChange("DEPARTMENT"); }}
          />
        </div>
      )}

      {/* ── DEPARTMENT BATCHES ── */}
      {mainTab === "DEPARTMENT" && (
        <>
          <StatusFilterCards
            items={batchStatusCards(batchSummary)}
            value={batchActiveTab}
            onChange={(k) => { setBatchActiveTab(k); }}
            total={batchSummary.totalBatches}
          />

          <div className="flex flex-col gap-3">
            <Toolbar>
              <SearchInput value={batchSearch} onChange={setBatchSearch} placeholder="Search by reference number or company…" />
              <DateRange from={batchFromDate} to={batchToDate} onChange={({ from, to }) => { setBatchFromDate(from); setBatchToDate(to); }} />
              <BatchFilterSelects filters={batchFilters} options={batchFilterOpts} onChange={setBatchFilters} />
            </Toolbar>
            <ResultSummary count={shownBatches.length} noun="result" chips={batchChips} onClearAll={clearBatchFilters} />
          </div>

          <TableCard
            footer={!batchLoading && shownBatches.length > 0 && (
              <Pagination page={batchPaged.page} pageSize={batchPaged.pageSize} total={batchPaged.total} onPage={batchPaged.setPage} onPageSize={batchPaged.setPageSize} />
            )}
          >
            <BatchesTable
              rows={batchPaged.rows}
              loading={batchLoading}
              onOpen={(b) => router.push(`${BASE}/${b.id}`)}
              getAction={batchAction}
              sort={batchSort}
              onSort={(key) => setBatchSort((cur) => nextSort(cur, key))}
              empty={batchChips.length ? {
                title: "No batches match your filters",
                message: "Try a different search or clear the filters.",
                action: <Button onClick={clearBatchFilters}><X className="h-4 w-4" /> Clear filters</Button>,
              } : {
                title: "No department bulk passes yet",
                message: "Create a bulk pass and the applicant receives a link to upload visitor details.",
                action: newPassButton,
              }}
            />
          </TableCard>
        </>
      )}

      {/* ── PUBLIC WEBSITE REQUESTS ── */}
      {mainTab === "PUBLIC" && isGenAdmin && (
        <>
          <StatusFilterCards items={publicCards} value={publicActiveTab} onChange={setPublicActiveTab} total={publicSummary.total} />

          <div className="flex flex-col gap-3">
            <Toolbar>
              <SearchInput value={publicSearch} onChange={setPublicSearch} placeholder="Search tracking no, email or company…" />
              <DateRange label="Received" from={publicFromDate} to={publicToDate} onChange={({ from, to }) => { setPublicFromDate(from); setPublicToDate(to); }} />
              <BatchFilterSelects filters={publicFilters} options={publicFilterOpts} onChange={setPublicFilters} show={["visitorType", "validity"]} />
            </Toolbar>
            <ResultSummary count={shownRequests.length} noun="request" chips={publicChips} onClearAll={clearPublicFilters} />
          </div>

          <TableCard
            footer={!publicLoading && shownRequests.length > 0 && (
              <Pagination page={publicPaged.page} pageSize={publicPaged.pageSize} total={publicPaged.total} onPage={publicPaged.setPage} onPageSize={publicPaged.setPageSize} />
            )}
          >
            <RequestsTable
              requests={publicPaged.rows}
              loading={publicLoading}
              onView={(req) => router.push(`/admin/public-requests/${req.id}`)}
              onQuickApprove={(req) => setQuickApproveReq(req)}
              onQuickReject={(req) => setQuickRejectReq(req)}
              hasFilters={publicChips.length > 0}
              emptyAction={<Button onClick={clearPublicFilters}><X className="h-4 w-4" /> Clear filters</Button>}
              sort={publicSort}
              onSort={(key) => setPublicSort((cur) => nextSort(cur, key))}
            />
          </TableCard>
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
    <Suspense fallback={<Spinner label="Loading Bulk Pass console…" />}>
      <AdminBulkPassPageContent />
    </Suspense>
  );
}
