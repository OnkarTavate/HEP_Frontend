"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, FileText, Clock, Building2, Mail, Phone, Calendar,
  XCircle, AlertCircle, X, RefreshCw, BadgeCheck, Car, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicRequestDetail, approvePublicRequest, rejectPublicRequest } from "@/lib/bulkPassApi";
import { BULK_PASS_LABELS, batchesNeededHint } from "@/lib/bulkPassConstants";
import SubmissionHistory, { SubmissionSummaryStrip } from "@/components/bulk-pass/SubmissionHistory";
import ApplicantLinkCard from "@/components/bulk-pass/ApplicantLinkCard";
import {
  getValidityState,
  combineValidity,
  formatValidityDateTime,
  toValidityInputs,
  toIstDateKey,
  DEFAULT_VALIDITY_FROM_TIME,
  DEFAULT_VALIDITY_UPTO_TIME,
} from "@/lib/bulkPassValidity";
import {
  RequestSummaryCard,
  CompanyInformationCard,
  PassRequirementsCard,
  ValidityCard,
  PurposeCard,
} from "@/components/admin/RequestInformationCards";

const STATUS_CONFIG = {
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

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : fmt.format(d);
};
const fmtDateShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};
const visitorTypeLabel = (v) =>
  v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    badge: "bg-stone-100 text-stone-500 ring-1 ring-stone-200",
    dot: "bg-stone-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${cfg.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ReadField({ label, value, mono, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
      </div>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  );
}

