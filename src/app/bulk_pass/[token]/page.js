"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Camera,
  Archive,
  Edit2,
  Check,
  Trash2,
  Plus,
  Car,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPublicBatch,
  uploadExcelFiles,
  downloadTemplate,
  parseExcelOnly,
  uploadZipPhotos,
  submitRowsDirectly,
  checkBulkPassBlacklist,
  checkVehicleValidity,
  fileUrl,
} from "@/lib/bulkPassApi";
import { processPhoto } from "@/lib/photoProcessor";

// ── Styles ────────────────────────────────────────────────────────────────────

const card =
  "rounded-3xl border-0 bg-white ring-1 ring-stone-200/70 " +
  "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.20)] " +
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
  return isNaN(d) ? v : fmt.format(d);
};

const visitorLabel = (v) =>
  v
    ? v
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

function validateExcelFile(f) {
  const name = f.name.toLowerCase();
  return [".xlsx", ".xls"].some((e) => name.endsWith(e));
}

// ── Field validators (mirror backend bulkPassValidators) ──────────────────────

function validateNameField(s) {
  if (typeof s !== "string" || !s.trim()) return "Name is required";
  return null;
}

function validateAadhaarField(s) {
  const v = String(s ?? "").replace(/\s+/g, "");
  if (!v) return "Aadhaar is required";
  if (!/^\d{12}$/.test(v)) return "Invalid Aadhaar: must be exactly 12 digits";
  return null;
}

function validateMobileField(s) {
  const v = String(s ?? "").replace(/\s+/g, "");
  if (!v) return "Mobile number is required";
  if (!/^[6-9][0-9]{9}$/.test(v))
    return "Invalid mobile number: must be 10 digits starting with 6–9";
  return null;
}

function validateDobField(s) {
  const v = String(s ?? "").trim();
  if (!v) return "Date of Birth is required";
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!match) return "Invalid DOB: use DD/MM/YYYY format";
  const [, dd, mm, yyyy] = match;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10) - 1;
  const year = parseInt(yyyy, 10);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return "Invalid DOB: use DD/MM/YYYY format";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return "Invalid DOB: future date not allowed";
  return null;
}

// Convert a stored date value (ISO string, YYYY-MM-DD, or already DD/MM/YYYY)
// into the DD/MM/YYYY format the form expects.
function normaliseDob(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  // Already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  // Parse via Date (handles ISO strings like 1981-10-15T18:30:00.000Z)
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return v;
}

// Auto-format a DOB string into DD/MM/YYYY as the user types.
// Strips non-digits, caps at 8 digits, and inserts the slashes automatically.
function formatDobInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}

// ── Vehicle helpers ───────────────────────────────────────────────────────────

// Allowed vehicle types for the dropdown.
const VEHICLE_TYPES = [
  "Two-Wheeler",
  "Car",
  "Auto Rickshaw",
  "Taxi / Cab",
  "Van",
  "Tempo / Mini Truck",
  "Truck / Lorry",
  "Bus",
  "Trailer",
  "Container",
  "Tractor",
  "Other",
];

// Normalise a registration number: uppercase, keep only A–Z/0–9, cap length.
function formatRegNo(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
}

// Validate against the standard Indian formats (compared without spaces):
//   • Normal series:   TN 01 AB 1234  → SS DD L(1-3) DDDD
//   • Bharat (BH):     22 BH 1234 AA  → DD 'BH' DDDD L(1-2)
function isValidRegNo(value) {
  const v = formatRegNo(value);
  const normal = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
  const bharat = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  return normal.test(v) || bharat.test(v);
}

// Returns a keyed map of field errors for a person row draft.
function getPersonFieldErrors(draft) {
  return {
    name: validateNameField(draft.name),
    aadhaar: validateAadhaarField(draft.aadhaar),
    dob: validateDobField(draft.dob),
    mobile: validateMobileField(draft.mobile),
  };
}

// Flattens field errors into the parseErrors array shape used elsewhere.
function buildParseErrors(draft) {
  const fe = getPersonFieldErrors(draft);
  return Object.values(fe).filter(Boolean);
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">
        {icon}
      </span>
      <h3 className="text-base font-bold text-stone-800">{title}</h3>
    </div>
  );
}

function ReadField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-stone-800">{value || "—"}</p>
    </div>
  );
}

// ── Error / Confirmation screens ─────────────────────────────────────────────

function ErrorScreen({ type }) {
  const isInvalid = type === "invalid";
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center px-4">
      <div className={`${card} p-8 max-w-md w-full text-center`}>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 ${
            isInvalid ? "bg-red-100 text-red-500" : "bg-orange-100 text-orange-500"
          }`}
        >
          {isInvalid ? (
            <XCircle className="h-7 w-7" />
          ) : (
            <AlertCircle className="h-7 w-7" />
          )}
        </div>
        <h2 className="text-lg font-bold text-stone-900 mb-2">
          {isInvalid ? "Invalid Link" : "Link Expired or Inactive"}
        </h2>
        <p className="text-sm text-stone-500">
          {isInvalid
            ? "This upload link does not exist."
            : "This upload link is no longer active. Contact the issuing department."}
        </p>
      </div>
    </div>
  );
}

function ConfirmationScreen({ refNo, email }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center px-4">
      <div className={`${card} p-10 max-w-md w-full text-center`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-500 mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900 mb-2">Submitted Successfully</h2>
        {refNo && (
          <p className="text-sm font-mono font-bold text-amber-700 mb-3">{refNo}</p>
        )}
        <p className="text-sm text-stone-500 leading-relaxed">
          Your visitor data has been submitted and is now with the department for review.
        </p>

        {/* Email notification banner */}
        {email && (
          <div className="mt-5 px-5 py-4 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 text-left">
            <div className="flex gap-2.5 items-start">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 mb-0.5">Confirmation email sent</p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  A confirmation has been sent to{" "}
                  <span className="font-bold font-mono">{email}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 px-5 py-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-left">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              This upload link is now inactive. Contact the issuing department if corrections are
              needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Intake info card ─────────────────────────────────────────────────────────

function IntakeCard({ batch }) {
  const [expanded, setExpanded] = useState(false);
  const isReturned = batch?.status === "RETURNED_TO_APPLICANT";
  return (
    <>
      {/* Return reason banner (if returned for revision) */}
      {isReturned && batch.returnReason && (
        <div className={`${card} mb-6`}>
          <div className="px-6 py-4 flex items-start gap-3 bg-orange-50/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900 mb-1">
                Returned for Revision — Traffic Department Remarks
              </p>
              <p className="text-sm text-orange-800 leading-relaxed">
                {batch.returnReason}
              </p>
              <p className="text-xs text-orange-700 mt-2 leading-relaxed">
                Your previously entered information is pre-filled below. Please correct any errors,
                re-upload photos and Aadhaar cards for all persons, and submit again.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={card}>
      <div className="px-6 pt-6 pb-4 border-b border-stone-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
              Bulk Pass Request
            </p>
            <h2 className="text-2xl font-black text-stone-900 font-mono">
              {batch.refNo || "—"}
            </h2>
            <p className="text-sm text-stone-500 mt-1">{batch.companyName}</p>
          </div>
          <div className="text-right">
            {batch.validityFrom && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                  Valid From
                </p>
                <p className="text-sm font-bold text-stone-800 mb-2">{fmtDate(batch.validityFrom)}</p>
              </>
            )}
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
              Valid Until
            </p>
            <p className="text-sm font-bold text-stone-800">{fmtDate(batch.validityUpto)}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
        <ReadField label="Department" value={batch.departmentName || batch.department} />
        <ReadField label="Visitor Type" value={visitorLabel(batch.visitorType)} />
        <ReadField
          label="Max No. of Persons"
          value={batch.noOfPersons != null ? String(batch.noOfPersons) : null}
        />
        <ReadField
          label="Max No. of Vehicles"
          value={batch.noOfVehicles != null ? String(batch.noOfVehicles) : null}
        />
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 px-6 py-3 border-t border-stone-100 text-xs font-semibold text-stone-500 hover:text-amber-600 hover:bg-amber-50/50 transition"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> Show more details
          </>
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-stone-100 pt-5">
          <ReadField label="Applicant Email" value={batch.applicantEmail} />
          <ReadField
            label="Applicant Mobile"
            value={batch.applicantMobile ? "+91 " + batch.applicantMobile : null}
          />
          {batch.purposeOfVisit && (
            <div className="sm:col-span-2">
              <ReadField label="Purpose of Visit" value={batch.purposeOfVisit} />
            </div>
          )}
          {batch.remarks && (
            <div className="sm:col-span-2">
              <ReadField label="Remarks" value={batch.remarks} />
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

// ── Step 1: Upload Excel ──────────────────────────────────────────────────────

function ExcelUploadStep({ token, onParsed }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const addFiles = useCallback(
    (incoming) => {
      const valid = [];
      for (const f of incoming) {
        if (!validateExcelFile(f)) {
          toast.error('"' + f.name + '" is not a valid Excel file.');
          continue;
        }
        if (f.size > 15 * 1024 * 1024) {
          toast.error('"' + f.name + '" exceeds 15 MB.');
          continue;
        }
        if (files.length + valid.length >= 5) {
          toast.error("Maximum 5 files allowed.");
          break;
        }
        if (files.some((ef) => ef.name === f.name)) {
          toast.warning('"' + f.name + '" already added.');
          continue;
        }
        valid.push(f);
      }
      if (valid.length) setFiles((prev) => [...prev, ...valid]);
    },
    [files]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const blob = await downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_pass_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUploadAndParse = async () => {
    if (!files.length) {
      toast.error("Please select at least one Excel file.");
      return;
    }
    setUploading(true);
    try {
      const uploadResult = await uploadExcelFiles(token, files);
      const paths = Array.isArray(uploadResult)
        ? uploadResult.map((r) => (typeof r === "string" ? r : r.filePath || r.path))
        : [];
      const names = Array.isArray(uploadResult)
        ? uploadResult.map((r) => (typeof r === "string" ? r : r.originalName))
        : [];
      const result = await parseExcelOnly(token, paths, names);
      const rows = Array.isArray(result) ? result : result?.rows || [];
      if (!rows.length) {
        toast.error("No data rows found in the Excel file(s).");
        return;
      }
      onParsed(rows);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to process files. Check your Excel format.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={card}>
      <div className="p-6">
        <SectionHeading
          icon={<FileSpreadsheet className="h-4 w-4" />}
          title="Step 1 — Upload Excel"
        />
        <p className="text-sm text-stone-500 mb-5 leading-relaxed">
          Download the template, fill in visitor details (no photos needed in the Excel — you
          add photos in the next step), then upload here.
        </p>

        <div className="mb-5 px-4 py-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
          <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Before you upload
          </p>
          <ul className="space-y-1.5 text-xs text-amber-700 leading-relaxed">
            <li>• Each person needs a <strong>passport-style photo</strong> — you'll upload these in the next step.</li>
            <li>• <strong>Aadhaar card (PDF/JPEG/JPG/PNG) is mandatory for every person</strong> — upload each one individually in Step 2.</li>
            <li>• Use the template below — other formats may not parse correctly.</li>
          </ul>
        </div>

        <div className="mb-4 px-4 py-3 rounded-2xl bg-stone-50 ring-1 ring-stone-100">
          <p className="text-xs font-semibold text-stone-600 mb-2">Required columns in Excel:</p>
          <div className="flex flex-wrap gap-2">
            {["Name", "Aadhaar Number", "Date of Birth (DD/MM/YYYY)", "Mobile Number"].map(
              (col) => (
                <span
                  key={col}
                  className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold"
                >
                  {col}
                </span>
              )
            )}
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-700 font-bold text-sm transition"
        >
          {downloadingTemplate ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Template (.xlsx)
        </button>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={
            "flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-2 " +
            "border-dashed cursor-pointer transition select-none " +
            (dragging
              ? "border-amber-400 bg-amber-50"
              : uploading
              ? "border-stone-200 bg-stone-50 cursor-not-allowed opacity-60"
              : "border-stone-200 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/50")
          }
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-stone-700">Drag &amp; drop Excel files here</p>
            <p className="text-xs text-stone-400 mt-1">
              .xlsx / .xls — max 15 MB each, up to 5 files
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
            disabled={uploading}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-stone-50 ring-1 ring-stone-100"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{f.name}</p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-stone-400 hover:text-red-500 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={handleUploadAndParse}
          disabled={uploading || !files.length}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#1f1f1f] font-bold text-sm transition"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" /> Upload &amp; Parse Excel
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Photo thumbnail cell ──────────────────────────────────────────────────────

function PhotoThumb({ src, existingPath, onRemove, onUpload, onClearKept, disabled }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";

    if (!["image/jpeg", "image/png"].includes(f.type)) {
      toast.error("Only JPEG or PNG images are supported.");
      return;
    }

    setProcessing(true);
    try {
      const { dataUrl, finalSizeKB, wasCropped, wasResized } = await processPhoto(f);
      const msgs = [];
      if (wasCropped) msgs.push("ratio corrected");
      if (wasResized) msgs.push("resized");
      if (msgs.length) {
        toast.info("Photo auto-fixed: " + msgs.join(", ") + " (" + finalSizeKB + " KB)");
      }
      onUpload(dataUrl);
    } catch {
      toast.error("Could not process image. Please try a different file.");
    } finally {
      setProcessing(false);
    }
  };

  // Case 1: new photo uploaded
  if (src) {
    return (
      <div className="relative group h-12 w-12 shrink-0">
        <img
          src={src}
          alt="photo"
          className="h-12 w-12 rounded-xl object-cover bg-stone-100 ring-1 ring-stone-200"
        />
        {!disabled && !processing && (
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition shadow"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Case 2: no new photo but existing server-side photo kept from previous submission
  if (existingPath) {
    return (
      <div className="flex flex-col gap-1 items-start">
        <div className="relative group h-12 w-12 shrink-0">
          <img
            src={fileUrl(existingPath)}
            alt="existing photo"
            className="h-12 w-12 rounded-xl object-cover bg-stone-100 ring-2 ring-emerald-400"
          />
          {!disabled && !processing && (
            <button
              onClick={onClearKept}
              title="Remove and upload a new photo"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-orange-500 text-white opacity-0 group-hover:opacity-100 transition shadow"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {!disabled && (
          <button
            onClick={() => !processing && inputRef.current?.click()}
            disabled={processing}
            className="text-[9px] font-semibold text-amber-600 hover:text-amber-800 underline underline-offset-2 leading-snug disabled:opacity-50"
          >
            Replace
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  // Case 3: nothing yet
  return (
    <>
      <button
        onClick={() => !disabled && !processing && inputRef.current?.click()}
        disabled={disabled || processing}
        className="h-12 w-12 shrink-0 flex flex-col items-center justify-center rounded-xl bg-stone-100 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-stone-400 hover:text-amber-600"
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Camera className="h-4 w-4" />
            <span className="text-[9px] font-semibold mt-0.5">Add</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

// ── Editable Row ──────────────────────────────────────────────────────────────

// ── Aadhaar card uploader (mandatory for every person) ───────────────────────
function AadhaarCardUpload({ file, existingPath, onChange, onClearKept, disabled }) {
  const inputRef = useRef(null);
  const MAX_MB = 10;
  const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

  const handle = (e) => {
    const f = e.target.files[0] || null;
    e.target.value = "";
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      toast.error("Aadhaar card must be a PDF, JPG, JPEG or PNG.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Aadhaar card is too large — max ${MAX_MB} MB.`);
      return;
    }
    onChange(f);
  };

  // New file uploaded
  if (file) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          {file.name ? file.name.slice(0, 18) + (file.name.length > 18 ? "…" : "") : "Aadhaar added"}
        </span>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="text-stone-400 hover:text-red-500 transition">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // No new file but existing kept from previous submission
  if (existingPath) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <a
          href={fileUrl(existingPath)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition"
          title="View existing Aadhaar card"
        >
          <CheckCircle2 className="h-3 w-3" /> Aadhaar kept ↗
        </a>
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-dashed border-amber-300 hover:bg-amber-100 transition"
            >
              <Upload className="h-3 w-3" /> Replace
            </button>
            <button type="button" onClick={onClearKept} className="text-stone-400 hover:text-red-500 transition" title="Remove kept Aadhaar">
              <X className="h-3 w-3" />
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handle} />
      </div>
    );
  }

  // Nothing — prompt upload
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition bg-red-50 text-red-600 border border-dashed border-red-300 hover:bg-red-100"
      >
        <Upload className="h-3 w-3" /> Upload Aadhaar *
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handle} />
    </div>
  );
}

