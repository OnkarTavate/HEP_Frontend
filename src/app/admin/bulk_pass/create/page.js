"use client";

// Create page within the /admin layout — identical to dashboard version
// but navigates back to /admin/bulk_pass.

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Mail, Hash, MessageSquare, Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createBulkIntake } from "@/lib/bulkPassApi";

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
  const persons = parseInt(fields.noOfPersons, 10);
  if (isNaN(persons) || persons < 0 || persons > 30) errors.noOfPersons = "Number of persons must be between 0 and 30.";
  const vehicles = parseInt(fields.noOfVehicles, 10);
  if (isNaN(vehicles) || vehicles < 0 || vehicles > 20) errors.noOfVehicles = "Number of vehicles must be between 0 and 20.";
  if (!fields.paymentMode) errors.paymentMode = "Payment mode is required.";
  if (!fields.purposeOfVisit?.trim()) errors.purposeOfVisit = "Purpose of visit is required.";
  if (!fields.validityUpto) errors.validityUpto = "Validity upto is required.";
  else if (new Date(fields.validityUpto) <= new Date()) errors.validityUpto = "Validity upto must be a future date.";
  if (!fields.validityFrom) errors.validityFrom = "Validity from is required.";
  else if (fields.validityUpto && new Date(fields.validityFrom) >= new Date(fields.validityUpto)) errors.validityFrom = "Validity from must be before validity upto.";
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

function InfoPanel({ title, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {title}
        </span>
        <span
          className={`text-amber-500 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 text-sm text-slate-600 pl-6">
          {children}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">{icon}</span>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  );
}

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

  const [form, setForm] = useState({
    visitorType: "", companyName: "", applicantEmail: "", applicantMobile: "",
    refDocNo: "", workOrderRequired: "no", noOfPersons: "30", noOfVehicles: "0",
    paymentMode: "", purposeOfVisit: "", validityFrom: "", validityUpto: "", remarks: "",
    multipleSubmissionsEnabled: false,
  });
  const [workOrderFile, setWorkOrderFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) setErrors((prev) => { const e = validate({ ...form, [key]: value }); return { ...prev, [key]: e[key] }; });
  };
  const touch = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [key]: e[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <SectionHeading icon={<Hash className="h-4 w-4" />} title="Pass Configuration" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <FieldLabel>Ref. Doc No. (optional)</FieldLabel>
              <input type="text" placeholder="e.g. DOC-2026-001" value={form.refDocNo} onChange={(e) => set("refDocNo", e.target.value)} className={inputCls(false)} />
            </div>
            <div>
              <FieldLabel required>No. of Persons (0–30)</FieldLabel>
              <input type="number" min={0} max={30} value={form.noOfPersons} onChange={(e) => set("noOfPersons", e.target.value)} onBlur={() => touch("noOfPersons")} className={inputCls(!!errors.noOfPersons)} />
              <FieldError msg={errors.noOfPersons} />
            </div>
            <div>
              <FieldLabel required>No. of Vehicles (0–20)</FieldLabel>
              <input type="number" min={0} max={20} value={form.noOfVehicles} onChange={(e) => set("noOfVehicles", e.target.value)} onBlur={() => touch("noOfVehicles")} className={inputCls(!!errors.noOfVehicles)} />
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
              <input type="datetime-local" value={form.validityFrom} onChange={(e) => set("validityFrom", e.target.value)} onBlur={() => touch("validityFrom")}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} className={inputCls(!!errors.validityFrom)} />
              <FieldError msg={errors.validityFrom} />
            </div>
              <div>
                <FieldLabel required>Validity Upto</FieldLabel>
                <input type="datetime-local" value={form.validityUpto} onChange={(e) => set("validityUpto", e.target.value)} onBlur={() => touch("validityUpto")}
                  min={form.validityFrom || new Date(Date.now() + 60000).toISOString().slice(0, 16)} className={inputCls(!!errors.validityUpto)} />
                <FieldError msg={errors.validityUpto} />
              </div>
            </div>

          <div className="mt-5">
            <FieldLabel>Work Order Required</FieldLabel>
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
              <FieldLabel>Work Order Document</FieldLabel>
              <div onClick={() => fileRef.current?.click()}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-400/60 hover:bg-amber-50/50 transition">
                <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                {workOrderFile
                  ? <span className="text-sm font-semibold text-slate-700 truncate">{workOrderFile.name}</span>
                  : <span className="text-sm text-slate-400">Click to upload work order (PDF, max 10 MB)</span>}
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

        {/* Multiple Submissions Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <SectionHeading icon={<Hash className="h-4 w-4" />} title="Submission Options" />
          <div className="space-y-4 mt-5">
            {/* Enable Multiple Submissions Checkbox */}
            <div>
              <div
                onClick={() => set("multipleSubmissionsEnabled", !form.multipleSubmissionsEnabled)}
                className="flex items-start gap-3 cursor-pointer"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition mt-0.5 shrink-0 ${
                    form.multipleSubmissionsEnabled
                      ? "border-amber-500 bg-amber-400"
                      : "border-slate-300"
                  }`}
                >
                  {form.multipleSubmissionsEnabled && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={form.multipleSubmissionsEnabled}
                      onChange={(e) => set("multipleSubmissionsEnabled", e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-sm font-bold text-slate-800">
                      Enable multiple submissions
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Organization can submit multiple batches with same link until validity expires
                  </p>
                  
                  {/* Collapsible Information Panel */}
                  {form.multipleSubmissionsEnabled && (
                    <InfoPanel title="How Multiple Submissions Work" defaultExpanded={false}>
                      <ul className="list-disc space-y-1 marker:text-amber-500">
                        <li>The organization receives ONE link that remains active</li>
                        <li>They can submit multiple batches within validity period</li>
                        <li>Each batch (max 30 persons) is reviewed separately by Traffic</li>
                        <li>Useful for schools with changing visitors or film productions with evolving crews</li>
                      </ul>
                    </InfoPanel>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
            className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#1f1f1f] font-bold text-sm shadow-sm transition">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><CheckCircle2 className="h-4 w-4" />Create Bulk Pass</>}
          </button>
        </div>
      </form>
    </div>
  );
}
