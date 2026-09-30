/**
 * bulkPassValidity.js
 * -------------------
 * Client mirror of the server's Bulk Pass validity rules
 * (user_service/src/utils/bulkPassValidity.js).
 *
 * The server is always the authority — every `validate-token` response carries
 * a `validity` object and the UI should prefer it. These helpers exist so a
 * page that only has a raw batch row (the management tables, which are fed by
 * `listBulkBatches`) can still label a Bulk Pass consistently.
 *
 * Date-only validation: All validity dates are treated as date-only (no time
 * component) and automatically extended to end of day (23:59:59.999) to ensure
 * passes remain valid throughout the entire specified day. `validityFrom` opens
 * at 00:00 IST of its day.
 *
 * Each batch under a Bulk Pass carries its own window, chosen by the applicant
 * inside the pass window — see getBatchValidityErrors.
 */

export const EXPIRY_WARNING_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The port operates on IST (UTC+05:30, no DST). Must match the server helper
// (user_service/src/utils/bulkPassValidity.js) exactly so the FE and BE never
// disagree about ACTIVE vs EXPIRED.
const IST_OFFSET_MS = 330 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalise the end of a validity window. All dates are treated as date-only
 * (no time component) and automatically extended to end of day (23:59:59.999)
 * so a pass valid "upto 30 Sep" stays usable throughout the entire day.
 */
function normalizeValidityUpto(value) {
  const d = toDate(value);
  if (!d) return null;
  
  // Always treat as date-only and extend to END of that day in IST
  // This ensures consistent behavior regardless of how the date was stored
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const endUtcMs =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS;
  return new Date(endUtcMs);
}

/**
 * The IST calendar day of a date-ish value as "YYYY-MM-DD", or null.
 * A bare "YYYY-MM-DD" (what a date input yields) is that IST day as-is.
 */
export function toIstDateKey(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const key = value.trim();
    const d = new Date(`${key}T00:00:00Z`);
    // Reject impossible days ("2026-02-31") instead of rolling them over.
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key ? key : null;
  }
  const d = toDate(value);
  if (!d) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Normalise the start of a validity window to 00:00 IST of that day.
 */
