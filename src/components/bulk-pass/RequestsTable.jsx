"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp, ChevronDown, Eye, 
  Mail, Phone, Users, Car,
  FileStack, ArrowUpDown
} from "lucide-react";

/**
 * RequestsTable Component for Admin Public Requests
 * 
 * Features:
 * - Table columns: Tracking No, Company Name, Contact (email + mobile), Persons, Vehicles, Validity, Status, Actions
 * - Display status badges with color coding: PENDING (yellow), ACTIVE (green), REJECTED (red)
 * - Sortable columns (tracking number, created date)
 * - Row click navigates to detail page
 * - "View" button in Actions column
 * - Quick approve/reject buttons for pending requests
 * - Empty state when no requests found
 * 
 * Requirements: 25.1-25.3
 */

// ── Status configuration ──────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING_ADMIN_APPROVAL: {
    label: "Pending Review",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
  },
  ACTIVE: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED_BY_ADMIN: {
    label: "Rejected",
    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
    dot: "bg-red-500",
  },
  EXPIRED: {
    label: "Expired",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    dot: "bg-slate-400",
  },
};

// ── Utility functions ──────────────────────────────────────────────────────
const fmtDateShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? v : new Intl.DateTimeFormat("en-IN", { 
    day: "2-digit", month: "short", year: "numeric" 
  }).format(d);
};

// ── Status Badge Component ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { 
    label: status || "Unknown", 
    badge: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", 
    dot: "bg-slate-400" 
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
}

// ── Action Buttons Component ────────────────────────────────────────────────
function ActionButtons({ request, onView, onQuickApprove, onQuickReject }) {
  const { status } = request;
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition whitespace-nowrap border";
  
  if (status === "PENDING_ADMIN_APPROVAL") {
    return (
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onView(request)} 
          className={`${base} border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100`}
          title="View details"
        >
          <Eye className="h-3.5 w-3.5" />View
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onQuickApprove(request);
          }}
          className={`${base} border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100`}
          title="Quick approve"
        >
          ✓ Approve
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onQuickReject(request);
          }}
          className={`${base} border-red-300 text-red-800 bg-red-50 hover:bg-red-100`}
          title="Quick reject"
        >
          ✗ Reject
        </button>
      </div>
    );
  }
  
  return (
    <button 
      onClick={() => onView(request)} 
      className={`${base} border-slate-200 text-slate-700 bg-white hover:bg-slate-50`}
    >
      <Eye className="h-3.5 w-3.5" />View Details
    </button>
  );
}

// ── Sortable Table Header Component ──────────────────────────────────────────
function SortableHeader({ label, sortKey, currentSort, onSort, className = "" }) {
  const isSorted = currentSort.key === sortKey;
  const isAsc = isSorted && currentSort.direction === "asc";
  
  return (
    <th 
      className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap cursor-pointer hover:text-slate-600 transition select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortKey && (
          <div className="flex flex-col">
            {isSorted ? (
              isAsc ? (
                <ChevronUp className="h-3 w-3 text-slate-600" />
              ) : (
                <ChevronDown className="h-3 w-3 text-slate-600" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-slate-300" />
            )}
          </div>
        )}
      </div>
    </th>
  );
}

// ── Main RequestsTable Component ─────────────────────────────────────────────
const RequestsTable = ({
  requests = [],
  loading = false,
  onView,
  onQuickApprove,
  onQuickReject,
  hasFilters = false,
  className = "",
}) => {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  // Sort the requests based on current sort configuration
  const sortedRequests = React.useMemo(() => {
    if (!sortConfig.key) return requests;

    return [...requests].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle special cases for sorting
      if (sortConfig.key === "tracking_number") {
        aVal = aVal || "";
        bVal = bVal || "";
      } else if (sortConfig.key === "created_at") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [requests, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRowClick = (request) => {
    router.push(`/admin/public-requests/${request.id}`);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-9 w-9 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Loading requests…</p>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FileStack className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-slate-700">
            {hasFilters ? "No requests match your filters" : "No public requests yet"}
          </p>
          <p className="text-sm text-slate-400">
            {hasFilters ? "Try adjusting your search or filters." : "Public requests will appear here when submitted."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <SortableHeader 
                label="Tracking No" 
                sortKey="tracking_number"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader 
                label="Company Name" 
                sortKey="company_name"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Contact
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Persons
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Vehicles
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Validity
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Status
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedRequests.map((request) => (
              <tr 
                key={request.id}
                className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                onClick={() => handleRowClick(request)}
              >
                <td className="px-5 py-3.5">
                  <p className="font-bold text-slate-900 text-sm font-mono group-hover:text-amber-600 transition-colors">
                    {request.tracking_number || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {fmtDateShort(request.created_at)}
                  </p>
                </td>
                <td className="px-5 py-3.5 max-w-[200px]">
                  <p className="font-medium text-slate-800 truncate" title={request.company_name}>
                    {request.company_name || "—"}
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600 truncate max-w-[180px]" title={request.applicant_email}>
                        {request.applicant_email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600">
                        {request.applicant_mobile || "—"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {request.no_of_persons ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {request.no_of_vehicles ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                  {request.validity_from && request.validity_upto ? (
                    <div className="flex flex-col gap-0.5">
                      <span>{fmtDateShort(request.validity_from)}</span>
                      <span className="text-slate-400">to</span>
                      <span>{fmtDateShort(request.validity_upto)}</span>
                    </div>
                  ) : request.validity_upto ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-400">until</span>
                      <span>{fmtDateShort(request.validity_upto)}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    request={request}
                    onView={onView}
                    onQuickApprove={onQuickApprove}
                    onQuickReject={onQuickReject}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestsTable;