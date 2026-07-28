"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  FileText,
  Clock,
  Send,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Car,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBulkBatchDetail,
  returnToApplicant,
  resendInvitation,
  downloadBulkPdf,
  fileUrl,
} from "@/lib/bulkPassApi";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT: {
    label: "Sent to User",
    chip: "bg-stone-100 text-stone-600 border border-stone-300 dark:bg-stone-700 dark:text-stone-300 dark:border-stone-600",
    dot: "bg-stone-400",
  },
  UNDER_REVIEW: {
    label: "Pending",
    chip: "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600",
    dot: "bg-amber-500",
  },
  RETURNED_TO_APPLICANT: {
    label: "Returned",
    chip: "bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-600",
    dot: "bg-orange-500",
  },
  REJECTED: {
    label: "Rejected",
    chip: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-600",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Approved",
    chip: "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600",
    dot: "bg-emerald-500",
  },
};

// ── Shared card shell ─────────────────────────────────────────────────────────

const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "transition-all duration-300";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  v
    ? v
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          {icon}
        </span>
        <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ── Read-only field ───────────────────────────────────────────────────────────

function ReadField({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-stone-800 dark:text-stone-200 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    chip: "bg-stone-100 text-stone-500 border border-stone-200",
    dot: "bg-stone-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${cfg.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Return modal ──────────────────────────────────────────────────────────────

function ReturnModal({ batchId, refNo, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a return reason.");
      return;
    }
    setLoading(true);
    try {
      await returnToApplicant(batchId, reason.trim());
      toast.success(`Batch ${refNo} returned to applicant.`);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to return batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`${cardShell} w-full max-w-md mx-4 p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Return to Applicant
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          Batch:{" "}
          <span className="font-semibold text-stone-700 dark:text-stone-200">
            {refNo}
          </span>
        </p>
        <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
          Return Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what needs to be corrected..."
          className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 px-4 py-3 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
        />
        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Returning…" : "Return to Applicant"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upload Link Banner ────────────────────────────────────────────────────────
// Displayed on DRAFT and RETURNED_TO_APPLICANT batches so the dept user
// can resend the invitation email through the application.

function UploadLinkBanner({ tokenActive, tokenExpiresAt, linkValidityHours, onResend, resending }) {
  const isExpired =
    tokenExpiresAt && new Date(tokenExpiresAt).getTime() < Date.now();

  return (
    <div className={`rounded-2xl ring-1 p-5 ${
      isExpired || !tokenActive
        ? "bg-red-50 dark:bg-red-900/10 ring-red-200 dark:ring-red-800/30"
        : "bg-sky-50 dark:bg-sky-900/10 ring-sky-200 dark:ring-sky-800/30"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Send className={`h-4 w-4 shrink-0 ${isExpired || !tokenActive ? "text-red-500" : "text-sky-600 dark:text-sky-400"}`} />
        <p className={`text-sm font-bold ${isExpired || !tokenActive ? "text-red-700 dark:text-red-300" : "text-sky-700 dark:text-sky-300"}`}>
          Applicant Upload Link
          {linkValidityHours && !isExpired && tokenActive && (
            <span className="ml-2 text-xs font-normal text-sky-500 dark:text-sky-400">
              · valid for {linkValidityHours}h
            </span>
          )}
          {(isExpired || !tokenActive) && (
            <span className="ml-2 text-xs font-normal text-red-500">· Link expired</span>
          )}
          {tokenExpiresAt && !isExpired && tokenActive && (
            <span className="ml-2 text-xs font-normal text-sky-500">
              · expires {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(tokenExpiresAt))}
            </span>
          )}
        </p>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
        {isExpired || !tokenActive
          ? "The applicant's upload link has expired. Resend the invitation to issue a fresh link."
          : "If the applicant hasn't received the invitation email, resend it through the application."}
      </p>
      <button
        onClick={onResend}
        disabled={resending}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <Send className="h-4 w-4" />
        {resending ? "Sending…" : "Resend Invitation Email"}
      </button>
    </div>
  );
}

// ── Persons table ─────────────────────────────────────────────────────────────

function PersonsTable({ persons }) {
  const [expanded, setExpanded] = useState(true);

  if (!persons?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-400 mb-3">
          <Users className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          No persons uploaded yet
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Persons will appear here after the applicant submits their Excel file.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300 mb-3 hover:text-amber-600 dark:hover:text-amber-400 transition"
      >
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {expanded ? "Collapse" : "Expand"} person list ({persons.length})
      </button>

      {expanded && (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100 dark:ring-white/[0.05]">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-stone-50/80 dark:bg-white/[0.03] border-b border-stone-100 dark:border-white/[0.06]">
                {[
                  "#",
                  "Photo",
                  "Name",
                  "Aadhaar",
                  "DOB",
                  "Mobile",
                  "Aadhaar Card",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map((p, idx) => (
                <tr
                  key={p.id || idx}
                  className="border-b border-stone-50 dark:border-white/[0.03] hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors last:border-b-0"
                >
                  <td className="px-4 py-3 text-xs text-stone-400 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <PhotoThumb src={p.photoPath} name={p.name} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                    {p.name || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {p.aadhaar
                      ? `XXXX XXXX ${String(p.aadhaar).slice(-4)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {fmtDateShort(p.dob)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400">
                    {p.mobile || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.aadhaarCardPath ? (
                      <a
                        href={fileUrl(p.aadhaarCardPath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                      >
                        <FileText className="h-3 w-3" /> View
                      </a>
                    ) : (
                      <span className="text-[10px] text-red-400">Missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ src, name }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="h-10 w-10 rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-300 dark:text-stone-600">
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  // Build URL — photoPath is a relative server path like uploads/bulk_pass/5/photo.jpg
  const imgSrc = fileUrl(src);

  return (
    <img
      src={imgSrc}
      alt={name || "photo"}
      onError={() => setError(true)}
      className="h-10 w-10 rounded-xl object-cover bg-stone-100 dark:bg-white/5"
    />
  );
}

// ── Vehicles table ─────────────────────────────────────────────────────────────

// Document field → human label (order defines display order)
const VEHICLE_DOC_LABELS = {
  rc: "RC",
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  roadTax: "Road Tax",
  emission: "PUCC",
};

function VehicleDocLinks({ vehicle }) {
  // Prefer the full vehicleDocs map; fall back to the legacy single RC path.
  const docs = vehicle.vehicleDocs && typeof vehicle.vehicleDocs === "object"
    ? vehicle.vehicleDocs
    : vehicle.photoPath
    ? { rc: vehicle.photoPath }
    : {};

  const entries = Object.keys(VEHICLE_DOC_LABELS)
    .filter((k) => docs[k])
    .map((k) => ({ key: k, label: VEHICLE_DOC_LABELS[k], path: docs[k] }));

  if (entries.length === 0) {
    return <span className="text-stone-400 text-xs">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(({ key, label, path: p }) => (
        <a
          key={key}
          href={fileUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 transition"
        >
          <FileText className="h-3 w-3" /> {label}
        </a>
      ))}
    </div>
  );
}

function VehiclesTable({ vehicles }) {
  const [expanded, setExpanded] = useState(true);

  if (!vehicles?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-400 mb-3">
          <Car className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          No vehicles submitted
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
          Vehicles added by the applicant will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300 mb-3 hover:text-amber-600 dark:hover:text-amber-400 transition"
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? "Collapse" : "Expand"} vehicle list ({vehicles.length})
      </button>

      {expanded && (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100 dark:ring-white/[0.05]">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-stone-50/80 dark:bg-white/[0.03] border-b border-stone-100 dark:border-white/[0.06]">
                {["#", "Reg. Number", "Type", "Driver", "Aadhaar", "Mobile", "Documents"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => (
                <tr
                  key={v.id || idx}
                  className="border-b border-stone-50 dark:border-white/[0.03] hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors last:border-b-0"
                >
                  <td className="px-4 py-3 text-xs text-stone-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                    {v.vehicleNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {v.vehicleType || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                    {v.name || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {v.aadhaar ? `XXXX XXXX ${String(v.aadhaar).slice(-4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-400">
                    {v.mobile || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <VehicleDocLinks vehicle={v} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Status timeline ───────────────────────────────────────────────────────────

function StatusTimeline({ logs }) {
  if (!logs?.length) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500 py-4">
        No status history yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l-2 border-stone-100 dark:border-white/[0.07] ml-2 space-y-0">
      {logs.map((log, idx) => {
        const cfg = STATUS_CONFIG[log.status] || {
          dot: "bg-stone-400",
          label: log.status,
        };
        return (
          <li key={log.id || idx} className="ml-5 pb-6 last:pb-0">
            <span
              className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1f232d] ${cfg.dot}`}
            />
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StatusChip status={log.status} />
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {fmtDate(log.createdAt)}
              </span>
            </div>
            {log.remarks && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {log.remarks}
              </p>
            )}
            {log.changedByName && (
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                by {log.changedByName}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Uploads table ─────────────────────────────────────────────────────────────

function UploadsTable({ uploads }) {
  if (!uploads?.length) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500 py-2">
        No files uploaded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100 dark:ring-white/[0.05]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50/80 dark:bg-white/[0.03] border-b border-stone-100 dark:border-white/[0.06]">
            {["File Name", "Rows", "Uploaded At"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uploads.map((u, idx) => (
            <tr
              key={u.id || idx}
              className="border-b border-stone-50 dark:border-white/[0.03] last:border-b-0 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-4 py-3 font-medium text-stone-700 dark:text-stone-300">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-stone-400 shrink-0" />
                  {u.fileName || u.originalName || "—"}
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums font-semibold text-stone-700 dark:text-stone-300">
                {u.rowCount ?? "—"}
              </td>
              <td className="px-4 py-3 text-stone-500 dark:text-stone-400 whitespace-nowrap">
                {fmtDate(u.uploadedAt || u.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BulkPassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [downloading, setDownloading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [resending, setResending] = useState(false);

  const fetchBatch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBulkBatchDetail(id);
      setBatch(data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to load batch details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await downloadBulkPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${batch.refNo}_QR.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    fetchBatch();
  };

  const handleResendInvitation = async () => {
    setResending(true);
    try {
      await resendInvitation(id);
      toast.success("Invitation email resent to " + batch.applicantEmail);
      fetchBatch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setResending(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Loading batch details…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !batch) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`${cardShell} p-8 max-w-md w-full mx-4 text-center`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-500 mx-auto mb-4">
            <XCircle className="h-7 w-7" />
          </div>
          <p className="text-base font-bold text-stone-800 dark:text-stone-200 mb-2">
            Could not load batch
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
            {error || "Batch not found or you don't have permission to view it."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard/bulk_pass")}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 transition"
            >
              Back to List
            </button>
            <button
              onClick={fetchBatch}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { status } = batch;
  const persons = batch.persons || [];
  // Persons and vehicles are stored in the same table; vehicles carry a
  // vehicleNumber. Split them so each is displayed in its own section.
  const peopleRows = persons.filter((p) => !p.vehicleNumber);
  const vehicleRows = persons.filter((p) => !!p.vehicleNumber);
  const uploads = batch.uploads || [];
  const statusLogs = batch.statusLogs || [];

  return (
    <div className="h-full flex flex-col gap-5 overflow-auto py-2">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/bulk_pass")}
            className="flex items-center justify-center h-10 w-10 rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 transition shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                {batch.refNo || `Batch #${id}`}
              </h2>
              <StatusChip status={status} />
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Created {fmtDate(batch.createdAt)}
            </p>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={fetchBatch}
            title="Refresh"
            className="flex items-center justify-center h-10 w-10 rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {(status === "DRAFT" || status === "RETURNED_TO_APPLICANT") && (
            <button
              onClick={handleResendInvitation}
              disabled={resending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="h-4 w-4" />
              {resending ? "Sending…" : "Resend Invitation"}
            </button>
          )}

          {status === "COMPLETED" && batch.qrPdfPath && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading…" : "Download QR PDF"}
            </button>
          )}
        </div>
      </div>


      {/* ── Rejection reason banner ── */}
      {status === "REJECTED" && batch.rejectionReason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-50 dark:bg-red-900/10 ring-1 ring-red-200 dark:ring-red-800/30">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              Rejection Reason
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
              {batch.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* ── Return reason banner ── */}
      {status === "RETURNED_TO_APPLICANT" && batch.returnReason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 ring-1 ring-orange-200 dark:ring-orange-800/30">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
              Return Reason
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
              {batch.returnReason}
            </p>
          </div>
        </div>
      )}

      {/* ── Upload Link banner (DRAFT / RETURNED) ── */}
      {(status === "DRAFT" || status === "RETURNED_TO_APPLICANT") && batch.token && (
        <UploadLinkBanner
          tokenActive={batch.tokenActive}
          tokenExpiresAt={batch.tokenExpiresAt}
          linkValidityHours={batch.linkValidityHours}
          batchId={id}
          onResend={handleResendInvitation}
          resending={resending}
        />
      )}

      {/* ── Summary counts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Persons",
            value: batch.noOfPersons ?? persons.length,
            icon: <Users className="h-5 w-5" />,
            color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
          },
          {
            label: "Vehicles",
            value: batch.noOfVehicles ?? 0,
            icon: <Car className="h-5 w-5" />,
            color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
          },
          {
            label: "Files",
            value: uploads.length,
            icon: <FileText className="h-5 w-5" />,
            color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
          },
          {
            label: "Status Updates",
            value: statusLogs.length,
            icon: <Clock className="h-5 w-5" />,
            color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`${cardShell} px-5 py-4`}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
              >
                {icon}
              </div>
              <div>
                <p className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  {value ?? 0}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout: Intake details + Status timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Intake details — 2/3 width */}
        <div className={`${cardShell} p-6 lg:col-span-2`}>
          <SectionHeading
            icon={<FileText className="h-4 w-4" />}
            title="Intake Details"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <ReadField label="Reference Number" value={batch.refNo} mono />
            <ReadField
              label="Department"
              value={batch.departmentName || batch.department}
            />
            <ReadField
              label="Visitor Type"
              value={visitorTypeLabel(batch.visitorType)}
            />
            <ReadField label="Company / Organisation" value={batch.companyName} />
            <ReadField label="Applicant Email" value={batch.applicantEmail} />
            <ReadField
              label="Applicant Mobile"
              value={batch.applicantMobile ? `+91 ${batch.applicantMobile}` : null}
            />
            <ReadField
              label="No. of Persons"
              value={
                batch.noOfPersons !== null && batch.noOfPersons !== undefined
                  ? String(batch.noOfPersons)
                  : null
              }
            />
            <ReadField
              label="No. of Vehicles"
              value={
                batch.noOfVehicles !== null && batch.noOfVehicles !== undefined
                  ? String(batch.noOfVehicles)
                  : null
              }
            />
            <ReadField label="Payment Mode" value={batch.paymentMode} />
            <ReadField
              label="Work Order Required"
              value={
                batch.workOrderRequired === true ||
                batch.workOrderRequired === "yes"
                  ? "Yes"
                  : batch.workOrderRequired === false ||
                    batch.workOrderRequired === "no"
                  ? "No"
                  : null
              }
            />
            <ReadField label="Ref. Doc No." value={batch.refDocNo} />
            <ReadField
              label="Validity From"
              value={fmtDate(batch.validityFrom)}
            />
            <ReadField
              label="Validity Upto"
              value={fmtDate(batch.validityUpto)}
            />
            <ReadField label="Created At" value={fmtDate(batch.createdAt)} />
            <div className="sm:col-span-2 lg:col-span-3">
              <ReadField
                label="Purpose of Visit"
                value={batch.purpose || batch.purposeOfVisit}
              />
            </div>
            {batch.remarks && (
              <div className="sm:col-span-2 lg:col-span-3">
                <ReadField label="Remarks" value={batch.remarks} />
              </div>
            )}
          </div>
        </div>

        {/* Status timeline — 1/3 width */}
        <div className={`${cardShell} p-6`}>
          <SectionHeading
            icon={<Clock className="h-4 w-4" />}
            title="Status History"
          />
          <StatusTimeline logs={statusLogs} />
        </div>
      </div>

      {/* ── Uploaded files ── */}
      <div className={`${cardShell} p-6`}>
        <SectionHeading
          icon={<FileText className="h-4 w-4" />}
          title="Uploaded Files"
        />
        <UploadsTable uploads={uploads} />
      </div>

      {/* ── Person list ── */}
      <div className={`${cardShell} p-6`}>
        <SectionHeading
          icon={<Users className="h-4 w-4" />}
          title="Person List"
          action={
            peopleRows.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {peopleRows.length} person{peopleRows.length !== 1 ? "s" : ""}
              </span>
            ) : null
          }
        />
        <PersonsTable persons={peopleRows} />
      </div>

      {/* ── Vehicle list ── */}
      <div className={`${cardShell} p-6`}>
        <SectionHeading
          icon={<Car className="h-4 w-4" />}
          title="Vehicle List"
          action={
            vehicleRows.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {vehicleRows.length} vehicle{vehicleRows.length !== 1 ? "s" : ""}
              </span>
            ) : null
          }
        />
        <VehiclesTable vehicles={vehicleRows} />
      </div>
    </div>
  );
}