function normalizeValidityFrom(value) {
  const key = toIstDateKey(value);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/**
 * The earliest and latest day ("YYYY-MM-DD", IST) an applicant may choose for a
 * batch under this Bulk Pass: from today or the pass start, whichever is later,
 * up to the pass end. Mirrors the server's getBatchValidityBounds.
 */
export function getBatchValidityBounds(pass, now = new Date()) {
  const from = pass?.validityFrom ?? pass?.approved_time_from ?? pass?.validity_from ?? null;
  const upto = pass?.validityUpto ?? pass?.approved_time_upto ?? pass?.validity_upto ?? null;
  const today = toIstDateKey(now);
  const passFrom = toIstDateKey(from);
  return {
    min: passFrom && passFrom > today ? passFrom : today,
    max: toIstDateKey(upto),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-01" → "01 Oct 2026". */
export function formatDateKey(key) {
  if (!key) return "";
  const [y, m, d] = key.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/**
 * Check the window an applicant chose for one batch. Returns an error keyed by
 * field ({ validityFrom?, validityUpto? }) — empty when the window is valid.
 * Same rules, same wording as the server's resolveBatchValidity.
 */
export function getBatchValidityErrors({ validityFrom, validityUpto }, pass, now = new Date()) {
  const fromKey = toIstDateKey(validityFrom);
  const uptoKey = toIstDateKey(validityUpto);
  const errors = {};
  if (!fromKey) errors.validityFrom = "Please enter a valid 'Valid From' date for this batch.";
  if (!uptoKey) errors.validityUpto = "Please enter a valid 'Valid To' date for this batch.";
  const { min, max } = getBatchValidityBounds(pass, now);
  if (fromKey && fromKey < min) {
    errors.validityFrom = `'Valid From' cannot be earlier than ${formatDateKey(min)}.`;
  }
  if (fromKey && uptoKey && uptoKey < fromKey) {
    errors.validityUpto = "'Valid To' cannot be earlier than 'Valid From'.";
  } else if (uptoKey && max && uptoKey > max) {
    errors.validityUpto = `'Valid To' cannot be later than the bulk pass validity (${formatDateKey(max)}).`;
  }
  return errors;
}

/**
 * Derive the validity state of a Bulk Pass from any row shape
 * (camelCase batch, snake_case public request, or an approved time window).
 *
 * @returns {{ state, expiringSoon, daysRemaining, canSubmit, validityFrom, validityUpto }}
 */
export function getValidityState(source, now = new Date()) {
  if (!source) {
    return { state: "UNKNOWN", expiringSoon: false, daysRemaining: null, canSubmit: false, validityFrom: null, validityUpto: null };
  }

  const from = normalizeValidityFrom(source.validityFrom ?? source.approved_time_from ?? source.validity_from ?? null);
  const upto = normalizeValidityUpto(
    source.validityUpto ?? source.approved_time_upto ?? source.validity_upto ?? null
  );
  const at = toDate(now) || new Date();

  const base = {
    validityFrom: from ? from.toISOString() : null,
    validityUpto: upto ? upto.toISOString() : null,
  };

  if (!upto) {
    return { ...base, state: "UNKNOWN", expiringSoon: false, daysRemaining: null, canSubmit: false };
  }
  if (from && at.getTime() < from.getTime()) {
    return { ...base, state: "NOT_STARTED", expiringSoon: false, daysRemaining: null, canSubmit: false };
  }

  const msRemaining = upto.getTime() - at.getTime();
  if (msRemaining < 0) {
    return { ...base, state: "EXPIRED", expiringSoon: false, daysRemaining: 0, canSubmit: false };
  }

  const daysRemaining = Math.ceil(msRemaining / MS_PER_DAY);
  return {
    ...base,
    state: "ACTIVE",
    expiringSoon: daysRemaining <= EXPIRY_WARNING_DAYS,
    daysRemaining,
    canSubmit: true,
  };
}

/**
 * Presentation metadata for a validity state, keyed so the same colour language
 * is used on the applicant portal and in the management console.
 */
export function getValidityMeta(validity) {
  const state = validity?.state || "UNKNOWN";

  if (state === "ACTIVE" && validity?.expiringSoon) {
    return {
      key: "EXPIRING_SOON",
      label: "Expiring Soon",
      tone: "amber",
      badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      dot: "bg-amber-500",
      panel: "bg-amber-50 ring-1 ring-amber-200",
      heading: "text-amber-900",
      body: "text-amber-800",
    };
  }

  switch (state) {
    case "ACTIVE":
      return {
        key: "ACTIVE",
        label: "Active",
        tone: "emerald",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        dot: "bg-emerald-500",
        panel: "bg-emerald-50 ring-1 ring-emerald-200",
        heading: "text-emerald-900",
        body: "text-emerald-800",
      };
    case "NOT_STARTED":
      return {
        key: "NOT_STARTED",
        label: "Not Started",
        tone: "sky",
        badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
        dot: "bg-sky-500",
        panel: "bg-sky-50 ring-1 ring-sky-200",
        heading: "text-sky-900",
        body: "text-sky-800",
      };
    case "EXPIRED":
      return {
        key: "EXPIRED",
        label: "Expired",
        tone: "red",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
        dot: "bg-red-500",
        panel: "bg-red-50 ring-1 ring-red-200",
        heading: "text-red-900",
        body: "text-red-800",
      };
    default:
      return {
        key: "UNKNOWN",
        label: "No Validity Set",
        tone: "slate",
        badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        dot: "bg-slate-400",
        panel: "bg-slate-50 ring-1 ring-slate-200",
        heading: "text-slate-800",
        body: "text-slate-600",
      };
  }
}

/**
 * Short human phrase for how much of the validity window is left.
 */
export function describeRemaining(validity) {
  if (!validity) return "";
  if (validity.state === "EXPIRED") return "Validity ended";
  if (validity.state === "NOT_STARTED") return "Not yet open for submissions";
  if (validity.state === "UNKNOWN") return "No validity period set";
  const d = validity.daysRemaining;
  if (d == null) return "Open for submissions";
  if (d <= 0) return "Closes today";
  if (d === 1) return "1 day remaining";
  return `${d} days remaining`;
}
