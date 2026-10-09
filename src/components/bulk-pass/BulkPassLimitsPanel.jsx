"use client";

/**
 * BulkPassLimitsPanel.jsx
 * -----------------------
 * The department's control over a reusable Bulk Pass after it has been issued:
 *
 *   - how much of the person and vehicle totals is used, split into approved /
 *     awaiting review / rejected (rejected ones hand their place back);
 *   - raise or lower the totals (each batch stays capped at 30 / 30);
 *   - extend the validity window;
 *   - switch the applicant link off, or back on.
 *
 * Shared by the admin console and the department dashboard so both read the
 * same numbers and offer the same actions.
 */

import React, { useState } from "react";
import { Gauge, Pencil, Power, PowerOff, Loader2, CheckCircle2, Clock, XCircle, Users, Archive, Car } from "lucide-react";
import { toast } from "sonner";
import { updateBulkBatch, setBulkPassLinkActive } from "@/lib/bulkPassApi";
import { BULK_PASS_LIMITS, validatePassTotals, batchesNeededHint } from "@/lib/bulkPassConstants";
import { combineValidity, toValidityInputs } from "@/lib/bulkPassValidity";


/**
 * A used / total meter with the verdict split underneath.
 */
function Meter({ label, used, total, icon: Icon, children }) {
  const hasCap = total != null && Number.isFinite(Number(total));
  const pct = hasCap && Number(total) > 0 ? Math.min(100, Math.round((used / Number(total)) * 100)) : 0;
  const nearly = hasCap && Number(total) - used <= Math.max(1, Math.ceil(Number(total) * 0.1));
  const full = hasCap && used >= Number(total);
  return (
    <div className="rounded-2xl ring-1 ring-slate-200 bg-white px-4 py-3.5 bp-lift">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-sm font-extrabold text-slate-900 tabular-nums">
          {used}
          <span className="text-slate-400 font-semibold"> / {hasCap ? total : "∞"}</span>
        </span>
      </div>
      {hasCap && (
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full bp-bar ${full ? "bg-red-500" : nearly ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * @param {Object}   batch     the parent (reusable) batch row
 * @param {Object}   summary   submissionSummary from getChildSubmissions
 * @param {Object}   remaining remaining from getChildSubmissions (optional)
 * @param {Object}   validity  from getValidityState
 * @param {boolean}  canManage whether this user may edit limits / switch the link
 * @param {Function} onChanged called after a successful change so the page can refetch
 */
export default function BulkPassLimitsPanel({
  batch,
  summary,
  remaining,
  validity,
  canManage = true,
  onChanged,
  className = "",
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  // The editor is seeded from the batch each time it opens, so a refetch never
  // overwrites what the officer is typing and a stale draft is never shown.
  const seedForm = () => {
    const upto = toValidityInputs(batch?.validityUpto, { upto: true });
    return {
      noOfPersons: String(batch?.maxTotalPersons ?? batch?.noOfPersons ?? ""),
      noOfVehicles: String(batch?.maxTotalVehicles ?? batch?.noOfVehicles ?? ""),
      validityUpto: upto.date,
      validityUptoTime: upto.time,
    };
  };
  const [form, setForm] = useState(seedForm);
  const openEditor = () => {
    setForm(seedForm());
    setEditing(true);
  };

  if (!batch?.multipleSubmissionsEnabled) return null;

  const submissionsUsed = remaining?.submissionsUsed ?? summary?.countedSubmissions ?? summary?.totalSubmissions ?? 0;
  const personsUsed = remaining?.personsUsed ?? summary?.countedPersons ?? summary?.totalPersons ?? 0;
  const vehiclesUsed = remaining?.vehiclesUsed ?? summary?.countedVehicles ?? summary?.totalVehicles ?? 0;
  const approved = summary?.approvedPersons ?? remaining?.personsApproved ?? 0;
  const pending = summary?.pendingPersons ?? remaining?.personsPending ?? 0;
  const rejected = summary?.rejectedPersons ?? remaining?.personsRejected ?? 0;
  const submitted = summary?.totalPersons ?? remaining?.personsSubmitted ?? 0;
  const vApproved = summary?.approvedVehicles ?? remaining?.vehiclesApproved ?? 0;
  const vPending = summary?.pendingVehicles ?? remaining?.vehiclesPending ?? 0;
  const vRejected = summary?.rejectedVehicles ?? remaining?.vehiclesRejected ?? 0;
  const vSubmitted = summary?.totalVehicles ?? remaining?.vehiclesSubmitted ?? 0;

  // Pass totals (what the applicant may use up), and the fixed per-batch ceiling.
  const totalPersons = Number(batch.maxTotalPersons ?? batch.noOfPersons) || BULK_PASS_LIMITS.DEFAULT_MAX_PERSONS;
  const totalVehicles = Math.max(0, Number(batch.maxTotalVehicles ?? batch.noOfVehicles) || 0);
  const perBatchP = Number(batch.perBatchMaxPersons) || BULK_PASS_LIMITS.MAX_PERSONS_PER_BATCH;
  const perBatchV = Number(batch.perBatchMaxVehicles) || BULK_PASS_LIMITS.MAX_VEHICLES_PER_BATCH;
  const linkOn = batch.tokenActive !== false;
  const expired = validity?.state === "EXPIRED";

  const newPersons = parseInt(form.noOfPersons, 10);
  const newVehicles = parseInt(form.noOfVehicles, 10);
  const totalsErrors = validatePassTotals(form.noOfPersons, form.noOfVehicles, true);
  const formError =
    totalsErrors.noOfPersons ||
    totalsErrors.noOfVehicles ||
    (newPersons >= 1 && newPersons < personsUsed && `${personsUsed} persons are already approved or awaiting review.`) ||
    (newVehicles >= 0 && newVehicles < vehiclesUsed && `${vehiclesUsed} vehicles are already approved or awaiting review.`) ||
    null;
  const formHint = batchesNeededHint(form.noOfPersons, form.noOfVehicles, true);

  const save = async () => {
    if (formError) { toast.error(formError); return; }
    // The clock is read here, in the handler, rather than during render.
    const current = toValidityInputs(batch.validityUpto, { upto: true });
    const uptoChanged =
      !!form.validityUpto && (form.validityUpto !== current.date || form.validityUptoTime !== current.time);
    if (uptoChanged) {
      const uptoAt = combineValidity(form.validityUpto, form.validityUptoTime, { upto: true });
      if (!uptoAt) { toast.error("Please enter a valid validity upto date and time."); return; }
      if (uptoAt.getTime() <= Date.now()) { toast.error("Validity upto must be in the future."); return; }
    }
    setSaving(true);
    try {
      const payload = { noOfPersons: newPersons, noOfVehicles: newVehicles };
      if (uptoChanged) {
        payload.validityUpto = form.validityUpto;
        payload.validityUptoTime = form.validityUptoTime;
      }
      await updateBulkBatch(batch.id, payload);
      toast.success("Bulk pass limits updated.");
      setEditing(false);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update limits.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLink = async () => {
    const next = !linkOn;
    if (!next && !window.confirm("Switch the applicant link off? New batches will be refused until it is switched back on. Batches already under review are not affected.")) return;
    setSwitching(true);
    try {
      await setBulkPassLinkActive(batch.id, next);
      toast.success(next ? "Applicant link reactivated." : "Applicant link deactivated.");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to switch the link.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bp-reveal ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-100 text-amber-600">
            <Gauge className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-800">Bulk Pass Allowance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Totals for the whole pass; each batch carries up to {perBatchP} persons and {perBatchV} vehicles.
              Only persons and vehicles approved or awaiting review count; rejected ones hand their place back.
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEditor())}
              className="bp-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              <Pencil className="h-3.5 w-3.5" /> {editing ? "Cancel" : "Adjust limits / validity"}
            </button>
            <button
              type="button"
              onClick={toggleLink}
              disabled={switching || (!linkOn && expired)}
              title={!linkOn && expired ? "Extend the validity before reactivating" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                linkOn ? "text-red-700 bg-red-50 hover:bg-red-100" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : linkOn ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {linkOn ? "Deactivate link" : "Reactivate link"}
            </button>
          </div>
        )}
      </div>

      {!linkOn && (
        <p className="mb-4 text-xs font-semibold text-red-700 bg-red-50 ring-1 ring-red-200 rounded-xl px-3 py-2">
          The applicant link is switched off. New batches are refused; the applicant can still see their history.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Meter label="Persons" used={personsUsed} total={totalPersons} icon={Users}>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold mt-2">
            <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {approved} approved</span>
            <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="h-3 w-3" /> {pending} awaiting review</span>
            <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> {rejected} rejected</span>
            <span className="text-slate-400 font-normal">({submitted} submitted in total)</span>
          </div>
        </Meter>
        <Meter label="Vehicles" used={vehiclesUsed} total={totalVehicles} icon={Car}>
          {totalVehicles === 0 ? (
            <p className="text-[11px] text-slate-500 mt-2">No vehicles allowed on this pass.</p>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold mt-2">
              <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {vApproved} approved</span>
              <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="h-3 w-3" /> {vPending} awaiting review</span>
              <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> {vRejected} rejected</span>
              <span className="text-slate-400 font-normal">({vSubmitted} submitted in total)</span>
            </div>
          )}
        </Meter>
        <Meter label="Batches" used={submissionsUsed} total={batch.maxSubmissions ?? null} icon={Archive}>
          <p className="text-[11px] text-slate-500 mt-2">
            {summary?.totalSubmissions ?? submissionsUsed} submitted
            {summary?.byStatus?.rejected ? ` · ${summary.byStatus.rejected} rejected (slot released)` : ""}
            {batch.maxSubmissions == null ? " · no cap on batches" : ""}
          </p>
        </Meter>
      </div>

      {editing && (
        <div className="mt-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Max No. of Persons (total)</label>
              <input
                type="number"
                min={1}
                max={BULK_PASS_LIMITS.MAX_TOTAL_PERSONS}
                value={form.noOfPersons}
                onChange={(e) => setForm((f) => ({ ...f, noOfPersons: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Max No. of Vehicles (total)</label>
              <input
                type="number"
                min={0}
                max={BULK_PASS_LIMITS.MAX_TOTAL_VEHICLES}
                value={form.noOfVehicles}
                onChange={(e) => setForm((f) => ({ ...f, noOfVehicles: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Validity Upto</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.validityUpto}
                  onChange={(e) => setForm((f) => ({ ...f, validityUpto: e.target.value }))}
                  className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <input
                  type="time"
                  value={form.validityUptoTime}
                  onChange={(e) => setForm((f) => ({ ...f, validityUptoTime: e.target.value }))}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 mt-3">{formError}</p>}
          {!formError && formHint && (
            <p className="text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2 mt-3">{formHint}</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !!formError}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
