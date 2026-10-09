"use client";

/**
 * ReturnForRevisionModal — send a batch back to the applicant, naming exactly
 * which persons / vehicles need fixing and why.
 *
 * The officer ticks rows, picks one or more quick reasons per row (or types
 * one), and optionally adds a note for the whole batch. The applicant's
 * correction link opens with those rows highlighted and the reasons beside
 * them, so nobody has to guess which of thirty people is the problem.
 *
 * onConfirm({ returnReason, flagged: [{ id, reason }] }) — must throw on failure.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Car, Check, CornerUpLeft, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { fileUrl } from "@/lib/bulkPassApi";

const PERSON_REASONS = [
  "Photo is unclear or not passport-style",
  "Aadhaar card is unreadable or missing",
  "Name does not match Aadhaar",
  "Date of birth is incorrect",
  "Aadhaar number is incorrect",
  "Mobile number is incorrect",
];
const VEHICLE_REASONS = [
  "RC document is unclear or missing",
  "Insurance is expired or missing",
  "Fitness certificate is missing",
  "Driver's licence is unclear or missing",
  "Driver's Aadhaar card is unreadable",
  "Vehicle number does not match RC",
];
const BATCH_REASONS = [
  "Please correct the highlighted entries and resubmit.",
  "Work order / supporting document is missing.",
  "Visit dates need to be changed.",
];

const isVehicleRow = (r) => !!(r.vehicleNumber && String(r.vehicleNumber).trim());
const last4 = (a) => (a ? `XXXX ${String(a).replace(/\s+/g, "").slice(-4)}` : null);

function Thumb({ row }) {
  const [broken, setBroken] = useState(false);
  const vehicle = isVehicleRow(row);
  const src = !vehicle && row.photoPath && !broken ? fileUrl(row.photoPath) : null;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setBroken(true)} className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
      {vehicle ? <Car className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </span>
  );
}

export default function ReturnForRevisionModal({ batch, rows = [], onConfirm, onClose }) {
  // { [rowId]: { reasons: string[], note: string } } — present = marked.
  // Rows the officer already rejected start marked with that reason, so the
  // return carries everything flagged so far.
  const [marked, setMarked] = useState(() => {
    const pre = {};
    for (const r of rows) {
      if (r.approvalStatus === "REJECTED" && r.approvalReason) pre[r.id] = { reasons: [], note: r.approvalReason };
    }
    return pre;
  });
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, loading]);


  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.vehicleNumber, r.aadhaar, r.mobile].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  const toggle = (id) =>
    setMarked((m) => {
      const next = { ...m };
      if (next[id]) delete next[id];
      else next[id] = { reasons: [], note: "" };
      return next;
    });
  const toggleReason = (id, text) =>
    setMarked((m) => {
      const cur = m[id] || { reasons: [], note: "" };
      const reasons = cur.reasons.includes(text) ? cur.reasons.filter((r) => r !== text) : [...cur.reasons, text];
      return { ...m, [id]: { ...cur, reasons } };
    });
  const setRowNote = (id, text) =>
    setMarked((m) => ({ ...m, [id]: { ...(m[id] || { reasons: [] }), note: text } }));

  const reasonFor = (id) => {
    const m = marked[id];
    if (!m) return "";
    return [...m.reasons, m.note.trim()].filter(Boolean).join("; ");
  };
  const markedIds = Object.keys(marked).map(Number);
  const missingReason = markedIds.filter((id) => !reasonFor(id));
  const label = (r) => (isVehicleRow(r) ? r.vehicleNumber : r.name) || "Unnamed";

  const submit = async () => {
    if (!markedIds.length && !note.trim()) {
      toast.error("Tick the persons / vehicles that need fixing, or write a message to the applicant.");
      return;
    }
    if (missingReason.length) {
      const first = rows.find((r) => r.id === missingReason[0]);
      toast.error(`Choose or type a reason for ${first ? label(first) : "each marked entry"}.`);
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        returnReason: note.trim(),
        flagged: markedIds.map((id) => ({ id, reason: reasonFor(id) })),
      });
    } catch {
      /* the caller shows the error */
    } finally {
      setLoading(false);
    }
  };

  const people = visible.filter((r) => !isVehicleRow(r));
  const vehicles = visible.filter(isVehicleRow);

  // A plain render helper, not a component: defining a component here would
  // remount it on every keystroke and drop focus from the reason inputs.
  const renderSection = (title, items, presets) =>
    items.length > 0 && (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
        <ul className="flex flex-col gap-2">
          {items.map((r) => {
            const on = !!marked[r.id];
            return (
              <li key={r.id} className={`rounded-2xl ring-1 transition ${on ? "ring-orange-300 bg-orange-50/60" : "ring-slate-200 bg-white hover:ring-slate-300"}`}>
                <button type="button" onClick={() => toggle(r.id)} aria-pressed={on}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 transition ${on ? "bg-orange-500 ring-orange-500 text-white" : "bg-white ring-slate-300"}`}>
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <Thumb row={r} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{label(r)}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {isVehicleRow(r)
                        ? [r.vehicleType, r.name && `Driver: ${r.name}`].filter(Boolean).join(" · ")
                        : [last4(r.aadhaar), r.mobile].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {r.approvalStatus === "APPROVED" && !on && (
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Approved</span>
                  )}
                </button>
                {on && (
                  <div className="px-3 pb-3 pl-11">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {presets.map((t) => {
                        const sel = marked[r.id].reasons.includes(t);
                        return (
                          <button key={t} type="button" onClick={() => toggleReason(r.id, t)} aria-pressed={sel}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${sel ? "bg-orange-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-orange-300"}`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      value={marked[r.id].note}
                      onChange={(e) => setRowNote(r.id, e.target.value)}
                      placeholder="Or describe the problem in your own words…"
                      className={`w-full rounded-xl bg-white ring-1 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-400/50 ${
                        missingReason.includes(r.id) ? "ring-red-300" : "ring-slate-200"
                      }`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="bp-return-title"
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <CornerUpLeft className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 id="bp-return-title" className="text-base font-bold text-slate-900">Return for revision</h3>
            <p className="text-sm text-slate-500">
              {batch?.refNo} · Tick who needs fixing — the applicant sees those rows highlighted with your reasons.
            </p>
          </div>
          <button onClick={onClose} disabled={loading} aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex flex-col gap-5">
          {rows.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a person or vehicle…"
                className="w-full h-10 pl-9 pr-3 rounded-xl ring-1 ring-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-400/50" />
            </div>
          )}

          {renderSection(`Persons (${people.length})`, people, PERSON_REASONS)}
          {renderSection(`Vehicles (${vehicles.length})`, vehicles, VEHICLE_REASONS)}
          {!visible.length && <p className="text-sm text-slate-400 text-center py-4">No match for “{query}”.</p>}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Message to the applicant {markedIds.length ? "(optional)" : <span className="text-red-500">*</span>}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BATCH_REASONS.map((t) => (
                <button key={t} type="button" onClick={() => setNote((n) => (n.includes(t) ? n : `${n.trim()} ${t}`.trim()))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-orange-100 hover:text-orange-800 transition">
                  {t}
                </button>
              ))}
            </div>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={markedIds.length ? "Anything else the applicant should know…" : "Describe what needs to be corrected…"}
              className="w-full rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-orange-400/50 resize-none" />
          </div>

          {/* What the applicant will see */}
          {(markedIds.length > 0 || note.trim()) && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1.5">The applicant will see</p>
              {note.trim() && <p className="text-sm text-amber-900 mb-1.5">{note.trim()}</p>}
              <ul className="text-sm text-amber-900 space-y-1">
                {markedIds.map((id) => {
                  const r = rows.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex gap-2">
                      <span className="font-semibold shrink-0">{r ? label(r) : `#${id}`}:</span>
                      <span className={reasonFor(id) ? "" : "italic text-amber-600"}>{reasonFor(id) || "choose a reason"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-3xl">
          <p className="text-xs text-slate-500 sm:mr-auto">
            {markedIds.length ? `${markedIds.length} marked for correction` : "Nothing marked yet"}
          </p>
          <button onClick={onClose} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-100 transition">
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition">
            {loading ? "Returning…" : markedIds.length ? `Return with ${markedIds.length} marked` : "Return to applicant"}
          </button>
        </div>
      </div>
    </div>
  );
}
