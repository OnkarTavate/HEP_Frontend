"use client";

/**
 * BatchesTable.jsx — the batch lists shared by the management pages.
 *
 *  - <BatchesTable>      department / admin: every bulk pass and the batches in it.
 *  - <ReviewQueueTable>  traffic approval / manager: batches to review, with
 *                        how long each has waited and whether it starts soon.
 */

import React from "react";
import { Building2, CalendarClock, Car, ChevronRight, Eye, FileStack, Layers, Users, XCircle, Edit3, CheckSquare } from "lucide-react";
import { ValidityBadge } from "./ValidityBanner.jsx";
import { formatValidityDateTime, getValidityState } from "@/lib/bulkPassValidity";
import {
  Button, CapacityMeter, DataTable, EmptyState, PassStatePill, RefCell, Row, SelectFilter, StatusPill, TableSkeleton, Tag, Td,
  accentOf, formatDate, timeAgo, titleCase,
} from "./ui";

/** "Created by X" / "Approved by Y" — who issued the pass and who cleared it. */
function ActorsCell({ batch }) {
  return (
    <div className="text-[12px] leading-snug whitespace-nowrap">
      <p className="text-stone-700 dark:text-stone-200">
        <span className="text-stone-400">Created</span> {batch.createdByName || "—"}
      </p>
      <p className={batch.approvedByName ? "text-emerald-700 dark:text-emerald-300" : "text-stone-400"}>
        <span className="text-stone-400">Approved</span> {batch.approvedByName || "—"}
      </p>
    </div>
  );
}

function ValidityCell({ batch }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <ValidityBadge validity={getValidityState(batch)} />
      {batch.validityUpto && (
        <span className="text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap tabular-nums">
          {batch.validityFrom ? `${formatValidityDateTime(batch.validityFrom)} → ` : "Until "}
          {formatValidityDateTime(batch.validityUpto, { upto: true })}
        </span>
      )}
    </div>
  );
}

const ACTION_STYLE = {
  review: { icon: CheckSquare, cls: "bg-amber-400 text-stone-900 hover:bg-amber-500" },
  fix: { icon: Edit3, cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20" },
  view: { icon: Eye, cls: "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-white/5 dark:text-stone-200 dark:ring-white/10" },
};

/** Default per-status action: label + style. Pages may override via `getAction`. */
function defaultAction(batch) {
  if (batch.status === "COMPLETED") return { label: "View pass", kind: "view" };
  if (batch.status === "RETURNED_TO_APPLICANT") return { label: "View", kind: "fix" };
  return { label: "View", kind: "view" };
}

export function ActionButton({ label, kind = "view", onClick }) {
  const s = ACTION_STYLE[kind] || ACTION_STYLE.view;
  const Icon = s.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-[0.97] ${s.cls}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      {label}
    </button>
  );
}

const MANAGE_COLUMNS = [
  { key: "ref", label: "Bulk pass / Batch", sortKey: "ref" },
  { key: "company", label: "Company", sortKey: "company" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "persons", label: "Persons", sortKey: "persons" },
  { key: "vehicles", label: "Vehicles", sortKey: "vehicles" },
  { key: "validity", label: "Validity", sortKey: "validity" },
  { key: "actors", label: "Created / Approved by", sortKey: "createdBy" },
  { key: "updated", label: "Last updated", sortKey: "updated" },
  { key: "action", label: "", className: "w-px" },
];

/**
 * @param rows        batches (already filtered + paged)
 * @param loading     show skeleton rows
 * @param onOpen      (batch) => void — row click and action button
 * @param getAction   optional (batch) => { label, kind: "review"|"fix"|"view" }
 * @param empty       { title, message, action } for the empty state
 * @param sort        { key, direction } — rows must already be sorted by the page
 * @param onSort      (key) => void — header click
 */
