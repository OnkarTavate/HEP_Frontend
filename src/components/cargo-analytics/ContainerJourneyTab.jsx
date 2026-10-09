"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  CheckCircle2,
  Container,
  DoorOpen,
  FileCheck2,
  Route,
  Scale,
  ScanLine,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useTrafficData from "./useTrafficData";
import { SOURCE_COLOR, STATUS } from "./palette";
import { fmtDateTimeIST, fmtMinutes, fmtNum } from "./format";

const TYPE_ICON = {
  EIR_GATE_IN: Anchor,
  EIR_GATE_OUT: Anchor,
  FORM13: FileCheck2,
  OOC: ShieldCheck,
  RAPISCAN: ScanLine,
  EXAMINATION: Search,
  WEIGHMENT: Scale,
};

const SOURCE_LABEL = { TOS: "TOS", WEIGHBRIDGE: "Weighbridge", CUSTOMS: "Customs", GATE: "Gate" };

function statusOf(ev) {
  const s = String(ev.meta?.status || "").toLowerCase();
  if (ev.type === "RAPISCAN") return s === "mismatch" ? "bad" : "good";
  if (ev.type === "EXAMINATION") return String(ev.meta?.discrepancyFound).toLowerCase() === "yes" ? "bad" : "good";
  if (ev.source === "GATE") return s === "failed" ? "bad" : s === "pending" ? "warn" : "good";
  if (ev.type === "OOC") return "good";
  return null;
}

export default function ContainerJourneyTab({ state, set }) {
  const [container, setContainer] = useState(state.container || "");
  const [vehicle, setVehicle] = useState(state.vehicle || "");
  const [synced, setSynced] = useState(`${state.container || ""}|${state.vehicle || ""}`);
  const urlKey = `${state.container || ""}|${state.vehicle || ""}`;
  if (urlKey !== synced) {
    setSynced(urlKey);
    setContainer(state.container || "");
    setVehicle(state.vehicle || "");
  }

  const enabled = Boolean(state.container || state.vehicle);
  const { data, loading, error } = useTrafficData("/journey", { container: state.container, vehicle: state.vehicle }, { enabled });
  const events = data?.events || [];
  const summary = data?.summary;

  const submit = (e) => {
    e.preventDefault();
    set({ container: container.trim(), vehicle: vehicle.trim() });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <form
        onSubmit={submit}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0a1e4d] via-[#1b3a8a] to-orange-400" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0a1e4d] to-[#1b3a8a] text-white shadow-md">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-[#0a1e4d] dark:text-white">Container / vehicle journey</h2>
            <p className="text-[11.5px] font-semibold text-slate-500">Every TOS, weighbridge, customs and gate record for one container or truck, on one timeline.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Container number</span>
            <div className="relative">
              <Container className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="container" value={container} onChange={(e) => setContainer(e.target.value)} placeholder="e.g. MSCU1234567" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm font-bold uppercase text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </label>
          <span className="hidden self-end pb-3 text-xs font-black uppercase text-slate-400 md:block">or</span>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Vehicle / trailer number</span>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. TN01AB1234" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm font-bold uppercase text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </label>
          <button type="submit" className="h-11 self-end rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:-translate-y-0.5">
            Trace
          </button>
        </div>
      </form>

      {!enabled && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Route className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-500">Enter a container or vehicle number to trace it</p>
          <p className="text-xs text-slate-400">Tip: click any row in the EIR, Weighbridge, Customs or Gate tables to open its journey here.</p>
        </div>
      )}

      {enabled && error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      {enabled && !error && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Subject" value={data?.subject?.container || data?.subject?.vehicle || "—"} mono loading={loading} />
            <Stat label="First seen" value={fmtDateTimeIST(summary?.firstSeen)} loading={loading} />
            <Stat label="Last seen" value={fmtDateTimeIST(summary?.lastSeen)} loading={loading} />
            <Stat label="Span" value={fmtMinutes(summary?.totalMinutes)} loading={loading} />
            <Stat label="Events" value={`${fmtNum(events.length)} · ${fmtNum(summary?.weighments)} weighments`} loading={loading} />
            <Stat
              label="Clearance"
              loading={loading}
              value={
                <span className="flex flex-wrap gap-1">
                  {data?.subject?.container ? (
                    <>
                      <Flag ok={summary?.oocGranted} label="OOC" />
                      <Flag ok={summary?.scanStatus ? summary.scanStatus === "Clean" : null} label={summary?.scanStatus ? `Scan ${summary.scanStatus}` : "No scan"} />
                    </>
                  ) : (
                    <Flag ok={null} label="Customs per container" />
                  )}
                  <Flag ok={summary?.gateFailures ? false : summary?.gateFailures === 0 ? true : null} label={summary?.gateFailures ? `${summary.gateFailures} gate fail` : "Gate ok"} />
                </span>
              }
            />
          </div>

          {/* Timeline */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] dark:border-slate-700 dark:bg-slate-900">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-bold text-slate-500">No records found for this identifier</p>
                <p className="text-xs text-slate-400">Numbers are matched ignoring spaces and case across all feeds.</p>
              </div>
            ) : (
              <ol className="relative ml-3 border-l-2 border-slate-200 dark:border-slate-700">
                {events.map((ev, i) => {
                  const Icon = TYPE_ICON[ev.type] || DoorOpen;
                  const color = SOURCE_COLOR[ev.source] || "#64748b";
                  const st = statusOf(ev);
                  return (
                    <li key={i} className="relative mb-5 pl-7 last:mb-0">
                      <span
                        className="absolute -left-[13px] top-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-white dark:ring-slate-900"
                        style={{ background: color }}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {ev.gapMinutes !== null && ev.gapMinutes > 0 && (
                        <span className="absolute -left-[2px] -top-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-black text-slate-500 dark:bg-slate-800">
                          <ArrowRight className="h-2.5 w-2.5 rotate-90" /> +{fmtMinutes(ev.gapMinutes)}
                        </span>
                      )}
                      <div className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: color }}>
                              {SOURCE_LABEL[ev.source] || ev.source}
                            </span>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{ev.title}</p>
                            {st === "good" && <CheckCircle2 className="h-4 w-4" style={{ color: STATUS.good }} aria-label="OK" />}
                            {st === "warn" && <AlertTriangle className="h-4 w-4" style={{ color: STATUS.warning }} aria-label="Pending" />}
                            {st === "bad" && <XCircle className="h-4 w-4" style={{ color: STATUS.critical }} aria-label="Failed" />}
                          </div>
                          {ev.detail && <p className="mt-0.5 text-xs font-semibold text-slate-500">{ev.detail}</p>}
                        </div>
                        <time className="shrink-0 text-xs font-black tabular-nums text-slate-600 dark:text-slate-300" dateTime={ev.at}>
                          {fmtDateTimeIST(ev.at)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, mono, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      ) : (
        <div className={cn("mt-1 text-sm font-extrabold text-slate-900 dark:text-white", mono && "font-mono")}>{value}</div>
      )}
    </div>
  );
}

function Flag({ ok, label }) {
  const tone = ok === true ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : ok === false ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-500 ring-slate-200";
  const Icon = ok === true ? CheckCircle2 : ok === false ? XCircle : AlertTriangle;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset", tone)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
