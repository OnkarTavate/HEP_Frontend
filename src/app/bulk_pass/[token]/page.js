"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
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
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPublicBatch,
  validateUploadToken,
  getBulkPassSubmissions,
  getBulkPassSubmissionDetail,
  downloadBulkPassSubmissionPdf,
  uploadExcelFiles,
  downloadTemplate,
  parseExcelOnly,
  uploadZipPhotos,
  submitRowsDirectly,
  checkBulkPassBlacklist,
  checkVehicleValidity,
  fileUrl,
  getBulkBatchDetail,
} from "@/lib/bulkPassApi";
import { processPhoto } from "@/lib/photoProcessor";
import SubmissionHistory, {
  SubmissionSummaryStrip,
  SubmissionStatusBadge,
} from "@/components/bulk-pass/SubmissionHistory";
import ValidityBanner from "@/components/bulk-pass/ValidityBanner";
import { getValidityState } from "@/lib/bulkPassValidity";
import { BULK_PASS_LABELS, BULK_PASS_LIMITS, isStudentVisitorType } from "@/lib/bulkPassConstants";

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

// On a student pass a blank mobile is allowed per person (the batch as a whole
// still needs a couple of contact numbers — enforced in EditFormStep). Any
// value that IS entered must still be a valid 10-digit number.
function validateMobileField(s, optional = false) {
  const v = String(s ?? "").replace(/\s+/g, "");
  if (!v) return optional ? null : "Mobile number is required";
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
// `mobileOptional` (student passes) makes a blank mobile acceptable per row.
function getPersonFieldErrors(draft, mobileOptional = false) {
  return {
    name: validateNameField(draft.name),
    aadhaar: validateAadhaarField(draft.aadhaar),
    dob: validateDobField(draft.dob),
    mobile: validateMobileField(draft.mobile, mobileOptional),
  };
}

// Flattens field errors into the parseErrors array shape used elsewhere.
function buildParseErrors(draft, mobileOptional = false) {
  const fe = getPersonFieldErrors(draft, mobileOptional);
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

/**
 * Full-page confirmation, used only for single-submission links where the
 * applicant's journey genuinely ends here. Reusable Bulk Passes stay on the
 * portal and show an inline success panel instead, so the link, the validity
 * and the submission history never leave the screen.
 */
/**
 * The shape of the portal while the link is being resolved, so the page does
 * not jump when the real content arrives.
 */
function PortalSkeleton() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      aria-busy="true"
      aria-label="Loading your bulk pass"
    >
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-stone-200/70 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-white font-black text-sm">H</div>
          <div className="space-y-1.5">
            <div className="bp-skeleton h-3 w-28" />
            <div className="bp-skeleton h-2.5 w-20" />
          </div>
        </div>
        <div className="bp-skeleton h-7 w-32 rounded-full" />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-10 flex flex-col gap-6">
        <div className={`${card} p-6 space-y-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="bp-skeleton h-2.5 w-16" />
              <div className="bp-skeleton h-7 w-56" />
              <div className="bp-skeleton h-3.5 w-40" />
            </div>
            <div className="bp-skeleton h-7 w-44 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="bp-skeleton h-2.5 w-20" />
                <div className="bp-skeleton h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="bp-skeleton h-20 rounded-2xl" />
        </div>
        <div className="bp-skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="bp-skeleton h-[68px] rounded-2xl" />)}
        </div>
        <div className="bp-skeleton h-56 rounded-3xl" />
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
          You will be emailed the outcome, usually within 1–2 working days.
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

/**
 * Inline success panel for a reusable Bulk Pass. Confirms the batch that was
 * just sent and immediately offers the next one, reinforcing that this is one
 * continuous Bulk Pass rather than a series of unrelated forms.
 */
function BatchSubmittedPanel({ result, email, canSubmitMore, onNextBatch, onViewHistory }) {
  return (
    <div className={`${card} p-6 sm:p-8 bp-pop`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300 bp-ring" aria-hidden="true" />
          <svg className="h-7 w-7 bp-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-stone-900">
            Batch{result?.submissionNumber ? ` #${result.submissionNumber}` : ""} submitted
          </h3>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">
            {result?.refNo && (
              <>
                Reference <span className="font-mono font-bold text-amber-700">{result.refNo}</span> ·{" "}
              </>
            )}
            {result?.personsSubmitted ?? 0} person(s) and {result?.vehiclesSubmitted ?? 0} vehicle(s)
            are now with the Traffic Department for review. You will be emailed once they are
            reviewed — usually within 1–2 working days.
          </p>
          {email && (
            <p className="text-xs text-stone-400 mt-2">
              A confirmation was sent to <span className="font-mono font-semibold">{email}</span>.
            </p>
          )}

          {/* What happens from here, so nobody has to guess. */}
          <ol className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: "Submitted", detail: "Received by the port", done: true },
              { label: "Traffic review", detail: "Usually 1–2 working days", done: false },
              { label: "Pass ready", detail: "Download it from the history below", done: false },
            ].map((st, i) => (
              <li
                key={st.label}
                className={`flex items-start gap-2 rounded-xl px-3 py-2.5 ring-1 bp-reveal ${
                  st.done ? "bg-emerald-50 ring-emerald-200" : "bg-stone-50 ring-stone-200"
                }`}
                style={{ "--bp-delay": `${150 + i * 90}ms` }}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                    st.done ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {st.done ? "✓" : i + 1}
                </span>
                <span>
                  <span className={`block font-bold ${st.done ? "text-emerald-800" : "text-stone-700"}`}>{st.label}</span>
                  <span className="text-stone-500">{st.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {canSubmitMore ? (
              <button
                onClick={onNextBatch}
                className="bp-press bp-lift inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#1f1f1f] font-bold text-sm transition"
              >
                <Plus className="h-4 w-4" />
                Submit Another Batch
              </button>
            ) : (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-stone-100 text-stone-600">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  This bulk pass is no longer accepting new batches. Your submission history stays
                  available below.
                </p>
              </div>
            )}
            <button
              onClick={onViewHistory}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition"
            >
              <Eye className="h-4 w-4" />
              View Submission History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Pass overview ───────────────────────────────────────────────────────

/**
 * The header of the applicant experience: which Bulk Pass this is, how long it
 * stays open, and what each batch may contain. Everything below it — the
 * history, the statistics and the upload form — belongs to this one pass.
 */
function BulkPassOverviewCard({ bulkPass, validity, canSubmit, blockedMessage, isMultiple, nextSubmissionNumber, batch, suppressReturnBanner, remaining }) {
  const [expanded, setExpanded] = useState(false);
  // A revision renders its own, better-placed notice — don't say it twice.
  const isReturned = !suppressReturnBanner && batch?.status === "RETURNED_TO_APPLICANT";

  return (
    <div className="flex flex-col gap-4 bp-reveal">
      {/* Identity + limits */}
      <div className={card}>
        <div className="px-5 sm:px-6 pt-6 pb-4 border-b border-stone-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
                Bulk Pass
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-mono break-all">
                {bulkPass?.identifier || "—"}
              </h2>
              <p className="text-sm text-stone-500 mt-1">{bulkPass?.companyName || "—"}</p>
            </div>
            {isMultiple && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                <RefreshCw className="h-3 w-3" />
                {suppressReturnBanner
                  ? `Reusable link · Correcting batch #${nextSubmissionNumber}`
                  : `Reusable link · Next batch #${nextSubmissionNumber}`}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <ReadField label="Department" value={bulkPass?.departmentName} />
          <ReadField label="Visitor Type" value={visitorLabel(bulkPass?.visitorType)} />
          <ReadField
            label={isMultiple ? `${BULK_PASS_LABELS.MAX_PERSONS} (total)` : BULK_PASS_LABELS.MAX_PERSONS}
            value={
              bulkPass?.maxTotalPersons != null
                ? String(bulkPass.maxTotalPersons)
                : bulkPass?.maxPersons != null
                ? String(bulkPass.maxPersons)
                : null
            }
          />
          <ReadField
            label={isMultiple ? `${BULK_PASS_LABELS.MAX_VEHICLES} (total)` : BULK_PASS_LABELS.MAX_VEHICLES}
            value={
              bulkPass?.maxTotalVehicles != null
                ? String(bulkPass.maxTotalVehicles)
                : bulkPass?.maxVehicles != null
                ? String(bulkPass.maxVehicles)
                : null
            }
          />
        </div>

        {isMultiple && (
          <p className="px-5 sm:px-6 pb-4 -mt-1 text-xs text-stone-400 leading-relaxed">
            These are the totals for the <span className="font-semibold text-stone-500">whole bulk pass</span>.
            Each batch you submit may carry up to{" "}
            <span className="font-semibold text-stone-500">
              {bulkPass?.perBatchMaxPersons ?? BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH} persons
            </span>{" "}
            and{" "}
            <span className="font-semibold text-stone-500">
              {bulkPass?.perBatchMaxVehicles ?? BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH} vehicles
            </span>
            ; larger groups are sent as several batches with this same link.
          </p>
        )}

        {/* What the whole bulk pass allows, and how much of it is left. */}
        {isMultiple && (
          <div className="px-5 sm:px-6 pb-5">
            <RemainingAllowance remaining={remaining} bulkPass={bulkPass} />
          </div>
        )}

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
          <div className="px-5 sm:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-stone-100 pt-5">
            <ReadField label="Applicant Email" value={bulkPass?.applicantEmail} />
            <ReadField
              label="Applicant Mobile"
              value={bulkPass?.applicantMobile ? "+91 " + bulkPass.applicantMobile : null}
            />
            <ReadField label="Payment Mode" value={bulkPass?.paymentMode} />
            <ReadField label="Ref. Doc No." value={bulkPass?.refDocNo} />
            {bulkPass?.purpose && (
              <div className="sm:col-span-2">
                <ReadField label="Purpose of Visit" value={bulkPass.purpose} />
              </div>
            )}
            {bulkPass?.remarks && (
              <div className="sm:col-span-2">
                <ReadField label="Remarks" value={bulkPass.remarks} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validity — the rule that governs whether another batch is possible */}
      <ValidityBanner validity={validity} canSubmit={canSubmit} message={blockedMessage} />

      {/* Return reason banner (if returned for revision) */}
      {isReturned && batch?.returnReason && (
        <div className={card}>
          <div className="px-5 sm:px-6 py-4 flex items-start gap-3 bg-orange-50/70 rounded-3xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900 mb-1">
                Returned for Revision — Traffic Department Remarks
              </p>
              <p className="text-sm text-orange-800 leading-relaxed">{batch.returnReason}</p>
              <p className="text-xs text-orange-700 mt-2 leading-relaxed">
                Your previously entered information is pre-filled below. Please correct any errors,
                re-upload photos and Aadhaar cards for all persons, and submit again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Submission history for the Bulk Pass, with the aggregate statistics above it
 * so the applicant can see everything they have sent through this one link.
 */
function SubmissionHistoryPanel({ submissions, summary, loading, onView, onDownload, downloadingId, nextSubmissionNumber, canSubmit }) {
  return (
    <div id="submission-history" className="flex flex-col gap-4 scroll-mt-24 bp-reveal" style={{ "--bp-delay": "120ms" }}>
      <SubmissionSummaryStrip summary={summary} submissions={submissions} />

      <div className={card}>
        <div className="px-5 sm:px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-800">Submission History</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Every batch submitted with this bulk pass link.
            </p>
          </div>
          {canSubmit && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
              Next batch will be #{nextSubmissionNumber}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <SubmissionHistory
            submissions={submissions}
            loading={loading}
            onView={onView}
            onDownload={onDownload}
            downloadingId={downloadingId}
            emptyTitle="No batches submitted yet"
            emptyHint="Upload your first batch below — it will appear here once submitted."
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only detail of a previous batch, opened from the history. Scoped to this
 * Bulk Pass link server-side; Aadhaar numbers arrive already masked.
 */
function SubmissionDetailModal({ token, submission, onClose, onDownload, downloading }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !submission?.id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await getBulkPassSubmissionDetail(token, submission.id);
        if (alive) setData(res);
      } catch (err) {
        if (alive) setError(err?.response?.data?.message || "Could not load this submission.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, submission?.id]);

  const detail = data?.submission;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col bp-pop">
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-stone-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Batch #{detail?.submissionNumber ?? submission?.number ?? "—"}
            </p>
            <h3 className="text-lg font-bold text-stone-900 font-mono truncate">
              {detail?.refNo || submission?.refNo || "—"}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detail?.status && <SubmissionStatusBadge status={detail.status} />}
            {onDownload && (detail?.status ?? submission?.status) === "COMPLETED" && (
              <button
                type="button"
                onClick={() => onDownload(detail || submission)}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download pass
              </button>
            )}
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-red-50 ring-1 ring-red-200">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                <ReadField label="Persons" value={String(detail?.personsCount ?? 0)} />
                <ReadField label="Vehicles" value={String(detail?.vehiclesCount ?? 0)} />
                <ReadField label="Submitted On" value={fmtDate(detail?.submittedAt)} />
                <ReadField label="Valid Until" value={fmtDate(detail?.validityUpto)} />
              </div>

              {detail?.returnReason && (
                <div className="px-4 py-3 rounded-2xl bg-orange-50 ring-1 ring-orange-200">
                  <p className="text-xs font-bold text-orange-800 mb-0.5">Returned for revision</p>
                  <p className="text-sm text-orange-700">{detail.returnReason}</p>
                </div>
              )}
              {detail?.rejectionReason && (
                <div className="px-4 py-3 rounded-2xl bg-red-50 ring-1 ring-red-200">
                  <p className="text-xs font-bold text-red-800 mb-0.5">Rejection reason</p>
                  <p className="text-sm text-red-700">{detail.rejectionReason}</p>
                </div>
              )}

              {data?.persons?.length > 0 && (
                <div>
                  <SectionHeading icon={<Users className="h-4 w-4" />} title={`Persons (${data.persons.length})`} />
                  <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-100">
                          {["#", "Name", "Aadhaar", "Mobile", "Decision"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {data.persons.map((p, i) => (
                          <tr key={p.id}>
                            <td className="px-4 py-2.5 text-xs text-stone-400 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-2.5 font-semibold text-stone-800">{p.name || "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-stone-600 whitespace-nowrap">
                              {p.aadhaar || "—"}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-stone-600">{p.mobile || "—"}</td>
                            <td className="px-4 py-2.5">
                              <PersonDecision status={p.approvalStatus} reason={p.approvalReason} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data?.vehicles?.length > 0 && (
                <div>
                  <SectionHeading icon={<Car className="h-4 w-4" />} title={`Vehicles (${data.vehicles.length})`} />
                  <div className="overflow-x-auto rounded-2xl ring-1 ring-stone-100">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-100">
                          {["#", "Reg. Number", "Type", "Driver", "Decision"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {data.vehicles.map((v, i) => (
                          <tr key={v.id}>
                            <td className="px-4 py-2.5 text-xs text-stone-400 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-stone-800 whitespace-nowrap">
                              {v.vehicleNumber}
                            </td>
                            <td className="px-4 py-2.5 text-stone-600">{v.vehicleType || "—"}</td>
                            <td className="px-4 py-2.5 text-stone-700">{v.driverName || "—"}</td>
                            <td className="px-4 py-2.5">
                              <PersonDecision status={v.approvalStatus} reason={v.approvalReason} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data?.statusLog?.length > 0 && (
                <div>
                  <SectionHeading icon={<FileText className="h-4 w-4" />} title="Progress" />
                  <ol className="relative border-l-2 border-stone-100 ml-2">
                    {data.statusLog.map((log, i) => (
                      <li key={i} className="ml-5 pb-5 last:pb-0">
                        <span className="absolute -left-[9px] flex h-4 w-4 rounded-full ring-2 ring-white bg-amber-400" />
                        <div className="flex flex-wrap items-center gap-2">
                          <SubmissionStatusBadge status={log.status} />
                          <span className="text-xs text-stone-400">{fmtDate(log.createdAt)}</span>
                        </div>
                        {log.remarks && <p className="text-xs text-stone-500 mt-1">{log.remarks}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto sm:ml-auto sm:block px-6 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonDecision({ status, reason }) {
  const s = status || "PENDING";
  const cls =
    s === "APPROVED"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : s === "REJECTED"
      ? "bg-red-50 text-red-600 ring-1 ring-red-200"
      : "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
  const label = s === "APPROVED" ? "Approved" : s === "REJECTED" ? "Rejected" : "Pending";
  return (
    <span
      title={reason || undefined}
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Intake info card (legacy single-submission link) ─────────────────────────
//
// Reusable Bulk Passes render <BulkPassOverviewCard /> instead; this card stays
// for links that accept exactly one submission.

function IntakeCard({ batch }) {
  const [expanded, setExpanded] = useState(false);
  const needsCorrection = ["RETURNED_TO_APPLICANT", "REJECTED"].includes(batch?.status);
  const correctionReason = batch?.returnReason || batch?.rejectionReason;

  // The body dereferences batch.refNo/companyName/validityUpto directly; a
  // legacy link that resolves without a batch would otherwise white-screen.
  if (!batch) return null;

  return (
    <>
      {/* Correction banner — shown for a return or a rejection alike */}
      {needsCorrection && (correctionReason || batch?.issues?.items?.length) && (
        <div className={`${card} mb-6`}>
          <div className="px-6 py-4 flex items-start gap-3 bg-orange-50/70 rounded-3xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-orange-900 mb-1">
                {batch.status === "REJECTED"
                  ? "Not Approved — Corrections Needed"
                  : "Returned for Revision — Traffic Department Remarks"}
              </p>
              {correctionReason && (
                <p className="text-sm text-orange-800 leading-relaxed">{correctionReason}</p>
              )}

              <IssueList issues={batch.issues} className="mt-3" />

              <p className="text-xs text-orange-700 mt-3 leading-relaxed">
                Your previously entered information is pre-filled below — correct only what is
                listed, re-attach photos and Aadhaar cards, and submit again.
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
            label={BULK_PASS_LABELS.MAX_PERSONS}
            value={batch.noOfPersons != null ? String(batch.noOfPersons) : null}
          />
          <ReadField
            label={BULK_PASS_LABELS.MAX_VEHICLES}
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

function ExcelUploadStep({ token, onParsed, onEnterManually }) {
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
            "border-dashed cursor-pointer transition select-none bp-lift " +
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

        {/* A spreadsheet is overkill for two or three people, and the review
            step can already add rows by hand — so offer that door directly. */}
        {onEnterManually && (
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-stone-200" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">or</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        )}
        {onEnterManually && (
          <button
            type="button"
            onClick={onEnterManually}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition"
          >
            <Plus className="h-4 w-4" /> Enter details manually
          </button>
        )}
        {onEnterManually && (
          <p className="mt-2 text-center text-[11px] text-stone-400">
            Quicker for a handful of people — you can still add more rows later.
          </p>
        )}
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

function EditableRow({ row, index, onChange, onDelete, disabled, derivedErrors = [], mobileOptional = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: row.name,
    aadhaar: row.aadhaar,
    dob: row.dob,
    mobile: row.mobile,
  });

  // Real-time field-level validation of the current draft
  const fieldErrors = getPersonFieldErrors(draft, mobileOptional);
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
      <td className="px-3 py-3 min-w-[240px] max-w-[320px] whitespace-normal">
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
              placeholder={mobileOptional ? "Optional" : ""}
              className={
                "w-full px-2 py-1.5 rounded-lg ring-1 text-sm font-mono outline-none bg-white " +
                (fieldErrors.mobile ? "ring-red-400" : "ring-amber-400")
              }
            />
            {fieldErrors.mobile ? (
              <p className="text-[10px] text-red-500 mt-1 leading-snug">{fieldErrors.mobile}</p>
            ) : mobileOptional ? (
              <p className="text-[10px] text-stone-400 mt-1 leading-snug">Optional for students</p>
            ) : null}
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
                    {(ulipValidity.validityChecks || []).map((c, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-1.5 ${i < (ulipValidity.validityChecks || []).length - 1 ? "border-b border-stone-100" : ""} ${c.expired ? "bg-red-50" : "bg-white"}`}>
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
                        ✗ {!ulipValidity.rcActive ? "RC not active" : `${(ulipValidity.expired || []).length} expired certificate(s) — update before entering port`}
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

function EditFormStep({ rows, token, batch, onRowsChange, vehicles, onVehiclesChange, onBack, onSubmit, submitting, uploadPct }) {
  const zipInputRef = useRef(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipResult, setZipResult] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null); // null | { index: number | null, data: object | null }

  // A real cap of 0 (persons allowance fully spent) must stay 0, not fall back
  // to 30 via `|| 30` — otherwise the form advertises 0/30 and lets the applicant
  // build a batch the submit guard then rejects. Only an absent/invalid value defaults.
  const maxPersons = Number.isFinite(Number(batch?.noOfPersons))
    ? Math.max(0, Number(batch.noOfPersons))
    : 30;
  // 0 vehicles means vehicles are not allowed on this pass — not "unlimited".
  const maxVehicles = Math.max(0, Number(batch?.noOfVehicles) || 0);

  // Student groups do not need a mobile per head — only a couple of contact
  // numbers (teacher / escort) for the whole batch. Mirrors the server rule
  // (BULK_PASS_LIMITS.MIN_STUDENT_CONTACT_MOBILES) so the form never lets an
  // applicant build a batch the submit endpoint would then reject.
  const mobileOptional = isStudentVisitorType(batch?.visitorType);
  const minContactMobiles = mobileOptional
    ? Math.min(BULK_PASS_LIMITS.MIN_STUDENT_CONTACT_MOBILES, rows.length)
    : 0;

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
    const errs = buildParseErrors(r, mobileOptional); // live field-level validation from row values
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
  const vehiclesExceeded = vehicles.length > maxVehicles;

  // Student batch: at least minContactMobiles rows must carry a valid mobile.
  const rowsWithMobile = rows.filter(
    (r) => validateMobileField(r.mobile, false) === null
  ).length;
  const contactMobilesShort = mobileOptional && rowsWithMobile < minContactMobiles;

  // Aadhaar card satisfied if a new file is uploaded OR a previous path is being kept
  const aadhaarCardsMissing = rows.filter((r) => !r.aadhaarCardFile && !r._keepAadhaarPath).length;

  // Persons must be valid + within limit; if vehicles are required, at least one
  // must be added and the count must not exceed the allowed maximum.
  const personsReady =
    rows.length > 0 &&
    errorRows.length === 0 &&
    noPhotoRows.length === 0 &&
    !personsExceeded &&
    !contactMobilesShort &&
    aadhaarCardsMissing === 0;
  // Driver Aadhaar card satisfied if a new file is uploaded OR a previous path is being kept
  const vehicleAadhaarCardsMissing = vehicles.filter(
    (v) => !v.driverAadhaarCard && !(v._keepVehicleDocs && v._keepVehicleDocs.driverAadhaarCard)
  ).length;

  // "Max No. of Vehicles" is a ceiling, not a quota: a batch of people arriving
  // on foot or by bus is perfectly valid. Only the upper bound is enforced.
  const vehiclesReady = !vehiclesExceeded && vehicleAadhaarCardsMissing === 0;
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
        id: "manual_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
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
      onVehiclesChange((prev) => [...prev, { ...data, id: "veh_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) }]);
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

        {/* Revision mode notice — shown when data was pre-filled from a returned
            OR rejected batch (the loader restores previous data for both). */}
        {["RETURNED_TO_APPLICANT", "REJECTED"].includes(batch?.status) && (
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
            {contactMobilesShort && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" />need {minContactMobiles - rowsWithMobile} more contact mobile{minContactMobiles - rowsWithMobile === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Student contact-mobile requirement */}
          {mobileOptional && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Students:</span> a mobile number is not
                needed for every person. At least {minContactMobiles} contact
                number{minContactMobiles === 1 ? "" : "s"} for the batch (a teacher
                or escort) {minContactMobiles === 1 ? "is" : "are"} enough.
                Currently {rowsWithMobile} provided.
              </p>
            </div>
          )}

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
                  <EditableRow key={row.id || i} row={row} index={i} onChange={handleRowChange} onDelete={handleDeleteRow} disabled={submitting} derivedErrors={rowErrors[i]} mobileOptional={mobileOptional} />
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
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500 border border-stone-200">
                    Optional
                  </span>
                )
              )}
            </div>

            <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-50 ring-1 ring-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                Add vehicle details below if this batch includes vehicles — up to {maxVehicles}. RC and Insurance are mandatory for each vehicle you add. If nobody is bringing a vehicle, leave this empty and submit.
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

        {/* A pass that allows no vehicles, but a revision still carries some:
            offer the one action that fixes it. */}
        {maxVehicles === 0 && vehicles.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 ring-1 ring-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-xs text-red-700 flex-1 min-w-[200px]">
              This bulk pass does not allow vehicles, but {vehicles.length} vehicle{vehicles.length === 1 ? " is" : "s are"} attached to this batch.
            </p>
            <button
              type="button"
              onClick={() => onVehiclesChange([])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-white ring-1 ring-red-200 hover:bg-red-100 transition"
            >
              Remove all vehicles
            </button>
          </div>
        )}

        {/* Submit section — stays in view while the applicant scrolls a long
            list, and says exactly what is still missing. */}
        <div className="mt-6 sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl bg-white/90 backdrop-blur-md ring-1 ring-stone-200/80 shadow-[0_-10px_30px_-14px_rgba(15,23,42,0.35)] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> {readyRows.length}/{rows.length} person{rows.length === 1 ? "" : "s"} ready
            </span>
            {noPhotoRows.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                {noPhotoRows.length} need a photo
              </span>
            )}
            {aadhaarCardsMissing > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                {aadhaarCardsMissing} need an Aadhaar card
              </span>
            )}
            {errorRows.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
                {errorRows.length} with errors
              </span>
            )}
            {vehicles.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 ring-1 ring-stone-200">
                {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
                {vehicleAadhaarCardsMissing > 0 ? ` · ${vehicleAadhaarCardsMissing} need driver Aadhaar` : ""}
              </span>
            )}
            <span className="ml-auto h-1.5 w-24 sm:w-40 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
              <span
                className={`block h-full bp-bar ${canSubmit ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${rows.length ? Math.round((readyRows.length / rows.length) * 100) : 0}%` }}
              />
            </span>
          </div>
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
                  (maxVehicles === 0
                    ? "This bulk pass does not allow vehicles. Remove the vehicle entries. "
                    : `Too many vehicles: ${vehicles.length} added, maximum allowed is ${maxVehicles}. Remove ${vehicles.length - maxVehicles}. `)}
                {vehicleAadhaarCardsMissing > 0 &&
                  `Upload driver Aadhaar card for ${vehicleAadhaarCardsMissing} vehicle(s) — it is mandatory for every vehicle. `}

              </p>
            </div>
          )}
          {/* Documents can take minutes on a slow connection — show movement. */}
          {submitting && uploadPct != null && (
            <div className="mb-3">
              <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-center text-[11px] text-stone-400">
                {uploadPct < 100
                  ? "Uploading photos and documents — please keep this page open."
                  : "Upload complete — finishing up…"}
              </p>
            </div>
          )}
          <button type="button" onClick={onSubmit} disabled={!canSubmit || submitting}
            className="bp-press w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-[#1f1f1f] font-black text-sm transition shadow-sm">
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {uploadPct != null && uploadPct < 100 ? `Uploading… ${uploadPct}%` : "Submitting…"}
              </>
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

  // ── Bulk Pass context ────────────────────────────────────────────────────
  const [batch, setBatch] = useState(null);           // raw batch/request row (legacy consumers)
  const [bulkPass, setBulkPass] = useState(null);     // normalised Bulk Pass view
  const [validity, setValidity] = useState(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [batchError, setBatchError] = useState(null); // "invalid" | "expired" | null

  // ── Multi-submission context ─────────────────────────────────────────────
  const [isMultipleSubmissionEnabled, setIsMultipleSubmissionEnabled] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [submissionSummary, setSubmissionSummary] = useState(null);
  const [nextSubmissionNumber, setNextSubmissionNumber] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openSubmission, setOpenSubmission] = useState(null);
  // Batch whose approved pass is being fetched, so its button shows a spinner.
  const [downloadingPassId, setDownloadingPassId] = useState(null);
  const [remaining, setRemaining] = useState(null);
  // Percentage for the submit upload, which can carry hundreds of documents.
  const [uploadPct, setUploadPct] = useState(null);
  // Set when this link opens one returned batch for correction rather than
  // starting a new one.
  const [revisionOf, setRevisionOf] = useState(null);

  // "excel" → "edit" → "submitted"
  const [step, setStep] = useState("excel");
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Pull the submission history + statistics for this Bulk Pass. Called after
  // every batch so the applicant immediately sees what they just sent.
  const refreshHistory = useCallback(async () => {
    if (!token) return null;
    setHistoryLoading(true);
    try {
      const res = await getBulkPassSubmissions(token);
      if (res) {
        setSubmissionHistory(res.submissionHistory || []);
        setSubmissionSummary(res.submissionSummary || null);
        setNextSubmissionNumber(res.nextSubmissionNumber || 1);
        if (res.validity) setValidity(res.validity);
        if (res.remaining) setRemaining(res.remaining);
        if (res.bulkPass) setBulkPass((prev) => ({ ...(prev || {}), ...res.bulkPass }));
        // A correction link is gated by its own batch, which this endpoint
        // does not know about — keep validate-token's answer for it.
        if (!revisionOf) {
          setCanSubmit(res.canSubmit !== false);
          if (res.message !== undefined) setBlockedMessage(res.message || null);
        }
      }
      return res;
    } catch (err) {
      console.error("Failed to refresh submission history:", err);
      return null;
    } finally {
      setHistoryLoading(false);
    }
  }, [token, revisionOf]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        let resolvedBatch = null;

        try {
          const data = await validateUploadToken(token);
          if (!alive) return;

          const isMulti =
            data.multipleSubmissionsEnabled ?? (data.isParentRequest || data.isParentBatch) ?? false;

          setIsMultipleSubmissionEnabled(!!isMulti);
          setRemaining(data.remaining || null);
          setRevisionOf(data.isRevision ? data.revisionOf || null : null);
          setSubmissionHistory(data.submissionHistory || []);
          setSubmissionSummary(data.submissionSummary || null);
          setNextSubmissionNumber(data.nextSubmissionNumber || 1);
          setBulkPass(data.bulkPass || null);
          setBlockedMessage(data.message || null);
          setCanSubmit(data.canSubmit !== false);
          // Older deployments answer without a `validity` block; derive it so
          // the banner still tells the truth.
          setValidity(data.validity || getValidityState(data.batch || data.parentRequest));

          if (data.batch) {
            resolvedBatch = data.batch;
          } else if (data.parentRequest) {
            // Present a public request through the same field names the rest of
            // the page already uses.
            const pr = data.parentRequest;
            resolvedBatch = {
              id: pr.id,
              refNo: pr.trackingNumber,
              companyName: pr.companyName,
              applicantEmail: pr.applicantEmail,
              applicantMobile: pr.applicantMobile,
              visitorType: pr.visitorType,
              noOfPersons: pr.noOfPersons,
              noOfVehicles: pr.noOfVehicles,
              purpose: pr.purpose,
              paymentMode: pr.paymentMode,
              validityFrom: pr.approvedTimeFrom || pr.validityFrom,
              validityUpto: pr.approvedTimeUpto || pr.validityUpto,
              departmentName: "General Administration",
              status: pr.status,
            };
          } else {
            resolvedBatch = await getPublicBatch(token);
          }
          if (alive) setBatch(resolvedBatch);
        } catch (validationErr) {
          // Fall back to the legacy lookup so older links keep working.
          resolvedBatch = await getPublicBatch(token);
          if (!alive) return;
          setBatch(resolvedBatch);
          setValidity(getValidityState(resolvedBatch));
        }

        // A returned batch is pre-populated so the applicant can correct it
        // without starting over.
        if (
          ["RETURNED_TO_APPLICANT", "REJECTED"].includes(resolvedBatch?.status) &&
          Array.isArray(resolvedBatch.previousPersons) &&
          resolvedBatch.previousPersons.length > 0
        ) {
          // Photos and Aadhaar card files can't be restored as File objects, so
          // we keep references to the server-side copies instead.
          const restoredRows = resolvedBatch.previousPersons.map((p, idx) => ({
            // Stable key: without it these rows fall back to their array index,
            // so deleting one row while another is being edited re-points the
            // open editor at the wrong person and can save one person's details
            // onto another. Excel/manual rows already carry an id.
            id: p.id != null ? `prev_${p.id}` : `prev_${idx}`,
            name: p.name || "",
            aadhaar: p.aadhaar || "",
            dob: normaliseDob(p.dob),
            mobile: p.mobile || "",
            photoDataUrl: null,
            aadhaarCardFile: null,
            _previousPhotoPath: p.photoPath || null,
            _keepPhotoPath: p.photoPath || null,         // reuse unless replaced
            _previousAadhaarPath: p.aadhaarCardPath || null,
            _keepAadhaarPath: p.aadhaarCardPath || null, // reuse unless replaced
            _revisionRejected: p.approvalStatus === "REJECTED",
            _revisionReason: p.approvalReason || null,
            parseErrors: [],
          }));
          if (alive) setRows(restoredRows);

          if (Array.isArray(resolvedBatch.previousVehicles) && resolvedBatch.previousVehicles.length > 0) {
            const restoredVehicles = resolvedBatch.previousVehicles.map((v, idx) => ({
              id: v.id != null ? `prev_veh_${v.id}` : `prev_veh_${idx}`,
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
              _previousVehicleDocs: v.vehicleDocs || {},
              _keepVehicleDocs: { ...(v.vehicleDocs || {}) },
              _revisionRejected: v.approvalStatus === "REJECTED",
              _revisionReason: v.approvalReason || null,
            }));
            if (alive) setVehicles(restoredVehicles);
          }

          // Skip the excel upload step — go straight to review/edit
          if (alive) setStep("edit");
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

  // What one batch may carry: the system's per-batch ceiling, or the pass
  // total when that is smaller (a 10-person pass never needs a 30-row form).
  const PER_BATCH_P = Number(bulkPass?.perBatchMaxPersons) || BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH;
  const PER_BATCH_V = Number(bulkPass?.perBatchMaxVehicles) || BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH;
  const totalPersons = Number(bulkPass?.maxTotalPersons ?? bulkPass?.maxPersons ?? batch?.noOfPersons ?? 0);
  const totalVehicles = Number(bulkPass?.maxTotalVehicles ?? bulkPass?.maxVehicles ?? batch?.noOfVehicles ?? BULK_PASS_LIMITS.DEFAULT_MAX_VEHICLES);
  const maxPersons = Math.min(totalPersons > 0 ? totalPersons : PER_BATCH_P, PER_BATCH_P);
  const maxVehicles = Math.min(Math.max(0, totalVehicles), PER_BATCH_V);
  // How big *this* batch may actually be: the per-batch ceiling, capped by what
  // is left of the bulk pass allowance. Sizing the form by this number means
  // the applicant is never asked for 30 photos only to be refused at the end.
  const effectiveMaxPersons =
    isMultipleSubmissionEnabled && remaining?.personsRemaining != null
      ? Math.max(0, Math.min(maxPersons, remaining.personsRemaining))
      : maxPersons;
  const effectiveMaxVehicles =
    isMultipleSubmissionEnabled && remaining?.vehiclesRemaining != null
      ? Math.max(0, Math.min(maxVehicles, remaining.vehiclesRemaining))
      : maxVehicles;

  const handleParsed = (parsedRows) => {
    setRows(parsedRows);
    setStep("edit");
    if (effectiveMaxPersons > 0 && parsedRows.length > effectiveMaxPersons) {
      const cappedByAllowance = effectiveMaxPersons < maxPersons;
      toast.warning(
        cappedByAllowance
          ? `Only ${effectiveMaxPersons} person(s) can still be added on this bulk pass (${remaining.personsRemaining} of ${bulkPass?.maxTotalPersons} left), but ${parsedRows.length} were found. Please remove ${parsedRows.length - effectiveMaxPersons} before submitting.`
          : `One batch may carry at most ${maxPersons} person(s), but ${parsedRows.length} were found. Please remove ${parsedRows.length - maxPersons} and send them in another batch.`
      );
    }
  };

  // Skip the spreadsheet entirely: open the review step with one blank row.
  const handleEnterManually = useCallback(() => {
    setRows([
      {
        id: "manual_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        fileName: "manual",
        rowNumber: 1,
        name: "",
        aadhaar: "",
        dob: "",
        mobile: "",
        photoDataUrl: null,
        parseErrors: ["Name is required"],
      },
    ]);
    setStep("edit");
  }, []);

  const handleBack = () => {
    setRows([]);
    setVehicles([]);
    setStep("excel");
  };

  const scrollToSubmission = useCallback(() => {
    const el = document.getElementById("submission-area");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToHistory = useCallback(() => {
    const el = document.getElementById("submission-history");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = async () => {
    if (isMultipleSubmissionEnabled && !canSubmit) {
      toast.error(blockedMessage || "This bulk pass is no longer accepting submissions.");
      return;
    }
    // Ceilings apply to this batch; the allowance caps how big it may be.
    if (rows.length > maxPersons) {
      toast.error(`Cannot submit: ${rows.length} persons exceed the ${maxPersons} allowed in one batch. Please split them across batches.`);
      return;
    }
    if (rows.length > effectiveMaxPersons) {
      toast.error(
        `Cannot submit: only ${effectiveMaxPersons} person(s) can still be added on this bulk pass. Please remove ${rows.length - effectiveMaxPersons}.`
      );
      return;
    }
    if (vehicles.length > maxVehicles) {
      toast.error(
        maxVehicles === 0
          ? "Cannot submit: this bulk pass does not allow vehicles. Please remove the vehicle entries."
          : `Cannot submit: ${vehicles.length} vehicles exceed the ${maxVehicles} allowed in one batch. Please split them across batches.`
      );
      return;
    }
    if (vehicles.length > effectiveMaxVehicles) {
      toast.error(
        `Cannot submit: only ${effectiveMaxVehicles} vehicle(s) can still be added on this bulk pass. Please remove ${vehicles.length - effectiveMaxVehicles}.`
      );
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

      const res = await submitRowsDirectly(token, rows, formData, (e) => {
        if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
      });
      setLastResult(res?.data || null);
      setRows([]);
      setVehicles([]);
      setStep("submitted");
      // The response already carries the refreshed allowance and gate; apply it
      // before the history refresh lands so nothing stale is offered.
      if (res?.data && isMultipleSubmissionEnabled) {
        if (res.data.remaining) setRemaining(res.data.remaining);
        if (res.data.validity) setValidity(res.data.validity);
        if (res.data.submissionSummary) setSubmissionSummary(res.data.submissionSummary);
        if (res.data.nextSubmissionNumber) setNextSubmissionNumber(res.data.nextSubmissionNumber);
        setCanSubmit(res.data.canSubmitMore !== false);
        setBlockedMessage(res.data.message || null);
        // A correction has been sent; the link now behaves like the pass itself.
        if (res.data.isRevision) setRevisionOf(null);
      }
      toast.success(
        res?.data?.submissionNumber && isMultipleSubmissionEnabled
          ? `Batch #${res.data.submissionNumber} submitted successfully.`
          : "Batch submitted successfully."
      );

      if (isMultipleSubmissionEnabled) {
        await refreshHistory();
      }
    } catch (err) {
      const errData = err?.response?.data;
      const reason = errData?.data?.blockReason || null;
      if (errData?.data?.errors && Array.isArray(errData.data.errors)) {
        errData.data.errors.slice(0, 5).forEach((e) => toast.error(e.message));
      } else {
        const errorMsg = errData?.message || errData?.errorDetails || err?.message || "Submission failed. Please try again.";
        toast.error(errorMsg, { duration: 8000 });
      }

      if (!isMultipleSubmissionEnabled) return;

      // Only a closed door closes the form. A blacklisted person, a duplicate,
      // or a batch that is merely too big for what is left are things the
      // applicant fixes in place — their rows must stay on screen.
      const TERMINAL = new Set([
        "EXPIRED", "NOT_STARTED", "UNKNOWN", "LINK_INACTIVE", "NOT_APPROVED",
        "SUBMISSION_LIMIT_REACHED", "PERSON_LIMIT_REACHED", "NOT_SUBMITTABLE",
      ]);
      if (reason && TERMINAL.has(reason)) {
        setCanSubmit(false);
        setBlockedMessage(errData?.message || null);
        if (errData?.data?.validity) setValidity(errData.data.validity);
        await refreshHistory();
      } else if (reason === "PERSON_LIMIT_EXCEEDS_REMAINING" || reason === "VEHICLE_LIMIT_EXCEEDS_REMAINING") {
        // Size the form to what is actually left and let them trim.
        if (typeof errData?.data?.remaining === "number") {
          const key = reason === "PERSON_LIMIT_EXCEEDS_REMAINING" ? "personsRemaining" : "vehiclesRemaining";
          setRemaining((prev) => ({ ...(prev || {}), [key]: errData.data.remaining }));
        }
        await refreshHistory();
      } else if (err?.response?.status === 403 && !reason && !errData?.data?.blacklisted) {
        // An older server that gives no reason: fall back to re-syncing.
        await refreshHistory();
      }
    } finally {
      setSubmitting(false);
      setUploadPct(null);
    }
  };

  // Fetch the approved pass (QR PDF) for one batch and hand it to the browser.
  const handleDownloadPass = useCallback(
    async (submission) => {
      if (!token || !submission?.id) return;
      setDownloadingPassId(submission.id);
      try {
        const blob = await downloadBulkPassSubmissionPdf(token, submission.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(submission.refNo || `batch-${submission.id}`).replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Pass downloaded.");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Could not download the pass. Please try again.");
      } finally {
        setDownloadingPassId(null);
      }
    },
    [token]
  );

  const handleStartNextBatch = useCallback(async () => {
    setStep("excel");
    setRows([]);
    setVehicles([]);
    setLastResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (isMultipleSubmissionEnabled) await refreshHistory();
  }, [isMultipleSubmissionEnabled, refreshHistory]);

  // ── Guards ───────────────────────────────────────────────────────────────

  if (loadingBatch) return <PortalSkeleton />;

  if (batchError === "invalid") return <ErrorScreen type="invalid" />;
  if (batchError === "expired") return <ErrorScreen type="expired" />;

  // Single-submission links end on a dedicated confirmation screen — there is
  // no ongoing Bulk Pass context to return to.
  if (step === "submitted" && !isMultipleSubmissionEnabled) {
    return <ConfirmationScreen refNo={batch?.refNo} email={batch?.applicantEmail} />;
  }

  const showUploadFlow = !isMultipleSubmissionEnabled || (canSubmit && step !== "submitted");

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Nav strip */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-stone-200/70 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-white font-black text-sm">
            H
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-800 leading-none">HEP Automation</p>
            <p className="text-[10px] text-stone-400 leading-none mt-0.5">Chennai Port Authority</p>
          </div>
        </div>
        {(bulkPass?.identifier || batch?.refNo) && (
          <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2.5 sm:px-3 py-1.5 rounded-full truncate max-w-[45%]">
            {bulkPass?.identifier || batch?.refNo}
          </span>
        )}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-10 flex flex-col gap-6">
        {isMultipleSubmissionEnabled ? (
          <>
            <BulkPassOverviewCard
              bulkPass={bulkPass}
              validity={validity}
              canSubmit={canSubmit}
              blockedMessage={blockedMessage}
              isMultiple
              nextSubmissionNumber={nextSubmissionNumber}
              batch={batch}
              suppressReturnBanner={!!revisionOf}
              remaining={remaining}
            />

            {canSubmit && step !== "submitted" && (
              <NextStepBanner
                step={step}
                revisionOf={revisionOf}
                nextSubmissionNumber={nextSubmissionNumber}
                maxPersons={effectiveMaxPersons}
                maxVehicles={effectiveMaxVehicles}
                rowsCount={rows.length}
                onStart={scrollToSubmission}
              />
            )}

            {revisionOf && step !== "submitted" && (
              <div className={`${card} p-5 sm:p-6`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-stone-900">
                        Batch #{revisionOf.submissionNumber} needs correction
                      </h3>
                      <span className="font-mono text-xs font-bold text-stone-500">
                        {revisionOf.refNo}
                      </span>
                    </div>
                    {(revisionOf.returnReason || revisionOf.rejectionReason) && (
                      <p className="text-sm text-orange-800 leading-relaxed">
                        {revisionOf.returnReason || revisionOf.rejectionReason}
                      </p>
                    )}

                    {/* Name the exact people or vehicles that were flagged, so
                        the applicant fixes those rather than re-checking all. */}
                    <IssueList issues={revisionOf.issues} className="mt-3" />

                    <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                      Your previous details are already filled in below — correct only what is
                      listed. Correcting this batch replaces its earlier contents and does not use
                      up another submission on this bulk pass.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === "submitted" && (
              <BatchSubmittedPanel
                result={lastResult}
                email={bulkPass?.applicantEmail || batch?.applicantEmail}
                canSubmitMore={canSubmit}
                onNextBatch={handleStartNextBatch}
                onViewHistory={scrollToHistory}
              />
            )}

            <SubmissionHistoryPanel
              submissions={submissionHistory}
              summary={submissionSummary}
              loading={historyLoading}
              onView={(s) => setOpenSubmission(s)}
              onDownload={handleDownloadPass}
              downloadingId={downloadingPassId}
              nextSubmissionNumber={nextSubmissionNumber}
              canSubmit={canSubmit}
            />

            {/* Submission area — only while the bulk pass is open */}
            {canSubmit && step !== "submitted" ? (
              <div id="submission-area" className="flex flex-col gap-6 scroll-mt-24 bp-reveal" style={{ "--bp-delay": "180ms" }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h3 className="text-base font-bold text-stone-800">
                    {revisionOf
                      ? `Correct Batch #${revisionOf.submissionNumber}`
                      : `Submit Batch #${nextSubmissionNumber}`}
                  </h3>
                  <StepIndicator step={step} />
                </div>

                {/* The size this batch may be: the per-batch ceiling, capped by
                    what is left of the bulk pass allowance. */}
                {((remaining?.personsRemaining != null && effectiveMaxPersons < maxPersons) ||
                  (remaining?.vehiclesRemaining != null && effectiveMaxVehicles < maxVehicles)) && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <span className="font-bold">
                        This batch may carry up to {effectiveMaxPersons} person{effectiveMaxPersons === 1 ? "" : "s"}
                        {maxVehicles > 0 ? ` and ${effectiveMaxVehicles} vehicle${effectiveMaxVehicles === 1 ? "" : "s"}` : ""}.
                      </span>{" "}
                      A batch normally takes up to {maxPersons} persons{maxVehicles > 0 ? ` and ${maxVehicles} vehicles` : ""},
                      but that is all that is left of the bulk pass allowance.
                    </p>
                  </div>
                )}

                {step === "excel" && (
                  <ExcelUploadStep token={token} onParsed={handleParsed} onEnterManually={handleEnterManually} />
                )}

                {step === "edit" && (
                  <EditFormStep
                    rows={rows}
                    token={token}
                    batch={{ ...batch, noOfPersons: effectiveMaxPersons, noOfVehicles: effectiveMaxVehicles }}
                    onRowsChange={setRows}
                    vehicles={vehicles}
                    onVehiclesChange={setVehicles}
                    onBack={handleBack}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    uploadPct={uploadPct}
                  />
                )}
              </div>
            ) : (
              !canSubmit && (
                <div className={`${card} p-6 sm:p-8 text-center bp-reveal`} style={{ "--bp-delay": "180ms" }}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mx-auto mb-3">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <p className="text-base font-bold text-stone-800 mb-1">
                    New submissions are closed
                  </p>
                  {/* The history sits directly above this panel, so the copy
                      points upwards rather than reusing the banner's wording. */}
                  <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                    {validity?.state === "NOT_STARTED"
                      ? "This bulk pass has not started accepting submissions yet."
                      : validity?.state === "EXPIRED"
                      ? "This bulk pass has expired. Your previous submissions remain available above."
                      : blockedMessage ||
                        "This bulk pass is no longer accepting new batches. Your previous submissions remain available above."}
                  </p>
                </div>
              )
            )}
          </>
        ) : (
          <>
            <StepIndicator step={step} />
            <IntakeCard batch={batch} />
            {step === "excel" && (
                  <ExcelUploadStep token={token} onParsed={handleParsed} onEnterManually={handleEnterManually} />
                )}
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
                uploadPct={uploadPct}
              />
            )}
          </>
        )}

        <p className="text-center text-xs text-stone-400 pb-4">
          Chennai Port Authority · HEP Automation System · Secure Upload Portal
        </p>
      </div>

      {openSubmission && (
        <SubmissionDetailModal
          token={token}
          onDownload={handleDownloadPass}
          downloading={downloadingPassId != null && openSubmission && String(downloadingPassId) === String(openSubmission.id)}
          submission={openSubmission}
          onClose={() => setOpenSubmission(null)}
        />
      )}
    </div>
  );
}

/**
 * How much of the bulk pass allowance is left, and where the rest went.
 *
 * Only persons who are approved or still awaiting review are charged against
 * the allowance; anyone the officer rejected hands their place back. The strip
 * says so explicitly — the applicant would otherwise read "80 used" and not
 * understand why 10 of those may be sent again.
 *
 * Renders nothing when the pass has no cumulative limit, which is the case for
 * every pass issued before limits existed — silence is the honest answer there.
 */
function RemainingAllowance({ remaining, bulkPass }) {
  if (!remaining) return null;
  const hasSubmissionCap = remaining.submissionsRemaining != null;
  const hasPersonCap = remaining.personsRemaining != null;
  // A vehicle total of 0 means "no vehicles on this pass" — nothing to meter.
  const hasVehicleCap = remaining.vehiclesRemaining != null && Number(bulkPass?.maxTotalVehicles) > 0;
  if (!hasSubmissionCap && !hasPersonCap && !hasVehicleCap) return null;

  // Vehicles are optional, so running out of them never closes the pass.
  const low =
    (hasSubmissionCap && remaining.submissionsRemaining <= 1) ||
    (hasPersonCap && remaining.personsRemaining <= 5);
  const spent =
    (hasSubmissionCap && remaining.submissionsRemaining === 0) ||
    (hasPersonCap && remaining.personsRemaining === 0);

  const tone = spent
    ? { box: "bg-red-50 ring-red-200", label: "text-red-700", value: "text-red-900", bar: "bg-red-500" }
    : low
    ? { box: "bg-amber-50 ring-amber-200", label: "text-amber-700", value: "text-amber-900", bar: "bg-amber-500" }
    : { box: "bg-stone-50 ring-stone-200", label: "text-stone-400", value: "text-stone-800", bar: "bg-emerald-500" };

  const pct = (used, total) => (total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0);

  return (
    <div className={`rounded-2xl px-4 py-3.5 ring-1 ${tone.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${tone.label}`}>
          Bulk pass allowance
        </span>
        <span className="text-[11px] text-stone-500">
          Counts persons and vehicles approved or awaiting review · rejected ones can be sent again ·
          up to {remaining.perBatchMaxPersons ?? BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH} persons and{" "}
          {remaining.perBatchMaxVehicles ?? BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH} vehicles per batch
        </span>
      </div>

      <div className={`grid grid-cols-1 ${[hasSubmissionCap, hasPersonCap, hasVehicleCap].filter(Boolean).length > 2 ? "lg:grid-cols-3" : "sm:grid-cols-2"} gap-x-6 gap-y-3`}>
        {hasSubmissionCap && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-stone-600">Batches</span>
              <span className={`text-sm font-bold tabular-nums ${tone.value}`}>
                {remaining.submissionsRemaining} of {bulkPass?.maxSubmissions} left
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/70 ring-1 ring-black/5 overflow-hidden">
              <div className={`h-full ${tone.bar}`} style={{ width: `${pct(remaining.submissionsUsed, bulkPass?.maxSubmissions)}%` }} />
            </div>
          </div>
        )}
        {hasPersonCap && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-stone-600">Persons</span>
              <span className={`text-sm font-bold tabular-nums ${tone.value}`}>
                {remaining.personsRemaining} of {bulkPass?.maxTotalPersons} left
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/70 ring-1 ring-black/5 overflow-hidden">
              <div className={`h-full ${tone.bar}`} style={{ width: `${pct(remaining.personsUsed, bulkPass?.maxTotalPersons)}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold">
              <span className="text-emerald-700">{remaining.personsApproved ?? 0} approved</span>
              <span className="text-amber-700">{remaining.personsPending ?? 0} awaiting review</span>
              {(remaining.personsRejected ?? 0) > 0 && (
                <span className="text-red-600">{remaining.personsRejected} rejected · place released</span>
              )}
            </div>
          </div>
        )}
        {hasVehicleCap && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-stone-600">Vehicles</span>
              <span className="text-sm font-bold tabular-nums text-stone-800">
                {remaining.vehiclesRemaining} of {bulkPass?.maxTotalVehicles} left
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/70 ring-1 ring-black/5 overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${pct(remaining.vehiclesUsed, bulkPass?.maxTotalVehicles)}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold">
              <span className="text-emerald-700">{remaining.vehiclesApproved ?? 0} approved</span>
              <span className="text-amber-700">{remaining.vehiclesPending ?? 0} awaiting review</span>
              {(remaining.vehiclesRejected ?? 0) > 0 && (
                <span className="text-red-600">{remaining.vehiclesRejected} rejected · place released</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The officer's per-row verdicts. One batch-level sentence rarely tells the
 * applicant which of thirty people is the problem, so each flagged entry is
 * listed with its own reason.
 */
function IssueList({ issues, className = "" }) {
  const items = Array.isArray(issues?.items) ? issues.items : [];
  if (!items.length) return null;

  return (
    <div className={`rounded-2xl bg-red-50 ring-1 ring-red-200 overflow-hidden ${className}`}>
      <p className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-red-700 bg-red-100/70">
        {items.length} entr{items.length === 1 ? "y needs" : "ies need"} correction
      </p>
      <ul className="divide-y divide-red-100">
        {items.map((item, i) => (
          <li key={i} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-red-900 shrink-0">
              {item.label}
              {item.identifier && (
                <span className="ml-2 font-mono text-[11px] font-normal text-red-500">
                  {item.identifier}
                </span>
              )}
            </span>
            <span className="text-xs text-red-700 leading-relaxed sm:ml-auto sm:text-right">
              {item.reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two-step progress marker for the batch currently being prepared. */
/**
 * One line that tells the applicant what to do right now, with the button that
 * takes them there. The overview above explains the pass; this explains the
 * next click.
 */
function NextStepBanner({ step, revisionOf, nextSubmissionNumber, maxPersons, maxVehicles, rowsCount, onStart }) {
  const batchLabel = revisionOf ? `Correct batch #${revisionOf.submissionNumber}` : `Batch #${nextSubmissionNumber}`;
  const copy =
    step === "edit"
      ? {
          title: `${batchLabel} — review the details`,
          detail: `${rowsCount} person${rowsCount === 1 ? "" : "s"} listed. Add a photo and Aadhaar card for each, then submit.`,
          cta: "Continue to the form",
        }
      : revisionOf
      ? {
          title: `${batchLabel} — your earlier details are filled in`,
          detail: "Fix only what the Traffic Department flagged and resend.",
          cta: "Go to the correction",
        }
      : {
          title: `Ready for ${batchLabel.toLowerCase()}`,
          detail: `Upload an Excel sheet or enter persons by hand — up to ${maxPersons} person${maxPersons === 1 ? "" : "s"}${
            maxVehicles > 0 ? ` and ${maxVehicles} vehicle${maxVehicles === 1 ? "" : "s"}` : ""
          } in this batch.`,
          cta: `Start batch #${nextSubmissionNumber}`,
        };

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl px-5 py-4 bg-[#1f1f1f] text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.6)] bp-reveal"
      style={{ "--bp-delay": "60ms" }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f]">
        {step === "edit" ? <Users className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{copy.title}</p>
        <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">{copy.detail}</p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="bp-press bp-lift inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1f1f1f] text-sm font-bold whitespace-nowrap"
      >
        {copy.cta}
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = [
    { label: "Upload", key: "excel", num: 1 },
    { label: "Review & Photos", key: "edit", num: 2 },
    { label: "Submitted", key: "submitted", num: 3 },
  ];
  const stepOrder = ["excel", "edit", "submitted"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="flex items-center gap-2 flex-1" aria-label={`Step ${currentIdx + 1} of ${steps.length}`}>
      {steps.map((s, i) => {
        const thisIdx = stepOrder.indexOf(s.key);
        const isActive = step === s.key;
        const isDone = currentIdx > thisIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div className="flex-1 h-0.5 rounded bg-stone-200 overflow-hidden">
                <div className={"h-full bg-amber-400 bp-bar"} style={{ width: isDone || isActive ? "100%" : "0%" }} />
              </div>
            )}
            <div
              aria-current={isActive ? "step" : undefined}
              className={
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap " +
                (isActive
                  ? "bg-amber-400 text-[#1f1f1f] shadow-[0_8px_20px_-10px_rgba(245,158,11,0.9)] bp-pop"
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
  );
}