export function BatchesTable({ rows, loading, onOpen, getAction = defaultAction, empty = {}, accent = "amber", sort, onSort }) {
  if (loading) return <TableSkeleton cols={7} />;
  if (!rows.length) {
    return <EmptyState icon={FileStack} title={empty.title || "No batches found"} message={empty.message} action={empty.action} />;
  }
  return (
    <DataTable columns={MANAGE_COLUMNS} minWidth={1220} sort={sort} onSort={onSort}>
      {rows.map((b) => {
        const isChild = !!b.parentRequestId;
        const multi = !!b.multipleSubmissionsEnabled;
        const persons = multi ? b.childPersonsCount : b.submittedPersonsCount;
        const vehicles = multi ? b.childVehiclesCount : b.submittedVehiclesCount;
        const action = getAction(b);
        return (
          <Row key={b.id} onOpen={() => onOpen(b)} accent={accent}>
            <Td>
              <RefCell
                accent={accent}
                refNo={b.refNo}
                sub={titleCase(b.visitorType)}
                tags={
                  <>
                    {multi && (
                      <Tag title={`${b.childSubmissionsCount || 0} batch(es) received on this bulk pass`}>
                        <FileStack className="h-2.5 w-2.5" strokeWidth={3} /> {b.childSubmissionsCount || 0} batch{(b.childSubmissionsCount || 0) === 1 ? "" : "es"}
                      </Tag>
                    )}
                    {isChild && <Tag>Batch #{b.submissionNumber ?? "—"}</Tag>}
                  </>
                }
              />
            </Td>
            <Td className="max-w-[220px]">
              <p className="font-semibold text-stone-800 dark:text-stone-100 truncate" title={b.companyName}>{b.companyName || "—"}</p>
              {b.departmentName && <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{b.departmentName}</p>}
            </Td>
            <Td>{b.isBulkPassContainer ? <PassStatePill state={b.bulkPassStatus} /> : <StatusPill status={b.status} />}</Td>
            <Td><CapacityMeter used={persons} max={b.noOfPersons} icon={Users} label="persons" /></Td>
            <Td><CapacityMeter used={vehicles} max={b.noOfVehicles} icon={Car} label="vehicles" /></Td>
            <Td><ValidityCell batch={b} /></Td>
            <Td><ActorsCell batch={b} /></Td>
            <Td className="whitespace-nowrap">
              <p className="text-[13px] text-stone-700 dark:text-stone-200">{timeAgo(b.updatedAt || b.createdAt)}</p>
              <p className="text-[11px] text-stone-400">{formatDate(b.updatedAt || b.createdAt)}</p>
            </Td>
            <Td stop className="text-right">
              <div className="flex items-center justify-end gap-1">
                <ActionButton label={action.label} kind={action.kind} onClick={() => onOpen(b)} />
                <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500 transition" />
              </div>
            </Td>
          </Row>
        );
      })}
    </DataTable>
  );
}

// ── Traffic review queue ─────────────────────────────────────────────────────

/** How long a batch has waited, and how loudly to say so. */
export function describeWait(seconds) {
  const s = Number(seconds) || 0;
  const hours = s / 3600;
  if (hours < 1) return { label: `${Math.max(1, Math.round(s / 60))} min`, tone: "fresh" };
  if (hours < 24) return { label: `${Math.round(hours)} h`, tone: hours >= 8 ? "warm" : "fresh" };
  const days = Math.floor(hours / 24);
  return { label: `${days} d`, tone: days >= 3 ? "hot" : "warm" };
}

const WAIT_TONE = {
  fresh: "bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300",
  warm: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  hot: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
};

/** True when the batch's validity opens within 36 hours. */
export function startsImminently(batch, now) {
  if (!batch?.validityFrom) return false;
  const from = new Date(batch.validityFrom).getTime();
  if (Number.isNaN(from)) return false;
  const delta = from - now;
  return delta > 0 && delta < 36 * 3600 * 1000;
}

/**
 * @param showStatus  true for a status-filtered list (status pill instead of
 *                    the waiting time and review actions)
 * @param onReject    optional; shows a Reject button per row
 */
export function ReviewQueueTable({ rows, loading, onOpen, onReject, showStatus = false, nowMs = 0, empty = {}, accent = "orange", sort, onSort }) {
  const a = accentOf(accent);
  if (loading) return <TableSkeleton cols={7} />;
  if (!rows.length) {
    return <EmptyState title={empty.title || "Nothing to review"} message={empty.message} />;
  }
  const columns = [
    { key: "ref", label: "Batch", sortKey: "ref" },
    { key: "company", label: "Company", sortKey: "company" },
    { key: "persons", label: "Persons", align: "center", sortKey: "persons" },
    showStatus ? { key: "status", label: "Status", sortKey: "status" } : { key: "wait", label: "Waiting", sortKey: "wait" },
    { key: "validity", label: "Validity", sortKey: "validity" },
    { key: "submitted", label: "Submitted", sortKey: "updated" },
    { key: "action", label: "", className: "w-px" },
  ];
  return (
    <DataTable columns={columns} minWidth={980} sort={sort} onSort={onSort}>
      {rows.map((b) => {
        const wait = describeWait(b.waitingSeconds);
        const soon = startsImminently(b, nowMs);
        return (
          <Row key={b.id} onOpen={() => onOpen(b)} accent={accent}>
            <Td>
              <RefCell
                accent={accent}
                refNo={b.refNo}
                sub={titleCase(b.visitorType)}
                tags={
                  <>
                    {b.multipleSubmissionsEnabled && !b.parentRequestId && (
                      <Tag>{b.childSubmissionsCount || 0} batch{(b.childSubmissionsCount || 0) === 1 ? "" : "es"}</Tag>
                    )}
                    {b.submissionNumber != null && b.parentRequestId && <Tag>Batch #{b.submissionNumber}</Tag>}
                  </>
                }
              />
            </Td>
            <Td className="max-w-[220px]">
              <p className="font-semibold text-stone-800 dark:text-stone-100 truncate" title={b.companyName}>{b.companyName || "—"}</p>
              {(b.departmentName || b.createdByName) && (
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {[b.departmentName, b.createdByName && `by ${b.createdByName}`].filter(Boolean).join(" · ")}
                </p>
              )}
              {showStatus && b.approvedByName && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">Approved by {b.approvedByName}</p>
              )}
            </Td>
            <Td className="text-center">
              <span className="inline-flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                <Users className="h-3.5 w-3.5 text-stone-400" />
                {b.submittedPersonsCount ?? b.noOfPersons ?? "—"}
              </span>
            </Td>
            <Td>
              {showStatus ? (
                <StatusPill status={b.status} />
              ) : (
                <div className="flex flex-col items-start gap-1">
                  <span title="Time since the applicant submitted" className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${WAIT_TONE[wait.tone]}`}>
                    {wait.label}
                  </span>
                  {soon && <Tag tone="red" title="This pass starts within 36 hours">Starts soon</Tag>}
                </div>
              )}
            </Td>
            <Td><ValidityCell batch={b} /></Td>
            <Td className="whitespace-nowrap">
              <p className="text-[13px] text-stone-700 dark:text-stone-200">{timeAgo(b.updatedAt || b.createdAt, nowMs || undefined)}</p>
              <p className="text-[11px] text-stone-400">{formatDate(b.updatedAt || b.createdAt)}</p>
            </Td>
            <Td stop className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {showStatus ? (
                  <ActionButton label="View" onClick={() => onOpen(b)} />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen(b)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-[0.97] ${a.primary}`}
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={2.4} /> Review
                    </button>
                    {onReject && (
                      <Button variant="ghost" onClick={() => onReject(b)} className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-400/10" title="Reject">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Td>
          </Row>
        );
      })}
    </DataTable>
  );
}

// ── Filter dropdowns ─────────────────────────────────────────────────────────

/**
 * Visitor type · Validity · Pass type · Department dropdowns.
 * `options` comes from batchFilterOptions(); a dropdown with fewer than two
 * choices is hidden (department, for a single-department user).
 */
export function BatchFilterSelects({ filters, options, onChange, accent = "amber", show = ["visitorType", "validity", "passType", "department"] }) {
  const defs = {
    visitorType: { label: "Visitor", icon: Users },
    validity: { label: "Validity", icon: CalendarClock },
    passType: { label: "Show", icon: Layers },
    department: { label: "Department", icon: Building2 },
  };
  return show
    .filter((k) => (options[k]?.length || 0) > 1 || filters[k])
    .map((k) => (
      <SelectFilter
        key={k}
        accent={accent}
        label={defs[k].label}
        icon={defs[k].icon}
        value={filters[k]}
        options={options[k] || []}
        onChange={(v) => onChange({ ...filters, [k]: v })}
      />
    ));
}
