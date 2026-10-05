"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  X,
  Building2,
  MapPinned,
  Package,
  Recycle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Clock,
  Edit3,
  Eye,
  ChevronUp,
  QrCode,
  Loader2,
  Maximize,
  Minimize,
  FileCheck2,
  MessageSquareWarning,
} from "lucide-react";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";
// Resolve the QR service base the same way PassRequestPage.js does.
const QR_SERVICE_URL =
  process.env.NEXT_PUBLIC_QR_API || "http://localhost:5007/api";

// --- Pass type metadata (mirrors the admin page's PASS_TYPE_META) ---
const PASS_TYPE_META = {
  returnable: {
    key: "returnable",
    dataKey: "returnablePass",
    label: "Returnable Pass",
    icon: Recycle,
  },
  nonReturnable: {
    key: "nonReturnable",
    dataKey: "nonReturnablePass",
    label: "Non-Returnable Pass",
    icon: Package,
  },
};

const STATUS_STYLES = {
  APPROVED: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-emerald-300",
    bar: "border-l-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    badge: "bg-red-50 text-red-700 border-red-200",
    border: "border-red-300",
    bar: "border-l-red-400",
    icon: XCircle,
  },
  REVERTED: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    border: "border-amber-300 border-dashed",
    bar: "border-l-amber-400",
    icon: CornerUpLeft,
  },
  SUBMITTED: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    border: "border-blue-200",
    bar: "border-l-blue-400",
    icon: Clock,
  },
  RESUBMITTED: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    border: "border-indigo-200",
    bar: "border-l-indigo-400",
    icon: Clock,
  },
};

const DEPARTMENT_DISPLAY_NAMES = {
  "Traffic": "Traffic",
  "Marine": "Marine",
  "Engineering Civil": "Civil",
  "Engineering Mechanical": "Mechanical",
  "Finance": "Finance",
  "General Administration": "General Administration",
};

const getStatusStyle = (status) =>
  STATUS_STYLES[(status || "").toUpperCase()] || STATUS_STYLES.SUBMITTED;

// Rows beyond this count trigger a scrollable table body inside the detail modal.
const MAX_VISIBLE_ROWS = 5;

// --- Compact, always-visible summary row for a pass type. Clicking it (or
// its "View details" button) opens the full material read-only review in a
// separate modal stacked on top — it never expands inline anymore. ---
function MaterialPassSummaryRow({ meta, passData, onOpen, onPrintQR, isPrinting }) {
  if (!passData) return null;

  const Icon = meta.icon;
  const materials = passData.materials || [];
  const status = (passData.status || "SUBMITTED").toUpperCase();
  const style = getStatusStyle(status);
  const StatusIcon = style.icon;
  const isReverted = status === "REVERTED";
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";
  const hasRemarks = (isReverted || isRejected) && (passData.remarks || passData.rejectedReason);

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
      className={`bg-white rounded-xl border ${style.border} border-l-4 ${style.bar} shadow-sm flex items-center justify-between px-5 py-4 mb-3 transition-all duration-200 cursor-pointer hover:bg-slate-50 hover:shadow-md`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-5 w-5 text-slate-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#0a1e4d] truncate">
            {meta.label}
          </div>
          <div className="text-xs text-slate-500">
            {materials.length} item{materials.length === 1 ? "" : "s"}
            {hasRemarks ? " · has remarks" : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${style.badge}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status}
        </span>

        {isApproved ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrintQR();
            }}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
          >
            {isPrinting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <QrCode className="h-3.5 w-3.5" />
            )}
            Print QR
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 italic px-1 hidden sm:inline">
            QR available after approval
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(meta.key);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> View details
        </button>
      </div>
    </div>
  );
}

