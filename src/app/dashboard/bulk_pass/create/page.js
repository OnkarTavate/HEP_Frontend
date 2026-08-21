"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Mail,
  Hash,
  MessageSquare,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createBulkIntake } from "@/lib/bulkPassApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const BULK_VISITOR_TYPES = [
  { value: "CRUISE_VESSEL", label: "Cruise Vessel" },
  { value: "EDUCATIONAL_VISIT", label: "Educational Visit" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "VIP", label: "VIP" },
  { value: "GOVT_OFFICIAL", label: "Government Official" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "FREE", label: "Free" },
];

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields) {
  const errors = {};

  if (!fields.visitorType) errors.visitorType = "Visitor type is required.";
  if (!fields.companyName?.trim()) errors.companyName = "Company name is required.";

  if (!fields.applicantEmail?.trim()) {
    errors.applicantEmail = "Applicant email is required.";
  } else if (!EMAIL_RE.test(fields.applicantEmail.trim())) {
    errors.applicantEmail = "Invalid applicant email.";
  }

  if (!fields.applicantMobile?.trim()) {
    errors.applicantMobile = "Applicant mobile is required.";
  } else if (!/^\d{10}$/.test(fields.applicantMobile.trim())) {
    errors.applicantMobile = "Applicant mobile must be 10 digits.";
  }

  const persons = parseInt(fields.noOfPersons, 10);
  if (isNaN(persons) || persons < 0 || persons > 30) {
    errors.noOfPersons = "Number of persons must be between 0 and 30.";
  }

  const vehicles = parseInt(fields.noOfVehicles, 10);
  if (isNaN(vehicles) || vehicles < 0 || vehicles > 20) {
    errors.noOfVehicles = "Number of vehicles must be between 0 and 20.";
  }

  if (!fields.paymentMode) errors.paymentMode = "Payment mode is required.";
  if (!fields.purposeOfVisit?.trim()) errors.purposeOfVisit = "Purpose of visit is required.";

  if (!fields.validityUpto) {
    errors.validityUpto = "Validity upto is required.";
  } else if (new Date(fields.validityUpto) <= new Date()) {
    errors.validityUpto = "Validity upto must be a future date.";
  }

  if (!fields.validityFrom) {
    errors.validityFrom = "Validity from is required.";
  } else if (
    fields.validityUpto &&
    new Date(fields.validityFrom) >= new Date(fields.validityUpto)
  ) {
    errors.validityFrom = "Validity from must be before validity upto.";
  }

  return errors;
}

// ── Shared card shell (matches rest of dashboard) ─────────────────────────────

const cardShell =
  "rounded-3xl border-0 bg-white dark:bg-[#1f232d] " +
  "ring-1 ring-stone-200/70 dark:ring-white/[0.06] " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.55),0_30px_60px_-24px_rgba(0,0,0,0.70)] " +
  "transition-all duration-300";

