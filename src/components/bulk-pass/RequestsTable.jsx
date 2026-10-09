"use client";

/**
 * RequestsTable — public website bulk pass requests (admin).
 *
 * Tracking no · company · contact · requested persons/vehicles · batches
 * received · validity · status · actions. Pending rows get one-click
 * Approve / Reject.
 *
 * Sorting is owned by the page (REQUEST_SORTERS + sortRows, before paging) so
 * it orders the whole list, not just the visible page; pass `sort`/`onSort`.
 * Renders the table body only — wrap it in <TableCard> with a <Pagination>.
 */

import React from "react";
import { Car, Check, FileStack, Globe, Mail, Phone, Users, X } from "lucide-react";
import { formatValidityDateTime } from "@/lib/bulkPassValidity";
import { DataTable, EmptyState, Pill, RefCell, Row, TableSkeleton, Td, formatDate, timeAgo } from "./ui";
import { ActionButton } from "./BatchesTable.jsx";

export const REQUEST_STATUS = {
  PENDING_ADMIN_APPROVAL: {
    label: "Pending Review",
    pill: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  ACTIVE: {
    label: "Approved",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  REJECTED_BY_ADMIN: {
    label: "Rejected",
    pill: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
    dot: "bg-red-500",
  },
  EXPIRED: {
    label: "Expired",
    pill: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10",
    dot: "bg-stone-400",
  },
};

function RequestStatusPill({ status }) {
  const m = REQUEST_STATUS[status] || { label: status || "Unknown", pill: REQUEST_STATUS.EXPIRED.pill, dot: "bg-stone-400" };
  return <Pill className={m.pill} dot={m.dot}>{m.label}</Pill>;
}

const COLUMNS = [
  { key: "tracking", label: "Tracking no", sortKey: "tracking" },
  { key: "company", label: "Company", sortKey: "company" },
  { key: "contact", label: "Contact" },
  { key: "requested", label: "Requested", sortKey: "persons" },
  { key: "batches", label: "Batches received", sortKey: "batches" },
  { key: "validity", label: "Validity", sortKey: "validity" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "received", label: "Received", sortKey: "received" },
  { key: "action", label: "", className: "w-px" },
];

const RequestsTable = ({
  requests = [],
  loading = false,
  onView,
  onQuickApprove,
  onQuickReject,
  hasFilters = false,
  emptyAction,
  sort,
  onSort,
}) => {
  if (loading) return <TableSkeleton cols={7} />;

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title={hasFilters ? "No requests match your filters" : "No public requests yet"}
        message={hasFilters ? "Try a different search or clear the filters." : "Requests submitted on the public website will appear here."}
        action={hasFilters ? emptyAction : null}
      />
    );
  }

  return (
    <DataTable columns={COLUMNS} minWidth={1080} sort={sort} onSort={onSort}>
          {requests.map((r) => {
            const pending = r.status === "PENDING_ADMIN_APPROVAL";
            return (
              <Row key={r.id} onOpen={() => onView(r)}>
                <Td><RefCell refNo={r.tracking_number} /></Td>
                <Td className="max-w-[220px]">
                  <p className="font-semibold text-stone-800 dark:text-stone-100 truncate" title={r.company_name}>{r.company_name || "—"}</p>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1 text-xs text-stone-600 dark:text-stone-300">
                    <span className="inline-flex items-center gap-1.5 truncate max-w-[200px]" title={r.applicant_email}>
                      <Mail className="h-3 w-3 text-stone-400 shrink-0" /> {r.applicant_email || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-stone-400 shrink-0" /> {r.applicant_mobile || "—"}
                    </span>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-3 text-[13px] font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                    <span className="inline-flex items-center gap-1" title="Max persons"><Users className="h-3.5 w-3.5 text-stone-400" />{r.no_of_persons ?? "—"}</span>
                    <span className="inline-flex items-center gap-1" title="Max vehicles"><Car className="h-3.5 w-3.5 text-stone-400" />{r.no_of_vehicles ?? "—"}</span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">
                  {r.status === "ACTIVE" || r.submissions_count > 0 ? (
                    <div className="text-[13px]">
                      <span className="inline-flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-100">
                        <FileStack className="h-3.5 w-3.5 text-stone-400" /> {r.submissions_count ?? 0}
                      </span>
                      <p className="text-[11px] text-stone-400">{r.submitted_persons_count ?? 0} persons · {r.submitted_vehicles_count ?? 0} vehicles</p>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-[11px] text-stone-600 dark:text-stone-300 tabular-nums">
                  {r.validity_upto ? (
                    <div className="flex flex-col gap-0.5">
                      <span>{r.validity_from ? formatValidityDateTime(r.validity_from) : "Until"}</span>
                      <span className="text-stone-500">→ {formatValidityDateTime(r.validity_upto, { upto: true })}</span>
                    </div>
                  ) : "—"}
                </Td>
                <Td>
                  <RequestStatusPill status={r.status} />
                  {r.approved_by_name && r.status !== "PENDING_ADMIN_APPROVAL" && (
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">by {r.approved_by_name}</p>
                  )}
                  {r.rejected_by_name && r.status === "REJECTED_BY_ADMIN" && (
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap">by {r.rejected_by_name}</p>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <p className="text-[13px] text-stone-700 dark:text-stone-200">{timeAgo(r.created_at)}</p>
                  <p className="text-[11px] text-stone-400">{formatDate(r.created_at)}</p>
                </Td>
                <Td stop className="text-right">
                  {pending ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={() => onQuickApprove(r)} title="Approve"
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition active:scale-[0.97]">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Approve
                      </button>
                      <button type="button" onClick={() => onQuickReject(r)} title="Reject" aria-label="Reject"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-600 ring-1 ring-red-200 hover:bg-red-50 transition dark:text-red-400 dark:ring-red-400/20 dark:hover:bg-red-400/10">
                        <X className="h-4 w-4" strokeWidth={2.6} />
                      </button>
                    </div>
                  ) : (
                    <ActionButton label="View" onClick={() => onView(r)} />
                  )}
                </Td>
              </Row>
            );
          })}
    </DataTable>
  );
};

export default RequestsTable;
