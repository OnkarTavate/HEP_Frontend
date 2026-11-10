"use client";

import React, { useState, useEffect, useCallback } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle2,
  Search,
  History,
  ShieldAlert,
  Clock,
  XCircle,
  X,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  MapPinned,
  Package,
  Recycle,
  CornerUpLeft,
  Pencil,
  Eye,
  FileText,
  FileCheck2,
  Maximize,
  Minimize,
  Flame,
  Trash2,
  Plus,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Check,
  User,
  Users,
  Link2,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

// NOTE: confirm/replace this with your actual backend endpoint for material
// pass decisions. This mirrors the pattern used by the normal pass page's
// `agent-pass-request-action` endpoint but is a material-pass-specific guess.
const MATERIAL_ACTION_URL = `${ADMIN_API}/material-pass/material-pass-request-action`;

// --- Static metadata describing the two possible material pass types ---
const PASS_TYPE_META = {
  returnable: {
    key: "returnable",
    dataKey: "returnablePass",
    apiValue: "RETURNABLE",
    label: "Returnable items",
    icon: Recycle,
  },
  nonReturnable: {
    key: "nonReturnable",
    dataKey: "nonReturnablePass",
    apiValue: "NON_RETURNABLE",
    label: "Non-returnable items",
    icon: Package,
  },
};

// --- Request-level status → badge styling (request status is only ever
// SUBMITTED or COMPLETED; RESUBMITTED overrides both when isResubmitted is true) ---
const getOverallStatusBadgeClass = (status, isResubmitted, currentStage, revertedToFireSafetyFromCisf) => {
  if (revertedToFireSafetyFromCisf && currentStage === "PENDING_FIRE_SAFETY_OFFICER") {
    return "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold";
  }
  if (isResubmitted) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20";
  }
  const key = (status || "").toLowerCase();
  if (key === "rejected" || currentStage === "REJECTED") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20 font-bold";
  }
  if (key === "completed" || currentStage === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20";
  }
  if (currentStage === "PENDING_FIRE_SAFETY_OFFICER") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
  }
  if (currentStage === "PENDING_TRAFFIC_DEPARTMENT") {
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20";
  }
  if (currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT") {
    return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20";
  }
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
};

const getOverallStatusLabel = (status, isResubmitted, currentStage, isSafetyApprover, revertedToFireSafetyFromCisf) => {
  if (revertedToFireSafetyFromCisf && currentStage === "PENDING_FIRE_SAFETY_OFFICER") return "REVERTED FROM CISF";
  if (isResubmitted) return "RESUBMITTED";
  if ((status || "").toLowerCase() === "rejected" || currentStage === "REJECTED") return "REJECTED";
  if ((status || "").toLowerCase() === "completed" || currentStage === "COMPLETED") return "COMPLETED";
  if (currentStage === "PENDING_FIRE_SAFETY_OFFICER") {
    return isSafetyApprover ? "DEPT APPROVED" : "PENDING FIRE SAFETY / DC";
  }
  if (currentStage === "PENDING_TRAFFIC_DEPARTMENT") return "PENDING TRAFFIC";
  if (currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT") return "PENDING CISF";
  return (status || "SUBMITTED").toUpperCase();
};

export const cleanRemarks = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  const parts = raw.split(/\s*\|\s*/);
  const cleaned = [];
  for (let part of parts) {
    const stripped = part.replace(/^(RETURNABLE|NON[-_]RETURNABLE)\s*:\s*/i, "").trim();
    if (stripped && !cleaned.includes(stripped)) {
      cleaned.push(stripped);
    }
  }
  return cleaned.join(" | ") || raw.trim();
};

const STATUS_STYLES = {
  APPROVED: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    header: "bg-emerald-50",
    headerText: "text-emerald-700",
    border: "border-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    header: "bg-red-50",
    headerText: "text-red-700",
    border: "border-red-400",
    icon: XCircle,
  },
  REVERTED: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    header: "bg-amber-50",
    headerText: "text-amber-700",
    border: "border-amber-400 border-dashed",
    icon: CornerUpLeft,
  },
};

const EXCLUDED_UNIT_NAMES = new Set([
  "milligram",
  "millimeter",
  "centimeter",
  "gram",
  "millilitre",
  "milliliter",
]);

const DEFAULT_UNITS = [
  { id: 2, name: "Kilogram", code: "kg" },
  { id: 4, name: "Ton", code: "t" },
  { id: 6, name: "Litre", code: "L" },
  { id: 7, name: "Piece", code: "pcs" },
  { id: 8, name: "Box", code: "box" },
  { id: 9, name: "Meter", code: "m" },
  { id: 11, name: "Others", code: "Others" },
];

const REVIEWED_STATUSES = ["APPROVED", "REJECTED", "REVERTED"];

const MAX_VISIBLE_ITEM_ROWS = 5;

function MaterialItemRow({
  item,
  passKey,
  isViewMode,
  isLocked,
  isCisfApprover,
  isTrafficApprover,
  canEditHazardous: propCanEditHazardous,
  isConcernedDeptApprover,
  onQtyChange,
  onRequestedQtyChange,
  onToggleApproval,
  onToggleHazardous,
  onRemarksChange,
  onDelete,
  index,
  showValidation,
}) {
  const canEditHazardous =
    propCanEditHazardous !== undefined
      ? propCanEditHazardous
      : Boolean(!isViewMode && !isLocked && !isCisfApprover && !isTrafficApprover);

  const numericApprovedQty =
    item.approvedQty === "" || item.approvedQty === null || item.approvedQty === undefined
      ? 0
      : Number(item.approvedQty);

  // Authority to exclude/approve items or edit approved quantities belongs ONLY to the Concerned Department
  const canExclude = Boolean(isConcernedDeptApprover && !isViewMode && !isLocked);
  // Item remarks can ONLY be added/modified by Concerned Department; read-only for all further approvers
  const canEditRemarks = Boolean(isConcernedDeptApprover && !isViewMode && !isLocked);
  const [remarksExpanded, setRemarksExpanded] = useState(false);
  const [showHazardousWarning, setShowHazardousWarning] = useState(false);

  useEffect(() => {
    setShowHazardousWarning(false);
  }, [item.id, item.isHazardous]);

  const REMARK_TRUNCATE_LEN = 35;
  const remarkText = item.approverRemarks || "";
  const isRemarkLong = remarkText.length > REMARK_TRUNCATE_LEN;

  const hasRequestedQty = item.quantity !== null && item.quantity !== undefined && item.quantity !== "" && Number(item.quantity) > 0;
  const requestedQty = hasRequestedQty ? Number(item.quantity) : null;
  const qtyApplicable = hasRequestedQty && item.approvedQty !== null && item.approvedQty !== undefined;

  const isQtyUnspecified =
    item.quantity === null ||
    item.quantity === undefined ||
    item.quantity === "" ||
    item.quantityMode === "UNSPECIFIED" ||
    Number(item.quantity) <= 0;

  const isUnitUnspecified =
    !item.unitId &&
    (!item.unit || item.unit === "NA" || item.unit === "N/A" || item.unit === "-");

  // Non-hazardous non-returnable items with unspecified quantity or unit cannot be changed to hazardous
  const isNonReturnableUnspecified =
    passKey === "nonReturnable" &&
    !item.isHazardous &&
    (isQtyUnspecified || isUnitUnspecified);

  const itemError = !item.approved
    ? null
    : !hasRequestedQty
      ? (item.isHazardous ? "Quantity required for hazardous item" : null)
      : item.approvedQty === "" || item.approvedQty === null || item.approvedQty === undefined
        ? "Invalid approved qty"
        : numericApprovedQty < 1
          ? "Approved qty must be at least 1"
          : numericApprovedQty > requestedQty
            ? "Exceeds requested qty"
            : null;

  return (
    <tr className={item.approved ? "bg-white hover:bg-slate-50/70" : "bg-slate-50/70"}>
      {/* S.No. */}
      <td className="p-3.5 align-middle text-center text-xs font-mono font-bold text-slate-500">
        {String(index + 1).padStart(2, "0")}
      </td>

      {/* Item name + description + New badge */}
      <td className="p-3.5 align-middle min-w-[180px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-[#0a1e4d] break-words">{item.name}</span>
          {item.isNew && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 tracking-wider">
              NEW
            </span>
          )}
        </div>
        {item.description ? (
          <p className="text-xs text-slate-500 break-words mt-0.5 line-clamp-2" title={item.description}>
            {item.description}
          </p>
        ) : (
          <span className="text-xs text-slate-300 italic">—</span>
        )}
      </td>

      {/* Hazardous Classification Toggle (Editable ONLY for Concerned Dept and DC/Fire Safety; Locked for Traffic Approver, CISF, View Mode, Locked) */}
      <td className="p-3.5 align-middle text-center">
        {!canEditHazardous ? (
          item.isHazardous ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-300">
              <Flame className="h-3.5 w-3.5 text-red-600" />
              Hazardous
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Non-Hazardous
            </span>
          )
        ) : (
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (isNonReturnableUnspecified) {
                  setShowHazardousWarning(true);
                  toast.error("Cannot mark as Hazardous", {
                    description:
                      "This action cannot be performed due to absence of quantity and unit values. Hazardous non-returnable materials require mandatory quantity and unit.",
                  });
                  return;
                }
                onToggleHazardous(item.id);
              }}
              title={
                isNonReturnableUnspecified
                  ? "Cannot mark as hazardous: Quantity and unit are not specified."
                  : "Click to toggle between Hazardous and Non-Hazardous"
              }
              className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all shadow-2xs whitespace-nowrap ${
                isNonReturnableUnspecified
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80"
                  : item.isHazardous
                  ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 cursor-pointer"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 cursor-pointer"
              }`}
            >
              {item.isHazardous ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-red-600 animate-pulse" />
                  <span>Hazardous</span>
                  <span className="text-[10px] text-red-500 opacity-60 group-hover:opacity-100">✎</span>
                </>
              ) : (
                <>
                  <ShieldCheck className={`h-3.5 w-3.5 ${isNonReturnableUnspecified ? "text-slate-400" : "text-emerald-600"}`} />
                  <span>Non-Hazardous</span>
                  {!isNonReturnableUnspecified && (
                    <span className="text-[10px] text-emerald-500 opacity-60 group-hover:opacity-100">✎</span>
                  )}
                </>
              )}
            </button>
            {showHazardousWarning && isNonReturnableUnspecified && (
              <span
                onClick={() => setShowHazardousWarning(false)}
                title="Click to dismiss"
                className="mt-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-0.5 max-w-[130px] whitespace-normal leading-tight text-center shadow-xs cursor-pointer hover:bg-rose-100 transition-colors animate-in fade-in duration-150"
              >
                Cannot mark hazardous<br />(missing qty &amp; unit)
              </span>
            )}
          </div>
        )}
      </td>

      {/* Dedicated Unit Column */}
      <td className="p-3.5 align-middle text-center whitespace-nowrap">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
          {item.unit || "NA"}
        </span>
      </td>

      {/* Requested Qty (read-only for all approver roles) */}
      <td className="p-3.5 align-middle text-center whitespace-nowrap">
        <span className="text-sm font-bold text-[#0a1e4d] tabular-nums">
          {item.quantity != null && item.quantity !== "" ? item.quantity : "NA"}
        </span>
      </td>

      {/* Approved Qty (Editable ONLY by Concerned Department; read-only for others and view mode) */}
      <td className="p-3.5 align-middle text-center whitespace-nowrap">
        {!canExclude || !hasRequestedQty ? (
          qtyApplicable ? (
            <span
              className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 text-sm font-bold tabular-nums rounded-lg border ${
                item.approved
                  ? "bg-slate-50 text-slate-800 border-slate-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}
            >
              {item.approvedQty}
            </span>
          ) : (
            <span className="text-sm font-bold text-slate-400 font-mono">
              {item.approved ? "NA" : "—"}
            </span>
          )
        ) : (
          <div className="flex flex-col items-center">
            <div
              className={`inline-flex items-center border rounded-lg overflow-hidden shadow-2xs transition-all ${
                item.approved
                  ? "border-slate-300 bg-white"
                  : "border-slate-200 bg-slate-100 opacity-60"
              }`}
            >
              <button
                type="button"
                disabled={isLocked || !item.approved || numericApprovedQty <= 1}
                onClick={() => onQtyChange(item.id, String(Math.max(1, numericApprovedQty - 1)))}
                className="h-8 w-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={requestedQty}
                value={item.approvedQty ?? ""}
                disabled={isLocked || !item.approved}
                onChange={(e) => onQtyChange(item.id, e.target.value)}
                className={`w-14 h-8 text-center text-sm font-bold outline-none border-x border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  item.approved ? "text-slate-900 bg-white" : "text-slate-400 bg-slate-100"
                }`}
              />

              <button
                type="button"
                disabled={isLocked || !item.approved || numericApprovedQty >= requestedQty}
                onClick={() => onQtyChange(item.id, String(Math.min(requestedQty, numericApprovedQty + 1)))}
                className="h-8 w-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
            {itemError && (
              <span className="text-[10px] font-semibold text-red-500 mt-1 whitespace-nowrap">{itemError}</span>
            )}
          </div>
        )}
      </td>

      {/* Remarks */}
      <td className="p-3.5 align-middle min-w-[180px]">
        {!canEditRemarks ? (
          remarkText ? (
            remarksExpanded ? (
              <div className="text-xs text-amber-700 font-medium leading-snug">
                <span className="whitespace-normal break-words">{remarkText}</span>
                {isRemarkLong && (
                  <button
                    type="button"
                    onClick={() => setRemarksExpanded(false)}
                    className="ml-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-normal align-baseline"
                  >
                    show less
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-xs text-amber-700 font-medium truncate">{remarkText}</span>
                {isRemarkLong && (
                  <button
                    type="button"
                    onClick={() => setRemarksExpanded(true)}
                    className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600 font-normal"
                  >
                    show more
                  </button>
                )}
              </div>
            )
          ) : (
            <span className="text-xs text-slate-400 italic">—</span>
          )
        ) : (
          <input
            type="text"
            value={item.approverRemarks || ""}
            disabled={isLocked}
            maxLength={1000}
            onChange={(e) => onRemarksChange(item.id, e.target.value.slice(0, 1000))}
            placeholder="Item remarks / notes..."
            className="w-full h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:bg-slate-50 shadow-2xs"
          />
        )}
      </td>

      {/* Action / Approval Status Badge (Only Concerned Department can toggle/exclude items; read-only for CISF and all other roles) */}
      <td className="p-3.5 align-middle text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          {!canExclude ? (
            item.approved ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Approved</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 shadow-2xs">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span>Excluded</span>
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => onToggleApproval(item.id)}
              title={item.approved ? "Item Approved (click to exclude)" : "Item Excluded (click to approve)"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                item.approved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {item.approved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px]">Approved</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px]">Excluded</span>
                </>
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// --- Table shell with active items and clean horizontal scroll ---
function MaterialItemsTable({
  materials,
  decision,
  isViewMode,
  isLocked,
  isCisfApprover,
  isTrafficApprover,
  canEditHazardous,
  isConcernedDeptApprover,
  showExcludedItems = true,
  passKey,
  onItemQtyChange,
  onRequestedQtyChange,
  onToggleApproval,
  onToggleHazardous,
  onItemRemarksChange,
  onDeleteItem,
  showValidation,
}) {
  const isItemExcluded = (m) =>
    m.approved === false ||
    m.departmentDecision === "REJECTED" ||
    m.isExcluded === true;

  const activeMaterials = (materials || []).filter((m) => {
    if (m.isDeleted) return false;
    if (!showExcludedItems && isItemExcluded(m)) return false;
    return true;
  });

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm min-w-[960px]">
        <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
          <tr>
            <th className="w-14 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              S.No.
            </th>
            <th className="min-w-[180px] px-3 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              Material Item
            </th>
            <th className="w-44 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              Hazardous Status
            </th>
            <th className="w-28 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              Unit
            </th>
            <th className="w-28 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              Requested
            </th>
            <th className="w-36 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              Approved Qty
            </th>
            <th className="min-w-[180px] px-3 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              Remarks
            </th>
            <th className="w-36 px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-center tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {activeMaterials.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-sm text-slate-400 italic">
                {isConcernedDeptApprover
                  ? "No materials in this pass. Click \"+ Add Material\" above to add items."
                  : "No approved materials in this pass."}
              </td>
            </tr>
          ) : (
            activeMaterials.map((item, index) => (
              <MaterialItemRow
                key={item.id}
                index={index}
                item={item}
                passKey={passKey}
                isViewMode={isViewMode}
                isLocked={isLocked}
                isCisfApprover={isCisfApprover}
                isTrafficApprover={isTrafficApprover}
                canEditHazardous={canEditHazardous}
                isConcernedDeptApprover={isConcernedDeptApprover}
                onQtyChange={(itemId, val) => onItemQtyChange(passKey, itemId, val)}
                onRequestedQtyChange={(itemId, val) => onRequestedQtyChange(passKey, itemId, val)}
                onToggleApproval={(itemId) => onToggleApproval(passKey, itemId)}
                onToggleHazardous={(itemId) => onToggleHazardous(passKey, itemId)}
                onRemarksChange={(itemId, val) => onItemRemarksChange(passKey, itemId, val)}
                onDelete={(itemId) => onDeleteItem(passKey, itemId)}
                showValidation={showValidation}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Compact row for each pass type in main modal ---
function MaterialPassRow({
  meta,
  pass,
  materials,
  isVerified,
  isViewMode,
  showExcludedItems = true,
  onOpen,
}) {
  const Icon = meta.icon;
  const isItemExcluded = (m) =>
    m?.approved === false ||
    m?.departmentDecision === "REJECTED" ||
    m?.isExcluded === true ||
    (m?.approvedQty !== null && m?.approvedQty !== undefined && m?.approvedQty !== "" && Number(m?.approvedQty) === 0);

  const activeMaterials = (materials || []).filter((m) => {
    if (m.isDeleted) return false;
    if (!showExcludedItems && isItemExcluded(m)) return false;
    return true;
  });
  const statusStr = (pass?.status || "").toUpperCase();
  const isDecided = REVIEWED_STATUSES.includes(statusStr);
  const style = isDecided ? STATUS_STYLES[pass.status] : null;
  const StatusIcon = style?.icon;

  const hasHazardousItem = (materials || []).some(
    (m) => !m.isDeleted && !isItemExcluded(m) && Boolean(m.isHazardous)
  );

  const actionLabel = isViewMode
    ? "View details"
    : isVerified
    ? "Re-verify items"
    : "Verify items";
  const ActionIcon = isViewMode ? Eye : isVerified ? CheckCircle2 : Pencil;

  return (
    <div
      onClick={() => onOpen(meta.key)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(meta.key);
        }
      }}
      className={`bg-white rounded-xl border ${
        isViewMode && style
          ? `${style.border} border-l-4 ${style.bar.replace("bg-", "border-l-")}`
          : isVerified
          ? "border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/10"
          : "border-slate-200 border-l-4 border-l-slate-300"
      } shadow-sm flex items-center justify-between px-5 py-4 mb-3 transition-all duration-200 cursor-pointer hover:bg-slate-50 hover:shadow-md`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-5 w-5 text-slate-400 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0a1e4d] truncate">
              {meta.label}
            </span>
            {hasHazardousItem ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                <Flame className="h-3 w-3" /> Hazardous Items
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> Non-Hazardous
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {activeMaterials.length} item{activeMaterials.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isViewMode ? (
          isDecided && style ? (
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${style.badge}`}>
              {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
              {pass.status}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
              {pass?.status || "Processed"}
            </span>
          )
        ) : isVerified ? (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Verified
          </span>
        ) : (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Pending verification
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(meta.key);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            isVerified
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ActionIcon className="h-3.5 w-3.5" /> {actionLabel}
        </button>
      </div>
    </div>
  );
}

