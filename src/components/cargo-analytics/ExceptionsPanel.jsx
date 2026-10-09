"use client";

import { AlertTriangle, ChevronRight, Hourglass, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS } from "./palette";
import { fmtNum } from "./format";

const SEVERITY = {
  critical: { color: STATUS.critical, label: "Critical", icon: ShieldAlert, ring: "ring-rose-200 hover:ring-rose-300", wash: "from-rose-50" },
  serious: { color: STATUS.serious, label: "Serious", icon: AlertTriangle, ring: "ring-orange-200 hover:ring-orange-300", wash: "from-orange-50" },
  warning: { color: STATUS.warning, label: "Warning", icon: AlertTriangle, ring: "ring-amber-200 hover:ring-amber-300", wash: "from-amber-50" },
  info: { color: "#2a78d6", label: "Coverage", icon: Info, ring: "ring-sky-200 hover:ring-sky-300", wash: "from-sky-50" },
};

const FEED_LABEL = {
  customs_ooc: "Customs OOC",
  customs_rapiscan: "Customs Rapiscan",
  customs_examinations: "Customs examinations",
  weighbridge_records: "Weighbridge",
  gate_verification_events: "Gate events",
  tos_form13: "TOS Form 13",
  tos_eir_records: "TOS EIR",
};

/**
 * Cross-feed reconciliation checks. Each card deep-links into the matching table
 * tab with filters pre-applied so an officer can act on the rows.
 */
export default function ExceptionsPanel({ exceptions, loading, onOpen }) {
  const items = exceptions || [];
  const actionable = items.filter((e) => !e.awaiting && e.severity !== "info");
  const total = actionable.reduce((n, e) => n + (e.count || 0), 0);
  const awaitingCount = items.filter((e) => e.awaiting).length;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md ring-1 ring-inset ring-white/30">
            <ShieldAlert className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-sm font-extrabold leading-tight text-[#0a1e4d] dark:text-slate-100">Reconciliation exceptions</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Where the TOS, weighbridge, customs and gate feeds disagree</p>
          </div>
        </div>
        {!loading && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset",
              total ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
            )}
          >
            {total ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {fmtNum(total)} open{awaitingCount ? ` · ${awaitingCount} awaiting feed` : ""}
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 6 }) : items).map((ex, i) => {
          if (!ex) return <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
          const sev = SEVERITY[ex.severity] || SEVERITY.warning;
          const Icon = sev.icon;
          const zero = !ex.count;
          if (ex.awaiting?.length) {
            return (
              <div
                key={ex.key}
                className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 text-left dark:border-slate-700 dark:bg-slate-800/40"
                role="status"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  <Hourglass className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Awaiting feed</span>
                  <span className="block text-sm font-extrabold leading-snug text-slate-600 dark:text-slate-200">{ex.title}</span>
                  <span className="mt-1 block text-[11.5px] font-semibold text-slate-500">
                    No {ex.awaiting.map((f) => FEED_LABEL[f] || f).join(" or ")} data has been received yet, so this check cannot run.
                  </span>
                </span>
              </div>
            );
          }
          const isInfo = ex.severity === "info";
          return (
            <button
              key={ex.key}
              type="button"
              onClick={() => onOpen?.(ex)}
              className={cn(
                "group relative flex items-start gap-3 overflow-hidden rounded-2xl bg-gradient-to-br to-white p-3.5 text-left ring-1 ring-inset transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:to-slate-900",
                zero && !isInfo ? "from-emerald-50/70 ring-emerald-200 dark:from-emerald-500/10 dark:ring-emerald-500/30" : `${sev.wash} ${sev.ring} dark:from-slate-800 dark:ring-slate-700`,
              )}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: zero && !isInfo ? STATUS.good : sev.color }}
              >
                {zero && !isInfo ? <ShieldCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {zero && !isInfo ? "Clear" : sev.label}
                </span>
                <span className="block text-sm font-extrabold leading-snug text-slate-800 dark:text-slate-100">{ex.title}</span>
                {ex.note && <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-500">{ex.note}</span>}
                <span className="mt-1 block text-2xl font-black tabular-nums leading-none" style={{ color: zero && !isInfo ? STATUS.good : sev.color }}>
                  {fmtNum(ex.count)}
                </span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
