"use client";

import { Suspense, useCallback, useMemo } from "react";
import { Container, DoorOpen, FileCheck2, LayoutDashboard, Route, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import useQueryState, { TABS } from "./useQueryState";
import useTrafficData from "./useTrafficData";
import GlobalFilterBar from "./GlobalFilterBar";
import OverviewTab from "./OverviewTab";
import DataTableTab from "./DataTableTab";
import ContainerJourneyTab from "./ContainerJourneyTab";
import { TABLE_SPECS } from "./tableSpecs";
import { fmtDateTimeIST } from "./format";

const TAB_ICON = {
  overview: LayoutDashboard,
  eir: Container,
  form13: FileCheck2,
  weighbridge: Scale,
  customs: ShieldCheck,
  gate: DoorOpen,
  journey: Route,
};

/** Map URL/global state → API query parameters shared by every endpoint. */
export function toApiParams(state) {
  return {
    fromDate: state.from,
    toDate: state.to,
    fromTime: state.fromTime,
    toTime: state.toTime,
    terminal: state.terminal,
    weighBridgeName: state.weighbridge,
    movementType: state.movement,
    search: state.q,
  };
}

function Dashboard({ basePath }) {
  const { state, set, setTab, reset } = useQueryState();
  const tab = TABS.some((t) => t.key === state.tab) ? state.tab : "overview";
  const apiParams = useMemo(() => toApiParams(state), [state]);

  const { data: options } = useTrafficData("/filters", {});
  const { data: overview, loading: overviewLoading, error: overviewError } = useTrafficData("/overview", apiParams, {
    enabled: tab === "overview",
  });

  const openTab = useCallback((key, extra = {}) => setTab(key, extra), [setTab]);
  const openJourney = useCallback((subject) => setTab("journey", subject), [setTab]);

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-5 py-5">
      {/* Title strip */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Traffic Department · Chennai Port</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0a1e4d] dark:text-white sm:text-3xl">Cargo Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
            Live view of what the terminals (TOS Form 13 &amp; EIR), iPortman weighbridges, Customs and gate hardware are sending into APACS.
          </p>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Updated {fmtDateTimeIST(new Date().toISOString())} IST</p>
      </div>

      <GlobalFilterBar state={state} set={set} reset={reset} options={options} loading={tab === "overview" && overviewLoading} />

      {/* Tabs */}
      <nav aria-label="Analytics sections" className="sticky top-0 z-20 -mx-1 px-1 py-1 backdrop-blur">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 rounded-r-2xl bg-gradient-to-l from-slate-50 to-transparent md:hidden" aria-hidden />
          <div className="inline-flex min-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm [scrollbar-width:thin] dark:border-slate-700 dark:bg-slate-900/90 sm:min-w-0">
          {TABS.map((t) => {
            const Icon = TAB_ICON[t.key];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => openTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm font-extrabold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                  active
                    ? "bg-gradient-to-r from-[#0a1e4d] to-[#1b3a8a] text-white shadow-md shadow-[#0a1e4d]/30"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-orange-300" : "text-slate-400")} />
                {t.label}
              </button>
            );
          })}
          </div>
        </div>
      </nav>

      {/* Body */}
      {tab === "overview" && <OverviewTab overview={overview} loading={overviewLoading} error={overviewError} onOpenTab={openTab} />}
      {TABLE_SPECS[tab] && (
        <DataTableTab key={tab} spec={TABLE_SPECS[tab]} state={state} set={set} apiParams={apiParams} options={options} onJourney={openJourney} />
      )}
      {tab === "journey" && <ContainerJourneyTab state={state} set={set} />}

      <p className="px-1 pb-2 text-[11px] font-semibold text-slate-400">
        Source tables: tos_eir_records, tos_form13, weighbridge_records, customs_ooc / customs_rapiscan / customs_examinations, gate_verification_events. Read-only. Base: {basePath}
      </p>
    </div>
  );
}

export default function CargoAnalyticsDashboard({ basePath = "/traffic_approval" }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm font-bold text-slate-500">Loading Cargo Analytics…</div>}>
      <Dashboard basePath={basePath} />
    </Suspense>
  );
}