function EditableRow({ row, index, onChange, onDelete, disabled, derivedErrors = [] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: row.name,
    aadhaar: row.aadhaar,
    dob: row.dob,
    mobile: row.mobile,
  });

  // Real-time field-level validation of the current draft
  const fieldErrors = getPersonFieldErrors(draft);
  const draftHasErrors = Object.values(fieldErrors).some(Boolean);

  // Blacklist check state for this row
  const [blacklistStatus, setBlacklistStatus] = useState(null); // null | { isBlacklisted, reason }
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);

  // Run blacklist check whenever the saved aadhaar (row.aadhaar) is valid
  useEffect(() => {
    const aadhaar = String(row.aadhaar || "").replace(/\s+/g, "");
    if (!/^\d{12}$/.test(aadhaar)) { setBlacklistStatus(null); return; }
    let cancelled = false;
    setCheckingBlacklist(true);
    checkBulkPassBlacklist("PERSON", aadhaar)
      .then((res) => {
        if (cancelled) return;
        setBlacklistStatus(res.isBlacklisted ? { isBlacklisted: true, reason: res.data?.reason } : { isBlacklisted: false });
      })
      .catch(() => { if (!cancelled) setBlacklistStatus(null); })
      .finally(() => { if (!cancelled) setCheckingBlacklist(false); });
    return () => { cancelled = true; };
  }, [row.aadhaar]);

  // Effective errors (field-level + cross-row duplicate) are computed by the
  // parent and passed in, so they always reflect the latest state of all rows.
  const isPersonBlacklisted = blacklistStatus?.isBlacklisted === true;
  const hasErrors = derivedErrors.length > 0 || isPersonBlacklisted;
  const hasPhoto = !!row.photoDataUrl || !!row._keepPhotoPath;

  const saveEdit = () => {
    if (draftHasErrors) {
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }
    // Persist the entered values. Errors (including duplicate Aadhaar) are
    // re-derived by the parent from the live row values, so nothing stale is kept.
    onChange(index, { ...row, ...draft, parseErrors: [] });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft({ name: row.name, aadhaar: row.aadhaar, dob: row.dob, mobile: row.mobile });
    setEditing(false);
  };

  const rowBg = isPersonBlacklisted
    ? "bg-red-100/60"
    : row._revisionRejected
    ? "bg-red-50/60"
    : hasErrors
    ? "bg-red-50/40"
    : hasPhoto
    ? "bg-emerald-50/20"
    : "";

  return (
    <tr className={"border-b border-stone-50 last:border-b-0 " + rowBg}>
      {/* # */}
      <td className="px-3 py-3 text-xs text-stone-400 tabular-nums font-mono">
        {index + 1}
        {row._revisionRejected && (
          <span
            title={row._revisionReason || "Rejected in previous review"}
            className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-800 border border-red-300 cursor-help"
          >
            ✗ Rejected
          </span>
        )}
      </td>

      {/* Photo */}
      <td className="px-3 py-3">
        <PhotoThumb
          src={row.photoDataUrl}
          existingPath={!row.photoDataUrl ? row._keepPhotoPath : null}
          disabled={disabled}
          onUpload={(dataUrl) =>
            onChange(index, {
              ...row,
              photoDataUrl: dataUrl,
              _keepPhotoPath: null,
              parseErrors: (row.parseErrors || []).filter((e) => !e.includes("Photo")),
            })
          }
          onRemove={() => onChange(index, { ...row, photoDataUrl: null })}
          onClearKept={() => onChange(index, { ...row, _keepPhotoPath: null })}
        />
      </td>

      {/* Name */}
      <td className="px-3 py-3 min-w-[160px]">
        {editing ? (
          <>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className={
                "w-full px-2 py-1.5 rounded-lg ring-1 text-sm font-semibold text-stone-800 outline-none bg-white " +
                (fieldErrors.name ? "ring-red-400" : "ring-amber-400")
              }
            />
            {fieldErrors.name && (
              <p className="text-[10px] text-red-500 mt-1 leading-snug">{fieldErrors.name}</p>
            )}
          </>
        ) : (
          <span className="text-sm font-semibold text-stone-800">
            {row.name || <span className="text-red-400 italic text-xs">Missing</span>}
          </span>
        )}
      </td>

      {/* Aadhaar */}
      <td className="px-3 py-3 min-w-[150px]">
        {editing ? (
          <>
            <input
              value={draft.aadhaar}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12),
                }))
              }
              maxLength={12}
              className={
                "w-full px-2 py-1.5 rounded-lg ring-1 text-sm font-mono outline-none bg-white " +
                (fieldErrors.aadhaar ? "ring-red-400" : "ring-amber-400")
              }
            />
            {fieldErrors.aadhaar && (
              <p className="text-[10px] text-red-500 mt-1 leading-snug">{fieldErrors.aadhaar}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-stone-600">
              {row.aadhaar ? (
                "XXXX XXXX " + String(row.aadhaar).slice(-4)
              ) : (
                <span className="text-red-400 italic">Missing</span>
              )}
            </span>
            {checkingBlacklist && (
              <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                <span className="h-2 w-2 rounded-full bg-stone-300 animate-pulse" /> Checking…
              </span>
            )}
            {!checkingBlacklist && isPersonBlacklisted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                🚫 BLACKLISTED
              </span>
            )}
            {!checkingBlacklist && blacklistStatus && !blacklistStatus.isBlacklisted && /^\d{12}$/.test(String(row.aadhaar || "").replace(/\s+/g, "")) && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                ✓ Clear
              </span>
            )}
          </div>
        )}
      </td>

      {/* DOB */}
      <td className="px-3 py-3 min-w-[130px]">
        {editing ? (
          <>
            <input
              value={draft.dob}
              onChange={(e) => setDraft((p) => ({ ...p, dob: formatDobInput(e.target.value) }))}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              maxLength={10}
              className={
                "w-full px-2 py-1.5 rounded-lg ring-1 text-sm outline-none bg-white " +
                (fieldErrors.dob ? "ring-red-400" : "ring-amber-400")
              }
            />
            {fieldErrors.dob && (
              <p className="text-[10px] text-red-500 mt-1 leading-snug">{fieldErrors.dob}</p>
            )}
          </>
        ) : (
          <span className="text-xs text-stone-600">{row.dob || "—"}</span>
        )}
      </td>

      {/* Mobile */}
      <td className="px-3 py-3 min-w-[120px]">
        {editing ? (
          <>
            <input
              value={draft.mobile}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
              maxLength={10}
              className={
                "w-full px-2 py-1.5 rounded-lg ring-1 text-sm font-mono outline-none bg-white " +
                (fieldErrors.mobile ? "ring-red-400" : "ring-amber-400")
              }
            />
            {fieldErrors.mobile && (
              <p className="text-[10px] text-red-500 mt-1 leading-snug">{fieldErrors.mobile}</p>
            )}
          </>
        ) : (
          <span className="text-xs font-mono text-stone-600">{row.mobile || "—"}</span>
        )}
      </td>

      {/* Aadhaar Card (mandatory for every person) */}
      <td className="px-3 py-3 min-w-[140px]">
        <AadhaarCardUpload
          file={row.aadhaarCardFile}
          existingPath={!row.aadhaarCardFile ? row._keepAadhaarPath : null}
          disabled={disabled}
          onChange={(f) => onChange(index, { ...row, aadhaarCardFile: f, _keepAadhaarPath: null })}
          onClearKept={() => onChange(index, { ...row, _keepAadhaarPath: null })}
        />
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        {isPersonBlacklisted ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-200 text-red-800 border border-red-400 whitespace-nowrap">
            🚫 Blacklisted
          </span>
        ) : hasErrors ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
            <XCircle className="h-3 w-3" /> Error
          </span>
        ) : !hasPhoto ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Camera className="h-3 w-3" /> No photo
          </span>
        ) : !row.aadhaarCardFile && !row._keepAadhaarPath ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
            <FileText className="h-3 w-3" /> No Aadhaar card
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        )}
      </td>

      {/* Error message */}
      <td className="px-3 py-3 max-w-[200px]">
        {isPersonBlacklisted && (
          <p className="text-[11px] font-bold text-red-700 leading-snug">
            🚫 {blacklistStatus.reason || "This person is blacklisted at Chennai Port."}
          </p>
        )}
        {!isPersonBlacklisted && hasErrors && (
          <p className="text-[11px] text-red-600 leading-snug">{derivedErrors.join("; ")}</p>
        )}
      </td>

      {/* Actions */}
      <td className="sticky right-0 z-10 px-3 py-3 bg-inherit shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={draftHasErrors}
                title={draftHasErrors ? "Fix the highlighted fields to save" : "Save"}
                className={
                  "h-7 w-7 flex items-center justify-center rounded-lg transition " +
                  (draftHasErrors
                    ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                    : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")
                }
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              {!disabled && (
                <button
                  onClick={() => setEditing(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-amber-100 hover:text-amber-600 transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {!disabled && (
                <button
                  onClick={() => onDelete(index)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-red-100 hover:text-red-500 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Step 2: Edit form + photo management ─────────────────────────────────────

// Vehicle document upload button
function DocUpload({ label, file, existingPath, onChange, onClearKept, required, disabled }) {
  const inputRef = useRef(null);

  const MAX_DOC_MB = 10;
  const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

  const handleFileSelect = (e) => {
    const f = e.target.files[0] || null;
    e.target.value = "";
    if (!f) return;

    if (!ALLOWED_DOC_TYPES.includes(f.type)) {
      toast.error(`"${label}": only PDF, JPEG or PNG files are allowed.`);
      return;
    }
    if (f.size > MAX_DOC_MB * 1024 * 1024) {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
      toast.error(`"${label}" is ${sizeMb} MB — exceeds the ${MAX_DOC_MB} MB limit. Please upload a smaller file.`);
      return;
    }
    onChange(f);
  };

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Case 1: new file uploaded */}
        {file ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {typeof file.name === "string"
                ? file.name.slice(0, 18) + (file.name.length > 18 ? "…" : "")
                : "Uploaded"}
            </span>
            {!disabled && (
              <button type="button" onClick={() => onChange(null)} className="text-stone-400 hover:text-red-500 transition">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : existingPath ? (
          /* Case 2: no new file but kept from previous submission */
          <>
            <a
              href={fileUrl(existingPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition"
              title={`View existing ${label}`}
            >
              <CheckCircle2 className="h-3 w-3" /> Kept ↗
            </a>
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-dashed border-amber-300 hover:bg-amber-100 transition"
                >
                  <Upload className="h-3 w-3" /> Replace
                </button>
                <button type="button" onClick={onClearKept} className="text-stone-400 hover:text-red-500 transition" title="Remove kept file">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </>
        ) : (
          /* Case 3: nothing */
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
            className={
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition " +
              (required
                ? "bg-red-50 text-red-600 border border-dashed border-red-300 hover:bg-red-100"
                : "bg-stone-100 text-stone-600 border border-dashed border-stone-300 hover:bg-stone-200")
            }
          >
            <Upload className="h-3 w-3" /> Upload
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      <p className="text-[9px] text-stone-400 mt-1">PDF, JPEG or PNG · max {MAX_DOC_MB} MB</p>
    </div>
  );
}

// Vehicle add/edit modal
function VehicleModal({ vehicle, onSave, onClose }) {
  const emptyVehicle = {
    // Driver particulars
    driverName: "", driverAadhaar: "", driverMobile: "", driverDob: "",
    driverLicenseNumber: "",
    driverAadhaarCard: null,
    driverLicense: null,
    // Vehicle details
    regNo: "", vehicleType: "",
    // Documents
    rc: null, insurance: null, fitness: null, permit: null, roadTax: null, emission: null,
    // Kept docs from previous submission (revision mode)
    _keepVehicleDocs: {},
  };
  const [form, setForm] = useState(vehicle || emptyVehicle);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [vehicleBlacklist, setVehicleBlacklist] = useState(null); // null | { isBlacklisted, reason }
  const [driverBlacklist, setDriverBlacklist] = useState(null);

  // ULIP validity check state
  // null = not checked yet, "loading" = in progress
  // object = { found, allValid, rcActive, rcStatus, validityChecks[], expired[], makerModel, vehicleClass }
  // "error" = service unavailable
  const [ulipValidity, setUlipValidity] = useState(null);
  const [ulipLoading, setUlipLoading] = useState(false);

  // Ref for the Registration Number input — used to trap focus when verification
  // is incomplete or has failed, so the user cannot proceed to the next field.
  const regNoRef = useRef(null);

  // Derived: is the reg-number field "cleared" to allow tab-out?
  // true  → check passed (or service unavailable — soft pass)
  // false → still loading, or check found blocking issues
  const regNoCleared =
    isValidRegNo(form.regNo) &&
    !ulipLoading &&
    (
      ulipValidity === "error" ||                                   // service down → soft pass
      (ulipValidity && ulipValidity !== "error" && ulipValidity.found && ulipValidity.allValid && ulipValidity.rcActive) ||
      (ulipValidity && ulipValidity !== "error" && !ulipValidity.found) // not in DB → soft pass
    );

  // Real-time blacklist check: vehicle reg number
  useEffect(() => {
    const reg = form.regNo.replace(/[\s\-]/g, "").toUpperCase();
    if (!reg || !isValidRegNo(form.regNo)) { setVehicleBlacklist(null); return; }
    let cancelled = false;
    checkBulkPassBlacklist("VEHICLE", reg)
      .then((res) => { if (!cancelled) setVehicleBlacklist(res.isBlacklisted ? { isBlacklisted: true, reason: res.data?.reason } : { isBlacklisted: false }); })
      .catch(() => { if (!cancelled) setVehicleBlacklist(null); });
    return () => { cancelled = true; };
  }, [form.regNo]);

  // Real-time blacklist check: driver Aadhaar
  useEffect(() => {
    const aadhaar = form.driverAadhaar.replace(/\s+/g, "");
    if (!/^\d{12}$/.test(aadhaar)) { setDriverBlacklist(null); return; }
    let cancelled = false;
    checkBulkPassBlacklist("PERSON", aadhaar)
      .then((res) => { if (!cancelled) setDriverBlacklist(res.isBlacklisted ? { isBlacklisted: true, reason: res.data?.reason } : { isBlacklisted: false }); })
      .catch(() => { if (!cancelled) setDriverBlacklist(null); });
    return () => { cancelled = true; };
  }, [form.driverAadhaar]);

  // ULIP real-time validity check: triggered when reg number becomes valid
  useEffect(() => {
    if (!isValidRegNo(form.regNo)) { setUlipValidity(null); return; }
    let cancelled = false;
    setUlipLoading(true);
    setUlipValidity(null);
    checkVehicleValidity(form.regNo)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) { setUlipValidity("error"); }
        else { setUlipValidity(res); }
      })
      .catch(() => { if (!cancelled) setUlipValidity("error"); })
      .finally(() => { if (!cancelled) setUlipLoading(false); });
    return () => { cancelled = true; };
  }, [form.regNo]);

  // Pure validator — computes the full error map for the current form.
  const getVehicleErrors = (f) => {
    const e = {};
    // Driver particulars
    if (!f.driverName.trim()) e.driverName = "Driver name is required";
    if (!f.driverAadhaar.trim()) e.driverAadhaar = "Aadhaar number is required";
    else if (!/^\d{12}$/.test(f.driverAadhaar.replace(/\s+/g, ""))) e.driverAadhaar = "Aadhaar must be exactly 12 digits";
    if (!f.driverAadhaarCard && !(f._keepVehicleDocs && f._keepVehicleDocs.driverAadhaarCard)) e.driverAadhaarCard = "Driver Aadhaar card document is required";
    if (!f.driverMobile.trim()) e.driverMobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(f.driverMobile.replace(/\s+/g, ""))) e.driverMobile = "Enter a valid 10-digit mobile starting with 6–9";
    // DOB is optional, but if provided it must be a valid past date
    if (f.driverDob && f.driverDob.trim()) {
      const dobErr = validateDobField(f.driverDob);
      if (dobErr) e.driverDob = dobErr;
    }
    // Vehicle
    if (!f.regNo.trim()) e.regNo = "Registration number is required";
    else if (!isValidRegNo(f.regNo)) e.regNo = "Enter a valid registration number (e.g. TN01AB1234 or 22BH1234AA)";
    // Block save when ULIP check is still running or found a blocking issue
    else if (ulipLoading) e.regNo = "Vehicle verification in progress — please wait";
    else if (ulipValidity && ulipValidity !== "error" && ulipValidity.found && !ulipValidity.rcActive) e.regNo = "RC status is not ACTIVE — vehicle cannot be entered";
    else if (ulipValidity && ulipValidity !== "error" && ulipValidity.found && ulipValidity.expired?.length > 0) {
      const labels = ulipValidity.expired.map((ex) => ex.label).join(", ");
      e.regNo = `Expired certificate(s): ${labels}`;
    }
    // Mandatory docs
    if (!f.rc && !(f._keepVehicleDocs && f._keepVehicleDocs.rc)) e.rc = "Registration Certificate is mandatory";
    if (!f.insurance && !(f._keepVehicleDocs && f._keepVehicleDocs.insurance)) e.insurance = "Insurance document is mandatory";
    return e;
  };

  // Real-time errors: recomputed every render from the current form.
  const liveErrors = getVehicleErrors(form);
  const hasErrors = Object.keys(liveErrors).length > 0;
  // Only surface a field's error once it's been touched or a save was attempted.
  const shownError = (key) => (touched[key] || submitAttempted ? liveErrors[key] : undefined);
  const markTouched = (key) => setTouched((p) => ({ ...p, [key]: true }));

  const handleSave = () => {
    setSubmitAttempted(true);
    if (vehicleBlacklist?.isBlacklisted) {
      toast.error("This vehicle is blacklisted and cannot be added. Reason: " + (vehicleBlacklist.reason || "Blacklisted at Chennai Port."));
      return;
    }
    if (driverBlacklist?.isBlacklisted) {
      toast.error("The driver is blacklisted and cannot be added. Reason: " + (driverBlacklist.reason || "Blacklisted at Chennai Port."));
      return;
    }
    // Block if ULIP check returned expired validities
    if (ulipValidity && ulipValidity !== "error" && ulipValidity.found) {
      if (!ulipValidity.rcActive) {
        toast.error("This vehicle's RC status is not ACTIVE and cannot be entered.");
        return;
      }
      if (ulipValidity.expired && ulipValidity.expired.length > 0) {
        const labels = ulipValidity.expired.map((e) => `${e.label} (expired ${e.date})`).join(", ");
        toast.error(`Vehicle cannot be added — expired: ${labels}`);
        return;
      }
    }
    if (ulipLoading) {
      toast.warning("Please wait for vehicle verification to complete.");
      return;
    }
    if (hasErrors) { toast.error("Please fix the errors before saving."); return; }
    onSave(form);
  };

  const inp = (key, extra = {}) => ({
    value: form[key],
    onChange: (e) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      markTouched(key);
    },
    onBlur: () => markTouched(key),
    className: "w-full px-3 py-2 rounded-xl border text-sm outline-none transition " +
      (shownError(key) ? "border-red-400 bg-red-50" : "border-stone-200 bg-stone-50 focus:ring-2 focus:ring-amber-400/40"),
    ...extra,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={card + " w-full max-w-xl max-h-[90vh] flex flex-col"}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <h3 className="text-base font-bold text-stone-800 flex items-center gap-2">
            <Car className="h-4 w-4 text-amber-600" />
            {vehicle ? "Edit Vehicle" : "Add Vehicle"}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Driver / Applicant details */}
          <div>
            <p className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-600" /> Driver / Applicant Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input {...inp("driverName")} placeholder="Full name of the driver" />
                {shownError("driverName") && <p className="text-xs text-red-500 mt-1">{shownError("driverName")}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Aadhaar Number <span className="text-red-500">*</span></label>
                <input {...inp("driverAadhaar")} placeholder="12-digit Aadhaar"
                  onChange={(e) => { setForm((p) => ({ ...p, driverAadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })); markTouched("driverAadhaar"); }}
                  maxLength={12} />
                {shownError("driverAadhaar") && <p className="text-xs text-red-500 mt-1">{shownError("driverAadhaar")}</p>}
                {driverBlacklist?.isBlacklisted && (
                  <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-2 rounded-xl bg-red-50 border border-red-300">
                    <span className="text-red-600 text-[11px] font-bold leading-snug">🚫 BLACKLISTED: {driverBlacklist.reason || "This driver is blacklisted at Chennai Port."}</span>
                  </div>
                )}
                {driverBlacklist && !driverBlacklist.isBlacklisted && /^\d{12}$/.test(form.driverAadhaar.replace(/\s+/g,"")) && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Driver clear</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <input {...inp("driverMobile")} placeholder="10-digit mobile"
                  onChange={(e) => { setForm((p) => ({ ...p, driverMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })); markTouched("driverMobile"); }}
                  maxLength={10} />
                {shownError("driverMobile") && <p className="text-xs text-red-500 mt-1">{shownError("driverMobile")}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Date of Birth</label>
                <input {...inp("driverDob")} placeholder="DD/MM/YYYY" inputMode="numeric" maxLength={10}
                  onChange={(e) => { setForm((p) => ({ ...p, driverDob: formatDobInput(e.target.value) })); markTouched("driverDob"); }} />
                {shownError("driverDob") && <p className="text-xs text-red-500 mt-1">{shownError("driverDob")}</p>}
              </div>
            </div>

            {/* Driver Aadhaar Card document (mandatory) */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Driver Aadhaar Card <span className="text-red-500">*</span>
              </label>
              <DocUpload
                label="Aadhaar Card"
                file={form.driverAadhaarCard}
                existingPath={!form.driverAadhaarCard ? (form._keepVehicleDocs && form._keepVehicleDocs.driverAadhaarCard) : null}
                required
                disabled={false}
                onChange={(f) => { setForm((p) => ({ ...p, driverAadhaarCard: f, _keepVehicleDocs: { ...p._keepVehicleDocs, driverAadhaarCard: null } })); markTouched("driverAadhaarCard"); }}
                onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, driverAadhaarCard: null } }))}
              />
              {shownError("driverAadhaarCard") && (
                <p className="text-xs text-red-500 mt-1">{shownError("driverAadhaarCard")}</p>
              )}
            </div>

            {/* Driver License Number + Document */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Driver License Number
                </label>
                <input
                  value={form.driverLicenseNumber}
                  onChange={(e) => setForm((p) => ({ ...p, driverLicenseNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) }))}
                  placeholder="e.g. TN0120220012345"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-amber-400/40 text-sm outline-none transition font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Driver License Document
                </label>
                <DocUpload
                  label="Driver License"
                  file={form.driverLicense}
                  existingPath={!form.driverLicense ? (form._keepVehicleDocs && form._keepVehicleDocs.driverLicense) : null}
                  required={false}
                  disabled={false}
                  onChange={(f) => setForm((p) => ({ ...p, driverLicense: f, _keepVehicleDocs: { ...p._keepVehicleDocs, driverLicense: null } }))}
                  onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, driverLicense: null } }))}
                />
              </div>
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Vehicle details */}
          <div>
            <p className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-amber-600" /> Vehicle Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Registration Number <span className="text-red-500">*</span></label>
                <input
                  {...inp("regNo")}
                  ref={regNoRef}
                  placeholder="e.g. TN01AB1234"
                  maxLength={11}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, regNo: formatRegNo(e.target.value) }));
                    markTouched("regNo");
                  }}
                  onBlur={(e) => {
                    markTouched("regNo");
                    // Only intercept if the reg number looks complete (valid format)
                    if (!isValidRegNo(form.regNo)) return;
                    // Still loading — snap focus back and warn
                    if (ulipLoading) {
                      e.preventDefault();
                      setTimeout(() => regNoRef.current?.focus(), 0);
                      toast.warning("Please wait — verifying vehicle registration…");
                      return;
                    }
                    // Blocking failures — snap focus back
                    if (ulipValidity && ulipValidity !== "error" && ulipValidity.found) {
                      if (!ulipValidity.rcActive) {
                        e.preventDefault();
                        setTimeout(() => regNoRef.current?.focus(), 0);
                        toast.error("RC status is not ACTIVE — correct the registration number.");
                        return;
                      }
                      if (ulipValidity.expired && ulipValidity.expired.length > 0) {
                        e.preventDefault();
                        setTimeout(() => regNoRef.current?.focus(), 0);
                        const labels = ulipValidity.expired.map((ex) => ex.label).join(", ");
                        toast.error(`Vehicle has expired certificate(s): ${labels} — correct the registration number.`);
                        return;
                      }
                    }
                    // Blacklisted vehicle — snap focus back
                    if (vehicleBlacklist?.isBlacklisted) {
                      e.preventDefault();
                      setTimeout(() => regNoRef.current?.focus(), 0);
                      toast.error("This vehicle is blacklisted — correct the registration number.");
                      return;
                    }
                    // All good (or service unavailable) — allow normal tab-out
                  }}
                />
                {shownError("regNo") && <p className="text-xs text-red-500 mt-1">{shownError("regNo")}</p>}
                {vehicleBlacklist?.isBlacklisted && (
                  <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-2 rounded-xl bg-red-50 border border-red-300">
                    <span className="text-red-600 text-[11px] font-bold leading-snug">🚫 BLACKLISTED: {vehicleBlacklist.reason || "This vehicle is blacklisted at Chennai Port."}</span>
                  </div>
                )}
                {vehicleBlacklist && !vehicleBlacklist.isBlacklisted && isValidRegNo(form.regNo) && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Vehicle clear</p>
                )}

                {/* ULIP validity check feedback */}
                {ulipLoading && isValidRegNo(form.regNo) && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500 font-semibold px-2.5 py-2 rounded-xl bg-stone-50 border border-stone-200">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500" /> Verifying vehicle registration — please wait…
                  </div>
                )}
                {!ulipLoading && ulipValidity === "error" && (
                  <p className="text-[11px] text-amber-600 mt-1">⚠ Vehicle verification service unavailable — you may still proceed.</p>
                )}
                {!ulipLoading && ulipValidity && ulipValidity !== "error" && !ulipValidity.found && (
                  <p className="text-[11px] text-amber-600 mt-1">⚠ Vehicle not found in VAHAN database — verify the number.</p>
                )}
                {!ulipLoading && ulipValidity && ulipValidity !== "error" && ulipValidity.found && (
                  <div className="mt-2 rounded-xl border overflow-hidden text-[11px]">
                    {/* Validity rows — tick/cross only, no dates or sensitive details */}
                    {ulipValidity.rcStatus && (
                      <div className={`flex items-center justify-between px-3 py-1.5 border-b border-stone-100 ${!ulipValidity.rcActive ? "bg-red-50" : "bg-white"}`}>
                        <span className="text-stone-500">RC Status</span>
                        <span className={`font-bold ${ulipValidity.rcActive ? "text-emerald-600" : "text-red-600"}`}>
                          {ulipValidity.rcActive ? "✓ Valid" : "✗ Invalid"}
                        </span>
                      </div>
                    )}
                    {ulipValidity.validityChecks.map((c, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-1.5 ${i < ulipValidity.validityChecks.length - 1 ? "border-b border-stone-100" : ""} ${c.expired ? "bg-red-50" : "bg-white"}`}>
                        <span className="text-stone-500">{c.label}</span>
                        <span className={`font-bold ${c.expired ? "text-red-600" : "text-emerald-600"}`}>
                          {c.expired ? "✗ Expired" : "✓ Valid"}
                        </span>
                      </div>
                    ))}
                    {/* Overall banner */}
                    {ulipValidity.allValid && ulipValidity.rcActive ? (
                      <div className="px-3 py-2 bg-emerald-50 text-emerald-700 font-bold text-center">✓ Vehicle documents verified</div>
                    ) : (
                      <div className="px-3 py-2 bg-red-50 text-red-700 font-bold text-center">
                        ✗ {!ulipValidity.rcActive ? "RC not active" : `${ulipValidity.expired.length} expired certificate(s) — update before entering port`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Vehicle Type</label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => { setForm((p) => ({ ...p, vehicleType: e.target.value })); markTouched("vehicleType"); }}
                  disabled={isValidRegNo(form.regNo) && !regNoCleared}
                  title={isValidRegNo(form.regNo) && !regNoCleared ? "Complete vehicle registration verification first" : undefined}
                  className={
                    "w-full px-3 py-2 rounded-xl border text-sm outline-none transition " +
                    (isValidRegNo(form.regNo) && !regNoCleared
                      ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed"
                      : "border-stone-200 bg-stone-50 focus:ring-2 focus:ring-amber-400/40")
                  }
                >
                  <option value="">Select vehicle type…</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {isValidRegNo(form.regNo) && !regNoCleared && (
                  <p className="text-[10px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> Waiting for registration verification…
                  </p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Documents */}
          <div>
            <p className="text-xs font-bold text-stone-700 mb-3">Documents</p>
            {isValidRegNo(form.regNo) && !regNoCleared && (
              <div className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-700 font-semibold">
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                Complete vehicle registration verification to upload documents.
              </div>
            )}
            <div className={`grid grid-cols-2 gap-x-6 gap-y-4 ${isValidRegNo(form.regNo) && !regNoCleared ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <DocUpload label="Registration Certificate" file={form.rc} existingPath={!form.rc ? (form._keepVehicleDocs && form._keepVehicleDocs.rc) : null} required onChange={(f) => { setForm((p) => ({ ...p, rc: f, _keepVehicleDocs: { ...p._keepVehicleDocs, rc: null } })); markTouched("rc"); }} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, rc: null } }))} />
              {shownError("rc") && <p className="text-xs text-red-500 -mt-3 col-span-2">{shownError("rc")}</p>}
              <DocUpload label="Insurance" file={form.insurance} existingPath={!form.insurance ? (form._keepVehicleDocs && form._keepVehicleDocs.insurance) : null} required onChange={(f) => { setForm((p) => ({ ...p, insurance: f, _keepVehicleDocs: { ...p._keepVehicleDocs, insurance: null } })); markTouched("insurance"); }} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, insurance: null } }))} />
              {shownError("insurance") && <p className="text-xs text-red-500 -mt-3 col-span-2">{shownError("insurance")}</p>}
              <DocUpload label="Fitness Certificate" file={form.fitness} existingPath={!form.fitness ? (form._keepVehicleDocs && form._keepVehicleDocs.fitness) : null} onChange={(f) => setForm((p) => ({ ...p, fitness: f, _keepVehicleDocs: { ...p._keepVehicleDocs, fitness: null } }))} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, fitness: null } }))} />
              <DocUpload label="Permit" file={form.permit} existingPath={!form.permit ? (form._keepVehicleDocs && form._keepVehicleDocs.permit) : null} onChange={(f) => setForm((p) => ({ ...p, permit: f, _keepVehicleDocs: { ...p._keepVehicleDocs, permit: null } }))} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, permit: null } }))} />
              <DocUpload label="Road Tax" file={form.roadTax} existingPath={!form.roadTax ? (form._keepVehicleDocs && form._keepVehicleDocs.roadTax) : null} onChange={(f) => setForm((p) => ({ ...p, roadTax: f, _keepVehicleDocs: { ...p._keepVehicleDocs, roadTax: null } }))} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, roadTax: null } }))} />
              <DocUpload label="Emission Certificate (PUCC)" file={form.emission} existingPath={!form.emission ? (form._keepVehicleDocs && form._keepVehicleDocs.emission) : null} onChange={(f) => setForm((p) => ({ ...p, emission: f, _keepVehicleDocs: { ...p._keepVehicleDocs, emission: null } }))} onClearKept={() => setForm((p) => ({ ...p, _keepVehicleDocs: { ...p._keepVehicleDocs, emission: null } }))} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-stone-100 justify-end shrink-0">
          {submitAttempted && hasErrors && (
            <p className="mr-auto text-xs text-red-500 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Fix the highlighted fields
            </p>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 transition">Cancel</button>
          <button
            onClick={handleSave}
            className={
              "px-5 py-2.5 rounded-2xl text-sm font-bold text-[#1f1f1f] transition " +
              (submitAttempted && hasErrors
                ? "bg-amber-200 cursor-not-allowed"
                : "bg-amber-400 hover:bg-amber-500")
            }
          >
            {vehicle ? "Save Changes" : "Add Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditFormStep({ rows, token, batch, onRowsChange, vehicles, onVehiclesChange, onBack, onSubmit, submitting }) {
  const zipInputRef = useRef(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipResult, setZipResult] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null); // null | { index: number | null, data: object | null }

  const maxPersons = Number(batch?.noOfPersons) || 30;
  const maxVehicles = Number(batch?.noOfVehicles) || 0;

  // ── Effective per-row errors (field-level + cross-row duplicate Aadhaar) ──
  // Duplicate detection is computed across ALL current rows so that fixing one
  // row's Aadhaar immediately clears the duplicate flag on every affected row.
  const normAadhaar = (r) => String(r.aadhaar || "").replace(/\s+/g, "");
  const dupAadhaarSet = (() => {
    const counts = new Map();
    rows.forEach((r) => {
      const a = normAadhaar(r);
      if (/^\d{12}$/.test(a)) counts.set(a, (counts.get(a) || 0) + 1);
    });
    return new Set(
      [...counts.entries()].filter(([, c]) => c > 1).map(([a]) => a)
    );
  })();

  const rowErrors = rows.map((r) => {
    const errs = buildParseErrors(r); // live field-level validation from row values
    const a = normAadhaar(r);
    if (/^\d{12}$/.test(a) && dupAadhaarSet.has(a)) errs.push("Duplicate Aadhaar");
    // Preserve rare structural errors (e.g. per-file row limit) from parsing.
    const structural = (r.parseErrors || []).filter((e) => /exceeds|200 rows/i.test(e));
    return [...structural, ...errs];
  });

  const errorRows = rows.filter((_, i) => rowErrors[i].length > 0);
  const noPhotoRows = rows.filter((r) => !r.photoDataUrl && !r._keepPhotoPath);
  const readyRows = rows.filter((r, i) => (r.photoDataUrl || r._keepPhotoPath) && rowErrors[i].length === 0);

  // Count limits: fewer than the max is fine, more than the max is not.
  const personsExceeded = maxPersons > 0 && rows.length > maxPersons;
  const vehiclesExceeded = maxVehicles > 0 && vehicles.length > maxVehicles;

  // Aadhaar card satisfied if a new file is uploaded OR a previous path is being kept
  const aadhaarCardsMissing = rows.filter((r) => !r.aadhaarCardFile && !r._keepAadhaarPath).length;

  // Persons must be valid + within limit; if vehicles are required, at least one
  // must be added and the count must not exceed the allowed maximum.
  const personsReady =
    rows.length > 0 &&
    errorRows.length === 0 &&
    noPhotoRows.length === 0 &&
    !personsExceeded &&
    aadhaarCardsMissing === 0;
  // Driver Aadhaar card satisfied if a new file is uploaded OR a previous path is being kept
  const vehicleAadhaarCardsMissing = vehicles.filter(
    (v) => !v.driverAadhaarCard && !(v._keepVehicleDocs && v._keepVehicleDocs.driverAadhaarCard)
  ).length;

  const vehiclesReady =
    (maxVehicles === 0 || vehicles.length > 0) &&
    !vehiclesExceeded &&
    vehicleAadhaarCardsMissing === 0;
  const canSubmit = personsReady && vehiclesReady;

  const handleRowChange = (index, updatedRow) => {
    onRowsChange((prev) => prev.map((r, i) => (i === index ? updatedRow : r)));
  };

  const handleDeleteRow = (index) => {
    onRowsChange((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    onRowsChange((prev) => [
      ...prev,
      {
        id: "manual_" + Date.now(),
        fileName: "manual",
        rowNumber: prev.length + 1,
        name: "",
        aadhaar: "",
        dob: "",
        mobile: "",
        photoDataUrl: null,
        parseErrors: ["Name is required"],
      },
    ]);
  };

  const handleSaveVehicle = (data) => {
    if (vehicleModal.index !== null) {
      onVehiclesChange((prev) => prev.map((v, i) => (i === vehicleModal.index ? data : v)));
    } else {
      onVehiclesChange((prev) => [...prev, { ...data, id: "veh_" + Date.now() }]);
    }
    setVehicleModal(null);
  };

  const handleDeleteVehicle = (index) => {
    onVehiclesChange((prev) => prev.filter((_, i) => i !== index));
  };

  const handleZipUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    if (!f.name.toLowerCase().endsWith(".zip")) { toast.error("Please select a .zip file."); return; }
    if (f.size > 100 * 1024 * 1024) { toast.error("Zip file must be ≤ 100 MB."); return; }
    setZipUploading(true);
    setZipResult(null);
    try {
      const result = await uploadZipPhotos(token, f);
      const skipped = Array.isArray(result.skipped) ? result.skipped : [];

      if (result.matched && result.matched.length > 0) {
        const processed = await Promise.all(
          result.matched.map(async (m) => {
            try { const { dataUrl } = await processPhoto(m.photoDataUrl); return { serial: m.serial, photoDataUrl: dataUrl }; }
            catch { return { serial: m.serial, photoDataUrl: m.photoDataUrl }; }
          })
        );
        // Map serial number → photo, then assign to the row at that position.
        const photoMap = new Map(processed.map((m) => [Number(m.serial), m.photoDataUrl]));
        const appliedSerials = new Set();
        onRowsChange((prev) =>
          prev.map((row, idx) => {
            const serial = idx + 1;
            if (photoMap.has(serial)) {
              appliedSerials.add(serial);
              return { ...row, photoDataUrl: photoMap.get(serial), parseErrors: (row.parseErrors || []).filter((e) => !e.includes("Photo")) };
            }
            return row;
          })
        );
        const appliedCount = appliedSerials.size;
        // Valid-named photos whose serial has no matching person row.
        const unmatched = processed
          .map((m) => Number(m.serial))
          .filter((serial) => !appliedSerials.has(serial));

        if (appliedCount > 0) {
          toast.success(`${appliedCount} photo(s) matched by serial number.`);
        }
        if (unmatched.length > 0) {
          toast.warning(`${unmatched.length} photo(s) had no matching person row (serial: ${unmatched.sort((a, b) => a - b).join(", ")}).`);
        }
        if (skipped.length > 0) {
          toast.warning(`${skipped.length} file(s) skipped due to invalid names or format.`);
        }
        if (appliedCount === 0 && unmatched.length === 0) {
          toast.warning("No photos matched. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).");
        }
        setZipResult({ appliedCount, unmatched, skipped });
      } else {
        if (skipped.length > 0) {
          toast.warning(`All ${skipped.length} file(s) were skipped. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).`);
        } else {
          toast.warning("No photos matched. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).");
        }
        setZipResult({ appliedCount: 0, unmatched: [], skipped });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to process zip file.");
    } finally { setZipUploading(false); }
  };

  // ── Folder upload handler (webkitdirectory) ─────────────────────────────
  const folderInputRef = useRef(null);
  const [folderProcessing, setFolderProcessing] = useState(false);

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    // Filter to image files only
    const imageFiles = files.filter((f) => /\.(jpe?g|png)$/i.test(f.name));
    if (imageFiles.length === 0) {
      toast.error("No image files found in the selected folder.");
      return;
    }

    setFolderProcessing(true);
    setZipResult(null);
    try {
      const matched = [];
      const skipped = [];

      for (const file of imageFiles) {
        const ext = file.name.split(".").pop().toLowerCase();
        const stem = file.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "");

        // Filename must be the person's serial number (row order in template)
        if (!/^\d+$/.test(stem) || parseInt(stem, 10) < 1) {
          skipped.push({ filename: file.name, reason: "Filename must be the serial number (e.g. 1.jpg, 2.jpg)" });
          continue;
        }

        // Read file as dataUrl
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Process photo (resize/crop)
        try {
          const { dataUrl: processed } = await processPhoto(dataUrl);
          matched.push({ serial: parseInt(stem, 10), photoDataUrl: processed });
        } catch {
          matched.push({ serial: parseInt(stem, 10), photoDataUrl: dataUrl });
        }
      }

      if (matched.length > 0) {
        const photoMap = new Map(matched.map((m) => [Number(m.serial), m.photoDataUrl]));
        const appliedSerials = new Set();
        onRowsChange((prev) =>
          prev.map((row, idx) => {
            const serial = idx + 1;
            if (photoMap.has(serial)) {
              appliedSerials.add(serial);
              return { ...row, photoDataUrl: photoMap.get(serial), parseErrors: (row.parseErrors || []).filter((err) => !err.includes("Photo")) };
            }
            return row;
          })
        );
        const appliedCount = appliedSerials.size;
        // Valid-named photos whose serial has no matching person row.
        const unmatched = matched
          .map((m) => Number(m.serial))
          .filter((serial) => !appliedSerials.has(serial));

        if (appliedCount > 0) {
          toast.success(`${appliedCount} photo(s) matched by serial number.`);
        }
        if (unmatched.length > 0) {
          toast.warning(`${unmatched.length} photo(s) had no matching person row (serial: ${unmatched.sort((a, b) => a - b).join(", ")}).`);
        }
        if (skipped.length > 0) {
          toast.warning(`${skipped.length} file(s) skipped due to invalid names.`);
        }
        if (appliedCount === 0 && unmatched.length === 0) {
          toast.warning("No photos matched. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).");
        }
        setZipResult({ appliedCount, unmatched, skipped });
      } else {
        if (skipped.length > 0) {
          toast.warning(`All ${skipped.length} file(s) were skipped. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).`);
        } else {
          toast.warning("No photos matched. Name each photo by its serial number (e.g. 1.jpg, 2.jpg).");
        }
        setZipResult({ appliedCount: 0, unmatched: [], skipped });
      }
    } catch (err) {
      toast.error("Failed to process folder. Please try again.");
    } finally {
      setFolderProcessing(false);
    }
  };

  return (
    <div className={card}>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <SectionHeading icon={<Edit2 className="h-4 w-4" />} title="Step 2 — Review, Add Photos & Vehicles" />
          <button onClick={onBack} disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Re-upload Excel
          </button>
        </div>

        {/* Revision mode notice — shown when data was pre-filled from a returned batch */}
        {batch?.status === "RETURNED_TO_APPLICANT" && (
          <div className="mb-5 px-4 py-4 rounded-2xl bg-orange-50 ring-1 ring-orange-200">
            <p className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Revision Mode — Pre-filled Data
            </p>
            <ul className="space-y-1.5 text-xs text-orange-700 leading-relaxed">
              <li>• All previously entered <strong>names, Aadhaar numbers, dates of birth and mobile numbers</strong> have been pre-filled.</li>
              <li>• Previously uploaded <strong>photos and Aadhaar card documents are kept</strong> — you can view them and replace only the ones that need to change.</li>
              <li>• Persons/vehicles marked <strong className="text-red-700">✗ Rejected</strong> were flagged in the previous review — please correct those entries.</li>
              <li>• You may also click <strong>Re-upload Excel</strong> above to start fresh from a new spreadsheet.</li>
            </ul>
          </div>
        )}

        {/* ── PERSONS SECTION ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center h-7 w-7 rounded-xl bg-amber-100 text-amber-600">
              <Users className="h-3.5 w-3.5" />
            </span>
            <h4 className="text-sm font-bold text-stone-800">Person Details ({rows.length}/{maxPersons})</h4>
            {personsExceeded && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                <AlertCircle className="h-3 w-3" /> Exceeds max by {rows.length - maxPersons}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
              <FileText className="h-3.5 w-3.5" />{rows.length} total
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />{readyRows.length} ready
            </span>
            {noPhotoRows.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <Camera className="h-3.5 w-3.5" />{noPhotoRows.length} need photo
              </span>
            )}
            {errorRows.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <XCircle className="h-3.5 w-3.5" />{errorRows.length} errors
              </span>
            )}
            {aadhaarCardsMissing > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <FileText className="h-3.5 w-3.5" />{aadhaarCardsMissing} need Aadhaar card
              </span>
            )}
          </div>

          {/* Aadhaar card requirement instruction */}
          <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 ring-1 ring-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">
              <span className="font-bold">Aadhaar card is mandatory for every person.</span>{" "}
              Upload each person's Aadhaar card using the button in the{" "}
              <span className="font-bold">"Aadhaar Card *"</span> column.
              Accepted formats: PDF, JPEG, JPG, PNG — max 10 MB.
            </p>
          </div>

          {/* Bulk photo upload (ZIP or Folder) */}
          <div className="mb-5 px-5 py-4 rounded-2xl bg-stone-50 ring-1 ring-stone-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-600 shrink-0" />
                  Auto-match photos
                </p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Name each photo by its serial number — the person's row order in the template (e.g.{" "}
                  <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700 text-[11px]">1.jpg</code>
                  ,{" "}
                  <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700 text-[11px]">2.jpg</code>
                  ). Upload a ZIP file or select a folder directly.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => !zipUploading && !folderProcessing && zipInputRef.current?.click()} disabled={zipUploading || folderProcessing || submitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#1f1f1f] font-bold text-xs whitespace-nowrap transition">
                  {zipUploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Matching…</> : <><Archive className="h-3.5 w-3.5" /> Upload ZIP</>}
                </button>
                <button type="button" onClick={() => !zipUploading && !folderProcessing && folderInputRef.current?.click()} disabled={zipUploading || folderProcessing || submitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs whitespace-nowrap transition">
                  {folderProcessing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</> : <><Upload className="h-3.5 w-3.5" /> Select Folder</>}
                </button>
              </div>
              <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={handleZipUpload} />
              <input ref={folderInputRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={handleFolderUpload} webkitdirectory="" directory="" />
            </div>
            {zipResult && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-full">
                    {zipResult.appliedCount || 0} applied
                  </span>
                  {zipResult.unmatched && zipResult.unmatched.length > 0 && (
                    <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2.5 py-1 rounded-full">
                      {zipResult.unmatched.length} no matching row
                    </span>
                  )}
                  {zipResult.skipped && zipResult.skipped.length > 0 && (
                    <span className="text-xs text-red-700 font-semibold bg-red-100 px-2.5 py-1 rounded-full">
                      {zipResult.skipped.length} invalid name
                    </span>
                  )}
                </div>

                {/* Details: which files were skipped and why */}
                {zipResult.skipped && zipResult.skipped.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-red-50 ring-1 ring-red-100">
                    <p className="text-[11px] font-bold text-red-700 mb-1">Skipped files (rename and re-upload):</p>
                    <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                      {zipResult.skipped.map((s, i) => (
                        <li key={i} className="text-[11px] text-red-600 leading-snug">
                          <span className="font-mono font-semibold">{s.filename}</span>
                          {s.reason ? " — " + s.reason : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {zipResult.unmatched && zipResult.unmatched.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 ring-1 ring-amber-100">
                    <p className="text-[11px] text-amber-700 leading-snug">
                      No person row for serial number(s):{" "}
                      <span className="font-mono font-semibold">
                        {[...zipResult.unmatched].sort((a, b) => a - b).join(", ")}
                      </span>
                      . Check that the photo numbers match the row order.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Persons table */}
          <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {["#", "Photo", "Name", "Aadhaar", "DOB", "Mobile", "Aadhaar Card *", "Status", "Error"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap">{h}</th>
                  ))}
                  {/* Sticky actions header */}
                  <th className="sticky right-0 z-10 bg-stone-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <EditableRow key={row.id || i} row={row} index={i} onChange={handleRowChange} onDelete={handleDeleteRow} disabled={submitting} derivedErrors={rowErrors[i]} />
                ))}
              </tbody>
            </table>
          </div>
          {!submitting && (
            <button type="button" onClick={handleAddRow} disabled={maxPersons > 0 && rows.length >= maxPersons}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <Plus className="h-3.5 w-3.5" /> Add Person Manually
              {maxPersons > 0 && <span className="text-stone-400 ml-1">({rows.length}/{maxPersons})</span>}
            </button>
          )}
        </div>

        {/* ── VEHICLES SECTION (separate layout, shown when noOfVehicles > 0) ── */}
        {maxVehicles > 0 && (
          <div className="mb-6 pt-6 border-t border-stone-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center h-7 w-7 rounded-xl bg-blue-100 text-blue-600">
                <Car className="h-3.5 w-3.5" />
              </span>
              <h4 className="text-sm font-bold text-stone-800">Vehicle Details ({vehicles.length}/{maxVehicles})</h4>
              {vehiclesExceeded ? (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                  <AlertCircle className="h-3 w-3" /> Exceeds max by {vehicles.length - maxVehicles}
                </span>
              ) : (
                vehicles.length === 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                    <AlertCircle className="h-3 w-3" /> Required
                  </span>
                )
              )}
            </div>

            <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-50 ring-1 ring-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                Add vehicle details below (maximum {maxVehicles}). RC and Insurance are mandatory for each vehicle. Submission will be blocked until at least one vehicle is added.
              </p>
            </div>

            {vehicleAadhaarCardsMissing > 0 && (
              <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 ring-1 ring-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  <span className="font-bold">Driver Aadhaar card is mandatory for every vehicle.</span>{" "}
                  Click <span className="font-bold">"Upload *"</span> in the Driver Aadhaar Card column, or use the edit button (✏️) to open the vehicle and upload the document there.
                </p>
              </div>
            )}

            {vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-stone-50 ring-1 ring-stone-100">
                <Car className="h-8 w-8 text-stone-300 mb-3" />
                <p className="text-sm font-semibold text-stone-500">No vehicles added yet</p>
                <p className="text-xs text-stone-400 mt-1">Click the button below to add a vehicle</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100 mb-3">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["#", "Driver Name", "Aadhaar", "Mobile", "Reg Number", "Type", "RC", "Insurance", "Driver Aadhaar Card *", "DL Number", "DL Doc", "Other Docs", ""].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v, i) => (
                      <tr key={v.id || i} className={"border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50" + (v._revisionRejected ? " bg-red-50/60" : "")}>
                        <td className="px-3 py-3 text-xs text-stone-400 tabular-nums">
                          {i + 1}
                          {v._revisionRejected && (
                            <span
                              title={v._revisionReason || "Rejected in previous review"}
                              className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-800 border border-red-300 cursor-help"
                            >
                              ✗ Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold text-stone-800 whitespace-nowrap">
                          {v.driverName || <span className="text-red-400 italic text-xs">Missing</span>}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-stone-600 whitespace-nowrap">
                          {v.driverAadhaar ? "XXXX XXXX " + String(v.driverAadhaar).slice(-4) : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-stone-600">{v.driverMobile || "—"}</td>
                        <td className="px-3 py-3 font-bold text-stone-800 font-mono whitespace-nowrap">{v.regNo || "—"}</td>
                        <td className="px-3 py-3 text-xs text-stone-600">{v.vehicleType || "—"}</td>
                        <td className="px-3 py-3">
                          {(v.rc || (v._keepVehicleDocs && v._keepVehicleDocs.rc)) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                          ) : <span className="text-red-400 text-[10px] font-semibold">Missing</span>}
                        </td>
                        <td className="px-3 py-3">
                          {(v.insurance || (v._keepVehicleDocs && v._keepVehicleDocs.insurance)) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                          ) : <span className="text-red-400 text-[10px] font-semibold">Missing</span>}
                        </td>
                        <td className="px-3 py-3">
                          {(v.driverAadhaarCard || (v._keepVehicleDocs && v._keepVehicleDocs.driverAadhaarCard)) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setVehicleModal({ index: i, data: v })}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-dashed border-red-300 hover:bg-red-100 px-2 py-0.5 rounded-full transition"
                            >
                              <Upload className="h-3 w-3" /> Upload *
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-stone-600">
                            {v.driverLicenseNumber || <span className="text-stone-400">—</span>}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {(v.driverLicense || (v._keepVehicleDocs && v._keepVehicleDocs.driverLicense)) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" /> Yes</span>
                          ) : <span className="text-[10px] text-stone-400">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-stone-500">
                            {[
                              (v.fitness || (v._keepVehicleDocs && v._keepVehicleDocs.fitness)) && "Fitness",
                              (v.permit || (v._keepVehicleDocs && v._keepVehicleDocs.permit)) && "Permit",
                              (v.roadTax || (v._keepVehicleDocs && v._keepVehicleDocs.roadTax)) && "Road Tax",
                              (v.emission || (v._keepVehicleDocs && v._keepVehicleDocs.emission)) && "PUCC",
                            ].filter(Boolean).join(", ") || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {!submitting && (
                              <>
                                <button type="button" onClick={() => setVehicleModal({ index: i, data: v })}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-amber-100 hover:text-amber-600 transition">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => handleDeleteVehicle(i)}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-red-100 hover:text-red-500 transition">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!submitting && (
              <button type="button" onClick={() => setVehicleModal({ index: null, data: null })}
                disabled={vehicles.length >= maxVehicles}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <Plus className="h-3.5 w-3.5" /> Add Vehicle
                <span className="text-stone-400 ml-1">({vehicles.length}/{maxVehicles})</span>
              </button>
            )}
          </div>
        )}

        {/* Submit section */}
        <div className="mt-6 flex flex-col gap-3">
          {!canSubmit && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                {personsExceeded &&
                  `Too many persons: ${rows.length} entered, maximum allowed is ${maxPersons}. Remove ${rows.length - maxPersons}. `}
                {errorRows.length > 0 && "Fix " + errorRows.length + " row(s) with errors. "}
                {noPhotoRows.length > 0 && "Add photos for " + noPhotoRows.length + " person(s). "}
                {aadhaarCardsMissing > 0 &&
                  `Upload Aadhaar card for ${aadhaarCardsMissing} person(s) — Aadhaar card is mandatory for every individual. `}
                {vehiclesExceeded &&
                  `Too many vehicles: ${vehicles.length} added, maximum allowed is ${maxVehicles}. Remove ${vehicles.length - maxVehicles}. `}
                {vehicleAadhaarCardsMissing > 0 &&
                  `Upload driver Aadhaar card for ${vehicleAadhaarCardsMissing} vehicle(s) — it is mandatory for every vehicle. `}
                {maxVehicles > 0 &&
                  vehicles.length === 0 &&
                  `Add at least 1 vehicle (${vehicles.length}/${maxVehicles} added).`}
              </p>
            </div>
          )}
          <button type="button" onClick={onSubmit} disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-[#1f1f1f] font-black text-sm transition shadow-sm">
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="h-5 w-5" /> Submit ({rows.length} persons{vehicles.length > 0 ? ", " + vehicles.length + " vehicles" : ""})</>
            )}
          </button>
        </div>
      </div>

      {/* Vehicle modal */}
      {vehicleModal && (
        <VehicleModal
          vehicle={vehicleModal.data}
          onSave={handleSaveVehicle}
          onClose={() => setVehicleModal(null)}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BulkPassPublicPage() {
  const params = useParams();
  // The URL carries an AES-encrypted token. Capture it, stash in sessionStorage,
  // then strip it from the address bar so the raw token is never exposed there.
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = params?.token;
    if (p) {
      sessionStorage.setItem("bulk_pass_token", p);
      setToken(p);
      window.history.replaceState(null, "", "/bulk_pass");
    } else {
      const stored = sessionStorage.getItem("bulk_pass_token");
      if (stored) setToken(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [batch, setBatch] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [batchError, setBatchError] = useState(null); // "invalid" | "expired" | null

  // "excel" → "edit" → "submitted"
  const [step, setStep] = useState("excel");
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Auto-save draft state to localStorage ───────────────────────────────
  const STORAGE_KEY = token ? `bulk_pass_draft_${token}` : null;

  // Restore saved draft on mount
  useEffect(() => {
    if (!STORAGE_KEY) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.step && draft.step !== "submitted") {
          setStep(draft.step);
          if (Array.isArray(draft.rows) && draft.rows.length > 0) {
            // File objects (Aadhaar card) cannot be persisted to localStorage,
            // so clear them on restore — the user must re-attach if needed.
            setRows(draft.rows.map((r) => ({ ...r, aadhaarCardFile: null })));
          }
          if (Array.isArray(draft.vehicles)) setVehicles(draft.vehicles);
        }
      }
    } catch {}
  }, [STORAGE_KEY]);

  // Save draft whenever step/rows/vehicles change (skip if submitted)
  useEffect(() => {
    if (!STORAGE_KEY || step === "submitted") return;
    // Only save if user has progressed past the initial excel step or has data
    if (step === "excel" && rows.length === 0) return;
    try {
      const draft = { step, rows, vehicles, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [STORAGE_KEY, step, rows, vehicles]);

  // Clear draft on successful submit
  const clearDraft = useCallback(() => {
    if (STORAGE_KEY) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const data = await getPublicBatch(token);
        if (alive) {
          setBatch(data);
          // If this is a revision (returned), pre-populate previously submitted data
          // so the applicant can correct and re-submit without starting from scratch.
          if (
            data?.status === "RETURNED_TO_APPLICANT" &&
            Array.isArray(data.previousPersons) &&
            data.previousPersons.length > 0
          ) {
            // Map stored person data back into the row format the edit step expects.
            // Photos and Aadhaar card files can't be restored (they're server-side files),
            // so we mark them null — the applicant must re-upload them.
            const restoredRows = data.previousPersons.map((p) => ({
              name: p.name || "",
              aadhaar: p.aadhaar || "",
              dob: normaliseDob(p.dob),
              mobile: p.mobile || "",
              photoDataUrl: null,
              aadhaarCardFile: null,
              // Keep references to previous server-side files so the applicant
              // can reuse them without re-uploading. Set the _keep* flags to true
              // by default — applicant can clear them by uploading a replacement.
              _previousPhotoPath: p.photoPath || null,
              _keepPhotoPath: p.photoPath || null,         // reuse unless replaced
              _previousAadhaarPath: p.aadhaarCardPath || null,
              _keepAadhaarPath: p.aadhaarCardPath || null, // reuse unless replaced
              _revisionRejected: p.approvalStatus === "REJECTED",
              _revisionReason: p.approvalReason || null,
              parseErrors: [],
            }));
            setRows(restoredRows);

            // Pre-populate vehicles too
            if (Array.isArray(data.previousVehicles) && data.previousVehicles.length > 0) {
              const restoredVehicles = data.previousVehicles.map((v) => ({
                regNo: v.regNo || "",
                vehicleType: v.vehicleType || "",
                driverName: v.driverName || "",
                driverAadhaar: v.driverAadhaar || "",
                driverMobile: v.driverMobile || "",
                driverDob: normaliseDob(v.driverDob),
                driverLicenseNumber: v.driverLicenseNumber || "",
                // All doc File slots start null — new uploads will fill them.
                rc: null, insurance: null, fitness: null,
                permit: null, roadTax: null, emission: null,
                driverAadhaarCard: null, driverLicense: null,
                // Previous server-side doc paths — kept by default so the applicant
                // doesn't have to re-upload unchanged documents.
                _previousVehicleDocs: v.vehicleDocs || {},
                _keepVehicleDocs: { ...(v.vehicleDocs || {}) },
                _revisionRejected: v.approvalStatus === "REJECTED",
                _revisionReason: v.approvalReason || null,
              }));
              setVehicles(restoredVehicles);
            }

            // Skip the excel upload step — go straight to review/edit
            setStep("edit");
          }
        }
      } catch (err) {
        if (!alive) return;
        const status = err?.response?.status;
        const msg = (err?.response?.data?.message || "").toLowerCase();
        if (status === 404 || msg.includes("invalid")) setBatchError("invalid");
        else setBatchError("expired");
      } finally {
        if (alive) setLoadingBatch(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const handleParsed = (parsedRows) => {
    setRows(parsedRows);
    setStep("edit");
    const maxP = Number(batch?.noOfPersons) || 0;
    if (maxP > 0 && parsedRows.length > maxP) {
      toast.warning(
        `This form allows a maximum of ${maxP} person(s), but ${parsedRows.length} were found. Please remove ${parsedRows.length - maxP} before submitting.`
      );
    }
  };

  const handleBack = () => {
    setRows([]);
    setVehicles([]);
    setStep("excel");
    clearDraft();
  };

  const handleSubmit = async () => {
    // Enforce person count limit from batch configuration
    if (batch.noOfPersons > 0 && rows.length > batch.noOfPersons) {
      toast.error(`Cannot submit: ${rows.length} persons exceed the allowed limit of ${batch.noOfPersons}`);
      return;
    }
    // Enforce vehicle count limit from batch configuration
    if (batch.noOfVehicles > 0 && vehicles.length > batch.noOfVehicles) {
      toast.error(`Cannot submit: ${vehicles.length} vehicles exceed the allowed limit of ${batch.noOfVehicles}`);
      return;
    }

    setSubmitting(true);
    try {
      // Vehicle docs are File objects — upload them via FormData, persons as JSON
      const formData = new FormData();
      // Strip File objects (aadhaarCardFile) from the JSON; send them separately.
      // Also pass keep-paths for revision reuse so the backend can skip re-processing.
      const rowsPayload = rows.map((r) => ({
        ...r,
        aadhaarCardFile: undefined,
        inCharge: false,
        hasAadhaarCard: !!r.aadhaarCardFile || !!r._keepAadhaarPath,
        // Backend uses these to reuse existing server-side files
        _keepPhotoPath: r.photoDataUrl ? undefined : (r._keepPhotoPath || undefined),
        _keepAadhaarPath: r.aadhaarCardFile ? undefined : (r._keepAadhaarPath || undefined),
      }));
      formData.append("rows", JSON.stringify(rowsPayload));

      // Append ALL persons' Aadhaar card documents (mandatory for every individual).
      rows.forEach((r, i) => {
        if (r.aadhaarCardFile) {
          formData.append(`person_${i}_aadhaarCard`, r.aadhaarCardFile);
        }
      });

      // Append vehicle metadata (without File objects) + file fields
      const vehicleMeta = vehicles.map((v) => ({
        regNo: v.regNo,
        vehicleType: v.vehicleType || "",
        driverName: v.driverName || "",
        driverAadhaar: v.driverAadhaar || "",
        driverMobile: v.driverMobile || "",
        driverDob: v.driverDob || "",
        driverLicenseNumber: v.driverLicenseNumber || "",
        hasRc: !!v.rc || !!(v._keepVehicleDocs && v._keepVehicleDocs.rc),
        hasInsurance: !!v.insurance || !!(v._keepVehicleDocs && v._keepVehicleDocs.insurance),
        hasFitness: !!v.fitness || !!(v._keepVehicleDocs && v._keepVehicleDocs.fitness),
        hasPermit: !!v.permit || !!(v._keepVehicleDocs && v._keepVehicleDocs.permit),
        hasRoadTax: !!v.roadTax || !!(v._keepVehicleDocs && v._keepVehicleDocs.roadTax),
        hasEmission: !!v.emission || !!(v._keepVehicleDocs && v._keepVehicleDocs.emission),
        hasDriverAadhaarCard: !!v.driverAadhaarCard || !!(v._keepVehicleDocs && v._keepVehicleDocs.driverAadhaarCard),
        hasDriverLicense: !!v.driverLicense || !!(v._keepVehicleDocs && v._keepVehicleDocs.driverLicense),
        // Pass kept paths so backend can reuse without re-upload
        _keepVehicleDocs: v._keepVehicleDocs || undefined,
      }));
      formData.append("vehicles", JSON.stringify(vehicleMeta));

      // Append actual document files with indexed keys
      vehicles.forEach((v, i) => {
        if (v.rc) formData.append(`vehicle_${i}_rc`, v.rc);
        if (v.insurance) formData.append(`vehicle_${i}_insurance`, v.insurance);
        if (v.fitness) formData.append(`vehicle_${i}_fitness`, v.fitness);
        if (v.permit) formData.append(`vehicle_${i}_permit`, v.permit);
        if (v.roadTax) formData.append(`vehicle_${i}_roadTax`, v.roadTax);
        if (v.emission) formData.append(`vehicle_${i}_emission`, v.emission);
        if (v.driverAadhaarCard) formData.append(`vehicle_${i}_driverAadhaarCard`, v.driverAadhaarCard);
        if (v.driverLicense) formData.append(`vehicle_${i}_driverLicense`, v.driverLicense);
      });

      await submitRowsDirectly(token, rows, formData);
      clearDraft();
      setStep("submitted");
      toast.success("Batch submitted successfully.");
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.data?.errors) {
        errData.data.errors.slice(0, 3).forEach((e) => toast.error(e.message));
      } else {
        toast.error(errData?.message || "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Guards
  if (step === "submitted") return <ConfirmationScreen refNo={batch?.refNo} email={batch?.applicantEmail} />;

  if (loadingBatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (batchError === "invalid") return <ErrorScreen type="invalid" />;
  if (batchError === "expired") return <ErrorScreen type="expired" />;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Nav strip */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-stone-200/70 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-white font-black text-sm">
            H
          </div>
          <div>
            <p className="text-xs font-bold text-stone-800 leading-none">HEP Automation</p>
            <p className="text-[10px] text-stone-400 leading-none mt-0.5">Chennai Port Authority</p>
          </div>
        </div>
        {batch?.refNo && (
          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
            {batch.refNo}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          {[
            { label: "Upload Excel", key: "excel", num: 1 },
            { label: "Review & Photos", key: "edit", num: 2 },
          ].map((s, i) => {
            const stepOrder = ["excel", "edit", "submitted"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s.key);
            const isActive = step === s.key;
            const isDone = currentIdx > thisIdx;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div
                    className={
                      "flex-1 h-0.5 rounded " +
                      (isDone || isActive ? "bg-amber-400" : "bg-stone-200")
                    }
                  />
                )}
                <div
                  className={
                    "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition " +
                    (isActive
                      ? "bg-amber-400 text-[#1f1f1f]"
                      : isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-100 text-stone-400")
                  }
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-4 w-4 flex items-center justify-center rounded-full bg-white/40 text-[10px]">
                      {s.num}
                    </span>
                  )}
                  {s.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pb-10 flex flex-col gap-6">
        <IntakeCard batch={batch} />

        {step === "excel" && <ExcelUploadStep token={token} onParsed={handleParsed} />}

        {step === "edit" && (
          <EditFormStep
            rows={rows}
            token={token}
            batch={batch}
            onRowsChange={setRows}
            vehicles={vehicles}
            onVehiclesChange={setVehicles}
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        <p className="text-center text-xs text-stone-400 pb-4">
          Chennai Port Authority · HEP Automation System · Secure Upload Portal
        </p>
      </div>
    </div>
  );
}
