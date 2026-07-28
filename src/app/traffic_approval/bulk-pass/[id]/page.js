"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle, XCircle, X, Download, RotateCcw,
  Users, FileText, Car, ImageIcon, ChevronDown, ChevronUp, Clock,
  CheckCircle2, AlertCircle, Shield, Eye, Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBulkBatchDetail,
  approvePersonInBatch,
  rejectPersonInBatch,
  finalizeBulkBatch,
  rejectBulkBatch,
  returnBulkBatchByTraffic,
  downloadBulkPdf,
  downloadBulkPdfAdmin,
  resendBulkPassEmail,
  fileUrl,
} from "@/lib/bulkPassApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});
const fmtDate  = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : fmt.format(d); };
const fmtShort = (v) => { if (!v) return "—"; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d); };
const visitorLabel = (v) => v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const STATUS_CFG = {
  DRAFT:                 { label: "Sent to User",  cls: "bg-stone-100 text-stone-600 border border-stone-300",    dot: "bg-stone-400" },
  UNDER_REVIEW:          { label: "Pending",        cls: "bg-amber-100 text-amber-700 border border-amber-300",    dot: "bg-amber-500" },
  RETURNED_TO_APPLICANT: { label: "Returned",       cls: "bg-orange-100 text-orange-700 border border-orange-300", dot: "bg-orange-500" },
  REJECTED:              { label: "Rejected",       cls: "bg-red-100 text-red-700 border border-red-300",          dot: "bg-red-500" },
  COMPLETED:             { label: "Approved",       cls: "bg-emerald-100 text-emerald-700 border border-emerald-300", dot: "bg-emerald-500" },
};

const PERSON_STATUS_CFG = {
  PENDING:  { label: "Pending",  cls: "bg-amber-100 text-amber-700 border border-amber-300",    dot: "bg-amber-400" },
  APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border border-emerald-300", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700 border border-red-300",          dot: "bg-red-500" },
};

function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] || { label: status || "Unknown", cls: "bg-stone-100 text-stone-500", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
    </span>
  );
}

