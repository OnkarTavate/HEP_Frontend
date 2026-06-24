"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle, XCircle, X, Download, RotateCcw,
  Users, FileText, Car, ImageIcon, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBulkBatchDetail,
  approveBulkBatch,
  rejectBulkBatch,
  returnBulkBatchByTraffic,
  downloadBulkPdf,
  fileUrl,
} from "@/lib/bulkPassApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});
const fmtDate = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : fmt.format(d); };
const fmtDateShort = (v) => { if (!v) return "—"; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d); };
const visitorLabel = (v) => v ? v.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const STATUS_CONFIG = {
  DRAFT:                 { label: "Sent to User",        cls: "bg-stone-100 text-stone-600 border border-stone-300", dot: "bg-stone-400" },

  UNDER_REVIEW:          { label: "Pending",             cls: "bg-amber-100 text-amber-700 border border-amber-300", dot: "bg-amber-500" },
  RETURNED_TO_APPLICANT: { label: "Returned",            cls: "bg-orange-100 text-orange-700 border border-orange-300", dot: "bg-orange-500" },
  REJECTED:              { label: "Rejected",            cls: "bg-red-100 text-red-700 border border-red-300", dot: "bg-red-500" },
  COMPLETED:             { label: "Approved",            cls: "bg-emerald-100 text-emerald-700 border border-emerald-300", dot: "bg-emerald-500" },
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || "Unknown", cls: "bg-stone-100 text-stone-500", dot: "bg-stone-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.cls}`}>
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

// ── Reason modal (shared for Reject and Return) ───────────────────────────────

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

// ── Persons table ─────────────────────────────────────────────────────────────

function PersonsSection({ persons }) {
  const [expanded, setExpanded] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const peopleRows = (persons || []).filter((p) => !p.vehicleNumber);
  const vehicleRows = (persons || []).filter((p) => !!p.vehicleNumber);

  if (!persons?.length) {
    return <p className="text-sm text-slate-400 py-3">No persons or vehicles submitted yet.</p>;
  }

  const DOC_LABELS = {
    rc: "Registration Certificate (RC)",
    insurance: "Insurance",
    fitness: "Fitness Certificate",
    permit: "Permit",
    roadTax: "Road Tax",
    emission: "Emission Certificate (PUCC)",
  };

  return (
    <div className="space-y-6">
      {/* ── Person Photo Gallery ── */}
      {peopleRows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-amber-600 transition"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Persons ({peopleRows.length})
            </button>
            {expanded && (
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs font-semibold text-slate-400 hover:text-amber-600 transition"
              >
                {showDetails ? "Hide details table" : "Show details table"}
              </button>
            )}
          </div>
          {expanded && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {peopleRows.map((p, idx) => {
                  const photoSrc = fileUrl(p.photoPath);
                  return (
                    <div key={p.id || idx}
                      className="group relative rounded-2xl overflow-hidden ring-1 ring-slate-100 bg-slate-50 hover:ring-amber-300 hover:shadow-md transition cursor-pointer"
                      onClick={() => photoSrc && setLightboxSrc(photoSrc)}
                    >
                      <div className="aspect-[3/4] w-full bg-slate-100 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={p.name}
                            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div className={`h-full w-full items-center justify-center text-slate-300 ${photoSrc ? "hidden" : "flex"}`}>
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
                        <p className="text-xs font-bold text-white truncate">{p.name || "Unknown"}</p>
                        <p className="text-[10px] text-white/70 font-mono">
                          {p.aadhaar ? `XXXX XXXX ${String(p.aadhaar).slice(-4)}` : "—"}
                        </p>
                      </div>
                      <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{idx + 1}</span>
                      {p.inCharge && (
                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">IN CHARGE</span>
                      )}
                      {photoSrc && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full transition">
                            Click to enlarge
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {showDetails && (
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100 mt-4">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["#", "Name", "Aadhaar", "DOB", "Mobile", "In Charge"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {peopleRows.map((p, idx) => (
                        <tr key={p.id || idx} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.name || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {p.aadhaar ? `XXXX XXXX ${String(p.aadhaar).slice(-4)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{fmtDateShort(p.dob)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.mobile || "—"}</td>
                          <td className="px-4 py-3">
                            {p.inCharge ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">In charge</span>
                                {p.aadhaarCardPath
                                  ? <a href={fileUrl(p.aadhaarCardPath)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"><FileText className="h-3 w-3" /> Aadhaar card</a>
                                  : <span className="text-[10px] text-red-400">No Aadhaar card</span>}
                              </div>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Vehicle Document Viewer ── */}
      {vehicleRows.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
            <Car className="h-4 w-4" /> Vehicles ({vehicleRows.length})
          </p>
          <div className="space-y-4">
            {vehicleRows.map((v, idx) => {
              const docMap = v.vehicleDocs && typeof v.vehicleDocs === "object"
                ? v.vehicleDocs
                : v.photoPath ? { rc: v.photoPath } : {};
              const docs = Object.keys(DOC_LABELS)
                .filter((k) => docMap[k])
                .map((k) => ({ label: DOC_LABELS[k], path: docMap[k] }));

              return (
                <div key={v.id || idx} className="rounded-2xl ring-1 ring-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-blue-100 text-blue-600 text-xs font-bold">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 font-mono">{v.vehicleNumber || "—"}</p>
                        <p className="text-[10px] text-slate-500">{v.vehicleType || "Vehicle"} · Driver: {v.name || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {v.mobile && <p className="text-[10px] text-slate-500 font-mono">{v.mobile}</p>}
                      {v.aadhaar && <p className="text-[10px] text-slate-400 font-mono">XXXX XXXX {String(v.aadhaar).slice(-4)}</p>}
                    </div>
                  </div>
                  <div className="p-4">
                    {docs.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {docs.map((doc, di) => {
                          const docSrc = fileUrl(doc.path);
                          const isImage = /\.(jpe?g|png|gif|webp)$/i.test(doc.path);
                          return (
                            <div key={di} className="rounded-xl ring-1 ring-slate-100 overflow-hidden bg-slate-50 hover:ring-blue-300 transition">
                              <div className="aspect-[4/3] w-full bg-slate-100 flex items-center justify-center">
                                {isImage ? (
                                  <img
                                    src={docSrc}
                                    alt={doc.label}
                                    className="h-full w-full object-cover cursor-pointer"
                                    onClick={() => setLightboxSrc(docSrc)}
                                    onError={(e) => { e.target.style.display = "none"; }}
                                  />
                                ) : (
                                  <FileText className="h-8 w-8 text-slate-300" />
                                )}
                              </div>
                              <div className="px-3 py-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold text-slate-600 truncate">{doc.label}</p>
                                <a href={docSrc} target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition">
                                  View
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No documents uploaded for this vehicle.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] mx-4">
            <img src={lightboxSrc} alt="Enlarged" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg hover:bg-red-50 hover:text-red-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-white/60 mt-3">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrafficBulkPassDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [modal, setModal] = useState(null); // "reject" | "return" | null
  const [user, setUser] = useState(null);

  useEffect(() => {
    try { const r = localStorage.getItem("user"); if (r) setUser(JSON.parse(r)); } catch {}
  }, []);

  // Only departmentId === 9 (Traffic) can approve / reject / return
  const canApprove = Number(user?.departmentId) === 9 || Number(user?.department_id) === 9;

  const fetchBatch = () => {
    if (!id) return;
    setLoading(true);
    getBulkBatchDetail(id)
      .then((data) => setBatch(data))
      .catch(() => toast.error("Failed to load batch details."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBatch(); }, [id]);

  const handleApprove = async () => {
    setApprovingId(id);
    try {
      await approveBulkBatch(id);
      toast.success(`Batch ${batch.refNo} approved.`);
      router.push("/traffic_approval/bulk-pass");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve batch.");
    } finally { setApprovingId(null); }
  };

  const handleReject = async (reason) => {
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
      const blob = await downloadBulkPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${batch.refNo}_QR.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download PDF.");
    } finally { setDownloadingId(null); }
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
  const isCompleted = batch.status === "COMPLETED" && !!batch.qrPdfPath;
  const persons = batch.persons || [];
  const uploads = batch.uploads || [];
  const statusLogs = batch.statusLogs || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/traffic_approval/bulk-pass")}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800 font-mono">{batch.refNo}</h2>
              <StatusChip status={batch.status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{batch.companyName} · Created {fmtDate(batch.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {isUnderReview && canApprove && (
            <>
              <button onClick={() => setModal("return")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 transition">
                <RotateCcw className="h-4 w-4" /> Return for Revision
              </button>
              <button onClick={() => setModal("reject")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 transition">
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button onClick={handleApprove} disabled={!!approvingId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">
                <CheckCircle className="h-4 w-4" />
                {approvingId ? "Approving…" : "Approve Batch"}
              </button>
            </>
          )}
          {isCompleted && (
            <button onClick={handleDownloadPdf} disabled={!!downloadingId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
              <Download className="h-4 w-4" />
              {downloadingId ? "Downloading…" : "Download QR PDF"}
            </button>
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

      {/* Two column: intake details + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Intake details */}
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
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Purpose of Visit" value={batch.purpose || batch.purposeOfVisit} />
            </div>
            {batch.remarks && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Remarks" value={batch.remarks} />
              </div>
            )}
          </div>
        </div>

        {/* Status timeline */}
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
                const cfg = STATUS_CONFIG[entry.status] || { dot: "bg-slate-400" };
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
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400 shrink-0" />{u.fileName || "—"}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{u.rowCount ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(u.uploadedAt || u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Persons & Vehicles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600"><Users className="h-4 w-4" /></span>
          <h3 className="text-base font-bold text-slate-800">
            Persons &amp; Vehicles
            <span className="ml-2 text-xs font-semibold text-slate-400">({persons.length} entries)</span>
          </h3>
        </div>
        <PersonsSection persons={persons} />
      </div>

      {/* Modals */}
      {modal === "reject" && (
        <ReasonModal
          title="Reject Batch"
          label="Rejection Reason"
          placeholder="Describe why this batch is being rejected…"
          confirmLabel="Reject Batch"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleReject}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "return" && (
        <ReasonModal
          title="Return for Revision"
          label="Return Remarks"
          placeholder="Describe what needs to be corrected — the applicant will see this message and receive a new upload link…"
          confirmLabel="Return to Applicant"
          confirmClass="bg-orange-500 hover:bg-orange-600"
          onConfirm={handleReturn}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