function ApprovalModal({ request, onClose, onApprove, loading }) {
  const [validityFrom, setValidityFrom] = useState("");
  const [validityUpto, setValidityUpto] = useState("");
  const [validityFromTime, setValidityFromTime] = useState(DEFAULT_VALIDITY_FROM_TIME);
  const [validityUptoTime, setValidityUptoTime] = useState(DEFAULT_VALIDITY_UPTO_TIME);
  const [remarks, setRemarks] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // The applicant's requested numbers are the allowance for the whole pass;
  // each batch is capped separately.
  const totalPersons = Number(request?.no_of_persons) || 0;
  const totalVehicles = Number(request?.no_of_vehicles) || 0;
  const batchesNeeded = batchesNeededHint(totalPersons, totalVehicles, true);

  useEffect(() => {
    if (request) {
      // Start from the requested window; a start already in the past opens today.
      const today = toIstDateKey(new Date());
      const from = toValidityInputs(request.validity_from);
      const upto = toValidityInputs(request.validity_upto, { upto: true });
      if (from.date && from.date >= today) {
        setValidityFrom(from.date);
        setValidityFromTime(from.time);
      } else {
        setValidityFrom(today);
        setValidityFromTime(DEFAULT_VALIDITY_FROM_TIME);
      }
      setValidityUpto(upto.date);
      setValidityUptoTime(upto.time);
    }
  }, [request]);

  const handleSubmit = async () => {
    if (!validityFrom || !validityUpto) {
      toast.error("Please select validity dates.");
      return;
    }
    const from = combineValidity(validityFrom, validityFromTime);
    const upto = combineValidity(validityUpto, validityUptoTime, { upto: true });
    if (!from || !upto) {
      toast.error("Please enter valid validity dates and times.");
      return;
    }
    if (from >= upto) {
      toast.error("Validity from must be before validity upto.");
      return;
    }
    // A past upto yields an ACTIVE-but-expired (dead-on-arrival) pass.
    if (upto <= new Date()) {
      toast.error("Validity upto must be in the future.");
      return;
    }
    try {
      await onApprove(request.id, {
        validityFrom,
        validityUpto,
        validityFromTime: validityFromTime || DEFAULT_VALIDITY_FROM_TIME,
        validityUptoTime: validityUptoTime || DEFAULT_VALIDITY_UPTO_TIME,
        remarks: remarks.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  if (!request) return null;

  // Show confirmation dialog before opening main modal
  if (!showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Approval Action</h3>
          <p className="text-sm text-slate-500 mb-6">
            You are about to approve the public request from <span className="font-semibold text-slate-700">{request.company_name}</span>.
            <br/><br/>
            This sends the applicant an upload link. They can submit as many batches as they need until the validity ends.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Approve Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Company: <span className="font-semibold text-slate-700">{request.company_name}</span>
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Validity From <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={validityFrom}
                onChange={(e) => setValidityFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition flex-[2_1_0%] min-w-0"
              />
              <input
                type="time"
                aria-label="Validity from time (IST)"
                value={validityFromTime}
                onChange={(e) => setValidityFromTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition flex-[1_1_0%] min-w-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Validity Upto <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={validityUpto}
                onChange={(e) => setValidityUpto(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition flex-[2_1_0%] min-w-0"
              />
              <input
                type="time"
                aria-label="Validity upto time (IST)"
                value={validityUptoTime}
                onChange={(e) => setValidityUptoTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 transition flex-[1_1_0%] min-w-0"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Times are in IST. Defaults: 06:00 from, 18:00 upto.</p>
          </div>

          {/* What approving grants: the requested totals, spent in batches. */}
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Bulk Pass Allowance
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Persons</p>
                <p className="font-extrabold text-slate-900 tabular-nums">{totalPersons}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Vehicles</p>
                <p className="font-extrabold text-slate-900 tabular-nums">{totalVehicles}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {BULK_PASS_LABELS.PER_BATCH_NOTE}. {batchesNeeded || ""} Only persons and vehicles approved or awaiting
              review count; rejected ones hand their place back.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Approval Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks for this approval…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none transition"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading ? "Approving…" : "Approve Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectionModal({ request, onClose, onReject, loading }) {
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please enter a rejection reason (minimum 10 characters).");
      return;
    }
    // Loading is owned by the parent (passed in as the `loading` prop), mirroring
    // ApprovalModal — there is no local setLoading here.
    try {
      await onReject(request.id, reason.trim());
      onClose();
    } catch (err) {
      console.error("Rejection error:", err);
    }
  };

  if (!request) return null;

  // Show confirmation dialog before opening main modal
  if (!showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Rejection Action</h3>
          <p className="text-sm text-slate-500 mb-6">
            You are about to reject the public request from <span className="font-semibold text-slate-700">{request.company_name}</span>.
            <br/><br/>
            The applicant will be notified via email with your rejection reason.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Reject Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Company: <span className="font-semibold text-slate-700">{request.company_name}</span>
        </p>

        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed reason for rejecting this request (minimum 10 characters)…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400/50 resize-none transition"
          />
          <p className="text-xs text-slate-400 mt-1">
            Characters: {reason.length} / 10 minimum
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? "Rejecting…" : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPublicRequestDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Only users from General Administration department can approve/reject public requests
  const userDeptName = (user?.departmentName || user?.department_name || "").toLowerCase().trim();
  const canApprove = userDeptName === "general administration";

  useEffect(() => {
    try {
      const r = localStorage.getItem("user");
      if (r) setUser(JSON.parse(r));
    } catch {}
  }, []);

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicRequestDetail(id);
      setRequest(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load request details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleApproveRequest = async (requestId, approvalData) => {
    setApproving(true);
    try {
      await approvePublicRequest(requestId, approvalData);
      toast.success("Request approved successfully!");
      fetchRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve request.");
      throw err;
    } finally {
      setApproving(false);
    }
  };

  const handleRejectRequest = async (requestId, rejectionReason) => {
    setRejecting(true);
    try {
      await rejectPublicRequest(requestId, rejectionReason);
      toast.success("Request rejected successfully!");
      fetchRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject request.");
      throw err;
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full mx-4 text-center">
          <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800 mb-2">Could not load request</p>
          <p className="text-sm text-slate-500 mb-5">{error || "Request not found."}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/admin/public-requests")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Back to List
            </button>
            <button
              onClick={fetchRequest}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { status } = request;

  // Determine if action buttons should be shown
  const showApproveButton = canApprove && status === "PENDING_ADMIN_APPROVAL";
  const showRejectButton = canApprove && status === "PENDING_ADMIN_APPROVAL";
  const isProcessed = status === "ACTIVE" || status === "REJECTED_BY_ADMIN";

  // Show approval/rejection info cards only after processing
  const showApprovalInfo = status === "ACTIVE" && request.approved_at;
  const showRejectionInfo = status === "REJECTED_BY_ADMIN" && request.rejection_reason;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/public-requests")}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800 font-mono">
                {request.tracking_number || `Request #${id}`}
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Submitted {fmtDate(request.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={fetchRequest}
            title="Refresh"
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {showApproveButton && !approving && (
            <button
              onClick={() => setShowApprovalModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <BadgeCheck className="h-4 w-4" />Approve Request
            </button>
          )}
          {approving && (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-400 cursor-not-allowed transition"
            >
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Approving…
            </button>
          )}
          {showRejectButton && !rejecting && (
            <button
              onClick={() => setShowRejectionModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition"
            >
              <XCircle className="h-4 w-4" />Reject Request
            </button>
          )}
          {rejecting && (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-400 cursor-not-allowed transition"
            >
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Rejecting…
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-slate-800 transition">
          Admin
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/admin/public-requests" className="hover:text-slate-800 transition">
          Public Requests
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800">
          {request.tracking_number || `#${id}`}
        </span>
      </div>

      {/* Approval Status Messages */}
      {status === "ACTIVE" && request.approved_at && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
          <BadgeCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-700">
              Request Approved
            </p>
            <p className="text-sm text-emerald-600 mt-0.5">
              Approved by {request.approved_by_user?.userName || "Admin"} on{" "}
              {fmtDate(request.approved_at)}
              {request.approved_time_from && request.approved_time_upto && (
                <>
                  {" "}
                  for validity period from {formatValidityDateTime(request.approved_time_from)} to{" "}
                  {formatValidityDateTime(request.approved_time_upto, { upto: true })} IST
                </>
              )}
            </p>
          </div>
        </div>
      )}
      {status === "REJECTED_BY_ADMIN" && request.rejection_reason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-red-50 ring-1 ring-red-200">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Rejection Reason</p>
            <p className="text-sm text-red-600 mt-0.5">{request.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Persons Declared",
            value: request.no_of_persons ?? 0,
            icon: <Users className="h-5 w-5" />,
            color: "text-blue-500 bg-blue-100",
          },
          {
            label: "Vehicles Declared",
            value: request.no_of_vehicles ?? 0,
            icon: <Car className="h-5 w-5" />,
            color: "text-purple-500 bg-purple-100",
          },
          {
            label: "Visitor Type",
            value: visitorTypeLabel(request.visitor_type),
            icon: <Building2 className="h-5 w-5" />,
            color: "text-amber-500 bg-amber-100",
          },
          {
            label: "Payment Mode",
            value: request.payment_mode || "—",
            icon: <FileText className="h-5 w-5" />,
            color: "text-emerald-500 bg-emerald-100",
          },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
              >
                {icon}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 tabular-nums">
                  {value ?? 0}
                </p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Request Information Cards */}
      <div className="space-y-6">
        <RequestSummaryCard
          trackingNumber={request.tracking_number}
          status={status}
          submittedDate={fmtDateShort(request.created_at)}
        />
        <CompanyInformationCard
          companyName={request.company_name}
          applicantEmail={request.applicant_email}
          applicantMobile={request.applicant_mobile}
        />
        <PassRequirementsCard
          noOfPersons={request.no_of_persons}
          noOfVehicles={request.no_of_vehicles}
          visitorType={request.visitor_type}
          paymentMode={request.payment_mode}
        />
        <ValidityCard
          validityFrom={request.validity_from}
          validityUpto={request.validity_upto}
          approvedTimeFrom={request.approved_time_from}
          approvedTimeUpto={request.approved_time_upto}
          status={status}
        />
        <PurposeCard
          purpose={request.purpose}
          remarks={request.remarks}
          workOrderRequired={request.work_order_required}
          refDocNo={request.ref_doc_no}
        />
      </div>

      {/* Approval Information (if approved) */}
      {status === "ACTIVE" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <SectionHeader title="Approval Details" icon={BadgeCheck} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <ReadField
              label="Approved By"
              value={request.approved_by_user?.userName || "Admin"}
            />
            <ReadField
              label="Approved At"
              value={fmtDate(request.approved_at)}
            />
            <ReadField
              label="Validity From"
              value={request.approved_time_from ? `${formatValidityDateTime(request.approved_time_from)} IST` : null}
            />
            <ReadField
              label="Validity Upto"
              value={request.approved_time_upto ? `${formatValidityDateTime(request.approved_time_upto, { upto: true })} IST` : null}
            />
          </div>
        </div>
      )}

      {/* The applicant's link — copy, QR or resend without digging out the approval email. */}
      {status === "ACTIVE" && request.upload_link && (
        <ApplicantLinkCard
          link={request.upload_link}
          tokenActive={request.token_active !== false}
          expired={getValidityState({ validityUpto: request.approved_time_upto }).state === "EXPIRED"}
          tokenExpiresAt={request.approved_time_upto}
          reusable
        />
      )}

      {/* Every batch submitted against this request, with the same history
          view the department bulk passes use. */}
      {status === "ACTIVE" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal">
          <SectionHeader title="Submission History" icon={Clock} />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              Every batch the applicant has submitted with this request&apos;s link
            </p>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {(request.child_batches || []).length} batch{(request.child_batches || []).length !== 1 ? "es" : ""}
            </span>
          </div>
          {(request.child_batches || []).length > 0 && (
            <SubmissionSummaryStrip submissions={request.child_batches || []} className="mb-4" />
          )}
          <SubmissionHistory
            submissions={request.child_batches || []}
            onView={(s) => router.push(`/admin/bulk_pass/${s.id}`)}
            emptyTitle="No batches submitted yet"
            emptyHint="The applicant received the upload link by email. Batches appear here as soon as they submit."
          />
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && !approving && (
        <ApprovalModal
          request={request}
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApproveRequest}
          loading={approving}
        />
      )}

      {/* Rejection Modal */}
      {showRejectionModal && !rejecting && (
        <RejectionModal
          request={request}
          onClose={() => setShowRejectionModal(false)}
          onReject={handleRejectRequest}
          loading={rejecting}
        />
      )}
    </div>
  );
}
