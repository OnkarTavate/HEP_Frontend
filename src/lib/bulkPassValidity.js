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
 * A validity window is a date + time of day in IST. The time defaults to 06:00
 * (from) and 18:00 (upto) and the user may change it; an upto time covers its
 * whole minute (HH:MM:59.999). Legacy rows stored as a bare date (midnight)
 * keep their old meaning: from opens at 00:00 IST, upto runs to end of day.
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

// Default time of day for a bulk pass window when only a date is chosen.
// Must match the server helper.
export const DEFAULT_VALIDITY_FROM_TIME = "06:00";
export const DEFAULT_VALIDITY_UPTO_TIME = "18:00";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * The IST calendar day of a date-ish value as "YYYY-MM-DD", or null.
 * A bare "YYYY-MM-DD" (what a date input yields) is that IST day as-is.
 */
export function toIstDateKey(value) {
  if (typeof value === "string" && DATE_KEY_RE.test(value.trim())) {
    const key = value.trim();
    const d = new Date(`${key}T00:00:00Z`);
    // Reject impossible days ("2026-02-31") instead of rolling them over.
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key ? key : null;
  }
  const d = toDate(value);
  if (!d) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** A valid "HH:MM" (24h) time, or null. */
export function toTimeKey(value) {
  if (typeof value !== "string") return null;
  const t = value.trim().slice(0, 5);
  return TIME_KEY_RE.test(t) ? t : null;
}

/** The IST time of day of an instant as "HH:MM", or null. */
export function toIstTimeKey(value) {
  const d = toDate(value);
  if (!d) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(11, 16);
}

/** The instant for an IST day + "HH:MM"; an upto covers its whole minute. */
function istDateTime(dateKey, timeKey, { upto = false } = {}) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = timeKey.split(":").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, upto ? 59 : 0, upto ? 999 : 0);
  return new Date(utcMs - IST_OFFSET_MS);
}

function istDayBoundary(key, endOfDay) {
  const [y, m, d] = key.split("-").map(Number);
  const utcMs = endOfDay ? Date.UTC(y, m - 1, d, 23, 59, 59, 999) : Date.UTC(y, m - 1, d);
  return new Date(utcMs - IST_OFFSET_MS);
}

const isIstMidnight = (d) => (d.getTime() + IST_OFFSET_MS) % MS_PER_DAY === 0;
const isUtcMidnight = (d) => d.getTime() % MS_PER_DAY === 0;

/**
 * The instant for one end of a window from a date and an optional "HH:MM".
 * A missing time falls back to the 06:00 / 18:00 default. Mirrors the server's
 * combineValidity.
 */
export function combineValidity(dateValue, timeValue, { upto = false } = {}) {
  const fallback = upto ? DEFAULT_VALIDITY_UPTO_TIME : DEFAULT_VALIDITY_FROM_TIME;
  const isBareDate = typeof dateValue === "string" && DATE_KEY_RE.test(dateValue.trim());
  if (!isBareDate && timeValue == null) {
    const d = toDate(dateValue);
    if (!d) return null;
    return upto ? normalizeValidityUpto(d) : d;
  }
  const dateKey = toIstDateKey(dateValue);
  if (!dateKey) return null;
  const timeKey = timeValue == null || timeValue === "" ? fallback : toTimeKey(timeValue);
  if (!timeKey) return null;
  return istDateTime(dateKey, timeKey, { upto });
}

/**
 * Normalise the end of a validity window to the instant it closes: a bare
 * "YYYY-MM-DD" closes at 18:00 IST, a legacy midnight at the end of that IST
 * day, and any other instant is kept as-is.
 */
export function normalizeValidityUpto(value) {
  if (typeof value === "string" && DATE_KEY_RE.test(value.trim())) {
    const key = toIstDateKey(value);
    return key ? istDateTime(key, DEFAULT_VALIDITY_UPTO_TIME, { upto: true }) : null;
  }
  const d = toDate(value);
  if (!d) return null;
  if (isIstMidnight(d) || isUtcMidnight(d)) return istDayBoundary(toIstDateKey(d), true);
  return d;
}