function PersonStatusChip({ status }) {
  const cfg = PERSON_STATUS_CFG[status] || PERSON_STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

// ── Reason modal (shared for Reject-person, Reject-batch, Return) ─────────────

function ReasonModal({ title, label, placeholder, confirmLabel, confirmClass, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please enter a reason."); return; }
    setLoading(true);
    try { await onConfirm(reason.trim()); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition"><X className="h-5 w-5" /></button>
        </div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
        />
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition ${confirmClass}`}>
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Approval summary bar ──────────────────────────────────────────────────────

function ApprovalSummaryBar({ persons, canFinalize, onFinalize, finalizing }) {
  const total    = persons.length;
  const approved = persons.filter((p) => p.approvalStatus === "APPROVED").length;
  const rejected = persons.filter((p) => p.approvalStatus === "REJECTED").length;
  const pending  = persons.filter((p) => !p.approvalStatus || p.approvalStatus === "PENDING").length;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 rounded-xl bg-slate-50 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm">
        <Shield className="h-4 w-4 text-slate-500" />
        <span className="font-semibold text-slate-700">Individual Review Progress</span>
      </div>
      <div className="flex flex-wrap gap-3 ml-auto items-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{pending} Pending
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{approved} Approved
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{rejected} Rejected
        </span>
        <span className="text-xs text-slate-400 font-mono">{approved + rejected}/{total} actioned</span>
        {canFinalize && pending === 0 && approved > 0 && (
          <button
            onClick={onFinalize}
            disabled={finalizing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <CheckCircle className="h-4 w-4" />
            {finalizing ? "Generating passes…" : "Finalize & Generate Passes"}
          </button>
        )}
        {canFinalize && pending === 0 && approved === 0 && (
          <span className="text-xs text-red-500 font-semibold">All rejected — use Reject Batch to close</span>
        )}
      </div>
    </div>
  );
}

// ── Persons section with per-person approve / reject ─────────────────────────

const DOC_LABELS = {
  rc: "RC", insurance: "Insurance", fitness: "Fitness",
  permit: "Permit", roadTax: "Road Tax", emission: "PUCC",
};

function PersonsSection({ persons, batchId, canApprove, isUnderReview, onPersonActioned }) {
  const [expanded, setExpanded]         = useState(true);
  const [lightboxSrc, setLightboxSrc]   = useState(null);
  const [showDetails, setShowDetails]   = useState(true);
  const [actioningId, setActioningId]   = useState(null); // personId being actioned
  const [rejectModal, setRejectModal]   = useState(null); // personId to reject

  const peopleRows  = (persons || []).filter((p) => !p.vehicleNumber);
  const vehicleRows = (persons || []).filter((p) => !!p.vehicleNumber);

  const handleApprovePerson = async (personId) => {
    setActioningId(personId);
    try {
      await approvePersonInBatch(batchId, personId);
      toast.success("Person approved.");
      onPersonActioned();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve person.");
    } finally { setActioningId(null); }
  };

  const handleRejectPerson = async (reason) => {
    const personId = rejectModal;
    try {
      await rejectPersonInBatch(batchId, personId, reason);
      toast.success("Person rejected.");
      setRejectModal(null);
      onPersonActioned();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject person.");
      throw err;
    }
  };

  if (!persons?.length) {
    return <p className="text-sm text-slate-400 py-3">No persons or vehicles submitted yet.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Person table with individual actions ── */}
      {peopleRows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-600 transition">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Persons ({peopleRows.length})
            </button>
          </div>
          {expanded && (
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["#", "Photo", "Name", "Aadhaar", "DOB", "Mobile", "Aadhaar Card", "Status", ...(isUnderReview && canApprove ? ["Action"] : [])].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peopleRows.map((p, idx) => {
                    const photoSrc = fileUrl(p.photoPath);
                    const personStatus = p.approvalStatus || "PENDING";
                    const isActioning = actioningId === p.id;
                    const alreadyActioned = personStatus !== "PENDING";
                    return (
                      <tr key={p.id || idx} className={`border-b border-slate-50 last:border-b-0 ${personStatus === "APPROVED" ? "bg-emerald-50/30" : personStatus === "REJECTED" ? "bg-red-50/30" : ""}`}>
                        <td className="px-3 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-3">
                          {photoSrc
                            ? <img src={photoSrc} alt={p.name} onClick={() => setLightboxSrc(photoSrc)} className="h-10 w-10 rounded-xl object-cover cursor-pointer ring-1 ring-slate-200 hover:ring-amber-400 transition" onError={(e) => { e.target.style.display = "none"; }} />
                            : <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{p.name || "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.aadhaar ? `XXXX XXXX ${String(p.aadhaar).slice(-4)}` : "—"}</td>
                        <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtShort(p.dob)}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.mobile || "—"}</td>
                        <td className="px-3 py-3">
                          {p.aadhaarCardPath
                            ? <a href={fileUrl(p.aadhaarCardPath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><FileText className="h-3 w-3" /> View</a>
                            : <span className="text-[10px] text-red-400 font-semibold">Missing</span>}
                        </td>
                        <td className="px-3 py-3"><PersonStatusChip status={personStatus} /></td>
                        {isUnderReview && canApprove && (
                          <td className="px-3 py-3">
                            {alreadyActioned ? (
                              personStatus === "REJECTED" && p.approvalReason
                                ? <span className="text-[10px] text-slate-400 italic max-w-[140px] block truncate" title={p.approvalReason}>{p.approvalReason}</span>
                                : <span className="text-[10px] text-slate-400">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleApprovePerson(p.id)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  {isActioning ? "…" : <><CheckCircle2 className="h-3 w-3" /> Approve</>}
                                </button>
                                <button
                                  onClick={() => setRejectModal(p.id)}
                                  disabled={isActioning}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  <XCircle className="h-3 w-3" /> Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Vehicle rows (display only — no individual approval for vehicles) ── */}
      {vehicleRows.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
            <Car className="h-4 w-4" /> Vehicles ({vehicleRows.length})
          </p>
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["#", "Reg. Number", "Type", "Driver", "Aadhaar", "Mobile", "Documents"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleRows.map((v, idx) => {
                  const docMap = v.vehicleDocs && typeof v.vehicleDocs === "object" ? v.vehicleDocs : v.photoPath ? { rc: v.photoPath } : {};
                  const docs = Object.keys(DOC_LABELS).filter((k) => docMap[k]).map((k) => ({ label: DOC_LABELS[k], path: docMap[k] }));
                  return (
                    <tr key={v.id || idx} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                      <td className="px-3 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-800">{v.vehicleNumber || "—"}</td>
                      <td className="px-3 py-3 text-slate-600">{v.vehicleType || "—"}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{v.name || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{v.aadhaar ? `XXXX XXXX ${String(v.aadhaar).slice(-4)}` : "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{v.mobile || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {docs.length > 0
                            ? docs.map((doc, di) => (
                                <a key={di} href={fileUrl(doc.path)} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition">
                                  <FileText className="h-3 w-3" />{doc.label}
                                </a>
                              ))
                            : <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Photo lightbox ── */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => setLightboxSrc(null)}>
          <div className="relative max-w-3xl max-h-[90vh] mx-4">
            <img src={lightboxSrc} alt="Enlarged" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg hover:bg-red-50 hover:text-red-600 transition">
              <X className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-white/60 mt-3">Click anywhere to close</p>
          </div>
        </div>
      )}

      {/* ── Reject person modal ── */}
      {rejectModal !== null && (
        <ReasonModal
          title="Reject Person"
          label="Rejection Reason"
          placeholder="State why this person is being rejected…"
          confirmLabel="Reject Person"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleRejectPerson}
          onClose={() => setRejectModal(null)}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrafficBulkPassDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [batch, setBatch]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [resendingPass, setResendingPass] = useState(false);
  const [modal, setModal]         = useState(null); // "reject-batch" | "return" | null
  const [user, setUser]           = useState(null);

  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);

  const canApprove = Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;

  const fetchBatch = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getBulkBatchDetail(id)
      .then((data) => setBatch(data))
      .catch(() => toast.error("Failed to load batch details."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await finalizeBulkBatch(id);
      toast.success(`Batch ${batch.refNo} finalized — passes generated for approved persons.`);
      router.push("/traffic_approval/bulk-pass");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to finalize batch.");
    } finally { setFinalizing(false); }
  };

  const handleRejectBatch = async (reason) => {
    try {
      await rejectBulkBatch(id, reason);
      toast.success(`Batch ${batch.refNo} rejected.`);
      router.push("/traffic_approval/bulk-pass");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject batch.");
      throw err;
    }
  };

  const handleReturn = async (reason) => {
    try {
      await returnBulkBatchByTraffic(id, reason);
      toast.success(`Batch ${batch.refNo} returned to applicant for revision.`);
      router.push("/traffic_approval/bulk-pass");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to return batch.");
      throw err;
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingId(id);
    try {
      // Traffic dept uses the admin-service proxy; it works for any traffic user
      const blob = await downloadBulkPdfAdmin(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${batch.refNo}_QR.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download PDF.");
    } finally { setDownloadingId(null); }
  };

  const handleViewPass = () => {
    // Open the public pass view page in a new tab
    if (batch?.id) {
      window.open(`/bulk_pass_approved/${batch.id}`, "_blank");
    }
  };

  const handleResendPass = async () => {
    setResendingPass(true);
    try {
      await resendBulkPassEmail(id);
      toast.success(`Pass email resent to ${batch.applicantEmail}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend pass email.");
    } finally { setResendingPass(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20 text-slate-500">
        Batch not found.{" "}
        <button onClick={() => router.push("/traffic_approval/bulk-pass")} className="text-orange-600 font-semibold hover:underline">Go back to queue</button>
      </div>
    );
  }

  const isUnderReview = batch.status === "UNDER_REVIEW";
  const isCompleted   = batch.status === "COMPLETED";
  const persons       = batch.persons || [];
  const uploads       = batch.uploads || [];
  const statusLogs    = batch.statusLogs || [];

  // Compute pending count to decide whether Finalize button should show
  const pendingCount  = persons.filter((p) => !p.approvalStatus || p.approvalStatus === "PENDING").length;
  const approvedCount = persons.filter((p) => p.approvalStatus === "APPROVED").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/traffic_approval/bulk-pass")}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800 font-mono">{batch.refNo}</h2>
              <StatusChip status={batch.status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{batch.companyName} · Created {fmtDate(batch.createdAt)}</p>
          </div>
        </div>

        {/* Batch-level actions */}
        <div className="flex flex-wrap gap-2">
          {isUnderReview && canApprove && (
            <>
              <button onClick={() => setModal("return")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 transition">
                <RotateCcw className="h-4 w-4" /> Return for Revision
              </button>
              <button onClick={() => setModal("reject-batch")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 transition">
                <XCircle className="h-4 w-4" /> Reject Entire Batch
              </button>
            </>
          )}
          {isCompleted && (
            <>
              <button onClick={handleViewPass}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 transition">
                <Eye className="h-4 w-4" /> View Pass
              </button>
              <button onClick={handleDownloadPdf} disabled={!!downloadingId}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <Download className="h-4 w-4" />
                {downloadingId ? "Downloading…" : "Download Pass PDF"}
              </button>
              <button onClick={handleResendPass} disabled={resendingPass}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-700 bg-violet-100 hover:bg-violet-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <Mail className="h-4 w-4" />
                {resendingPass ? "Sending…" : "Resend Pass Email"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Return reason banner */}
      {batch.returnReason && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-orange-50 ring-1 ring-orange-200">
          <RotateCcw className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-700">Previously Returned</p>
            <p className="text-sm text-orange-600 mt-0.5">{batch.returnReason}</p>
          </div>
        </div>
      )}

      {/* Individual approval progress bar */}
      {isUnderReview && persons.filter((p) => !p.vehicleNumber).length > 0 && (
        <ApprovalSummaryBar
          persons={persons.filter((p) => !p.vehicleNumber)}
          canFinalize={canApprove}
          onFinalize={handleFinalize}
          finalizing={finalizing}
        />
      )}

      {/* Info banner: how individual approval works */}
      {isUnderReview && canApprove && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-sky-50 ring-1 ring-sky-200">
          <AlertCircle className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-700 leading-relaxed">
            <span className="font-bold">Individual review mode:</span> Approve or reject each person independently.
            Passes are generated only for approved persons. Once all persons are actioned, click{" "}
            <span className="font-bold">Finalize &amp; Generate Passes</span> to complete the batch.
            Use <span className="font-bold">Reject Entire Batch</span> only when the whole submission is invalid.
          </p>
        </div>
      )}

      {/* Two-column: intake details + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><FileText className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Intake Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <Field label="Reference No." value={batch.refNo} />
            <Field label="Department" value={batch.departmentName} />
            <Field label="Visitor Type" value={visitorLabel(batch.visitorType)} />
            <Field label="Company / Organisation" value={batch.companyName} />
            <Field label="Applicant Email" value={batch.applicantEmail} />
            <Field label="Applicant Mobile" value={batch.applicantMobile ? "+91 " + batch.applicantMobile : null} />
            <Field label="No. of Persons" value={batch.noOfPersons != null ? String(batch.noOfPersons) : null} />
            <Field label="No. of Vehicles" value={batch.noOfVehicles != null ? String(batch.noOfVehicles) : null} />
            <Field label="Payment Mode" value={batch.paymentMode} />
            <Field label="Validity From" value={fmtDate(batch.validityFrom)} />
            <Field label="Validity Upto" value={fmtDate(batch.validityUpto)} />
            <Field label="Created At" value={fmtDate(batch.createdAt)} />
            <div className="sm:col-span-2 lg:col-span-3"><Field label="Purpose of Visit" value={batch.purpose || batch.purposeOfVisit} /></div>
            {batch.remarks && <div className="sm:col-span-2 lg:col-span-3"><Field label="Remarks" value={batch.remarks} /></div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><Clock className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Status History</h3>
          </div>
          {statusLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No history yet.</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {statusLogs.map((entry, i) => {
                const cfg = STATUS_CFG[entry.status] || { dot: "bg-slate-400" };
                return (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                    <StatusChip status={entry.status} />
                    {entry.remarks && <p className="text-xs text-slate-500 mt-1">{entry.remarks}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(entry.createdAt)}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><FileText className="h-4 w-4" /></span>
            <h3 className="text-base font-bold text-slate-800">Uploaded Files</h3>
          </div>
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["File Name", "Rows", "Uploaded At"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploads.map((u, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-700"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400 shrink-0" />{u.fileName || "—"}</div></td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{u.rowCount ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(u.uploadedAt || u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Persons & Vehicles with individual approve/reject */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><Users className="h-4 w-4" /></span>
          <h3 className="text-base font-bold text-slate-800">
            Persons &amp; Vehicles
            <span className="ml-2 text-xs font-semibold text-slate-400">({persons.length} entries)</span>
          </h3>
        </div>
        <PersonsSection
          persons={persons}
          batchId={id}
          canApprove={canApprove}
          isUnderReview={isUnderReview}
          onPersonActioned={fetchBatch}
        />
      </div>

      {/* Modals */}
      {modal === "reject-batch" && (
        <ReasonModal
          title="Reject Entire Batch"
          label="Rejection Reason"
          placeholder="Describe why this entire batch is being rejected…"
          confirmLabel="Reject Entire Batch"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleRejectBatch}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "return" && (
        <ReasonModal
          title="Return for Revision"
          label="Return Remarks"
          placeholder="Describe what needs to be corrected — the applicant will see this message…"
          confirmLabel="Return to Applicant"
          confirmClass="bg-orange-500 hover:bg-orange-600"
          onConfirm={handleReturn}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
