"use client";

// Create page within the /admin layout — identical to dashboard version
// but navigates back to /admin/bulk_pass.

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Mail, Hash, MessageSquare, Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createBulkIntake } from "@/lib/bulkPassApi";
import { BULK_PASS_LIMITS, BULK_PASS_LABELS, validatePassTotals } from "@/lib/bulkPassConstants";
import { DEFAULT_VALIDITY_FROM_TIME, DEFAULT_VALIDITY_UPTO_TIME, combineValidity } from "@/lib/bulkPassValidity";

const BASE = "/admin/bulk_pass";

const BULK_VISITOR_TYPES = [
  { value: "Govt Officials", label: "Govt Officials" },
  { value: "Consultants", label: "Consultants" },
  { value: "Students", label: "Students" },
  { value: "Vendors", label: "Vendors" },
  { value: "VIPs", label: "VIPs" },
  { value: "Others", label: "Others" },
];
const PAYMENT_MODES = [{ value: "CASH", label: "Cash" }, { value: "FREE", label: "Free" }];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields) {
  const errors = {};
  if (!fields.visitorType) errors.visitorType = "Visitor type is required.";
  if (!fields.companyName?.trim()) errors.companyName = "Company name is required.";
  if (!fields.applicantEmail?.trim()) errors.applicantEmail = "Applicant email is required.";
  else if (!EMAIL_RE.test(fields.applicantEmail.trim())) errors.applicantEmail = "Invalid applicant email.";
  if (!fields.applicantMobile?.trim()) errors.applicantMobile = "Applicant mobile is required.";
  else if (!/^\d{10}$/.test(fields.applicantMobile.trim())) errors.applicantMobile = "Applicant mobile must be 10 digits.";
  // Totals for the whole pass. Any size on a reusable link; a single-use pass
  // carries one batch, so its totals are bounded by the per-batch ceiling.
  Object.assign(errors, validatePassTotals(fields.noOfPersons, fields.noOfVehicles, !!fields.multipleSubmissionsEnabled));
  if (!fields.paymentMode) errors.paymentMode = "Payment mode is required.";
  if (!fields.purposeOfVisit?.trim()) errors.purposeOfVisit = "Purpose of visit is required.";
  const from = fields.validityFrom ? combineValidity(fields.validityFrom, fields.validityFromTime) : null;
  const upto = fields.validityUpto ? combineValidity(fields.validityUpto, fields.validityUptoTime, { upto: true }) : null;
  if (!fields.validityUpto) errors.validityUpto = "Validity upto is required.";
  else if (!upto) errors.validityUpto = "Invalid validity upto date or time.";
  else if (upto <= new Date()) errors.validityUpto = "Validity upto must be in the future.";
  if (!fields.validityFrom) errors.validityFrom = "Validity from is required.";
  else if (!from) errors.validityFrom = "Invalid validity from date or time.";
  else if (upto && from >= upto) errors.validityFrom = "Validity from must be before validity upto.";
  return errors;
}

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 placeholder:text-slate-400 outline-none transition focus:ring-2 ${
    hasError ? "border-red-400 focus:ring-red-300/50" : "border-slate-200 focus:ring-amber-400/50"
  }`;

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-500"><AlertCircle className="h-3.5 w-3.5" />{msg}</p>;
}

// ── Multiple Submissions Info Panel ─────────────────────────────────────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">{icon}</span>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  );
}


/**
 * A sensible default validity window so the officer is not typing two dates on
 * every single pass: open today, close thirty days out. Both remain editable;
 * the times default to 06:00 / 18:00 IST.
 */
function defaultValidityWindow() {
  const pad = (n) => String(n).padStart(2, "0");
  const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = new Date();
  const upto = new Date(from.getTime() + 30 * 86400000);
  return { from: toDateInput(from), upto: toDateInput(upto) };
}

const VALIDITY_KEYS = ["validityFrom", "validityUpto", "validityFromTime", "validityUptoTime"];


export default function AdminCreateBulkPassPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [dept, setDept] = useState({ name: "", id: "" });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setDept({ name: u.departmentName || u.department || "", id: u.departmentId || u.department_id || "" });
      }
    } catch {}

  }, []);

  const [form, setForm] = useState(() => {
    // Pre-filled so an officer is not typing two dates on every pass.
    const { from, upto } = defaultValidityWindow();
    return {
    visitorType: "", companyName: "", applicantEmail: "", applicantMobile: "",
    refDocNo: "", workOrderRequired: "no",
    noOfPersons: "0",
    noOfVehicles: "0",
    paymentMode: "", purposeOfVisit: "", validityFrom: from, validityUpto: upto,
    validityFromTime: DEFAULT_VALIDITY_FROM_TIME, validityUptoTime: DEFAULT_VALIDITY_UPTO_TIME, remarks: "",
    // Every bulk pass is a reusable link: the organisation submits batches of up
    // to 30 persons / 30 vehicles until the totals above are used up.
    multipleSubmissionsEnabled: true,
    };
  });

  const [workOrderFile, setWorkOrderFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // The validity fields are checked as one window, so refresh both together.
    const shown = (VALIDITY_KEYS.includes(key) ? ["validityFrom", "validityUpto"] : [key]).filter((k) => touched[k]);
    if (shown.length) setErrors((prev) => { const e = validate({ ...form, [key]: value }); return { ...prev, ...Object.fromEntries(shown.map((k) => [k, e[k]])) }; });
  };
  const touch = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [key]: e[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // The disabled attribute updates asynchronously; guard against a fast
    // double-submit firing two createIntake calls (two batches + two emails).
    if (submitting) return;
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { toast.error("Please fix the errors before submitting."); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "multipleSubmissionsEnabled") {
          fd.append(k, v ? "true" : "false");
        } else if (k === "workOrderRequired") {
          // Backend coerces via === "true"; the radio holds "yes"/"no".
          fd.append(k, v === "yes" ? "true" : "false");
        } else if (k === "validityFromTime" || k === "validityUptoTime") {
          fd.append(k, v || (k === "validityFromTime" ? DEFAULT_VALIDITY_FROM_TIME : DEFAULT_VALIDITY_UPTO_TIME));
        } else {
          fd.append(k, typeof v === "string" ? v.trim() : v);
        }
      });
      if (dept.id) fd.append("departmentId", dept.id);
      if (workOrderFile) fd.append("workOrder", workOrderFile);
      const result = await createBulkIntake(fd);
      const refNo = result?.refNo || result?.ref_no || "";
      toast.success(`Bulk Pass Created${refNo ? ` — Ref: ${refNo}` : ""}`, { duration: 5000 });
      router.push(BASE);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create bulk pass.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(BASE)}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">New Bulk Pass Request</h2>
          <p className="text-sm text-slate-500 mt-0.5">Fill in the group pass details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Group Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal">
          <SectionHeading icon={<Users className="h-4 w-4" />} title="Group Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <FieldLabel>Department</FieldLabel>
              <input type="text" readOnly value={dept.name || "Loading…"}
                className={`${inputCls(false)} bg-slate-100 text-slate-500 cursor-not-allowed`} />
            </div>
            <div>
              <FieldLabel required>Type of Visitors</FieldLabel>
              <select value={form.visitorType} onChange={(e) => set("visitorType", e.target.value)} onBlur={() => touch("visitorType")} className={inputCls(!!errors.visitorType)}>
                <option value="">Select visitor type…</option>
                {BULK_VISITOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <FieldError msg={errors.visitorType} />
            </div>
            <div>
              <FieldLabel required>Company / Organisation Name</FieldLabel>
              <input type="text" placeholder="e.g. Reliance Industries Ltd." value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)} onBlur={() => touch("companyName")} className={inputCls(!!errors.companyName)} />
              <FieldError msg={errors.companyName} />
            </div>
          </div>
        </div>

        {/* Applicant Contact */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal">
          <SectionHeading icon={<Mail className="h-4 w-4" />} title="Applicant Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel required>Applicant Email</FieldLabel>
              <input type="email" placeholder="applicant@example.com" value={form.applicantEmail}
                onChange={(e) => set("applicantEmail", e.target.value)} onBlur={() => touch("applicantEmail")} className={inputCls(!!errors.applicantEmail)} />
              <FieldError msg={errors.applicantEmail} />
            </div>
            <div>
              <FieldLabel required>Applicant Mobile</FieldLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-semibold select-none">+91</span>
                <input type="tel" placeholder="9876543210" maxLength={10} value={form.applicantMobile}
                  onChange={(e) => set("applicantMobile", e.target.value.replace(/\D/g, ""))} onBlur={() => touch("applicantMobile")}
                  className={`${inputCls(!!errors.applicantMobile)} pl-12`} />
              </div>
              <FieldError msg={errors.applicantMobile} />
            </div>
          </div>
        </div>

        {/* Pass Config */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal">
          <SectionHeading icon={<Hash className="h-4 w-4" />} title="Pass Configuration" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <FieldLabel>Ref. Doc No. (optional)</FieldLabel>
              <input type="text" placeholder="e.g. DOC-2026-001" value={form.refDocNo} onChange={(e) => set("refDocNo", e.target.value)} className={inputCls(false)} />
            </div>
            <div>
              <FieldLabel required>{BULK_PASS_LABELS.MAX_PERSONS} (total)</FieldLabel>
              <input type="number" min={1} max={BULK_PASS_LIMITS.MAX_TOTAL_PERSONS} value={form.noOfPersons} onChange={(e) => set("noOfPersons", e.target.value)} onBlur={() => touch("noOfPersons")} className={inputCls(!!errors.noOfPersons)} />
              <FieldError msg={errors.noOfPersons} />
            </div>
            <div>
              <FieldLabel required>{BULK_PASS_LABELS.MAX_VEHICLES} (total)</FieldLabel>
              <input type="number" min={0} max={BULK_PASS_LIMITS.MAX_TOTAL_VEHICLES} value={form.noOfVehicles} onChange={(e) => set("noOfVehicles", e.target.value)} onBlur={() => touch("noOfVehicles")} className={inputCls(!!errors.noOfVehicles)} />
              <FieldError msg={errors.noOfVehicles} />
            </div>
            <div>
              <FieldLabel required>Payment Mode</FieldLabel>
              <select value={form.paymentMode} onChange={(e) => set("paymentMode", e.target.value)} onBlur={() => touch("paymentMode")} className={inputCls(!!errors.paymentMode)}>
                <option value="">Select…</option>
                {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <FieldError msg={errors.paymentMode} />
            </div>
            <div>
              <FieldLabel required>Validity From</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={form.validityFrom} onChange={(e) => set("validityFrom", e.target.value)} onBlur={() => touch("validityFrom")}
                  min={new Date().toISOString().slice(0, 10)} className={`${inputCls(!!errors.validityFrom)} flex-[2_1_9rem] min-w-0`} />
                <input type="time" aria-label="Validity from time (IST)" value={form.validityFromTime} onChange={(e) => set("validityFromTime", e.target.value)}
                  onBlur={() => touch("validityFrom")} className={`${inputCls(!!errors.validityFrom)} flex-[1_1_7rem] min-w-0`} />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Pass opens at this date and time (IST)</p>
              <FieldError msg={errors.validityFrom} />
            </div>
            <div>
              <FieldLabel required>Validity Upto</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={form.validityUpto} onChange={(e) => set("validityUpto", e.target.value)} onBlur={() => touch("validityUpto")}
                  min={form.validityFrom || new Date().toISOString().slice(0, 10)} className={`${inputCls(!!errors.validityUpto)} flex-[2_1_9rem] min-w-0`} />
                <input type="time" aria-label="Validity upto time (IST)" value={form.validityUptoTime} onChange={(e) => set("validityUptoTime", e.target.value)}
                  onBlur={() => touch("validityUpto")} className={`${inputCls(!!errors.validityUpto)} flex-[1_1_7rem] min-w-0`} />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Pass closes at this date and time (IST)</p>
              <FieldError msg={errors.validityUpto} />
            </div>
            </div>

          <div className="mt-5">
            <FieldLabel>Request letter/supporting document</FieldLabel>
            <div className="flex items-center gap-6 mt-1">
              {[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => set("workOrderRequired", value)}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${form.workOrderRequired === value ? "border-amber-500 bg-amber-400" : "border-slate-300"}`}>
                    {form.workOrderRequired === value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.workOrderRequired === "yes" && (
            <div className="mt-5">
              <FieldLabel>Request letter/supporting document file</FieldLabel>
              <div onClick={() => fileRef.current?.click()}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-400/60 hover:bg-amber-50/50 transition">
                <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                {workOrderFile
                  ? <span className="text-sm font-semibold text-slate-700 truncate">{workOrderFile.name}</span>
                  : <span className="text-sm text-slate-400">Click to upload the request letter or supporting document (PDF, max 10 MB)</span>}
                {workOrderFile && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setWorkOrderFile(null); }} className="ml-auto text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setWorkOrderFile(e.target.files?.[0] || null)} />
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal">
          <SectionHeading icon={<MessageSquare className="h-4 w-4" />} title="Additional Information" />
          <div className="space-y-5">
            <div>
              <FieldLabel required>Purpose of Visit</FieldLabel>
              <textarea rows={3} placeholder="Describe the purpose of this group visit…" value={form.purposeOfVisit}
                onChange={(e) => set("purposeOfVisit", e.target.value)} onBlur={() => touch("purposeOfVisit")}
                className={`${inputCls(!!errors.purposeOfVisit)} resize-none`} />
              <FieldError msg={errors.purposeOfVisit} />
            </div>
            <div>
              <FieldLabel>Remarks (optional)</FieldLabel>
              <textarea rows={2} placeholder="Any additional remarks…" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={`${inputCls(false)} resize-none`} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <button type="button" onClick={() => router.push(BASE)}
            className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button type="submit" disabled={submitting}
            className="bp-press bp-lift inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#1f1f1f] font-bold text-sm shadow-sm transition">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><CheckCircle2 className="h-4 w-4" />Create Bulk Pass</>}
          </button>
        </div>
      </form>
    </div>
  );
}
