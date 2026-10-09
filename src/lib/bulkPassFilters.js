/**
 * bulkPassFilters.js
 * ------------------
 * Client-side filters and sort orders for the bulk pass management lists.
 * Server-side filters (status, search, submitted date) still narrow the fetch;
 * these refine the loaded rows and must run BEFORE pagination.
 */

import { getValidityState, normalizeValidityUpto } from "@/lib/bulkPassValidity";

// ── Filters ──────────────────────────────────────────────────────────────────

export const EMPTY_BATCH_FILTERS = { visitorType: "", validity: "", passType: "", department: "" };

export const VALIDITY_FILTERS = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING", label: "Expiring soon" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "EXPIRED", label: "Expired" },
  { value: "UNKNOWN", label: "No validity set" },
];

// Every bulk pass link takes any number of batches, so the useful split is
// the pass itself vs the batches submitted under it.
export const PASS_TYPE_FILTERS = [
  { value: "PASS", label: "Bulk passes" },
  { value: "CHILD", label: "Batches" },
];

const visitorKey = (b) => String(b.visitorType || b.visitor_type || "").toUpperCase();
const departmentOf = (b) => b.departmentName || b.department_name || "";

/** The validity bucket a row falls into (matches VALIDITY_FILTERS values). */
export function validityBucket(row, now = new Date()) {
  const v = getValidityState(row, now);
  if (v.state === "ACTIVE") return v.expiringSoon ? "EXPIRING" : "ACTIVE";
  return v.state;
}

function passTypeOf(b) {
  return b.parentRequestId ? "CHILD" : "PASS";
}

const matchers = {
  visitorType: (b, v) => visitorKey(b) === v,
  validity: (b, v, now) => {
    const bucket = validityBucket(b, now);
    // "Active" includes the passes that are active but closing soon.
    return v === "ACTIVE" ? bucket === "ACTIVE" || bucket === "EXPIRING" : bucket === v;
  },
  passType: (b, v) => passTypeOf(b) === v,
  department: (b, v) => departmentOf(b) === v,
};

/** Rows matching every set filter. `skip` leaves one key out (for counts). */
export function applyBatchFilters(rows, filters, { skip, now = new Date() } = {}) {
  const active = Object.entries(filters || {}).filter(([k, v]) => v && k !== skip && matchers[k]);
  if (!active.length) return rows;
  return rows.filter((b) => active.every(([k, v]) => matchers[k](b, v, now)));
}

const titleCase = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Dropdown options with live counts. Each count reflects the OTHER active
 * filters, so the number shown is what you get if you pick that option.
 */
export function batchFilterOptions(rows, filters, now = new Date()) {
  const count = (key, list, pick) => {
    const base = applyBatchFilters(rows, filters, { skip: key, now });
    return list.map((o) => ({ ...o, count: base.filter((b) => pick(b, o.value)).length }));
  };

  const visitorTypes = [...new Set(rows.map(visitorKey).filter(Boolean))].sort();
  const departments = [...new Set(rows.map(departmentOf).filter(Boolean))].sort();

  return {
    visitorType: count("visitorType", visitorTypes.map((v) => ({ value: v, label: titleCase(v) })), matchers.visitorType),
    validity: count("validity", VALIDITY_FILTERS, (b, v) => matchers.validity(b, v, now)),
    passType: count("passType", PASS_TYPE_FILTERS, matchers.passType),
    department: count("department", departments.map((d) => ({ value: d, label: d })), matchers.department),
  };
}

/** Removable chips for the active filters. */
export function batchFilterChips(filters, options, onChange) {
  const labels = { visitorType: "Visitor", validity: "Validity", passType: "Type", department: "Department" };
  return Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => ({
      key: `f-${k}`,
      label: `${labels[k]}: ${options[k]?.find((o) => o.value === v)?.label || v}`,
      onClear: () => onChange({ ...filters, [k]: "" }),
    }));
}

// ── Sorting ──────────────────────────────────────────────────────────────────

const STATUS_RANK = { UNDER_REVIEW: 0, RETURNED_TO_APPLICANT: 1, DRAFT: 2, COMPLETED: 3, REJECTED: 4 };
const time = (v) => {
  const t = new Date(v || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const text = (v) => String(v || "").toLowerCase();

/** Sort keys shared by the batch tables: key → value to compare. */
export const BATCH_SORTERS = {
  ref: (b) => text(b.refNo),
  company: (b) => text(b.companyName),
  status: (b) => STATUS_RANK[b.status] ?? 9,
  persons: (b) => Number(b.multipleSubmissionsEnabled ? b.childPersonsCount : b.submittedPersonsCount ?? b.noOfPersons) || 0,
  vehicles: (b) => Number(b.multipleSubmissionsEnabled ? b.childVehiclesCount : b.submittedVehiclesCount ?? b.noOfVehicles) || 0,
  validity: (b) => normalizeValidityUpto(b.validityUpto)?.getTime() ?? Infinity,
  updated: (b) => time(b.updatedAt || b.createdAt),
  createdBy: (b) => text(b.createdByName),
  wait: (b) => Number(b.waitingSeconds) || 0,
};

export const REQUEST_SORTERS = {
  tracking: (r) => text(r.tracking_number),
  company: (r) => text(r.company_name),
  persons: (r) => Number(r.no_of_persons) || 0,
  batches: (r) => Number(r.submissions_count) || 0,
  validity: (r) => normalizeValidityUpto(r.validity_upto)?.getTime() ?? Infinity,
  status: (r) => ({ PENDING_ADMIN_APPROVAL: 0, ACTIVE: 1, EXPIRED: 2, REJECTED_BY_ADMIN: 3 })[r.status] ?? 9,
  received: (r) => time(r.created_at),
};

/** Stable sort by `sorters[sort.key]`; ties keep the server order. */
export function sortRows(rows, sort, sorters) {
  const get = sort?.key && sorters[sort.key];
  if (!get) return rows;
  const dir = sort.direction === "desc" ? -1 : 1;
  return rows
    .map((row, i) => ({ row, i, v: get(row) }))
    .sort((a, b) => (a.v < b.v ? -dir : a.v > b.v ? dir : a.i - b.i))
    .map((x) => x.row);
}

// Columns whose natural first click is "biggest / newest first".
const DESC_FIRST = new Set(["updated", "received", "persons", "vehicles", "batches", "wait"]);

/** Next sort after clicking a column: first click → natural order, then flip. */
export function nextSort(current, key) {
  if (current?.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: DESC_FIRST.has(key) ? "desc" : "asc" };
}