// --- Detail review modal for Returnable / Non-Returnable pass ---
function MaterialPassDetailModal({
  meta,
  pass,
  materials,
  unitsList = DEFAULT_UNITS,
  isVerified,
  isViewMode,
  isLocked: propIsLocked,
  isCisfApprover,
  isTrafficApprover,
  canEditHazardous,
  isConcernedDeptApprover,
  showExcludedItems = true,
  onClose,
  onMarkVerified,
  onItemQtyChange,
  onToggleApproval,
  onToggleHazardous,
  onItemRemarksChange,
  onAddItem,
}) {
  const isLocked = Boolean(isViewMode || propIsLocked);

  // Add Material Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnitId, setNewItemUnitId] = useState(unitsList[0]?.id || 7);
  const [newItemHazardous, setNewItemHazardous] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");

  if (!meta) return null;

  const Icon = meta.icon;
  const isItemExcluded = (m) =>
    m.approved === false ||
    m.departmentDecision === "REJECTED" ||
    m.isExcluded === true;

  const activeMaterials = (materials || []).filter((m) => {
    if (m.isDeleted) return false;
    if (!showExcludedItems && isItemExcluded(m)) return false;
    return true;
  });
  const statusStr = (pass?.status || "").toUpperCase();
  const isDecided = REVIEWED_STATUSES.includes(statusStr);
  const style = isDecided ? STATUS_STYLES[pass.status] : null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    const isNonRet = meta.key === "nonReturnable";
    const qtyStr = String(newItemQty || "").trim();
    const hasQty = qtyStr !== "";
    const q = hasQty ? Number(qtyStr) : null;

    if (newItemHazardous || !isNonRet) {
      if (!hasQty || !q || q <= 0) {
        toast.error(`Please enter a valid positive quantity${newItemHazardous ? " for hazardous material" : ""}`);
        return;
      }
      if (!newItemUnitId) {
        toast.error(`Please select a unit${newItemHazardous ? " for hazardous material" : ""}`);
        return;
      }
    } else {
      if (hasQty && (!q || q <= 0)) {
        toast.error("Please enter a valid positive quantity");
        return;
      }
    }

    const selUnit = unitsList.find((u) => String(u.id) === String(newItemUnitId));

    onAddItem(meta.key, {
      name: newItemName.trim(),
      quantity: q,
      unitId: selUnit ? selUnit.id : null,
      unitName: selUnit ? (selUnit.name || selUnit.unitName) : "NA",
      description: newItemDesc.trim(),
      isHazardous: newItemHazardous,
    });

    setNewItemName("");
    setNewItemQty("");
    setNewItemUnitId(unitsList[0]?.id || "");
    setNewItemDesc("");
    setNewItemHazardous(false);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 px-6 py-4 bg-[#0a1e4d] text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="h-6 w-6 text-orange-500 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold tracking-wide truncate">
              {isViewMode ? "View" : "Review"}: {meta.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 shrink-0 cursor-pointer rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header: item count + status + Add Item Button */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {activeMaterials.length} item{activeMaterials.length === 1 ? "" : "s"}
            </h4>

            {!isViewMode && isConcernedDeptApprover && !showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Material
              </button>
            )}
          </div>

          <div>
            {isViewMode ? (
              isDecided && style ? (
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${style.badge}`}>
                  {pass?.status}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                  {pass?.status || "Processed"}
                </span>
              )
            ) : isVerified ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Verified
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Pending verification
              </span>
            )}
          </div>
        </div>

        {/* Inline Add Material Form */}
        {showAddForm && !isViewMode && !isLocked && (
          <form onSubmit={handleAddSubmit} className="p-4 sm:p-5 bg-orange-50/70 border-b border-orange-200 shrink-0 animate-in fade-in-50 duration-200">
            <div className="flex justify-between items-center mb-3">
              <h5 className="text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-orange-600" /> Add New Material Item to {meta.label}
              </h5>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Material Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Industrial Valve, Paint Thinner..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Quantity {newItemHazardous || meta.key !== "nonReturnable" ? "*" : "(Optional)"}
                </label>
                <input
                  type="number"
                  min={1}
                  required={newItemHazardous || meta.key !== "nonReturnable"}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder={newItemHazardous || meta.key !== "nonReturnable" ? "1" : "Optional"}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-orange-500 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                  Unit {newItemHazardous || meta.key !== "nonReturnable" ? "*" : "(Optional)"}
                </label>
                <select
                  value={newItemUnitId}
                  onChange={(e) => setNewItemUnitId(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-orange-500 font-medium"
                >
                  {!newItemHazardous && meta.key === "nonReturnable" && (
                    <option value="">Select unit (optional)</option>
                  )}
                  {unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.unitName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center mt-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Description (Optional)</label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Specifications, model, or batch notes"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newItemHazardous}
                    onChange={(e) => setNewItemHazardous(e.target.checked)}
                    className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 accent-orange-600"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber-600" />
                    Hazardous / Inflammable Item
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-xs cursor-pointer"
                  >
                    Add to Pass
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Scrollable body: table card + optional view remarks card */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 bg-slate-50/50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <MaterialItemsTable
              materials={materials}
              isViewMode={isViewMode}
              isLocked={isViewMode}
              isCisfApprover={isCisfApprover}
              isTrafficApprover={isTrafficApprover}
              canEditHazardous={canEditHazardous}
              isConcernedDeptApprover={isConcernedDeptApprover}
              showExcludedItems={showExcludedItems}
              passKey={meta.key}
              onItemQtyChange={onItemQtyChange}
              onToggleApproval={onToggleApproval}
              onToggleHazardous={onToggleHazardous}
              onItemRemarksChange={onItemRemarksChange}
              showValidation={false}
            />
          </div>

          {isViewMode && (pass?.rejectedReason || pass?.remarks) && (
            <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200/80">
              <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-orange-600" />
                Authority remarks
              </label>
              <p className="text-xs text-slate-800">
                {cleanRemarks(pass.rejectedReason || pass.remarks)}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions: single Done Verifying / Close button */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3 px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
            <span>
              {isViewMode
                ? "Viewing reviewed pass items."
                : "Verify items, approved quantities, and item-level notes. Make the final Approve / Revert / Reject decision on the main window."}
            </span>
          </div>

          {isViewMode ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close Details
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const invalidItems = activeMaterials.filter((m) => {
                  if (m.isDeleted || !m.approved) return false;
                  const hasReqQty =
                    m.quantity !== null &&
                    m.quantity !== undefined &&
                    m.quantity !== "" &&
                    Number(m.quantity) > 0;
                  if (hasReqQty) {
                    return (
                      m.approvedQty === "" ||
                      m.approvedQty === null ||
                      m.approvedQty === undefined ||
                      Number(m.approvedQty) < 1
                    );
                  }
                  // If item is hazardous, quantity is mandatory
                  if (m.isHazardous) {
                    return (
                      m.approvedQty === "" ||
                      m.approvedQty === null ||
                      m.approvedQty === undefined ||
                      Number(m.approvedQty) < 1
                    );
                  }
                  // Non-hazardous items without requested quantity are non-mandatory (NA)
                  return false;
                });
                if (invalidItems.length > 0) {
                  toast.error("Approved quantity must be at least 1 for all approved items requiring quantity.");
                  return;
                }
                const exceedingItems = activeMaterials.filter((m) => {
                  if (m.isDeleted || !m.approved) return false;
                  const hasReqQty =
                    m.quantity !== null &&
                    m.quantity !== undefined &&
                    m.quantity !== "" &&
                    Number(m.quantity) > 0;
                  if (!hasReqQty) return false;
                  return Number(m.approvedQty) > Number(m.quantity);
                });
                if (exceedingItems.length > 0) {
                  toast.error("Approved quantity cannot exceed requested quantity.");
                  return;
                }
                onMarkVerified?.(meta.key);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Done Verifying
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MaterialPassPage() {
  const [workflowTab, setWorkflowTab] = useState("REGULAR"); // "REGULAR" | "VENDOR"
  const [activeTab, setActiveTab] = useState("pending");
  const [cardFilter, setCardFilter] = useState("ALL");
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [processedByMe, setProcessedByMe] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    breakdown: { regPending: 0, regProcessed: 0, regTotal: 0, venPending: 0, venProcessed: 0, venTotal: 0 },
  });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Which pass type (returnable / nonReturnable) is currently open in the
  // secondary "detail" modal. Null means no detail modal is showing.
  const [activePassKey, setActivePassKey] = useState(null);

  // PDF/Image Viewer States
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const [passDecision, setPassDecision] = useState({
    returnable: { status: "", remarks: "", collapsed: false, validationAttempted: false },
    nonReturnable: { status: "", remarks: "", collapsed: false, validationAttempted: false },
  });
  const [verifiedPasses, setVerifiedPasses] = useState({
    returnable: false,
    nonReturnable: false,
  });
  const [overallRemarks, setOverallRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passMaterials, setPassMaterials] = useState({
    returnable: [],
    nonReturnable: [],
  });
  const [unitsList, setUnitsList] = useState(DEFAULT_UNITS);
  const [currentUser, setCurrentUser] = useState(null);
  const [requiresTrafficApproval, setRequiresTrafficApproval] = useState(false);
  const [activePassViewOnly, setActivePassViewOnly] = useState(false);
  const [availableGates, setAvailableGates] = useState([]);
  const [assignedGates, setAssignedGates] = useState([]);
  const [showGateDropdown, setShowGateDropdown] = useState(false);
  const [gateSearchQuery, setGateSearchQuery] = useState("");
  const [customGateInput, setCustomGateInput] = useState("");
  const gateDropdownRef = React.useRef(null);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [selectedRevertTarget, setSelectedRevertTarget] = useState("VENDOR");
  const [revertRemarksInput, setRevertRemarksInput] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectRemarksInput, setRejectRemarksInput] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
  }, []);

  useEffect(() => {
    const fetchMasterGates = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${AGENT_API}/vendor-material-pass/link-masters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rawGates =
          res?.data?.data?.gates ||
          res?.data?.gates ||
          (Array.isArray(res?.data?.data) ? res.data.data : []);
        if (Array.isArray(rawGates) && rawGates.length > 0) {
          setAvailableGates(rawGates);
        } else {
          setAvailableGates(
            Array.from({ length: 9 }, (_, i) => ({ id: i, name: `Gate ${i}` }))
          );
        }
      } catch (err) {
        setAvailableGates(
          Array.from({ length: 9 }, (_, i) => ({ id: i, name: `Gate ${i}` }))
        );
      }
    };
    fetchMasterGates();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gateDropdownRef.current && !gateDropdownRef.current.contains(event.target)) {
        setShowGateDropdown(false);
      }
    };
    if (showGateDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showGateDropdown]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${AGENT_API}/material-pass/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const filtered = list.filter((u) => {
            const name = String(u?.name || u?.unitName || "").toLowerCase().trim();
            const code = String(u?.code || u?.unitCode || "").toLowerCase().trim();
            return !EXCLUDED_UNIT_NAMES.has(name) && !["mg", "mm", "cm", "g", "ml"].includes(code);
          });
          setUnitsList(filtered.length > 0 ? filtered : list);
        }
      } catch (err) {
        // fallback to DEFAULT_UNITS
      }
    };
    fetchUnits();
  }, []);

  const [justCompleted, setJustCompleted] = useState(false);
  const wasAllReviewedRef = React.useRef(false);

  const [companyDetails, setCompanyDetails] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const fetchAgentDetails = useCallback(async (agentId, passData = null) => {
    if (!agentId) {
      if (passData && (passData.originType === "VENDOR" || passData.companyName || passData.vendorEmail || passData.entityName)) {
        setCompanyDetails({
          entityName: passData.companyName || passData.entityName || "N/A",
          email: passData.vendorEmail || passData.email || "N/A",
          mobileNo: passData.vendorMobile || passData.mobileNo || passData.phone || "N/A",
          gstinNumber: passData.gstinNumber || "N/A",
          panNumber: passData.panNumber || "N/A",
        });
      } else {
        setCompanyDetails(null);
      }
      return;
    }
    setCompanyLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${AGENT_API}/agents/getAgentById/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        setCompanyDetails(response.data.data);
      } else {
        setCompanyDetails(
          passData
            ? {
                entityName: passData.companyName || passData.entityName || "N/A",
                email: passData.email || passData.vendorEmail || "N/A",
                mobileNo: passData.mobileNo || passData.vendorMobile || passData.phone || "N/A",
                gstinNumber: passData.gstinNumber || "N/A",
                panNumber: passData.panNumber || "N/A",
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to fetch agent details", error);
      setCompanyDetails(
        passData
          ? {
              entityName: passData.companyName || passData.entityName || "N/A",
              email: passData.email || passData.vendorEmail || "N/A",
              mobileNo: passData.mobileNo || passData.vendorMobile || passData.phone || "N/A",
              gstinNumber: passData.gstinNumber || "N/A",
              panNumber: passData.panNumber || "N/A",
            }
          : null
      );
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (viewingDocUrl) {
      setIframeLoading(true);
    }
  }, [viewingDocUrl]);

  const handleViewDoc = (passRequestId, documentType, staticPath) => {
    // Check if the file is an image based on its extension
    const isImg = staticPath && /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);

    // NOTE: backend endpoint TBD — mirrors the pattern used for regular passes
    setViewingDocUrl(
      `${AGENT_API}/material-pass/viewMaterialPassDocument?passRequestId=${passRequestId}&documentType=${documentType}`,
    );
  };

  const fetchPassRequests = useCallback(
    async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${ADMIN_API}/material-pass/material-pass-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: currentPage,
              limit: pageSize,
              search: debouncedSearch || undefined,
              status: activeTab || undefined,
              sortOrder:
                sortBy === "DATE_ASC" ? "ASC" : sortBy === "EXPIRY_SOON" ? "EXPIRY_SOON" : "DESC",
              processedByMe: processedByMe ? "true" : undefined,
              originType: workflowTab,
            },
          },
        );

        if (response.data && response.data.success) {
          const newRequests = response.data.data || [];
          const newMeta = response.data.pagination || {};
          const newCounts = response.data.counts || { total: 0, pending: 0, processed: 0 };

          setRequests((prev) =>
            JSON.stringify(newRequests) === JSON.stringify(prev) ? prev : newRequests,
          );
          setPaginationMeta((prev) =>
            JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta,
          );
          setGlobalCounts((prev) => {
            const mergedBreakdown = {
              ...(prev.breakdown || {}),
              ...(newCounts.breakdown || {}),
            };
            if (workflowTab === "REGULAR") {
              mergedBreakdown.regPending = newCounts.pending ?? mergedBreakdown.regPending;
              mergedBreakdown.regProcessed = newCounts.processed ?? mergedBreakdown.regProcessed;
              mergedBreakdown.regTotal = (mergedBreakdown.regPending || 0) + (mergedBreakdown.regProcessed || 0);
            } else if (workflowTab === "VENDOR") {
              mergedBreakdown.venPending = newCounts.pending ?? mergedBreakdown.venPending;
              mergedBreakdown.venProcessed = newCounts.processed ?? mergedBreakdown.venProcessed;
              mergedBreakdown.venTotal = (mergedBreakdown.venPending || 0) + (mergedBreakdown.venProcessed || 0);
            }
            return {
              ...newCounts,
              breakdown: mergedBreakdown,
            };
          });
        } else {
          setRequests((prev) => (prev.length === 0 ? prev : []));
        }
      } catch (error) {
        console.error("Failed to fetch requests", error);
        if (!isPoll) toast.error("Failed to load pass requests.");
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, activeTab, sortBy, processedByMe, workflowTab],
  );

  useEffect(() => {
    fetchPassRequests(false);
    const interval = setInterval(() => fetchPassRequests(true), 5000);
    return () => clearInterval(interval);
  }, [fetchPassRequests]);

  // --- Which pass types actually exist on the selected request
  const getApplicablePassKeys = useCallback((request) => {
    if (!request) return [];

    return Object.values(PASS_TYPE_META)
      .filter((meta) => !!request[meta.dataKey])
      .map((meta) => meta.key);
  }, []);

  const applicablePassKeys = getApplicablePassKeys(selectedRequest);

  const userRoleNorm = (currentUser?.role || "").toLowerCase().trim();
  const userDeptNum = Number(currentUser?.departmentId);
  const userDeptName = (currentUser?.departmentName || "").toLowerCase().trim();
  const currentStage = selectedRequest?.currentStage;
  const isCompleted =
    (selectedRequest?.status || "").toLowerCase() === "completed" ||
    (selectedRequest?.status || "").toLowerCase() === "approved" ||
    currentStage === "COMPLETED";

  // CISF Assistant Commandant alone has authority to modify authorized gates
  const isCisfAssistantCommandant = Boolean(
    userRoleNorm === "cisf.assistant commandant" ||
    userRoleNorm === "cisf assistant commandant" ||
    userRoleNorm === "cisf asst commandant" ||
    userRoleNorm === "assistant commandant" ||
    (userDeptNum === 1 && (userRoleNorm.includes("commandant") || userRoleNorm.includes("cisf"))) ||
    (userDeptName.includes("cisf") && (userRoleNorm.includes("commandant") || userRoleNorm.includes("asst")))
  );

  // CISF approvers (cannot change hazardous toggle, approved quantity, or exclude items)
  const isCisfApprover = Boolean(
    isCisfAssistantCommandant ||
    userDeptNum === 1 ||
    userDeptName.includes("cisf") ||
    userRoleNorm.includes("cisf") ||
    currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT" ||
    selectedRequest?.status === "PENDING_CISF_ASSISTANT_COMMANDANT"
  );

  // Approver role checks
  const isSafetyApprover = Boolean(
    currentStage === "PENDING_FIRE_SAFETY_OFFICER" ||
    (currentUser?.role &&
      [
        "fire safety officer",
        "safety officer",
        "dy. conservator",
        "deputy conservator",
        "dy conservator",
      ].includes(currentUser.role.toLowerCase()))
  );

  // Check if the applicant's chosen concerned department is Traffic Department
  const isConcernedDeptTraffic = Boolean(
    Number(selectedRequest?.concernedDepartmentId) === 9 ||
    (selectedRequest?.concernedDepartment || "").toLowerCase().includes("traffic")
  );

  // Check if the current user is in the Traffic Department
  const isCurrentUserTraffic = Boolean(
    Number(currentUser?.departmentId) === 9 ||
    (currentUser?.departmentName || "").toLowerCase().includes("traffic") ||
    (currentUser?.role || "").toLowerCase().includes("traffic")
  );

  // Has the pass moved past the initial Concerned Department stage?
  const isPastConcernedDept = Boolean(
    currentStage === "PENDING_FIRE_SAFETY_OFFICER" ||
    currentStage === "PENDING_TRAFFIC_DEPARTMENT" ||
    currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT" ||
    isCompleted ||
    Boolean(selectedRequest?.deptApprovedBy)
  );

  // Traffic approver (reviewing Stage 3 traffic movement)
  const isTrafficApprover = Boolean(
    currentStage === "PENDING_TRAFFIC_DEPARTMENT" ||
    (!isSafetyApprover && !isCisfApprover && isCurrentUserTraffic && !isConcernedDeptTraffic)
  );

  // Authority to exclude items, edit approved quantities, or add items belongs ONLY to the Concerned Department
  const ALLOWED_MATERIAL_PASS_DEPT_IDS = [3, 4, 5, 6, 7, 8, 9];
  const ALLOWED_MATERIAL_PASS_DEPT_NAMES = [
    "engineering civil",
    "engineering mechanical",
    "finance",
    "general administration",
    "marine",
    "medical",
    "traffic",
  ];

  const isAllowedDept =
    ALLOWED_MATERIAL_PASS_DEPT_IDS.includes(userDeptNum) ||
    ALLOWED_MATERIAL_PASS_DEPT_NAMES.some((d) => userDeptName.includes(d));

  const isApprovalRoleId =
    Number(currentUser?.roleId) === 4 ||
    userRoleNorm === "approval" ||
    userRoleNorm === "department";

  const isPermittedDeptApprover = isAllowedDept && isApprovalRoleId;

  const isConcernedDeptApprover = Boolean(
    !isViewMode &&
    !isPastConcernedDept &&
    !isSafetyApprover &&
    !isTrafficApprover &&
    !isCisfApprover &&
    (isPermittedDeptApprover || !currentUser)
  );

  const userTypeNorm = (currentUser?.userType || "").toLowerCase().trim();
  const userSource = (currentUser?.source || "").toLowerCase().trim();

  // The original vendor / company / applicant user
  const isApplicantUser = Boolean(
    userSource === "agent" ||
    userRoleNorm.includes("agent") ||
    userRoleNorm.includes("company") ||
    userRoleNorm.includes("applicant") ||
    userRoleNorm.includes("vendor") ||
    userTypeNorm === "agent" ||
    userTypeNorm === "applicant" ||
    (!currentUser?.departmentId && !currentUser?.departmentName && (userRoleNorm === "user" || !userRoleNorm))
  );

  const canAccessMaterialPass = Boolean(
    !currentUser ||
    isApplicantUser ||
    isCisfApprover ||
    isSafetyApprover ||
    isTrafficApprover ||
    isPermittedDeptApprover ||
    userRoleNorm.includes("admin")
  );

  // Excluded items must be shown to:
  // 1. The original vendor / company / applicant (always)
  // 2. The Concerned Department reviewer while reviewing (to approve/exclude items or if reverted back to department)
  // In further approvals (Fire Safety, Traffic, CISF), excluded items are hidden completely.
  const showExcludedItems = Boolean(isApplicantUser || isConcernedDeptApprover);

  // Concerned Department approvers or CISF Assistant Commandant can modify gates during their review stage
  const canModifyGates = Boolean(
    !isViewMode &&
    (isConcernedDeptApprover || currentStage === "PENDING_DEPARTMENT" || isCisfAssistantCommandant || currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT")
  );

  const handleRemoveGate = (gateToRemove) => {
    if (!canModifyGates) return;
    if (assignedGates.length <= 1) {
      toast.error("At least one gate must be specified.");
      return;
    }
    setAssignedGates((prev) => prev.filter((g) => g.toLowerCase() !== gateToRemove.toLowerCase()));
  };

  const handleToggleGate = (gateName) => {
    if (!canModifyGates) return;
    setAssignedGates((prev) => {
      const exists = prev.some((g) => g.toLowerCase() === gateName.toLowerCase());
      if (exists) {
        if (prev.length <= 1) {
          toast.error("At least one gate must be specified.");
          return prev;
        }
        return prev.filter((g) => g.toLowerCase() !== gateName.toLowerCase());
      } else {
        return [...prev, gateName];
      }
    });
  };

  const handleAddCustomGate = (gateName) => {
    if (!canModifyGates) return;
    const trimmed = (gateName || "").trim();
    if (!trimmed) return;
    setAssignedGates((prev) => {
      if (prev.some((g) => g.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
    setCustomGateInput("");
  };

  const getAvailableRevertOptions = () => {
    if (!selectedRequest) return [];
    const isVendor = selectedRequest.originType === "VENDOR" || workflowTab === "VENDOR";

    if (isCisfApprover || currentStage === "PENDING_CISF_ASSISTANT_COMMANDANT") {
      return [
        {
          target: "FIRE_SAFETY_OFFICER",
          label: "DC / Fire Safety Officer",
          description: "Revert back to Fire Safety Officer for review",
        },
        {
          target: isVendor ? "VENDOR" : "APPLICANT",
          label: isVendor ? "Original Vendor / Company" : "Applicant / User",
          description: isVendor
            ? "Revert directly to vendor to edit and resubmit their application"
            : "Returns the pass request to the applicant to revise items/quantities",
        },
      ];
    }

    return [
      {
        target: isVendor ? "VENDOR" : "APPLICANT",
        label: isVendor ? "Original Vendor / Company" : "Applicant / User",
        description: isVendor
          ? "Revert directly to vendor to edit and resubmit their application"
          : "Returns the pass request to the applicant to revise items/quantities",
      },
    ];
  };

  const actionablePassKeys = applicablePassKeys;

  const allVerified =
    applicablePassKeys.length > 0
      ? applicablePassKeys.every((key) => verifiedPasses[key])
      : false;

  const verifiedCount = applicablePassKeys.filter((key) => verifiedPasses[key]).length;

  // Trigger a brief "just completed" pulse on the action buttons the moment
  // all passes get verified.
  useEffect(() => {
    if (allVerified && !wasAllReviewedRef.current && !isViewMode) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 900);
      wasAllReviewedRef.current = true;
      return () => clearTimeout(t);
    }
    if (!allVerified) wasAllReviewedRef.current = false;
  }, [allVerified, isViewMode]);

  const handleRemarksChange = (key, value) => {
    setPassDecision((prev) => ({
      ...prev,
      [key]: { ...prev[key], remarks: value },
    }));
  };

  const handleToggleHazardous = (passKey, itemId) => {
    if (isCisfApprover || isTrafficApprover || isViewMode) return;

    if (passKey === "nonReturnable") {
      const targetItem = (passMaterials[passKey] || []).find((it) => it.id === itemId);
      if (targetItem && !targetItem.isHazardous) {
        const isQtyUnspecified =
          targetItem.quantity === null ||
          targetItem.quantity === undefined ||
          targetItem.quantity === "" ||
          targetItem.quantityMode === "UNSPECIFIED" ||
          Number(targetItem.quantity) <= 0;

        const isUnitUnspecified =
          !targetItem.unitId &&
          (!targetItem.unit || targetItem.unit === "NA" || targetItem.unit === "N/A" || targetItem.unit === "-");

        if (isQtyUnspecified || isUnitUnspecified) {
          toast.error("Cannot mark as Hazardous", {
            description:
              "This action cannot be performed due to absence of quantity and unit values. Hazardous non-returnable materials require mandatory quantity and unit.",
          });
          return;
        }
      }
    }

    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey].map((item) =>
        item.id === itemId
          ? { ...item, isHazardous: !item.isHazardous }
          : item
      ),
    }));
  };

  const handleRequestedQtyChange = (passKey, itemId, rawValue) => {
    if (!isConcernedDeptApprover) return;
    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey].map((item) => {
        if (item.id !== itemId) return item;
        const num = Math.max(1, Number(rawValue) || 1);
        return {
          ...item,
          quantity: num,
          requestedQty: num,
          approvedQty: item.approvedQty > num ? num : item.approvedQty,
        };
      }),
    }));
  };

  const handleItemQtyChange = (passKey, itemId, rawValue) => {
    if (!isConcernedDeptApprover) return;
    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey].map((item) => {
        if (item.id !== itemId) return item;
        if (rawValue === "") return { ...item, approvedQty: "" };
        const num = Number(rawValue);
        if (isNaN(num)) return item;
        return {
          ...item,
          approvedQty: Math.max(1, Math.min(Number(item.quantity) || num, num)),
        };
      }),
    }));
  };

  const handleToggleApproval = (passKey, itemId) => {
    if (!isConcernedDeptApprover) return;
    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey].map((item) => {
        if (item.id !== itemId) return item;
        const nextApproved = !item.approved;
        return {
          ...item,
          approved: nextApproved,
          approvedQty: nextApproved ? (Number(item.approvedQty) > 0 ? item.approvedQty : item.quantity) : 0,
        };
      }),
    }));
  };

  const handleItemRemarksChange = (passKey, itemId, value) => {
    const trimmedVal = typeof value === "string" ? value.slice(0, 1000) : value;
    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey].map((item) =>
        item.id === itemId
          ? { ...item, approverRemarks: trimmedVal }
          : item
      ),
    }));
  };

  const handleDeleteItem = (passKey, itemId) => {
    if (!isConcernedDeptApprover) return;
    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: prev[passKey]
        .map((item) => {
          if (item.id !== itemId) return item;
          return { ...item, isDeleted: true, approved: false, approvedQty: 0 };
        })
        .filter((item) => !(item.isDeleted && item.isNew)),
    }));
    toast.info("Item Removed", {
      description: "Material item removed from pass.",
    });
  };

  const handleAddItem = (passKey, newItemData) => {
    if (!isConcernedDeptApprover) return;
    const hasQty =
      newItemData.quantity !== null &&
      newItemData.quantity !== undefined &&
      newItemData.quantity !== "" &&
      Number(newItemData.quantity) > 0;
    const qtyVal = hasQty ? Number(newItemData.quantity) : null;
    const newItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newItemData.name.trim(),
      quantity: qtyVal,
      requestedQty: qtyVal,
      approvedQty: qtyVal,
      approved: true,
      unit: newItemData.unitName || (hasQty ? "Piece" : "NA"),
      unitId: newItemData.unitId ? Number(newItemData.unitId) : null,
      description: newItemData.description?.trim() || "",
      isHazardous: Boolean(newItemData.isHazardous),
      approverRemarks: "",
      isNew: true,
      isDeleted: false,
    };

    setPassMaterials((prev) => ({
      ...prev,
      [passKey]: [...prev[passKey], newItem],
    }));

    toast.success("Item Added", {
      description: `Added "${newItem.name}" to ${PASS_TYPE_META[passKey].label}.`,
    });
  };

  // Returns true when the decision was applied, false when validation blocked it.
  const handlePassDecision = (key, decision) => {
    const current = passDecision[key];
    const materials = passMaterials[key] || [];
    const activeMaterials = materials.filter((m) => !m.isDeleted);

    if ((decision === "REJECTED" || decision === "REVERTED") && !current.remarks?.trim()) {
      toast.error("Remarks are mandatory.", {
        description:
          decision === "REVERTED"
            ? "Explain what needs to be corrected before reverting."
            : "Explain why this pass is being rejected.",
      });
      return false;
    }

    if (decision === "APPROVED") {
      if (activeMaterials.length === 0) {
        toast.error("No items in pass", {
          description: "Cannot approve a pass with no active items. Please add at least one item.",
        });
        return false;
      }

      const approvedItems = activeMaterials.filter((m) => m.approved);
      if (approvedItems.length === 0) {
        toast.error("No items approved", {
          description: "Approve at least one item before approving this pass.",
        });
        return false;
      }

      const hasBadQty = approvedItems.some((m) => {
        const hasReq = m.quantity !== null && m.quantity !== undefined && m.quantity !== "" && Number(m.quantity) > 0;
        if (!hasReq) return false;
        const q = m.approvedQty;
        if (q === "" || q === null || q === undefined) return true;
        const numQ = Number(q);
        const reqQ = Number(m.quantity);
        return numQ <= 0 || numQ > reqQ;
      });

      if (hasBadQty) {
        toast.error("Fix approved quantities", {
          description: "One or more approved items have an invalid, zero, or excessive quantity.",
        });
        setPassDecision((prev) => ({
          ...prev,
          [key]: { ...prev[key], validationAttempted: true },
        }));
        return false;
      }
    }

    setPassDecision((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: decision, collapsed: true, validationAttempted: false },
    }));
    return true;
  };

  const handleMarkVerified = (key) => {
    setVerifiedPasses((prev) => ({ ...prev, [key]: true }));
  };

  const openPassDetail = (key, forceViewMode = false) => {
    setActivePassKey(key);
    setActivePassViewOnly(Boolean(forceViewMode));
    if (!forceViewMode) {
      setVerifiedPasses((prev) => ({ ...prev, [key]: true }));
    }
  };

  const closePassDetail = () => {
    setActivePassKey(null);
    setActivePassViewOnly(false);
  };

  // Single unified decision for the entire pass request (all active categories: Returnable / Non-Returnable)
  const handleRequestDecision = async (decision, targetOverride = null, customRemarks = null) => {
    if (submitting) return;

    let activeRemarks = (customRemarks !== null && customRemarks !== undefined ? customRemarks : overallRemarks).trim().slice(0, 1000);

    // Check authority remarks for REJECT or REVERT
    if (decision === "REJECTED" && !activeRemarks) {
      toast.error("Rejection Remarks Required", {
        description: "Please specify why this pass request is being rejected.",
      });
      return;
    }

    if (decision === "REVERTED" && !activeRemarks) {
      toast.error("Remarks Required", {
        description: "Please enter remarks explaining the corrections required before reverting.",
      });
      return;
    }

    if (decision === "APPROVED") {
      activeRemarks = ""; // No remarks on approval
    }

    // Defensive check: If APPROVED, ensure the overall request has at least one approved item across applicable categories
    if (decision === "APPROVED") {
      let totalApprovedCount = 0;

      for (const key of applicablePassKeys) {
        const activeItems = (passMaterials[key] || []).filter((m) => !m.isDeleted);

        const hasInvalidQty = activeItems
          .filter((m) => m.approved)
          .some((m) => {
            const hasReqQty =
              m.quantity !== null &&
              m.quantity !== undefined &&
              m.quantity !== "" &&
              Number(m.quantity) > 0;
            if (hasReqQty) {
              const appQ = Number(m.approvedQty);
              const reqQ = Number(m.quantity);
              return isNaN(appQ) || appQ <= 0 || appQ > reqQ;
            }
            if (m.isHazardous) {
              const appQ = Number(m.approvedQty);
              return isNaN(appQ) || appQ <= 0;
            }
            return false;
          });

        if (hasInvalidQty) {
          toast.error("Validation Error", {
            description: `One or more approved items in ${PASS_TYPE_META[key].label} have invalid approved quantities.`,
          });
          return;
        }

        const approvedCountInPass = activeItems.filter((m) => {
          if (!m.approved) return false;
          const hasReqQty =
            m.quantity !== null &&
            m.quantity !== undefined &&
            m.quantity !== "" &&
            Number(m.quantity) > 0;
          if (hasReqQty) {
            return Number(m.approvedQty) > 0;
          }
          return !m.isHazardous || Number(m.approvedQty) > 0;
        }).length;

        totalApprovedCount += approvedCountInPass;
      }

      if (totalApprovedCount === 0) {
        toast.error("Validation Error", {
          description: "At least one item (returnable or non-returnable) must be approved to approve the pass request.",
        });
        return;
      }
    }

    const isVendor = selectedRequest?.originType === "VENDOR" || workflowTab === "VENDOR";
    const revertTarget = targetOverride || (isCisfApprover ? "FIRE_SAFETY_OFFICER" : isVendor ? "VENDOR" : "APPLICANT");

    if (canModifyGates && (!assignedGates || assignedGates.length === 0)) {
      toast.error("At least one gate must be specified.");
      return;
    }

    setSubmitting(true);
    const loadingToastId = toast.loading(
      decision === "APPROVED"
        ? "Approving pass request..."
        : decision === "REVERTED"
        ? revertTarget === "FIRE_SAFETY" || revertTarget === "FIRE_SAFETY_OFFICER"
          ? "Reverting pass request to DC / Fire Safety Officer..."
          : isVendor
          ? "Reverting pass request to vendor..."
          : "Reverting pass request to applicant..."
        : "Rejecting pass request...",
    );

    if (decision === "APPROVED") {
      for (const key of applicablePassKeys) {
        const materials = passMaterials[key] || [];
        const invalid = materials.find((m) => {
          if (m.isDeleted || !m.approved) return false;
          const hasReqQty =
            m.quantity !== null &&
            m.quantity !== undefined &&
            m.quantity !== "" &&
            Number(m.quantity) > 0;
          if (hasReqQty || m.isHazardous) {
            return (
              m.approvedQty === "" ||
              m.approvedQty === null ||
              m.approvedQty === undefined ||
              Number(m.approvedQty) < 1
            );
          }
          return false;
        });
        if (invalid) {
          toast.error(
            `Approved quantity for "${invalid.name}" must be at least 1. Please update the verified quantity.`
          );
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      const passesPayload = applicablePassKeys.map((key) => {
        const meta = PASS_TYPE_META[key];
        const materials = passMaterials[key] || [];

        return {
          passType: meta.apiValue,
          decision: decision, // Unified decision applied to the entire request
          remarks: activeRemarks || undefined,
          items: materials
            .map((m) => {
              if (m.isDeleted) {
                const delId = Number(m.id || m.materialId);
                return !isNaN(delId) ? { materialId: delId, isDeleted: true } : null;
              }
              const hasQty =
                m.quantity !== null &&
                m.quantity !== undefined &&
                m.quantity !== "" &&
                Number(m.quantity) > 0;
              const itemQty = hasQty ? Number(m.quantity) : null;
              const itemApproved = Boolean(m.approved);
              const itemApprovedQty =
                decision === "APPROVED"
                  ? itemApproved
                    ? hasQty
                      ? (m.approvedQty !== null && m.approvedQty !== undefined && m.approvedQty !== "" && !isNaN(Number(m.approvedQty)))
                        ? Number(m.approvedQty)
                        : itemQty
                      : null
                    : 0
                  : null;
              const itemUnitId =
                m.unitId !== null && m.unitId !== undefined && m.unitId !== "" && Number(m.unitId) > 0
                  ? Number(m.unitId)
                  : null;

              if (m.isNew) {
                return {
                  isNew: true,
                  name: m.name,
                  requestedQty: itemQty,
                  approvedQty: itemApprovedQty,
                  approved: itemApproved,
                  unitId: itemUnitId,
                  description: m.description || null,
                  isHazardous: Boolean(m.isHazardous),
                  approverRemarks: m.approverRemarks?.trim() || null,
                };
              }
              const matId = Number(m.id || m.materialId);
              return {
                materialId: matId,
                requestedQty: itemQty,
                approvedQty: itemApprovedQty,
                approved: itemApproved,
                unitId: itemUnitId,
                isHazardous: Boolean(m.isHazardous),
                approverRemarks: m.approverRemarks?.trim() || null,
              };
            })
            .filter(Boolean),
        };
      });

      const isConcernedDeptTraffic =
        Number(selectedRequest?.concernedDepartmentId) === 9 ||
        (selectedRequest?.concernedDepartment || "").toLowerCase().includes("traffic");

      const finalTrafficApproval = isConcernedDeptTraffic
        ? false
        : isVendor
        ? Boolean(selectedRequest?.requiresTrafficApproval ?? selectedRequest?.linkRequiresTraffic ?? requiresTrafficApproval)
        : Boolean(requiresTrafficApproval);

      const assignedGateIds = assignedGates
        .map((gName) => {
          const match = availableGates.find(
            (ag) =>
              (ag.name || "").toLowerCase() === gName.toLowerCase() ||
              (ag.code || "").toLowerCase() === gName.toLowerCase()
          );
          return match ? Number(match.id) : null;
        })
        .filter((id) => id !== null && !isNaN(id));

      const updatedLocationOther = assignedGates.length > 0 ? assignedGates.join(", ") : null;

      const payload = {
        passRequestId: selectedRequest.id,
        passes: passesPayload,
        decision: "complete-review",
        originType: selectedRequest.originType || (workflowTab === "VENDOR" ? "VENDOR" : "REGULAR"),
        revertTarget: decision === "REVERTED" ? revertTarget : undefined,
        requiresTrafficApproval: finalTrafficApproval,
        ...(canModifyGates
          ? {
              locationOther: updatedLocationOther,
              locationIds: assignedGateIds,
              permittedGates: assignedGates,
              gateIds: assignedGateIds,
            }
          : {}),
      };

      const response = await axios.patch(
        MATERIAL_ACTION_URL,
        payload,
        { headers },
      );

      if (canModifyGates) {
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                locationOther: updatedLocationOther,
                locationIds: assignedGateIds,
                permittedGates: assignedGates,
              }
            : prev
        );
      }

      const responseMessage = response.data?.data?.message || response.data?.message;

      toast.success(
        decision === "APPROVED"
          ? "Pass Request Approved Successfully"
          : decision === "REVERTED"
          ? revertTarget === "FIRE_SAFETY" || revertTarget === "FIRE_SAFETY_OFFICER"
            ? "Pass Request Reverted to DC / Fire Safety Officer"
            : isVendor
            ? "Pass Request Reverted to Vendor"
            : "Pass Request Reverted to Applicant"
          : "Pass Request Rejected",
        {
          id: loadingToastId,
          description: responseMessage || `Pass request successfully ${decision.toLowerCase()}.`,
        },
      );

      setIsRevertModalOpen(false);
      setIsRejectModalOpen(false);
      setIsModalOpen(false);
      setActivePassKey(null);
      setCompanyDetails(null);
      setOverallRemarks("");
      setRevertRemarksInput("");
      setRejectRemarksInput("");
      fetchPassRequests();
    } catch (error) {
      console.error("Submission error:", error);
      const errMsg = error.response?.data?.message || "Failed to process review.";
      toast.error("Operation Failed", {
        id: loadingToastId,
        description: errMsg,
      });

      if (
        errMsg.toLowerCase().includes("already been reviewed") ||
        errMsg.toLowerCase().includes("no longer pending") ||
        error.response?.status === 409
      ) {
        setIsModalOpen(false);
        setActivePassKey(null);
        fetchPassRequests();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (pass, viewOnly = false) => {
    setSelectedRequest(pass);
    setRequiresTrafficApproval(Boolean(pass.requiresTrafficApproval));
    setOverallRemarks("");
    setSubmitting(false);
    fetchAgentDetails(pass.agentId, pass);

    const rawLoc = pass.locationOther || pass.locationFrom || pass.locationTo || "";
    let initialGates = [];
    if (rawLoc) {
      initialGates = rawLoc
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    setAssignedGates(initialGates);
    setShowGateDropdown(false);
    setGateSearchQuery("");
    setCustomGateInput("");

    const initPassMaterials = (passData) => {
      const status = (passData?.status || "").toUpperCase();
      const rawMaterials = passData?.materials || [];
      const materials = rawMaterials.slice().sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      const isDecided = REVIEWED_STATUSES.includes(status);
      const isApprovedStatus = status === "APPROVED";

      return materials.map((m) => {
        const hasReqQty = m.quantity !== null && m.quantity !== undefined && m.quantity !== "" && Number(m.quantity) > 0;
        const qty = hasReqQty ? Number(m.quantity) : null;
        const hasExistingApprovedQty =
          m.approvedQty !== null && m.approvedQty !== undefined && m.approvedQty !== "";
        const appQty = hasExistingApprovedQty
          ? Number(m.approvedQty)
          : isDecided
          ? (isApprovedStatus ? qty : null)
          : qty;
        const isExcludedFromBackend =
          m.departmentDecision === "REJECTED" ||
          m.isExcluded === true ||
          (hasExistingApprovedQty && Number(m.approvedQty) === 0);

        const app = isExcludedFromBackend
          ? false
          : hasExistingApprovedQty
          ? Number(m.approvedQty) > 0
          : isDecided
          ? isApprovedStatus
          : true;

        return {
          id: m.id,
          name: m.name,
          quantity: qty,
          requestedQty: qty,
          approvedQty: appQty,
          approved: app,
          unit: m.unit || null,
          unitId: m.unitId || null,
          description: m.description || "",
          isHazardous: Boolean(m.isHazardous),
          approverRemarks: m.approverRemarks || "",
          departmentDecision: m.departmentDecision || (app ? "APPROVED" : "REJECTED"),
          isExcluded: !app,
          isNew: false,
          isDeleted: false,
        };
      });
    };

    const buildDecision = (passData) => {
      const status = (passData?.status || "").toUpperCase();
      const isDecided = REVIEWED_STATUSES.includes(status);

      return {
        status,
        remarks: passData?.remarks || passData?.rejectedReason || "",
        collapsed: isDecided,
        validationAttempted: false,
      };
    };

    setPassMaterials({
      returnable: initPassMaterials(pass.returnablePass),
      nonReturnable: initPassMaterials(pass.nonReturnablePass),
    });

    setPassDecision({
      returnable: buildDecision(pass.returnablePass),
      nonReturnable: buildDecision(pass.nonReturnablePass),
    });

    setVerifiedPasses({
      returnable: Boolean(viewOnly),
      nonReturnable: Boolean(viewOnly),
    });

    setActivePassKey(null);
    setIsViewMode(viewOnly);
    setIsModalOpen(true);
  };

  const filteredData = requests;

  const handleCardClick = (tab, filter) => {
    setActiveTab(tab);
    setCardFilter(filter);
    setSearchInput("");
    setCurrentPage(1);
  };

  const activeMeta = activePassKey ? PASS_TYPE_META[activePassKey] : null;
  const activePass = activeMeta && selectedRequest ? selectedRequest[activeMeta.dataKey] : null;
  const activeDecision = activePassKey ? passDecision[activePassKey] : null;

  if (!canAccessMaterialPass) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12 bg-white dark:bg-[#1e293b] rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Material pass approval is restricted to authorized approval users of permitted departments:
          Engineering Civil, Engineering Mechanical, Finance, General Administration, Marine, Traffic, Medical, and CISF.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans relative">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        <div
          onClick={() => handleCardClick("pending", "ALL")}
          className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Passes
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800">
              <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[#0a1e4d] dark:text-stone-100 tabular-nums">
            {globalCounts.total}
          </p>
        </div>

        <div
          onClick={() => handleCardClick("pending", "ALL")}
          className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              Pending
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
            {globalCounts.pending}
          </p>
        </div>

        <div
          onClick={() => handleCardClick("processed", "ALL")}
          className="col-span-2 sm:col-span-1 bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Processed
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
            {globalCounts.processed}
          </p>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1e4d] dark:text-stone-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#ff6b00]" strokeWidth={2.5} />
            Material Pass Approvals
          </h2>
          <p className="text-sm text-slate-500 dark:text-stone-400 mt-0.5">
            Review and authorize Material passes
          </p>
        </div>
        <button
          onClick={() => fetchPassRequests(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1e4d] hover:bg-blue-900 text-white text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Primary Workflow Tabs (Registered User vs Vendor Link) ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3">
        {[
          {
            id: "REGULAR",
            label: "Registered User Passes",
            icon: Users,
            count:
              globalCounts.breakdown
                ? (globalCounts.breakdown.regPending || 0) + (globalCounts.breakdown.regProcessed || 0)
                : workflowTab === "REGULAR"
                ? globalCounts.total
                : 0,
          },
          {
            id: "VENDOR",
            label: "Vendor Link Passes",
            icon: Link2,
            count:
              globalCounts.breakdown
                ? (globalCounts.breakdown.venPending || 0) + (globalCounts.breakdown.venProcessed || 0)
                : workflowTab === "VENDOR"
                ? globalCounts.total
                : 0,
          },
        ].map((wTab) => {
          const Icon = wTab.icon;
          const isActive = workflowTab === wTab.id;
          return (
            <button
              key={wTab.id}
              onClick={() => {
                if (workflowTab !== wTab.id) {
                  setWorkflowTab(wTab.id);
                  setCurrentPage(1);
                  setSearchInput("");
                  setCardFilter("ALL");
                  setProcessedByMe(false);
                }
              }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0a1e4d] text-white shadow-md ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-orange-400" : "text-slate-400"}`} />
              <span>{wTab.label}</span>
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                }`}
              >
                {wTab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sub-Tabs (Pending Approvals vs Processed Passes) ── */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-0">
        {[
          {
            id: "pending",
            label: "Pending Approvals",
            count:
              workflowTab === "REGULAR"
                ? (globalCounts.breakdown?.regPending ?? globalCounts.pending)
                : (globalCounts.breakdown?.venPending ?? globalCounts.pending),
          },
          {
            id: "processed",
            label: "Processed Passes",
            count:
              workflowTab === "REGULAR"
                ? (globalCounts.breakdown?.regProcessed ?? globalCounts.processed)
                : (globalCounts.breakdown?.venProcessed ?? globalCounts.processed),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCardFilter("ALL");
              setSearchInput("");
              setProcessedByMe(false);
              setCurrentPage(1);
            }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#0a1e4d] text-white shadow"
                : "text-slate-500 hover:text-[#0a1e4d] hover:bg-slate-100"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl ring-1 ring-slate-200/60 dark:ring-white/5 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="font-bold text-slate-800 dark:text-stone-100 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "pending" ? (
              <>
                <ShieldAlert className="h-4 w-4 text-[#ff6b00]" /> Awaiting Review
              </>
            ) : (
              <>
                <History className="h-4 w-4 text-emerald-500" /> Processed Passes
              </>
            )}
          </h3>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            {activeTab === "processed" && (
              <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  id="processed-by-me-filter"
                  checked={processedByMe}
                  onChange={(e) => {
                    setProcessedByMe(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <span>Processed By Me</span>
              </label>
            )}

            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-[#ff6b00] appearance-none cursor-pointer"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
                <option value="EXPIRY_SOON">Expiring Soon</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search Ref ID, Name, Reg No..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#ff6b00]"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear Search"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-700/40">
                {(activeTab === "processed"
                  ? ["Ref No", "Company Details", "Pass Types", "Applied On", "Approved By", "Status"]
                  : ["Ref No", "Company Details", "Pass Types", "Applied On", "Status"]
                ).map((h) => {
                  const vis =
                    h === "Pass Types"
                      ? "hidden sm:table-cell"
                      : h === "Applied On"
                        ? "hidden md:table-cell"
                        : h === "Approved By"
                          ? "hidden lg:table-cell"
                          : "";
                  return (
                    <th
                      key={h}
                      className={`px-4 sm:px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                        h === "Status" ? "text-center" : ""
                      } ${vis}`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading requests...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "processed" ? 6 : 5}
                    className="py-16 text-center text-slate-500"
                  >
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found for the current filter/search.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((pass) => {
                  const statusClass = getOverallStatusBadgeClass(pass.status, pass.isResubmitted, pass.currentStage, pass.revertedToFireSafetyFromCisf);
                  const statusLabel = getOverallStatusLabel(pass.status, pass.isResubmitted, pass.currentStage, isSafetyApprover, pass.revertedToFireSafetyFromCisf);
                  const passTypeLabel = pass.surplusPass
                    ? "Surplus"
                    : pass.debrisPass
                      ? "Debris"
                      : pass.auctionPass
                        ? "Auction"
                        : pass.originType === "VENDOR"
                          ? "Vendor"
                          : pass.returnablePass || pass.nonReturnablePass
                            ? "Regular"
                            : "-";

                  return (
                    <tr
                      key={pass?.originType === "VENDOR" ? `vpr-${pass.id}` : pass.id}
                      onClick={() => openReviewModal(pass, activeTab === "processed")}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-[#0a1e4d] dark:text-stone-200 font-mono">
                        {pass.referenceNo || `REQ-${pass.id}`}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                            {(pass.companyName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 dark:text-stone-100 truncate">
                              {pass.companyName || "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {pass.email || pass.vendorEmail || "—"}
                            </div>
                            <div className="sm:hidden mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                {passTypeLabel}
                              </span>
                              <span>{new Date(pass.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                        <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200 dark:border-blue-500/20">
                          {passTypeLabel}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {new Date(pass.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      {activeTab === "processed" && (
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                          {pass.approvedBy || "—"}
                        </td>
                      )}
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {pass.revertedToFireSafetyFromCisf && pass.currentStage === "PENDING_FIRE_SAFETY_OFFICER" ? (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-bold flex items-center justify-center gap-1">
                            <span>From: CISF Reversion</span>
                          </div>
                        ) : pass.currentStage === "PENDING_FIRE_SAFETY_OFFICER" && pass.deptApprovedBy && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Dept: {pass.deptApprovedBy}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 pb-4">
          <PaginationBar
            currentPage={paginationMeta.currentPage || currentPage}
            totalPages={paginationMeta.totalPages || 1}
            totalRecords={paginationMeta.totalRecords || 0}
            pageSize={paginationMeta.pageSize || pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN REQUEST VERIFICATION MODAL */}
      {/* ============================================================== */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] text-white">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold tracking-wide truncate">
                  {isViewMode ? "View Processed Pass" : "Review Submissions"}:{" "}
                  {selectedRequest.referenceNo || `REQ-${selectedRequest.id}`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setActivePassKey(null);
                  setCompanyDetails(null);
                }}
                className="text-white/70 hover:text-white p-2 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* CISF REVERSION ALERT BANNER */}
              {selectedRequest.revertedToFireSafetyFromCisf &&
                selectedRequest.currentStage === "PENDING_FIRE_SAFETY_OFFICER" && (() => {
                const cisfRevertHistory = (selectedRequest.workflowHistory || []).slice().reverse().find(
                  (h) =>
                    (h.approvalStage === "CISF_ASSISTANT_COMMANDANT" || (h.stage && h.stage.includes("CISF"))) &&
                    (h.decision?.startsWith("REVERTED") || h.action?.startsWith("REVERTED"))
                );
                const cisfRemarks =
                  selectedRequest.cisfRevertRemarks ||
                  cisfRevertHistory?.remarks ||
                  selectedRequest.revertRemarks ||
                  selectedRequest.returnablePass?.rejectedReason ||
                  selectedRequest.nonReturnablePass?.rejectedReason;
                const cisfOfficer =
                  selectedRequest.cisfRevertedBy ||
                  cisfRevertHistory?.approverUserName ||
                  cisfRevertHistory?.actorUserName;
                const cisfDate =
                  selectedRequest.cisfRevertedAt ||
                  cisfRevertHistory?.createdAt;

                return (
                  <div className="rounded-2xl border-2 border-amber-500 bg-amber-50/95 p-5 shadow-sm">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-600 text-white shadow-xs">
                              REVERTED FROM CISF
                            </span>
                            <span className="text-sm font-bold text-amber-950">
                              Pass Request Reverted by CISF Assistant Commandant for Re-evaluation
                            </span>
                          </div>
                          {cisfDate && (
                            <span className="text-xs font-semibold text-amber-800">
                              {new Date(cisfDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <div className="p-3.5 bg-white/95 rounded-xl border border-amber-300 shadow-2xs">
                          <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-1">
                            CISF Remarks / Instructions:
                          </span>
                          <p className="text-sm font-bold text-amber-950 italic">
                            &ldquo;{cleanRemarks(cisfRemarks) || "Please verify hazardous materials before re-approval"}&rdquo;
                          </p>
                          {cisfOfficer && (
                            <p className="text-xs text-amber-700 mt-1.5 font-medium">
                              — Officer: <span className="font-bold text-amber-900">{cisfOfficer}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Company Details
                    </h3>
                  </div>

                  {companyLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading company details...
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-[#0a1e4d] break-words mb-5">
                        {companyDetails?.entityName || selectedRequest?.companyName || selectedRequest?.entityName || "N/A"}
                      </h2>
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-500">Email</span>
                          <span className="text-sm font-medium text-slate-800 break-all sm:text-right">
                            {companyDetails?.email || selectedRequest?.vendorEmail || selectedRequest?.email || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-500">Phone</span>
                          <span className="text-sm font-medium text-slate-800">
                            {companyDetails?.mobileNo || selectedRequest?.vendorMobile || selectedRequest?.mobileNo || selectedRequest?.phone || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-500">GST</span>
                          <span className="text-sm font-medium text-slate-800 break-all sm:text-right">
                            {companyDetails?.gstinNumber || selectedRequest?.gstinNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-500">PAN</span>
                          <span className="text-sm font-medium text-slate-800">
                            {companyDetails?.panNumber || selectedRequest?.panNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <MapPinned className="h-5 w-5 text-green-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Movement Details
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          Location / Gates
                          {canModifyGates && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                              Editable
                            </span>
                          )}
                        </span>

                        {canModifyGates && (
                          <div className="relative" ref={gateDropdownRef}>
                            <button
                              type="button"
                              onClick={() => setShowGateDropdown((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Select Gates</span>
                              <ChevronDown className="h-3 w-3" />
                            </button>

                            {/* Dropdown popover */}
                            {showGateDropdown && (
                              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-xs font-bold text-slate-800">Authorized Gates</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowGateDropdown(false)}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Search gates */}
                                <div className="relative">
                                  <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={gateSearchQuery}
                                    onChange={(e) => setGateSearchQuery(e.target.value)}
                                    placeholder="Search gate..."
                                    className="w-full h-7 pl-7 pr-2 text-xs rounded border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                                  />
                                </div>

                                {/* Quick options */}
                                <div className="flex items-center justify-between text-[11px] px-0.5 text-slate-500">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allNames = availableGates.map((g) => g.name).filter(Boolean);
                                      setAssignedGates(Array.from(new Set(allNames)));
                                    }}
                                    className="hover:text-blue-600 font-semibold cursor-pointer"
                                  >
                                    Select All
                                  </button>
                                </div>

                                {/* Gate list with checkboxes */}
                                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-50">
                                  {availableGates
                                    .filter((g) =>
                                      (g.name || "")
                                        .toLowerCase()
                                        .includes(gateSearchQuery.toLowerCase())
                                    )
                                    .map((gate) => {
                                      const isChecked = assignedGates.some(
                                        (g) => g.toLowerCase() === (gate.name || "").toLowerCase()
                                      );
                                      return (
                                        <label
                                          key={gate.id || gate.name}
                                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none text-xs transition-colors ${
                                            isChecked
                                              ? "bg-amber-50 text-amber-900 font-bold"
                                              : "hover:bg-slate-50 text-slate-700 font-medium"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleGate(gate.name)}
                                            className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                                          />
                                          <span className="truncate">{gate.name}</span>
                                        </label>
                                      );
                                    })}
                                </div>

                                {/* Add Custom Gate input */}
                                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={customGateInput}
                                    onChange={(e) => setCustomGateInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddCustomGate(customGateInput);
                                      }
                                    }}
                                    placeholder="Custom gate..."
                                    className="flex-1 h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomGate(customGateInput)}
                                    className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Render selected gates */}
                      {canModifyGates ? (
                        <div className="flex flex-wrap items-center gap-1.5 min-h-[1.75rem] mt-0.5">
                          {assignedGates.length > 0 ? (
                            assignedGates.map((gate, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs group"
                              >
                                <span>{gate}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGate(gate)}
                                  title={assignedGates.length <= 1 ? "At least one gate must be specified" : `Remove ${gate}`}
                                  className={`text-amber-700 hover:text-red-700 hover:bg-amber-100 rounded-full p-0.5 transition-colors cursor-pointer ${
                                    assignedGates.length <= 1 ? "opacity-40 cursor-not-allowed" : ""
                                  }`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-red-500 font-semibold italic">
                              No gates selected. Click &quot;Select Gates&quot; to add authorized gates.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                          {assignedGates.length > 0 ? (
                            assignedGates.map((gate, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200"
                              >
                                {gate}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm font-medium text-slate-800">
                              {selectedRequest.locationOther || selectedRequest.locationFrom || selectedRequest.locationTo || "N/A"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Movement</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.returnablePass?.movement ||
                          selectedRequest.nonReturnablePass?.movement ||
                          selectedRequest.surplusPass?.movement ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Purpose</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.purposeOther || selectedRequest.purpose || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Valid From</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {(() => {
                          const val = selectedRequest.validFrom || selectedRequest.entryDate;
                          if (!val) return "-";
                          if (typeof val === "string" && (val.includes("am") || val.includes("pm") || val.includes("AM") || val.includes("PM"))) {
                            return val;
                          }
                          try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                              return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}, 12:00 AM`;
                            }
                          } catch (_) {}
                          return String(val);
                        })()}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Valid Till</span>
                      <span className="text-sm font-semibold text-emerald-700 sm:text-right">
                        {(() => {
                          const val = selectedRequest.validTo || selectedRequest.expiryDate || selectedRequest.validTillDate || selectedRequest.validTill;
                          if (!val) return "-";
                          if (typeof val === "string" && (val.includes("am") || val.includes("pm") || val.includes("AM") || val.includes("PM"))) {
                            return val;
                          }
                          try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                              return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}, 11:59 PM`;
                            }
                          } catch (_) {}
                          return String(val);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <FileText className="h-5 w-5 text-orange-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Application Info
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Pass Type</span>
                      <span className="text-sm font-bold text-[#0a1e4d] sm:text-right">
                        {selectedRequest.originType === "VENDOR"
                          ? "VENDOR"
                          : selectedRequest.surplusPass
                            ? "SURPLUS"
                            : "REGULAR"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Application Date</span>
                      <span className="text-sm font-medium text-slate-800 sm:text-right">
                        {selectedRequest.createdAt
                          ? new Date(selectedRequest.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 items-start sm:items-center">
                      <span className="text-xs font-semibold text-slate-500">Status</span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getOverallStatusBadgeClass(
                          selectedRequest.status,
                          selectedRequest.isResubmitted,
                          selectedRequest.currentStage,
                          selectedRequest.revertedToFireSafetyFromCisf,
                        )}`}
                      >
                        {getOverallStatusLabel(
                          selectedRequest.status,
                          selectedRequest.isResubmitted,
                          selectedRequest.currentStage,
                          isSafetyApprover,
                          selectedRequest.revertedToFireSafetyFromCisf,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DOCUMENTS: Requisition Letter & Work Order */}
              {(selectedRequest.requisitionLetterFilePath || selectedRequest.workOrderFilePath) && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Attached Documents
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedRequest.requisitionLetterFilePath && (
                      <button
                        onClick={() =>
                          handleViewDoc(
                            selectedRequest.id,
                            "requisitionLetter",
                            selectedRequest.requisitionLetterFilePath,
                          )
                        }
                        className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                      >
                        <FileText className="h-4 w-4 text-blue-600" /> View Requisition Letter
                      </button>
                    )}
                    {selectedRequest.workOrderFilePath && (
                      <button
                        onClick={() =>
                          handleViewDoc(
                            selectedRequest.id,
                            "workOrder",
                            selectedRequest.workOrderFilePath,
                          )
                        }
                        className="bg-orange-50 text-orange-700 border border-orange-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors shadow-sm"
                      >
                        <FileCheck2 className="h-4 w-4 text-orange-600" /> View Work Order
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Material review: compact clickable rows, each opens its own modal ── */}
              {applicablePassKeys.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
                      <Package className="h-4 w-4" /> Material Review
                    </h4>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        allVerified || isViewMode
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isViewMode
                        ? `${applicablePassKeys.length} pass${applicablePassKeys.length === 1 ? "" : "es"}`
                        : `${verifiedCount} of ${applicablePassKeys.length} verified`}
                    </span>
                  </div>

                  {applicablePassKeys.map((key) => {
                    return (
                      <MaterialPassRow
                        key={key}
                        meta={PASS_TYPE_META[key]}
                        pass={selectedRequest[PASS_TYPE_META[key].dataKey]}
                        materials={passMaterials[key]}
                        isVerified={verifiedPasses[key]}
                        isViewMode={isViewMode}
                        showExcludedItems={showExcludedItems}
                        onOpen={(k) => openPassDetail(k, isViewMode)}
                      />
                    );
                  })}
                </div>
              )}

              {/* ── 4. Approval Flow (below material review) ── */}
              {(() => {
                const stage = currentStage;
                const isVendor = Boolean(
                  selectedRequest?.originType === "VENDOR" ||
                  selectedRequest?.vendorMaterialLinkId ||
                  workflowTab === "VENDOR"
                );
                // Only Concerned Department reviewer for REGISTERED USER passes can toggle "Include Traffic in the flow" on/off
                // For vendor link passes, traffic selection was already specified during link generation and cannot be modified here
                const canToggleTraffic = !isVendor && isConcernedDeptApprover && !isConcernedDeptTraffic;

                const isItemExcluded = (m) =>
                  m?.approved === false ||
                  m?.departmentDecision === "REJECTED" ||
                  m?.isExcluded === true ||
                  (m?.approvedQty !== null && m?.approvedQty !== undefined && m?.approvedQty !== "" && Number(m?.approvedQty) === 0);

                const hasHazardousItem = [
                  ...(passMaterials.returnable || []),
                  ...(passMaterials.nonReturnable || []),
                ].some((m) => !m.isDeleted && !isItemExcluded(m) && Boolean(m.isHazardous));

                // Always use the real Concerned Department name for Stage 1!
                const concernedDeptDisplayName =
                  selectedRequest?.concernedDepartment ||
                  (isConcernedDeptTraffic ? "Traffic Department" : "Department");

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-600">
                          4
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#0a1e4d]">
                          Approval flow
                        </h3>
                      </div>
                      {hasHazardousItem ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                          <Flame className="h-3.5 w-3.5 text-red-600" /> Hazardous Material Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Non-Hazardous Pass
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      {isConcernedDeptTraffic
                        ? "Traffic Department is the applicant's chosen Concerned Department. The request routes to safety verification (if hazardous) and then to CISF."
                        : isVendor
                        ? requiresTrafficApproval
                          ? "Traffic approval was configured during link generation and is required before forwarding to CISF."
                          : "Requests proceed to CISF after the other required approvals (Traffic approval was not included for this link)."
                        : canToggleTraffic
                        ? "Choose whether Traffic approval is required in the workflow before forwarding to CISF."
                        : requiresTrafficApproval
                        ? "Traffic approval is included in the workflow before forwarding to CISF."
                        : "Requests proceed to CISF after the other required approvals."}
                    </p>

                    <div
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all"
                    >
                      {/* ONLY show the "Include Traffic in the flow" toggle control for Registered Users during Concerned Dept review */}
                      {canToggleTraffic && (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              Include Traffic in the flow
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {requiresTrafficApproval
                                ? "Traffic approval is included before CISF approval."
                                : "Requests proceed to CISF after the other required approvals."}
                            </p>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={requiresTrafficApproval}
                            onClick={() => setRequiresTrafficApproval((prev) => !prev)}
                            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-orange-500/25 cursor-pointer ${
                              requiresTrafficApproval ? "bg-orange-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                requiresTrafficApproval ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      {/* Dynamic Workflow Routing Sequence: Department -> Fire Safety (if hazardous) -> Traffic -> CISF */}
                      {(() => {
                        const isFinalCompleted =
                          isCompleted ||
                          stage === "COMPLETED" ||
                          (selectedRequest?.status || "").toLowerCase() === "approved" ||
                          (selectedRequest?.status || "").toLowerCase() === "completed";

                        const isRejectedStatus =
                          stage === "REJECTED" || (selectedRequest?.status || "").toLowerCase() === "rejected";
                        const isRevertedToVendorStatus =
                          stage === "REVERTED_TO_VENDOR" ||
                          (selectedRequest?.status || "").toLowerCase() === "reverted";

                        // Stage 1: Concerned Department
                        const isDeptApproved =
                          isFinalCompleted ||
                          stage === "PENDING_FIRE_SAFETY_OFFICER" ||
                          stage === "PENDING_TRAFFIC_DEPARTMENT" ||
                          stage === "PENDING_CISF_ASSISTANT_COMMANDANT";
                        const isDeptCurrent =
                          !isFinalCompleted &&
                          !isRejectedStatus &&
                          !isRevertedToVendorStatus &&
                          (stage === "PENDING_DEPARTMENT" || stage === "PENDING_CONCERNED_DEPT" || !stage);

                        // Stage 2: DC / Fire Safety Officer (only if active approved hazardous items exist or if previously in fire safety stage)
                        const requiresFireSafety =
                          hasHazardousItem ||
                          stage === "PENDING_FIRE_SAFETY_OFFICER" ||
                          (Boolean(selectedRequest?.revertedToFireSafetyFromCisf) && stage === "PENDING_FIRE_SAFETY_OFFICER") ||
                          Boolean(selectedRequest?.safetyApprovedBy);

                        const isDcFsApproved =
                          requiresFireSafety &&
                          (isFinalCompleted ||
                            stage === "PENDING_TRAFFIC_DEPARTMENT" ||
                            stage === "PENDING_CISF_ASSISTANT_COMMANDANT");
                        const isDcFsCurrent =
                          requiresFireSafety &&
                          !isFinalCompleted &&
                          !isRejectedStatus &&
                          !isRevertedToVendorStatus &&
                          stage === "PENDING_FIRE_SAFETY_OFFICER";

                        // Stage 3: Traffic Department (if enabled and not traffic dept)
                        const isTrafficApproved =
                          requiresTrafficApproval &&
                          !isConcernedDeptTraffic &&
                          (isFinalCompleted || stage === "PENDING_CISF_ASSISTANT_COMMANDANT");
                        const isTrafficCurrent =
                          requiresTrafficApproval &&
                          !isConcernedDeptTraffic &&
                          !isTrafficApproved &&
                          !isFinalCompleted &&
                          !isRejectedStatus &&
                          !isRevertedToVendorStatus &&
                          stage === "PENDING_TRAFFIC_DEPARTMENT";

                        // Stage 4: CISF Assistant Commandant
                        const isCisfApproved = isFinalCompleted;
                        const isCisfCurrent =
                          !isCisfApproved &&
                          !isFinalCompleted &&
                          !isRejectedStatus &&
                          !isRevertedToVendorStatus &&
                          stage === "PENDING_CISF_ASSISTANT_COMMANDANT";

                        return (
                          <div className={`flex flex-wrap items-center gap-2 text-[11px] font-semibold ${canToggleTraffic ? "mt-4 pt-3 border-t border-slate-200/80" : ""}`}>
                            {/* 1. Concerned Department */}
                            {isDeptApproved ? (
                              <span
                                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs flex items-center gap-1.5 font-bold"
                                title={selectedRequest?.deptApprovedBy ? `Approved by ${selectedRequest.deptApprovedBy}` : "Department Approved"}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{concernedDeptDisplayName}</span>
                                <span className="text-[9px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                  Approved
                                </span>
                              </span>
                            ) : isDeptCurrent ? (
                              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-blue-900 border border-blue-400 ring-2 ring-blue-400/40 shadow-2xs flex items-center gap-1.5 font-bold animate-pulse">
                                <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span>{concernedDeptDisplayName}</span>
                                <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                  In Review
                                </span>
                              </span>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 border border-slate-200 shadow-2xs flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{concernedDeptDisplayName}</span>
                              </span>
                            )}

                            <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isDeptApproved ? "text-emerald-500" : "text-slate-300"}`} />

                            {/* 2. DC / Fire Safety Officer (if hazardous items exist) */}
                            {requiresFireSafety ? (
                              <>
                                {isDcFsApproved ? (
                                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>DC / Fire Safety Officer</span>
                                    <span className="text-[9px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                      Approved
                                    </span>
                                  </span>
                                ) : isDcFsCurrent ? (
                                  <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-950 border border-amber-400 ring-2 ring-amber-400/50 shadow-2xs flex items-center gap-1.5 font-bold animate-pulse">
                                    <Flame className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>DC / Fire Safety Officer</span>
                                    {selectedRequest.revertedToFireSafetyFromCisf && selectedRequest.currentStage === "PENDING_FIRE_SAFETY_OFFICER" ? (
                                      <span className="text-[9px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider border border-rose-300">
                                        Reverted from CISF
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                        In Review
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-500 border border-slate-200 shadow-2xs flex items-center gap-1.5 font-medium">
                                    <Flame className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>DC / Fire Safety Officer</span>
                                  </span>
                                )}
                                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isDcFsApproved ? "text-emerald-500" : "text-slate-300"}`} />
                              </>
                            ) : null}

                            {/* 3. Traffic Department */}
                            {!isConcernedDeptTraffic && requiresTrafficApproval && (
                              <>
                                {isTrafficApproved ? (
                                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Traffic Department</span>
                                    <span className="text-[9px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                      Approved
                                    </span>
                                  </span>
                                ) : isTrafficCurrent ? (
                                  <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-950 border border-amber-400 ring-2 ring-amber-400/50 shadow-2xs flex items-center gap-1.5 font-bold animate-pulse">
                                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>Traffic Department</span>
                                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                      In Review
                                    </span>
                                  </span>
                                ) : (
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-500 border border-slate-200 shadow-2xs flex items-center gap-1.5 font-medium">
                                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>Traffic Department</span>
                                  </span>
                                )}
                                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isTrafficApproved ? "text-emerald-500" : "text-slate-300"}`} />
                              </>
                            )}

                            {/* 4. CISF Assistant Commandant */}
                            {isCisfApproved ? (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>CISF Assistant Commandant</span>
                                <span className="text-[9px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                  Approved
                                </span>
                              </span>
                            ) : isCisfCurrent ? (
                              <span className="rounded-lg bg-cyan-100 px-2.5 py-1 text-cyan-950 border border-cyan-400 ring-2 ring-cyan-400/50 shadow-2xs flex items-center gap-1.5 font-bold animate-pulse">
                                <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                                <span>CISF Assistant Commandant</span>
                                <span className="text-[9px] bg-cyan-200 text-cyan-900 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                                  In Review
                                </span>
                              </span>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-500 border border-slate-200 shadow-2xs flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>CISF Assistant Commandant</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Approval Flow Audit History */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-orange-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Approval Flow Audit Trail
                        </h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {(selectedRequest.workflowHistory || []).length} {(selectedRequest.workflowHistory || []).length === 1 ? "event" : "events"}
                      </span>
                    </div>

                    {(!selectedRequest.workflowHistory || selectedRequest.workflowHistory.length === 0) ? (
                      <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No approval workflow events recorded yet.
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {selectedRequest.workflowHistory.map((item, idx) => {
                          const isApproved = item.action === "APPROVED";
                          const isRejected = item.action === "REJECTED";
                          const isReverted = item.action?.startsWith("REVERTED");

                          let dotColor = "bg-blue-500 ring-blue-100";
                          let badgeBg = "bg-blue-50 text-blue-700 border-blue-200";
                          let actionLabel = item.action;

                          if (isApproved) {
                            dotColor = "bg-emerald-500 ring-emerald-100";
                            badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            actionLabel = "Approved";
                          } else if (isRejected) {
                            dotColor = "bg-rose-500 ring-rose-100";
                            badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
                            actionLabel = "Rejected";
                          } else if (isReverted) {
                            dotColor = "bg-amber-500 ring-amber-100";
                            badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                            const targetText = item.revertTarget ? " to " + item.revertTarget.replace(/_/g, " ") : "";
                            actionLabel = "Reverted" + targetText;
                          } else if (item.action === "RESUBMITTED") {
                            dotColor = "bg-purple-500 ring-purple-100";
                            badgeBg = "bg-purple-50 text-purple-700 border-purple-200";
                            actionLabel = "Resubmitted (Rev #" + (item.revisionNumber || 1) + ")";
                          } else if (item.action === "SUBMITTED") {
                            dotColor = "bg-sky-500 ring-sky-100";
                            badgeBg = "bg-sky-50 text-sky-700 border-sky-200";
                            actionLabel = "Initial Submission";
                          }

                          const stageDisplay = (item.stage || "")
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase());

                          return (
                            <div key={item.id || idx} className="relative group">
                              <span
                                className={"absolute -left-[19px] top-1.5 h-3 w-3 rounded-full " + dotColor + " ring-4 transition-transform group-hover:scale-125"}
                              />
                              <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-200 rounded-xl p-3.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                      {stageDisplay}
                                    </span>
                                    <span
                                      className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full border " + badgeBg}
                                    >
                                      {actionLabel}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "—"}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                  <span>
                                    <strong className="text-slate-700">Actor:</strong>{" "}
                                    {item.actorUserName || "System / Vendor"}
                                  </span>
                                  {item.actorRole && (
                                    <span>
                                      <strong className="text-slate-700">Role:</strong> {item.actorRole}
                                    </span>
                                  )}
                                  {item.actorDepartment && (
                                    <span>
                                      <strong className="text-slate-700">Department:</strong>{" "}
                                      {item.actorDepartment}
                                    </span>
                                  )}
                                </div>

                                {item.remarks ? (
                                  <div className="mt-2 text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700 font-medium">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                      Remarks / Comments:
                                    </span>
                                    <p className="whitespace-pre-wrap">{item.remarks}</p>
                                  </div>
                                ) : (
                                  isApproved && (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Approved without remarks (approval remarks not required).
                                    </p>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
              {/* View Mode Remarks Display */}
              {isViewMode && (selectedRequest?.rejectedReason || selectedRequest?.remarks || selectedRequest?.returnablePass?.rejectedReason || selectedRequest?.nonReturnablePass?.rejectedReason) ? (
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-500" />
                    Authority Remarks
                  </label>
                  <p className="text-xs text-slate-800">
                    {cleanRemarks(selectedRequest?.rejectedReason || selectedRequest?.remarks || selectedRequest?.returnablePass?.rejectedReason || selectedRequest?.nonReturnablePass?.rejectedReason)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-5 border-t border-slate-200 bg-white rounded-b-2xl">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                {isViewMode
                  ? "Historical record — read only."
                  : allVerified
                  ? "All passes verified. Ready to Approve, Revert, or Reject the entire request."
                  : `Please verify all material passes (${verifiedCount} of ${applicablePassKeys.length} verified) before making a decision.`}
              </span>
              {!isViewMode ? (
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectRemarksInput("");
                      setIsRejectModalOpen(true);
                    }}
                    disabled={!allVerified || submitting}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all ${
                      !allVerified || submitting
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer shadow-xs"
                    }`}
                    title={!allVerified ? "Verify all material passes before rejecting" : "Reject pass request"}
                  >
                    <XCircle className="h-4 w-4" /> Reject Request
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const opts = getAvailableRevertOptions();
                      if (opts.length > 0) setSelectedRevertTarget(opts[0].target);
                      setRevertRemarksInput("");
                      setIsRevertModalOpen(true);
                    }}
                    disabled={!allVerified || submitting}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all ${
                      !allVerified || submitting
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer shadow-xs"
                    }`}
                    title={!allVerified ? "Verify all material passes before reverting" : "Revert pass request"}
                  >
                    <CornerUpLeft className="h-4 w-4" /> Revert Request
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRequestDecision("APPROVED")}
                    disabled={!allVerified || submitting}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                      !allVerified || submitting
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
                    }`}
                    title={!allVerified ? "Verify all material passes before approving" : "Approve entire pass request"}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Request
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REVERT DESTINATION MODAL */}
      {/* ============================================================== */}
      {isRevertModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500 text-white shadow-sm">
                  <CornerUpLeft className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-amber-950">
                    Revert Material Pass Request
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    {selectedRequest?.referenceNo} • {selectedRequest?.companyName || selectedRequest?.agentName || "Applicant"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevertModalOpen(false)}
                className="text-amber-800 hover:text-amber-950 p-1.5 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Revert Destination
                </label>
                <div className="space-y-2">
                  {getAvailableRevertOptions().map((opt) => {
                    const isSelected = selectedRevertTarget === opt.target;
                    return (
                      <label
                        key={opt.target}
                        onClick={() => setSelectedRevertTarget(opt.target)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="revertDestination"
                          value={opt.target}
                          checked={isSelected}
                          onChange={() => setSelectedRevertTarget(opt.target)}
                          className="mt-1 h-4 w-4 text-amber-600 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            {opt.label}
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                Selected
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Revert Remarks / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={revertRemarksInput}
                  onChange={(e) => setRevertRemarksInput(e.target.value)}
                  placeholder="Specify clear instructions and reasons for reverting this pass (mandatory)..."
                  className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-800 placeholder:text-slate-400"
                />
                {!revertRemarksInput.trim() ? (
                  <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Remarks are strictly required when reverting a material pass request.
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    These instructions will be displayed in the audit trail and sent to the recipient.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRevertModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!revertRemarksInput.trim()) {
                    toast.error("Revert remarks are mandatory", {
                      description: "Please specify what needs to be corrected before reverting.",
                    });
                    return;
                  }
                  handleRequestDecision("REVERTED", selectedRevertTarget, revertRemarksInput.trim());
                }}
                disabled={!revertRemarksInput.trim() || submitting}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <CornerUpLeft className="h-4 w-4" /> Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REJECT CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-red-50 border-b border-red-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500 text-white shadow-sm">
                  <XCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-red-950">
                    Reject Material Pass Request
                  </h3>
                  <p className="text-xs text-red-800 font-medium">
                    {selectedRequest?.referenceNo} • {selectedRequest?.companyName || selectedRequest?.agentName || "Applicant"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-red-800 hover:text-red-950 p-1.5 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Rejection Remarks / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectRemarksInput}
                  onChange={(e) => setRejectRemarksInput(e.target.value)}
                  placeholder="Specify why this material pass request is being rejected (mandatory)..."
                  className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-slate-800 placeholder:text-slate-400"
                />
                {!rejectRemarksInput.trim() ? (
                  <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Remarks are strictly required when rejecting a material pass request.
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    This rejection reason will be recorded in the audit trail and sent to the applicant.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectRemarksInput.trim()) {
                    toast.error("Rejection remarks are mandatory", {
                      description: "Please specify why this request is being rejected.",
                    });
                    return;
                  }
                  handleRequestDecision("REJECTED", null, rejectRemarksInput.trim());
                }}
                disabled={!rejectRemarksInput.trim() || submitting}
                className={"px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm " + (
                  !rejectRemarksInput.trim() || submitting
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white active:scale-95"
                )}
              >
                <XCircle className="h-4 w-4" /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      
{/* ============================================================== */}
      {/* MATERIAL PASS DETAIL MODAL — opened on top of the request modal */}
      {/* ============================================================== */}
      {activeMeta && (
        <MaterialPassDetailModal
          meta={activeMeta}
          pass={activePass}
          isVerified={verifiedPasses[activePassKey]}
          materials={passMaterials[activePassKey]}
          unitsList={unitsList}
          isViewMode={isViewMode || activePassViewOnly}
          isLocked={isViewMode || activePassViewOnly}
          isCisfApprover={isCisfApprover}
          isTrafficApprover={isTrafficApprover}
          canEditHazardous={!isViewMode && !activePassViewOnly && !isCisfApprover && !isTrafficApprover}
          isConcernedDeptApprover={isConcernedDeptApprover}
          showExcludedItems={showExcludedItems}
          onClose={closePassDetail}
          onMarkVerified={handleMarkVerified}
          onItemQtyChange={handleItemQtyChange}
          onToggleApproval={handleToggleApproval}
          onToggleHazardous={handleToggleHazardous}
          onItemRemarksChange={handleItemRemarksChange}
          onAddItem={handleAddItem}
        />
      )}

      {/* ============================================================== */}
      {/* DOCUMENT VIEWER OVERLAY */}
      {/* ============================================================== */}
      {viewingDocUrl && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-all duration-300 ${isFullscreen ? "p-0" : "p-4 md:p-8"}`}
        >
          <div
            className={`bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${isFullscreen ? "max-w-full rounded-none border-none" : "max-w-6xl rounded-xl border border-slate-700"}`}
          >
            <div className="flex justify-between items-center px-4 py-3 bg-slate-800 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Document Viewer
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => {
                    setViewingDocUrl(null);
                    setIsFullscreen(false);
                  }}
                  className="bg-slate-700 hover:bg-red-500 p-2 rounded-lg transition-colors"
                  title="Close Viewer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center p-4">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                  <Loader2 className="h-10 w-10 text-[#ff6b00] animate-spin mb-4" />
                  <p className="text-slate-500 font-bold animate-pulse">Loading document...</p>
                </div>
              )}

              {isImage ? (
                <img
                  src={viewingDocUrl}
                  alt="Document Viewer"
                  className="max-w-full max-h-full object-contain relative z-0 drop-shadow-lg rounded-md"
                  onLoad={() => setIframeLoading(false)}
                />
              ) : (
                <iframe
                  src={viewingDocUrl}
                  className="w-full h-full border-none relative z-0 bg-white"
                  title="Document Viewer"
                  onLoad={() => setIframeLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}