"use client";

// Detail page within the /admin layout — navigates back to /admin/bulk_pass.

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Users, FileText, Clock, Send, RotateCcw, Download,
  XCircle, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp, Car, ImageIcon, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { getBulkBatchDetail, returnToApplicant, resendInvitation, downloadBulkPdf, fileUrl, getChildSubmissions } from "@/lib/bulkPassApi";

const BASE = "/admin/bulk_pass";

const STATUS_CONFIG = {
  DRAFT:                 { label: "Sent to User",          chip: "bg-stone-100 text-stone-600 border border-stone-300", dot: "bg-stone-400" },

  UNDER_REVIEW:          { label: "Pending",               chip: "bg-amber-100 text-amber-700 border border-amber-300", dot: "bg-amber-500" },
  RETURNED_TO_APPLICANT: { label: "Returned",              chip: "bg-orange-100 text-orange-700 border border-orange-300", dot: "bg-orange-500" },
  REJECTED:              { label: "Rejected",              chip: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" },
  COMPLETED:             { label: "Approved",              chip: "bg-emerald-100 text-emerald-700 border border-emerald-300", dot: "bg-emerald-500" },
};

const fmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
const fmtDate = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : fmt.format(d); };
const fmtDateShort = (v) => { if (!v) return "—"; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d); };
const visitorTypeLabel = (v) => v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || "Unknown", chip: "bg-stone-100 text-stone-500 border border-stone-200", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${cfg.chip}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />{cfg.label}
    </span>
  );
}

