"use client";

/**
 * BulkPassCreateSummary.jsx
 * -------------------------
 * A live, sticky summary that sits above the Bulk Pass create form and shows
 * the officer what the applicant is about to receive: who it is for, how many
 * persons and vehicles in total, the per-batch ceiling, and the validity
 * window — plus a completion meter for the required fields.
 *
 * Shared by the admin console and the department dashboard forms.
 */

import React from "react";
import { Users, Car, CalendarClock, Building2, CheckCircle2, Layers } from "lucide-react";
import { BULK_PASS_LIMITS, batchesNeededHint } from "@/lib/bulkPassConstants";

const REQUIRED = [
  ["visitorType", "Visitor type"],
  ["companyName", "Company"],
  ["applicantEmail", "Applicant email"],
  ["applicantMobile", "Applicant mobile"],
  ["noOfPersons", "Max No. of Persons"],
  ["paymentMode", "Payment mode"],
  ["purposeOfVisit", "Purpose"],
  ["validityFrom", "Validity from"],
  ["validityUpto", "Validity upto"],
];

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : dateFmt.format(d);
};

function Chip({ icon: Icon, label, value, muted, dark }) {
  const base = dark
    ? "bg-white/5 ring-white/10 text-stone-200"
    : "bg-white ring-slate-200 text-slate-800";
  const sub = dark ? "text-stone-500" : "text-slate-400";
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ${base} ${muted ? "opacity-60" : ""}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{label}</p>
        <p className="text-sm font-semibold truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

/**
 * @param {Object}  form    the create form's state
 * @param {Object}  errors  current validation errors, keyed by field
 * @param {boolean} dark    render for the dark-capable dashboard theme
 */
export default function BulkPassCreateSummary({ form, errors = {}, dark = false, className = "" }) {
  const filled = REQUIRED.filter(([k]) => String(form?.[k] ?? "").trim() !== "" && !errors[k]);
  const pct = Math.round((filled.length / REQUIRED.length) * 100);
  const complete = pct === 100 && Object.values(errors).every((e) => !e);
  const missing = REQUIRED.filter(([k]) => !filled.some(([f]) => f === k)).map(([, label]) => label);

  const persons = Number(form?.noOfPersons) || 0;
  const vehicles = Number(form?.noOfVehicles) || 0;
  const hint = batchesNeededHint(persons, vehicles, !!form?.multipleSubmissionsEnabled);

  const shell = dark
    ? "bg-stone-50/95 dark:bg-[#1f232d]/95 ring-stone-200/70 dark:ring-white/[0.06]"
    : "bg-white/95 ring-slate-200";
  const text = dark ? "text-stone-700 dark:text-stone-300" : "text-slate-600";

  return (
    <div className={`sticky top-2 z-20 rounded-2xl ring-1 backdrop-blur-md shadow-sm p-4 bp-reveal ${shell} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[#1f1f1f]">
            <Layers className="h-3.5 w-3.5" />
          </span>
          <p className={`text-sm font-bold ${dark ? "text-stone-800 dark:text-stone-100" : "text-slate-800"}`}>
            What the applicant will receive
          </p>
        </div>
        <div className="flex items-center gap-3 min-w-[180px] flex-1 sm:flex-none">
          <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${dark ? "bg-stone-200 dark:bg-white/10" : "bg-slate-100"}`}>
            <div className={`h-full bp-bar ${complete ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${complete ? "text-emerald-700" : text}`}>
            {complete && <CheckCircle2 className="h-3.5 w-3.5" />}
            {filled.length}/{REQUIRED.length} ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Chip icon={Building2} label="For" value={form?.companyName?.trim()} muted={!form?.companyName} dark={dark} />
        <Chip
          icon={Users}
          label="Persons in total"
          value={persons > 0 ? `${persons} · up to ${BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH} per batch` : null}
          muted={!(persons > 0)}
          dark={dark}
        />
        <Chip
          icon={Car}
          label="Vehicles in total"
          value={vehicles > 0 ? `${vehicles} · up to ${BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH} per batch` : "None"}
          muted={!(vehicles > 0)}
          dark={dark}
        />
        <Chip
          icon={CalendarClock}
          label="Valid"
          value={form?.validityUpto ? `${fmtDate(form.validityFrom) || "now"} → ${fmtDate(form.validityUpto)}` : null}
          muted={!form?.validityUpto}
          dark={dark}
        />
      </div>

      {(hint || missing.length > 0) && (
        <p className={`mt-2.5 text-[11px] leading-relaxed ${text}`}>
          {hint && <span>{hint} </span>}
          {missing.length > 0 && !complete && (
            <span className={dark ? "text-stone-500 dark:text-stone-400" : "text-slate-400"}>
              Still needed: {missing.slice(0, 4).join(", ")}
              {missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
