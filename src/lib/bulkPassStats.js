/**
 * bulkPassStats.js
 * ----------------
 * Pure client-side aggregation that turns the batch list returned by
 * `listBulkBatches()` (GET /api/bulk-pass/list) into the shape consumed by
 * <BulkPassDashboard />. This keeps the dashboard and the /admin/bulk_pass
 * table backed by the exact same data source — no separate stats endpoint.
 */

const STATUS_KEYS = [
  "DRAFT",
  "UNDER_REVIEW",
  "RETURNED_TO_APPLICANT",
  "REJECTED",
  "COMPLETED",
];

const STATUS_LABELS = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  RETURNED_TO_APPLICANT: "Returned",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const titleCase = (s) =>
  !s ? "Unspecified" : String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * @param {Array} batches - rows from listBulkBatches()
 * @returns stats object: { summary, statusBreakdown, trend, visitorTypes, recentActivity }
 */
export function computeBulkPassStats(batches) {
  const rows = Array.isArray(batches) ? batches : [];

  // ── Status counts ──────────────────────────────────────────────────────
  const statusCounts = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  let declaredPersons = 0;
  let declaredVehicles = 0;
  let totalPersons = 0;
  let totalVehicles = 0;

  for (const b of rows) {
    if (statusCounts[b.status] !== undefined) statusCounts[b.status] += 1;
    declaredPersons += toInt(b.noOfPersons);
    declaredVehicles += toInt(b.noOfVehicles);
    // submitted counts come from the list join; fall back to declared
    totalPersons += toInt(b.submittedPersonsCount ?? b.noOfPersons);
    totalVehicles += toInt(b.submittedVehiclesCount ?? b.noOfVehicles);
  }

  const pendingReview = statusCounts.UNDER_REVIEW;

  // ── 6-month trend (created vs completed), oldest → newest ───────────────
  const now = new Date();
  const buckets = [];
  const bucketIndex = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    bucketIndex[key] = buckets.length;
    buckets.push({
      month: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      created: 0,
      completed: 0,
    });
  }
  for (const b of rows) {
    if (!b.createdAt) continue;
    const d = new Date(b.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = bucketIndex[key];
    if (idx === undefined) continue; // older than 6 months
    buckets[idx].created += 1;
    if (b.status === "COMPLETED") buckets[idx].completed += 1;
  }

  // ── Visitor-type breakdown (descending) ─────────────────────────────────
  const visitorMap = new Map();
  for (const b of rows) {
    const key = titleCase(b.visitorType);
    visitorMap.set(key, (visitorMap.get(key) || 0) + 1);
  }
  const visitorTypes = Array.from(visitorMap.entries())
    .map(([visitorType, count]) => ({ visitorType, count }))
    .sort((a, b) => b.count - a.count);

  // ── Recent activity (latest-touched batches) ────────────────────────────
  const recentActivity = [...rows]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 12)
    .map((b) => ({
      batchId: b.id,
      status: b.status,
      refNo: b.refNo,
      companyName: b.companyName,
      departmentName: b.departmentName,
      remarks: b.returnReason || b.rejectionReason || null,
      createdAt: b.updatedAt || b.createdAt,
    }));

  return {
    summary: {
      totalBatches: rows.length,
      draft: statusCounts.DRAFT,

      underReview: statusCounts.UNDER_REVIEW,
      returned: statusCounts.RETURNED_TO_APPLICANT,
      rejected: statusCounts.REJECTED,
      completed: statusCounts.COMPLETED,
      declaredPersons,
      declaredVehicles,
      totalPersons,
      totalVehicles,
      pendingReview,
    },
    statusBreakdown: STATUS_KEYS.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: statusCounts[status],
    })),
    trend: buckets,
    visitorTypes,
    recentActivity,
  };
}