function ReadField({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function UploadLinkBanner({ tokenActive, tokenExpiresAt, onResend, resending }) {
  const isExpired = tokenExpiresAt && new Date(tokenExpiresAt).getTime() < Date.now();
  // canResend: link is active OR expired by time (admin can refresh the window).
  // If tokenActive=false but NOT time-expired the applicant already submitted —
  // resending an invitation makes no sense in that case.
  const canResend = tokenActive || isExpired;
  return (
    <div className={`rounded-2xl ring-1 p-5 ${isExpired || !tokenActive ? "bg-red-50 ring-red-200" : "bg-sky-50 ring-sky-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Send className={`h-4 w-4 shrink-0 ${isExpired || !tokenActive ? "text-red-500" : "text-sky-600"}`} />
        <p className={`text-sm font-bold ${isExpired || !tokenActive ? "text-red-700" : "text-sky-700"}`}>
          Applicant Upload Link
          {isExpired && <span className="ml-2 text-xs font-normal text-red-500">· Link expired</span>}
          {!tokenActive && !isExpired && <span className="ml-2 text-xs font-normal text-red-500">· Submitted</span>}
          {tokenExpiresAt && !isExpired && tokenActive && (
            <span className="ml-2 text-xs font-normal text-sky-500">· expires {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(tokenExpiresAt))}</span>
          )}
        </p>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {isExpired
          ? "The applicant\'s upload link has expired. Resend the invitation to issue a fresh link."
          : !tokenActive
          ? "The applicant has already submitted. Use Return to Applicant if corrections are needed."
          : "If the applicant hasn\'t received the invitation email, resend it through the application."}
      </p>
      {canResend && (
        <button onClick={onResend} disabled={resending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition">
          <Send className="h-4 w-4" />{resending ? "Sending…" : "Resend Invitation Email"}
        </button>
      )}
    </div>
  );
}


function ReturnModal({ batchId, refNo, onClose, onSuccess }) {  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please enter a return reason."); return; }
    setLoading(true);
    try { await returnToApplicant(batchId, reason.trim()); toast.success(`Batch ${refNo} returned.`); onSuccess(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed."); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Return to Applicant</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Batch: <span className="font-semibold">{refNo}</span></p>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Return Reason <span className="text-red-500">*</span></label>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe what needs to be corrected..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-400/50 resize-none" />
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition">
            {loading ? "Returning…" : "Return to Applicant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoThumb({ src, name }) {
  const [error, setError] = useState(false);
  if (!src || error) return <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon className="h-5 w-5" /></div>;
  const imgSrc = fileUrl(src);
  return <img src={imgSrc} alt={name || "photo"} onError={() => setError(true)} className="h-10 w-10 rounded-xl object-cover bg-slate-100" />;
}

// Document field → human label (order defines display order)
const VEHICLE_DOC_LABELS = {
  rc: "RC",
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  roadTax: "Road Tax",
  emission: "PUCC",
  driverAadhaarCard: "Aadhaar",
  driverLicense: "DL",
};

function VehicleDocLinks({ vehicle }) {
  const docs = vehicle.vehicleDocs && typeof vehicle.vehicleDocs === "object"
    ? vehicle.vehicleDocs
    : vehicle.photoPath
    ? { rc: vehicle.photoPath }
    : {};

  const entries = Object.keys(VEHICLE_DOC_LABELS)
    .filter((k) => docs[k])
    .map((k) => ({ key: k, label: VEHICLE_DOC_LABELS[k], path: docs[k] }));

  if (entries.length === 0) return <span className="text-slate-400 text-xs">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(({ key, label, path: p }) => (
        <a
          key={key}
          href={fileUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
        >
          <FileText className="h-3 w-3" /> {label}
        </a>
      ))}
    </div>
  );
}

function PersonsTable({ persons }) {
  const [expanded, setExpanded] = useState(true);
  if (!persons?.length) return <p className="text-sm text-slate-400 py-4">No persons uploaded yet.</p>;
  return (
    <div>
      <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3 hover:text-amber-600 transition">
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? "Collapse" : "Expand"} person list ({persons.length})
      </button>
      {expanded && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["#", "Photo", "Name", "Aadhaar", "DOB", "Mobile", "Aadhaar Card"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {persons.map((p, idx) => (
                <tr key={p.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-b-0">
                  <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3"><PhotoThumb src={p.photoPath} name={p.name} /></td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{p.name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.aadhaar ? `XXXX XXXX ${String(p.aadhaar).slice(-4)}` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDateShort(p.dob)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.mobile || "—"}</td>
                  <td className="px-4 py-3">
                    {p.aadhaarCardPath
                      ? <a href={fileUrl(p.aadhaarCardPath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"><FileText className="h-3 w-3" /> View</a>
                      : <span className="text-[10px] text-red-400">Missing</span>}
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

function VehiclesTable({ vehicles }) {
  const [expanded, setExpanded] = useState(true);
  if (!vehicles?.length) return <p className="text-sm text-slate-400 py-4">No vehicles submitted.</p>;
  return (
    <div>
      <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3 hover:text-amber-600 transition">
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {expanded ? "Collapse" : "Expand"} vehicle list ({vehicles.length})
      </button>
      {expanded && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["#", "Reg. Number", "Type", "Driver", "Aadhaar", "Mobile", "DL Number", "Documents"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => (
                <tr key={v.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-b-0">
                  <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{v.vehicleNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{v.vehicleType || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{v.name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{v.aadhaar ? `XXXX XXXX ${String(v.aadhaar).slice(-4)}` : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.mobile || "—"}</td>
                  <td className="px-4 py-3">
                    {v.driverLicenseNumber
                      ? <span className="font-mono text-xs font-semibold text-slate-700">{v.driverLicenseNumber}</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><VehicleDocLinks vehicle={v} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminBulkPassDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [resending, setResending] = useState(false);
  const [user, setUser] = useState(null);

  // Child submissions state (Multiple Pass Submissions Feature)
  const [childSubmissions, setChildSubmissions] = useState([]);
  const [childSubmissionsLoading, setChildSubmissionsLoading] = useState(false);

  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);

  // Only departmentId === 9 (Traffic) can approve/reject/return
  const canApprove = Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;

  const fetchBatch = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setBatch(await getBulkBatchDetail(id)); }
    catch (err) { setError(err?.response?.data?.message || "Failed to load batch details."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  // Fetch child submissions if multiple submissions are enabled
  useEffect(() => {
    const fetchChildSubmissions = async () => {
      if (!batch?.id || !batch.multipleSubmissionsEnabled) {
        setChildSubmissions([]);
        return;
      }
      
      setChildSubmissionsLoading(true);
      try {
        const res = await getChildSubmissions(batch.id);
        if (res?.success) {
          setChildSubmissions(res.submissions || []);
        } else {
          setChildSubmissions([]);
        }
      } catch (err) {
        console.error("Failed to fetch child submissions:", err);
        setChildSubmissions([]);
      } finally {
        setChildSubmissionsLoading(false);
      }
    };
    
    fetchChildSubmissions();
  }, [batch?.id, batch?.multipleSubmissionsEnabled]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await downloadBulkPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${batch.refNo}_QR.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to download PDF."); }
    finally { setDownloading(false); }
  };

  const handleResendInvitation = async () => {
    setResending(true);
    try { await resendInvitation(id); toast.success("Invitation email resent to " + batch.applicantEmail); fetchBatch(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to resend invitation."); }
    finally { setResending(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !batch) return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full mx-4 text-center">
        <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-base font-bold text-slate-800 mb-2">Could not load batch</p>
        <p className="text-sm text-slate-500 mb-5">{error || "Batch not found."}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push(BASE)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Back to List</button>
          <button onClick={fetchBatch} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition">Retry</button>
        </div>
      </div>
    </div>
  );

  const { status } = batch;
  const persons = batch.persons || [];
  const vehicles = batch.vehicles || persons.filter((p) => !!p.vehicleNumber);
  const peopleRows = persons.filter((p) => !p.vehicleNumber);
  const uploads = batch.uploads || [];
  const statusLogs = batch.statusLogs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(BASE)} className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800 font-mono">{batch.refNo || `Batch #${id}`}</h2>
              <StatusChip status={status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Created {fmtDate(batch.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={fetchBatch} title="Refresh" className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          {status === "UNDER_REVIEW" && canApprove && (
            <button onClick={() => setShowReturnModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 transition">
              <RotateCcw className="h-4 w-4" />Return to Applicant
            </button>
          )}
          {status === "COMPLETED" && batch.qrPdfPath && (
            <button onClick={handleDownloadPdf} disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition">
              <Download className="h-4 w-4" />{downloading ? "Downloading…" : "Download QR PDF"}
            </button>
          )}
          {(status === "DRAFT" || status === "RETURNED_TO_APPLICANT") && (
            <button onClick={handleResendInvitation} disabled={resending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 disabled:opacity-50 transition">
              <Send className="h-4 w-4" />{resending ? "Sending…" : "Resend Invitation"}
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {status === "REJECTED" && batch.rejectionReason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-red-50 ring-1 ring-red-200">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Rejection Reason</p>
            <p className="text-sm text-red-600 mt-0.5">{batch.rejectionReason}</p>
          </div>
        </div>
      )}
      {status === "RETURNED_TO_APPLICANT" && batch.returnReason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-orange-50 ring-1 ring-orange-200">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-700">Return Reason</p>
            <p className="text-sm text-orange-600 mt-0.5">{batch.returnReason}</p>
          </div>
        </div>
      )}

      {/* Upload link (DRAFT / RETURNED) */}
      {(status === "DRAFT" || status === "RETURNED_TO_APPLICANT") && batch.token && (
        <UploadLinkBanner
          tokenActive={batch.tokenActive}
          tokenExpiresAt={batch.tokenExpiresAt}
          onResend={handleResendInvitation}
          resending={resending}
        />
      )}

      {/* Child Submissions (Multiple Pass Submissions Feature) */}
      {batch.multipleSubmissionsEnabled && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><RefreshCw className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Submission History</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            This batch allows multiple submissions. Below are all submissions made so far.
          </p>
          
          {childSubmissionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            </div>
          ) : childSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No submissions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                The applicant will receive the upload link via email. Submissions will appear here after they upload their first batch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Submission #", "Reference No", "Persons", "Vehicles", "Status", "Submitted Date", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {childSubmissions.map((submission, idx) => {
                    const submissionStatus = submission.status || "UNKNOWN";
                    const statusConfig = STATUS_CONFIG[submissionStatus] || { 
                      label: submissionStatus, 
                      chip: "bg-stone-100 text-stone-500 border border-stone-200", 
                      dot: "bg-stone-400" 
                    };
                    return (
                      <tr key={submission.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-b-0">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">{submission.submissionNumber || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">{submission.refNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">{submission.personsCount ?? 0}</td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">{submission.vehiclesCount ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.chip}`}>
                            <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(submission.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/admin/bulk_pass/${submission.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">Total Submissions: {childSubmissions.length}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Persons (declared)", value: batch.noOfPersons ?? 0, icon: <Users className="h-5 w-5" />, color: "text-blue-500 bg-blue-100" },
          { label: "Vehicles (declared)", value: batch.noOfVehicles ?? 0, icon: <Car className="h-5 w-5" />, color: "text-purple-500 bg-purple-100" },
          { label: "Persons Uploaded", value: peopleRows.length, icon: <Users className="h-5 w-5" />, color: "text-emerald-500 bg-emerald-100" },
          { label: "Status Updates", value: statusLogs.length, icon: <Clock className="h-5 w-5" />, color: "text-amber-500 bg-amber-100" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>{icon}</div>
              <div>
                <p className="text-xl font-bold text-slate-800 tabular-nums">{value ?? 0}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><FileText className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Intake Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <ReadField label="Reference Number" value={batch.refNo} mono />
            <ReadField label="Department" value={batch.departmentName || batch.department} />
            <ReadField label="Visitor Type" value={visitorTypeLabel(batch.visitorType)} />
            <ReadField label="Company / Organisation" value={batch.companyName} />
            <ReadField label="Applicant Email" value={batch.applicantEmail} />
            <ReadField label="Applicant Mobile" value={batch.applicantMobile ? `+91 ${batch.applicantMobile}` : null} />
            <ReadField label="No. of Persons" value={batch.noOfPersons !== null && batch.noOfPersons !== undefined ? String(batch.noOfPersons) : null} />
            <ReadField label="No. of Vehicles" value={batch.noOfVehicles !== null && batch.noOfVehicles !== undefined ? String(batch.noOfVehicles) : null} />
            <ReadField label="Payment Mode" value={batch.paymentMode} />
            <ReadField label="Work Order Required" value={batch.workOrderRequired === true || batch.workOrderRequired === "yes" ? "Yes" : "No"} />
            <ReadField label="Validity From" value={fmtDate(batch.validityFrom)} />
            <ReadField label="Validity Upto" value={fmtDate(batch.validityUpto)} />
            <div className="sm:col-span-2 lg:col-span-3"><ReadField label="Purpose of Visit" value={batch.purpose || batch.purposeOfVisit} /></div>
            {batch.remarks && <div className="sm:col-span-2 lg:col-span-3"><ReadField label="Remarks" value={batch.remarks} /></div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><Clock className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Status History</h3>
          </div>
          {!statusLogs.length ? (
            <p className="text-sm text-slate-400 py-4">No status history yet.</p>
          ) : (
            <ol className="relative border-l-2 border-slate-100 ml-2 space-y-0">
              {statusLogs.map((log, idx) => {
                const cfg = STATUS_CONFIG[log.status] || { dot: "bg-slate-400" };
                return (
                  <li key={log.id || idx} className="ml-5 pb-6 last:pb-0">
                    <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${cfg.dot}`} />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusChip status={log.status} />
                      <span className="text-xs text-slate-400">{fmtDate(log.createdAt)}</span>
                    </div>
                    {log.remarks && <p className="text-xs text-slate-500 mt-1">{log.remarks}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Persons */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><Users className="h-4 w-4" /></span>
          <h3 className="text-base font-bold text-slate-800">Person List</h3>
        </div>
        <PersonsTable persons={peopleRows} />
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-purple-100 text-purple-600"><Car className="h-4 w-4" /></span>
          <h3 className="text-base font-bold text-slate-800">Vehicle List</h3>
        </div>
        <VehiclesTable vehicles={vehicles} />
      </div>

      {showReturnModal && (
        <ReturnModal batchId={id} refNo={batch.refNo}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => { setShowReturnModal(false); fetchBatch(); }} />
      )}
    </div>
  );
}