// ── Field components ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {msg}
    </p>
  );
}

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-2xl border text-sm text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-white/5 placeholder:text-stone-400 outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-400 dark:border-red-500 focus:ring-red-300/50"
      : "border-stone-200 dark:border-white/10 focus:ring-amber-400/50"
  }`;

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateBulkPassPage() {
  const router = useRouter();
  const fileRef = useRef(null);

  // Read department from session
  const [dept, setDept] = useState({ name: "", id: "" });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setDept({
          name: u.departmentName || u.department || "",
          id: u.departmentId || u.department_id || "",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const [form, setForm] = useState({
    visitorType: "",
    companyName: "",
    applicantEmail: "",
    applicantMobile: "",
    refDocNo: "",
    workOrderRequired: "no",
    noOfPersons: "30",
    noOfVehicles: "0",
    paymentMode: "",
    purposeOfVisit: "",
    validityFrom: "",
    validityUpto: "",
    remarks: "",
    multipleSubmissionsEnabled: false,
  });

  // Split date/time state for validity fields — defaults: 06:00 start, 23:59 end
  const DEFAULT_FROM_TIME = "06:00";
  const DEFAULT_UPTO_TIME = "23:59";
  const [validityFromDate, setValidityFromDate] = useState("");
  const [validityFromTime, setValidityFromTime] = useState(DEFAULT_FROM_TIME);
  const [validityUptoDate, setValidityUptoDate] = useState("");
  const [validityUptoTime, setValidityUptoTime] = useState(DEFAULT_UPTO_TIME);

  // Sync split date+time → form.validityFrom / form.validityUpto
  const syncValidity = (fromDate, fromTime, uptoDate, uptoTime) => {
    const from = fromDate ? `${fromDate}T${fromTime}` : "";
    const upto = uptoDate ? `${uptoDate}T${uptoTime}` : "";
    setForm((prev) => ({ ...prev, validityFrom: from, validityUpto: upto }));
  };

  const [workOrderFile, setWorkOrderFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) {
      // re-validate just this field inline
      setErrors((prev) => {
        const e = validate({ ...form, [key]: value });
        return { ...prev, [key]: e[key] };
      });
    }
  };

  const touch = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [key]: e[key] }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("Work order file must be under 10 MB.");
      return;
    }
    setWorkOrderFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark all as touched and validate
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("visitorType", form.visitorType);
      fd.append("companyName", form.companyName.trim());
      fd.append("applicantEmail", form.applicantEmail.trim());
      fd.append("applicantMobile", form.applicantMobile.trim());
      fd.append("refDocNo", form.refDocNo.trim());
      fd.append("workOrderRequired", form.workOrderRequired);
      fd.append("noOfPersons", form.noOfPersons);
      fd.append("noOfVehicles", form.noOfVehicles);
      fd.append("paymentMode", form.paymentMode);
      fd.append("purposeOfVisit", form.purposeOfVisit.trim());
      fd.append("validityFrom", form.validityFrom);
      fd.append("validityUpto", form.validityUpto);
      fd.append("remarks", form.remarks.trim());
      fd.append("multipleSubmissionsEnabled", form.multipleSubmissionsEnabled ? "true" : "false");
      if (dept.id) fd.append("departmentId", dept.id);
      if (workOrderFile) fd.append("workOrder", workOrderFile);

      const result = await createBulkIntake(fd);
      const refNo = result?.refNo || result?.ref_no || "";

      toast.success(
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-stone-800">Bulk Pass Created</p>
            {refNo && (
              <p className="text-xs text-stone-500 mt-0.5">
                Reference: <span className="font-mono font-bold text-amber-600">{refNo}</span>
              </p>
            )}
            <p className="text-xs text-stone-400 mt-0.5">
              An invitation email has been sent to the applicant.
            </p>
          </div>
        </div>,
        { duration: 5000 }
      );

      router.push("/dashboard/bulk_pass");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create bulk pass. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-5 overflow-auto py-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/bulk_pass")}
          className="flex items-center justify-center h-10 w-10 rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 transition shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            New Bulk Pass Request
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Fill in the group pass details to generate an applicant upload link
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-5">
          {/* ── Section 1: Basic Details ── */}
          <div className={`${cardShell} p-6`}>
            <SectionHeading icon={<Users className="h-4 w-4" />} title="Group Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {/* Department (read-only) */}
              <div>
                <FieldLabel>Department</FieldLabel>
                <input
                  type="text"
                  readOnly
                  value={dept.name || "Loading…"}
                  className={`${inputCls(false)} bg-stone-100 dark:bg-white/[0.03] text-stone-500 cursor-not-allowed`}
                />
              </div>

              {/* Visitor Type */}
              <div>
                <FieldLabel required>Type of Visitors</FieldLabel>
                <select
                  value={form.visitorType}
                  onChange={(e) => set("visitorType", e.target.value)}
                  onBlur={() => touch("visitorType")}
                  className={inputCls(!!errors.visitorType)}
                >
                  <option value="">Select visitor type…</option>
                  {BULK_VISITOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.visitorType} />
              </div>

              {/* Company Name */}
              <div>
                <FieldLabel required>Company / Organisation Name</FieldLabel>
                <input
                  type="text"
                  placeholder="e.g. Reliance Industries Ltd."
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  onBlur={() => touch("companyName")}
                  className={inputCls(!!errors.companyName)}
                />
                <FieldError msg={errors.companyName} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Applicant Contact ── */}
          <div className={`${cardShell} p-6`}>
            <SectionHeading icon={<Mail className="h-4 w-4" />} title="Applicant Contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              {/* Applicant Email */}
              <div>
                <FieldLabel required>Applicant Email</FieldLabel>
                <input
                  type="email"
                  placeholder="applicant@example.com"
                  value={form.applicantEmail}
                  onChange={(e) => set("applicantEmail", e.target.value)}
                  onBlur={() => touch("applicantEmail")}
                  className={inputCls(!!errors.applicantEmail)}
                  autoComplete="email"
                />
                <FieldError msg={errors.applicantEmail} />
              </div>

              {/* Applicant Mobile */}
              <div>
                <FieldLabel required>Applicant Mobile</FieldLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-500 font-semibold select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={form.applicantMobile}
                    onChange={(e) => set("applicantMobile", e.target.value.replace(/\D/g, ""))}
                    onBlur={() => touch("applicantMobile")}
                    className={`${inputCls(!!errors.applicantMobile)} pl-12`}
                    autoComplete="tel"
                  />
                </div>
                <FieldError msg={errors.applicantMobile} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Pass Configuration ── */}
          <div className={`${cardShell} p-6`}>
            <SectionHeading icon={<Hash className="h-4 w-4" />} title="Pass Configuration" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {/* Ref Doc No */}
              <div>
                <FieldLabel>Ref. Doc No. (optional)</FieldLabel>
                <input
                  type="text"
                  placeholder="e.g. DOC-2026-001"
                  value={form.refDocNo}
                  onChange={(e) => set("refDocNo", e.target.value)}
                  className={inputCls(false)}
                />
              </div>

              {/* No. of Persons */}
              <div>
                <FieldLabel required>No. of Persons (0–30)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.noOfPersons}
                  onChange={(e) => set("noOfPersons", e.target.value)}
                  onBlur={() => touch("noOfPersons")}
                  className={inputCls(!!errors.noOfPersons)}
                />
                <FieldError msg={errors.noOfPersons} />
              </div>

              {/* No. of Vehicles */}
              <div>
                <FieldLabel required>No. of Vehicles (0–20)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={form.noOfVehicles}
                  onChange={(e) => set("noOfVehicles", e.target.value)}
                  onBlur={() => touch("noOfVehicles")}
                  className={inputCls(!!errors.noOfVehicles)}
                />
                <FieldError msg={errors.noOfVehicles} />
              </div>

              {/* Payment Mode */}
              <div>
                <FieldLabel required>Payment Mode</FieldLabel>
                <select
                  value={form.paymentMode}
                  onChange={(e) => set("paymentMode", e.target.value)}
                  onBlur={() => touch("paymentMode")}
                  className={inputCls(!!errors.paymentMode)}
                >
                  <option value="">Select payment mode…</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.paymentMode} />
              </div>

              {/* Validity From */}
              <div>
                <FieldLabel required>Validity From</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={validityFromDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setValidityFromDate(e.target.value);
                      syncValidity(e.target.value, validityFromTime, validityUptoDate, validityUptoTime);
                      if (touched.validityFrom) touch("validityFrom");
                    }}
                    onBlur={() => touch("validityFrom")}
                    className={inputCls(!!errors.validityFrom) + " flex-1"}
                  />
                  <input
                    type="time"
                    value={validityFromTime}
                    onChange={(e) => {
                      setValidityFromTime(e.target.value);
                      syncValidity(validityFromDate, e.target.value, validityUptoDate, validityUptoTime);
                    }}
                    className={inputCls(false) + " w-32"}
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Default start time: 06:00 AM</p>
                <FieldError msg={errors.validityFrom} />
              </div>

              {/* Validity Upto */}
              <div>
                <FieldLabel required>Validity Upto</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={validityUptoDate}
                    min={validityFromDate || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setValidityUptoDate(e.target.value);
                      syncValidity(validityFromDate, validityFromTime, e.target.value, validityUptoTime);
                      if (touched.validityUpto) touch("validityUpto");
                    }}
                    onBlur={() => touch("validityUpto")}
                    className={inputCls(!!errors.validityUpto) + " flex-1"}
                  />
                  <input
                    type="time"
                    value={validityUptoTime}
                    onChange={(e) => {
                      setValidityUptoTime(e.target.value);
                      syncValidity(validityFromDate, validityFromTime, validityUptoDate, e.target.value);
                    }}
                    className={inputCls(false) + " w-32"}
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Default end time: 11:59 PM</p>
                <FieldError msg={errors.validityUpto} />
              </div>
            </div>

            {/* Work Order Required */}
            <div className="mt-5">
              <FieldLabel>Work Order Required</FieldLabel>
              <div className="flex items-center gap-6 mt-1">
                {[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <div
                      onClick={() => set("workOrderRequired", value)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        form.workOrderRequired === value
                          ? "border-amber-500 bg-amber-400"
                          : "border-stone-300 dark:border-white/20 bg-transparent"
                      }`}
                    >
                      {form.workOrderRequired === value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work Order File — shown only when required = yes */}
            {form.workOrderRequired === "yes" && (
              <div className="mt-5">
                <FieldLabel>Work Order Document</FieldLabel>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 cursor-pointer hover:border-amber-400/60 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition"
                >
                  <Upload className="h-5 w-5 text-stone-400 shrink-0" />
                  {workOrderFile ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                        {workOrderFile.name}
                      </span>
                      <span className="text-xs text-stone-400 shrink-0">
                        ({(workOrderFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-stone-400">
                      Click to upload work order (PDF, max 10 MB)
                    </span>
                  )}
                  {workOrderFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkOrderFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="shrink-0 text-stone-400 hover:text-red-500 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* ── Section: Multiple Submissions ── */}
            <div className="mt-5">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03]">
                <div className="mt-0.5">
                  <div
                    onClick={() => set("multipleSubmissionsEnabled", !form.multipleSubmissionsEnabled)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition cursor-pointer ${
                      form.multipleSubmissionsEnabled
                        ? "border-amber-500 bg-amber-400"
                        : "border-stone-300 dark:border-white/20 bg-transparent"
                    }`}
                  >
                    {form.multipleSubmissionsEnabled && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => set("multipleSubmissionsEnabled", !form.multipleSubmissionsEnabled)}
                  >
                    <input
                      type="checkbox"
                      checked={form.multipleSubmissionsEnabled}
                      onChange={(e) => set("multipleSubmissionsEnabled", e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                      Enable multiple submissions
                    </span>
                  </label>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Organization can submit multiple batches with same link until validity expires
                  </p>
                  
                  <InfoPanel title="How Multiple Submissions Work" defaultExpanded={false}>
                    <ul className="list-disc space-y-1 marker:text-amber-500">
                      <li>The organization receives ONE link that remains active</li>
                      <li>They can submit multiple batches within validity period</li>
                      <li>Each batch (max 30 persons) is reviewed separately by Traffic</li>
                      <li>Useful for schools with changing visitors or film productions with evolving crews</li>
                    </ul>
                  </InfoPanel>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Additional Info ── */}
          <div className={`${cardShell} p-6`}>
            <SectionHeading icon={<MessageSquare className="h-4 w-4" />} title="Additional Information" />
            <div className="grid grid-cols-1 gap-5 mt-5">
              {/* Purpose of Visit */}
              <div>
                <FieldLabel required>Purpose of Visit</FieldLabel>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this group visit…"
                  value={form.purposeOfVisit}
                  onChange={(e) => set("purposeOfVisit", e.target.value)}
                  onBlur={() => touch("purposeOfVisit")}
                  className={`${inputCls(!!errors.purposeOfVisit)} resize-none`}
                />
                <FieldError msg={errors.purposeOfVisit} />
              </div>

              {/* Remarks */}
              <div>
                <FieldLabel>Remarks (optional)</FieldLabel>
                <textarea
                  rows={2}
                  placeholder="Any additional remarks or notes…"
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  className={`${inputCls(false)} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/bulk_pass")}
              className="px-6 py-3 rounded-2xl text-sm font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2.5 px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-[#1f1f1f] font-bold text-sm shadow-sm transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Bulk Pass
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        {icon}
      </span>
      <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">{title}</h3>
    </div>
  );
}

// ── Multiple Submissions Info Panel ─────────────────────────────────────────────────

function InfoPanel({ title, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mt-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03] overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
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
        <div className="px-4 pb-4 text-sm text-stone-600 dark:text-stone-400 pl-6">
          {children}
        </div>
      )}
    </div>
  );
}