/**
 * Normalise the start of a validity window: a bare "YYYY-MM-DD" opens at
 * 06:00 IST; any stored instant is kept.
 */
export function normalizeValidityFrom(value) {
  if (typeof value === "string" && DATE_KEY_RE.test(value.trim())) {
    const key = toIstDateKey(value);
    return key ? istDateTime(key, DEFAULT_VALIDITY_FROM_TIME) : null;
  }
  return toDate(value);
}

/**
 * "DD/MM/YYYY HH:MM" (IST) for a validity instant. Pass `{ upto: true }` for
 * the end of a window so a legacy bare date shows its real closing time.
 */
export function formatValidityDateTime(value, { upto = false, fallback = "—" } = {}) {
  const d = upto ? normalizeValidityUpto(value) : normalizeValidityFrom(value);
  if (!d) return fallback;
  const [y, m, day] = toIstDateKey(d).split("-");
  return `${day}/${m}/${y} ${toIstTimeKey(d)}`;
}

/**
 * Prefill values for a date + time input pair from a stored instant.
 * Empty values yield the default time.
 */
export function toValidityInputs(value, { upto = false } = {}) {
  const d = value ? (upto ? normalizeValidityUpto(value) : normalizeValidityFrom(value)) : null;
  return {
    date: d ? toIstDateKey(d) : "",
    time: d ? toIstTimeKey(d) : upto ? DEFAULT_VALIDITY_UPTO_TIME : DEFAULT_VALIDITY_FROM_TIME,
  };
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
 * Times are "HH:MM" (IST) and default to 06:00 / 18:00.
 * Same rules, same wording as the server's resolveBatchValidity.
 */
export function getBatchValidityErrors(
  { validityFrom, validityUpto, validityFromTime, validityUptoTime },
  pass,
  now = new Date()
) {
  const fromKey = toIstDateKey(validityFrom);
  const uptoKey = toIstDateKey(validityUpto);
  const fromTime = validityFromTime ? toTimeKey(validityFromTime) : DEFAULT_VALIDITY_FROM_TIME;
  const uptoTime = validityUptoTime ? toTimeKey(validityUptoTime) : DEFAULT_VALIDITY_UPTO_TIME;
  const errors = {};
  if (!fromKey) errors.validityFrom = "Please enter a valid 'Valid From' date for this batch.";
  else if (!fromTime) errors.validityFrom = "Please enter a valid 'Valid From' time for this batch.";
  if (!uptoKey) errors.validityUpto = "Please enter a valid 'Valid To' date for this batch.";
  else if (!uptoTime) errors.validityUpto = "Please enter a valid 'Valid To' time for this batch.";
  if (errors.validityFrom || errors.validityUpto) return errors;

  const from = istDateTime(fromKey, fromTime);
  const upto = istDateTime(uptoKey, uptoTime, { upto: true });
  const passFrom = normalizeValidityFrom(pass?.validityFrom ?? pass?.approved_time_from ?? pass?.validity_from ?? null);
  const passUpto = normalizeValidityUpto(pass?.validityUpto ?? pass?.approved_time_upto ?? pass?.validity_upto ?? null);
  const { min, max } = getBatchValidityBounds(pass, now);

  if (fromKey < min) {
    errors.validityFrom = `'Valid From' cannot be earlier than ${formatDateKey(min)}.`;
  } else if (passFrom && from.getTime() < passFrom.getTime()) {
    errors.validityFrom = `'Valid From' cannot be earlier than the bulk pass validity (${formatValidityDateTime(passFrom)}).`;
  }
  if (upto.getTime() <= from.getTime()) {
    errors.validityUpto = "'Valid To' must be later than 'Valid From'.";
  } else if ((max && uptoKey > max) || (passUpto && upto.getTime() > passUpto.getTime())) {
    errors.validityUpto = `'Valid To' cannot be later than the bulk pass validity (${formatValidityDateTime(passUpto, { upto: true })}).`;
  } else if (upto.getTime() < (toDate(now) || new Date()).getTime()) {
    errors.validityUpto = "'Valid To' time has already passed.";
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
