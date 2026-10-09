export const IST_TZ = "Asia/Kolkata";

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const fmtNum = (v, digits = 0) =>
  num(v).toLocaleString("en-IN", { maximumFractionDigits: digits });

/** Kilograms → compact tonnes/kg label. */
export const fmtWeight = (kg) => {
  const n = num(kg);
  if (n >= 1000) {
    return `${n / 1000 >= 1000 ? fmtNum(n / 1000) : (n / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} t`;
  }
  return `${fmtNum(n)} kg`;
};

export const fmtMinutes = (m) => {
  const n = Math.round(num(m));
  if (!n) return "0m";
  const d = Math.floor(n / 1440);
  const h = Math.floor((n % 1440) / 60);
  const mm = n % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${mm ? `${mm}m` : ""}`.trim();
  return `${mm}m`;
};

export const fmtPct = (v, digits = 0) =>
  `${num(v).toLocaleString("en-IN", { maximumFractionDigits: digits })}%`;

export const fmtDateTimeIST = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const fmtDateIST = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { timeZone: IST_TZ, day: "2-digit", month: "short", year: "numeric" });
};

/** 'YYYY-MM-DD' for a Date, in IST. */
export const toISTDateString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const shiftDays = (yyyyMmDd, days) => {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Human label for a chart bucket (ISO string) at day or hour granularity. */
export const fmtBucket = (iso, bucket) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  if (bucket === "hour") {
    return d.toLocaleString("en-IN", { timeZone: IST_TZ, hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("en-IN", { timeZone: IST_TZ, day: "2-digit", month: "short" });
};

export const pctDelta = (current, previous) => {
  const c = num(current);
  const p = num(previous);
  if (!p) return c ? 100 : 0;
  return ((c - p) / p) * 100;
};

export const prettyDateRangeLabel = (from, to) => {
  if (!from && !to) return "All time";
  const f = from ? fmtDateIST(`${from}T00:00:00+05:30`) : "…";
  const t = to ? fmtDateIST(`${to}T00:00:00+05:30`) : "…";
  return from === to ? f : `${f} – ${t}`;
};