// --- Secondary modal: opened on top of the main details modal when a pass
// summary row is clicked. Read-only — full materials table, remarks, and a
// Print QR action for approved passes. ---
function MaterialPassDetailViewModal({ meta, passData, onClose, onPrintQR, isPrinting, onViewDoc }) {
  const [expandedDesc, setExpandedDesc] = useState({});
  const [expandedRemarks, setExpandedRemarks] = useState({});

  if (!meta || !passData) return null;

  const toggleDesc = (i) =>
    setExpandedDesc((prev) => ({ ...prev, [i]: !prev[i] }));
  const toggleRemark = (i) =>
    setExpandedRemarks((prev) => ({ ...prev, [i]: !prev[i] }));

  const Icon = meta.icon;
  const materials = passData.materials || [];
  const status = (passData.status || "SUBMITTED").toUpperCase();
  const style = getStatusStyle(status);
  const StatusIcon = style.icon;
  const isReverted = status === "REVERTED";
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";
  const hasRemarks = (isReverted || isRejected) && (passData.remarks || passData.rejectedReason);
  const isScrollable = materials.length > MAX_VISIBLE_ROWS;

  // Heuristic threshold for showing "show more" — avoids needing a DOM
  // measurement just to decide if text overflows a single line.
  const DESC_TRUNCATE_LEN = 45;
  const REMARK_TRUNCATE_LEN = 35;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] text-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 shrink-0" />
            <h2 className="text-base sm:text-xl font-bold tracking-wide truncate">
              {meta.label}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-2 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header: item count + status + optional document link */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {materials.length} item{materials.length === 1 ? "" : "s"}
          </h4>
          <div className="flex items-center gap-2">
            {passData.documentUrl && (
              <button
                onClick={() => onViewDoc(passData.documentUrl)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-white px-2 py-1 rounded shadow-sm border border-slate-200"
              >
                <Eye className="h-3 w-3" /> View Document
              </button>
            )}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${style.badge}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status}
            </span>
          </div>
        </div>

        {/* Scrollable body: table + remarks */}
        <div className="overflow-y-auto flex-1">
          <div className={`overflow-x-auto ${isScrollable ? "max-h-72 overflow-y-auto" : ""}`}>
            <table className="w-full table-fixed text-left text-sm min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="w-14 p-3 font-semibold text-slate-600 uppercase text-xs">S.No.</th>
                  <th className="w-[22%] p-3 font-semibold text-slate-600 uppercase text-xs">Item Name</th>
                  <th className="w-20 p-3 font-semibold text-slate-600 uppercase text-xs">Quantity</th>
                  <th className="w-24 p-3 font-semibold text-slate-600 uppercase text-xs">Unit</th>
                  <th className="w-[28%] p-3 font-semibold text-slate-600 uppercase text-xs">Description</th>
                  <th className="w-[22%] p-3 font-semibold text-slate-600 uppercase text-xs">Approved Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-slate-400 italic">
                      No materials listed.
                    </td>
                  </tr>
                ) : (
                  materials.map((item, index) => {
                    // "Approved" is purely a function of approvedQty now — remarks can
                    // legitimately exist on an approved item (e.g. a reduced-qty note),
                    // so they're no longer mutually exclusive with approval.
                    const approvedQtyNum = Number(item.approvedQty) || 0;
                    const isItemApproved = isApproved && approvedQtyNum > 0;
                    const isItemShort =
                      isApproved && item.approvedQty != null && approvedQtyNum < Number(item.quantity);

                    const descText = item.description || "";
                    const isDescLong = descText.length > DESC_TRUNCATE_LEN;
                    const isDescExpanded = !!expandedDesc[index];

                    const remarkText = item.approverRemarks || "";
                    const isRemarkLong = remarkText.length > REMARK_TRUNCATE_LEN;
                    const isRemarkExpanded = !!expandedRemarks[index];

                    return (
                      <tr key={index} className={isApproved && !isItemApproved ? "bg-red-50/40" : ""}>
                        <td className="p-3 align-top text-slate-800 font-mono font-bold text-xs">
                          {index + 1}
                        </td>
                        <td className="p-3 align-top font-bold text-[#0a1e4d]">{item.name}</td>
                        <td className="p-3 align-top text-slate-600 font-mono font-bold text-xs">{item.quantity}</td>
                        <td className="p-3 align-top text-slate-800 font-mono text-xs">{item.unit}</td>

                        {/* Description — reserved height even when empty, subtle show more/less */}
                        <td className="p-3 align-top text-slate-600">
                          {descText ? (
                            isDescExpanded ? (
                              <div className="text-xs leading-snug">
                                <span className="whitespace-normal break-words">{descText}</span>
                                {isDescLong && (
                                  <button
                                    onClick={() => toggleDesc(index)}
                                    className="ml-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-normal align-baseline"
                                  >
                                    show less
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-xs truncate">{descText}</span>
                                {isDescLong && (
                                  <button
                                    onClick={() => toggleDesc(index)}
                                    className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600 font-normal"
                                  >
                                    show more
                                  </button>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-slate-300">{"\u00A0"}</span>
                          )}
                        </td>

                        {/* Approved Qty — green if >0, plain grey "0" if not approved, tick/x on the right, remarks below */}
                        <td className="p-3 align-top">
                          <div className="min-h-[34px] flex flex-col justify-center gap-1">
                            <div className="flex items-center justify-between gap-1.5 font-mono text-xs">
                              {isApproved ? (
                                approvedQtyNum > 0 ? (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <span className="font-bold text-emerald-700">
                                        {approvedQtyNum}
                                      </span>
                                      {isItemShort && (
                                        <span className="text-slate-400 font-normal">/ {item.quantity}</span>
                                      )}
                                    </span>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-slate-400 font-bold">0</span>
                                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  </>
                                )
                              ) : (
                                <span className="text-slate-400 font-bold">-</span>
                              )}
                            </div>

                            {remarkText ? (
                              isRemarkExpanded ? (
                                <div className="flex items-start gap-1 text-[11px] text-amber-600 font-medium leading-snug">
                                  <MessageSquareWarning className="h-3 w-3 shrink-0 mt-[1px]" />
                                  <span className="whitespace-normal break-words">
                                    {remarkText}
                                    {isRemarkLong && (
                                      <button
                                        onClick={() => toggleRemark(index)}
                                        className="ml-1.5 text-[10px] text-slate-400 hover:text-slate-600 font-normal align-baseline"
                                      >
                                        show less
                                      </button>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                  <MessageSquareWarning className="h-3 w-3 shrink-0 text-amber-500 relative top-[1px]" />
                                  <span className="truncate text-[11px] text-amber-600 font-medium">{remarkText}</span>
                                  {isRemarkLong && (
                                    <button
                                      onClick={() => toggleRemark(index)}
                                      className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600 font-normal"
                                    >
                                      show more
                                    </button>
                                  )}
                                </div>
                              )
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {hasRemarks && (
            <div className={`p-4 border-t ${isReverted ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isReverted ? "text-amber-800" : "text-red-800"}`}>
                {isReverted ? "Reviewer remarks — action required" : "Rejection reason"}
              </p>
              <p className={`text-sm ${isReverted ? "text-amber-700" : "text-red-700"}`}>
                {passData.remarks || passData.rejectedReason}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white shrink-0">
          {isApproved ? (
            <button
              onClick={onPrintQR}
              disabled={isPrinting}
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPrinting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              Print QR
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-400 italic self-center">
              QR available after approval
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MaterialPassDetailsModal({
  pass,
  onClose,
  onEditReverted,
}) {
  // Which pass type (returnable / nonReturnable) is currently open in the
  // secondary "detail" modal. Null means no detail modal is showing.
  const [activePassKey, setActivePassKey] = useState(null);
  // Tracks which pass key is currently generating/printing a QR (or null).
  const [printingKey, setPrintingKey] = useState(null);

  // --- Document viewer state ---
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (viewingDocUrl) {
      setIframeLoading(true);
    }
  }, [viewingDocUrl]);

  // Existing — used for per-pass documents (e.g. QR-related docs via passData.documentUrl)
  const handleViewDoc = (docUrl) => {
    if (!docUrl) return;
    const isImg = /\.(jpe?g|png|gif|webp)$/i.test(docUrl);
    setIsImage(!!isImg);
    setViewingDocUrl(docUrl);
  };

  // New — for request-level documents (Requisition Letter / Work Order),
  // streamed via the backend's viewMaterialPassDocument endpoint.
  const handleViewRequestDoc = (passRequestId, documentType, staticPath) => {
    if (!staticPath) return;
    const isImg = /\.(jpe?g|png|gif|webp)$/i.test(staticPath);
    setIsImage(!!isImg);
    setViewingDocUrl(
      `${AGENT_API}/material-pass/viewMaterialPassDocument?passRequestId=${passRequestId}&documentType=${documentType}`,
    );
  };

  if (!pass) return null;

  const applicablePassKeys = Object.values(PASS_TYPE_META)
    .filter((meta) => !!pass[meta.dataKey])
    .map((meta) => meta.key);

  const overallStatus = (pass.status || "SUBMITTED").toUpperCase();
  const displayStatus = pass.isResubmitted ? "RESUBMITTED" : overallStatus;
  const overallStyle = getStatusStyle(displayStatus);
  const isReverted = pass.hasRevertedPass;

  const createdAtStr = pass.createdAt || pass.submittedAt;
  const passIdStr = pass.referenceNo || (pass.id ? `REQ-${pass.id}` : "MREQ-0001");

  // Opens the secondary detail modal for a given pass type.
  const openPassDetail = (key) => setActivePassKey(key);
  const closePassDetail = () => setActivePassKey(null);

  // Generates and prints the QR/pass PDF for a given material pass type
  // (returnable / nonReturnable). Only ever called for APPROVED passes —
  // the button itself is hidden otherwise, but we double-check here too.
  const handlePrintQR = async (meta) => {
    const passData = pass[meta.dataKey];
    const passRequestId = pass.id || pass.passId;
    const passId = passData?.id;

    if ((passData?.status || "").toUpperCase() !== "APPROVED") {
      toast.error("QR can only be generated for an approved pass.");
      return;
    }

    if (!passRequestId || !passId) {
      toast.error("Missing pass or reference ID. Cannot generate QR.");
      return;
    }

    setPrintingKey(meta.key);
    toast.info(`Generating QR for ${meta.label}...`);

    try {
      let token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) token = token.replace(/^["']|["']$/g, "");

      const response = await axios.get(
        `${QR_SERVICE_URL}/qr/generate-material-pass/${passRequestId}?type=${meta.key}&passId=${passId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob", // handle a PDF file, not JSON
        },
      );

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Print seamlessly via a hidden iframe, same pattern as person/vehicle QR.
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfUrl);
        }, 60000);
      };
    } catch (error) {
      let errorMessage = "Failed to generate QR pass.";

      if (error.response && error.response.data) {
        if (error.response.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            errorMessage = json.message || errorMessage;
          } catch (e) {
            errorMessage = text;
          }
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      }

      toast.error(`QR Error: ${errorMessage}`);
      console.error("QR Generation Error:", error);
    } finally {
      setPrintingKey(null);
    }
  };

  const getDepartmentLabel = (name) => DEPARTMENT_DISPLAY_NAMES[name] || name || "N/A";

  const activeMeta = activePassKey ? PASS_TYPE_META[activePassKey] : null;
  const activePassData = activeMeta ? pass[activeMeta.dataKey] : null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] text-white">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 shrink-0" />
              <h2 className="text-base sm:text-xl font-bold tracking-wide truncate">
                Material Pass Request: {passIdStr}
              </h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-2 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
            {/* Revert banner — top priority, action-oriented */}
            {isReverted && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-amber-900 uppercase tracking-wide text-xs mb-1">
                    Action Required — Application Reverted
                  </p>
                  <p className="text-amber-700">
                    One or more materials on this request need correction. Review the remarks
                    below on each affected pass type, then edit and resubmit.
                  </p>
                  {onEditReverted && (
                    <button
                      onClick={() => onEditReverted(pass)}
                      className="mt-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit & Resubmit
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Application info — company name kept minimal, no email/GST/PAN */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Application Info
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Company Name</span>
                    <span className="text-sm font-bold text-[#0a1e4d] sm:text-right">
                      {pass.companyName || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Application Date</span>
                    <span className="text-sm font-medium text-slate-800 sm:text-right">
                      {createdAtStr
                        ? new Date(createdAtStr).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">
                          Pass Type
                      </span>

                      <span className="text-sm font-bold text-[#0a1e4d] sm:text-right tracking-wide">
                          {pass.returnablePass || pass.nonReturnablePass
                              ? "Regular"
                              : pass.surplusPass
                              ? "Surplus"
                              : pass.debrisPass
                              ? "Debris"
                              : "N/A"}
                      </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 items-start sm:items-center">
                    <span className="text-xs font-semibold text-slate-500">Status</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${overallStyle.badge}`}>
                      {displayStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Movement details */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-5">
                  <MapPinned className="h-5 w-5 text-green-600 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Movement Details
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Location</span>
                    <span className="text-sm font-medium text-slate-800 sm:text-right">
                      {pass.locationOther || pass.locationFrom || pass.locationTo || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Department</span>
                    <span className="text-sm font-medium text-slate-800 sm:text-right">
                      {getDepartmentLabel(pass.concernedDepartment)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Purpose</span>
                    <span className="text-sm font-medium text-slate-800 sm:text-right">
                      {pass.purposeOther || pass.purpose || "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-500">Entry Date</span>
                    <span className="text-sm font-medium text-slate-800 sm:text-right">
                      {pass.entryDate
                        ? new Date(pass.entryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Attached Documents — Requisition Letter & Work Order (request-level) */}
            {(pass.requisitionLetterFilePath || pass.workOrderFilePath) && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Attached Documents
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pass.requisitionLetterFilePath && (
                    <button
                      onClick={() =>
                        handleViewRequestDoc(
                          pass.id,
                          "requisitionLetter",
                          pass.requisitionLetterFilePath,
                        )
                      }
                      className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                      <FileText className="h-4 w-4 text-blue-600" /> View Requisition Letter
                    </button>
                  )}
                  {pass.workOrderFilePath && (
                    <button
                      onClick={() =>
                        handleViewRequestDoc(
                          pass.id,
                          "workOrder",
                          pass.workOrderFilePath,
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

            {/* Material review: compact clickable rows, each opens its own modal */}
            {applicablePassKeys.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-[#0a1e4d] uppercase tracking-widest flex items-center gap-2 mb-3 px-1">
                  <Package className="h-4 w-4" /> Material Details
                </h4>
                {applicablePassKeys.map((key) => {
                  const meta = PASS_TYPE_META[key];
                  return (
                    <MaterialPassSummaryRow
                      key={key}
                      meta={meta}
                      passData={pass[meta.dataKey]}
                      onOpen={openPassDetail}
                      onPrintQR={() => handlePrintQR(meta)}
                      isPrinting={printingKey === key}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-5 border-t border-slate-200 bg-white rounded-b-2xl">
            <button
              onClick={onClose}
              className="bg-[#0a1e4d] text-white px-8 py-2.5 rounded-xl shadow-lg font-bold hover:bg-opacity-90 transition-colors uppercase tracking-wider text-sm"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>

      {/* Material Pass Detail View Modal — opened on top of the main modal */}
      {activeMeta && activePassData && (
        <MaterialPassDetailViewModal
          meta={activeMeta}
          passData={activePassData}
          onClose={closePassDetail}
          onPrintQR={() => handlePrintQR(activeMeta)}
          isPrinting={printingKey === activeMeta.key}
          onViewDoc={handleViewDoc}
        />
      )}

      {/* Document Viewer Modal Overlay */}
      {viewingDocUrl && (
        <div className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 lg:p-10 animate-in fade-in duration-300">
          <div
            className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen ? "w-full h-full" : "w-full max-w-5xl h-[85vh]"
            }`}
          >
            {/* Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Document Viewer
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
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

            {/* Iframe / Image Container */}
            <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center p-4">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
                  <Loader2 className="h-10 w-10 text-[#ff6b00] animate-spin mb-4" />
                  <p className="text-slate-500 font-bold animate-pulse">
                    Loading document...
                  </p>
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
    </>
  );
}