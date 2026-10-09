"use client";

import {
  Activity,
  Anchor,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Clock3,
  Container,
  DoorOpen,
  FileCheck2,
  Scale,
  ScanLine,
  ShieldCheck,
  Timer,
  Truck,
  Users,
  Warehouse,
  Weight,
} from "lucide-react";
import KpiTile from "./KpiTile";
import ChartCard from "./ChartCard";
import ExceptionsPanel from "./ExceptionsPanel";
import {
  CustomsStatusRows,
  DWELL_LEGEND,
  DwellChart,
  GATE_LEGEND,
  GateOutcomeChart,
  HourProfileChart,
  RankedBars,
  TERMINAL_MIX_LEGEND,
  TerminalMixChart,
  TREND_LEGEND,
  TrendChart,
} from "./charts";
import { fmtBucket, fmtMinutes, fmtNum, fmtWeight, num } from "./format";
import { SERIES } from "./palette";

const S = SERIES.light;

export default function OverviewTab({ overview, loading, error, onOpenTab }) {
  const k = overview?.kpis || {};
  const p = overview?.previous || {};
  const eir = k.eir || {};
  const wb = k.weighbridge || {};
  const cus = k.customs || {};
  const gate = k.gate || {};
  const bucket = overview?.range?.bucket || "day";
  const series = overview?.series || [];
  const bd = overview?.breakdowns || {};
  const dwell = overview?.dwell || {};
  const empty = (arr) => !loading && (!arr || arr.length === 0);

  const sumSeries = (key) => series.reduce((n, r) => n + num(r[key]), 0);
  const dir = (bd.terminal || []).reduce(
    (acc, t) => ({
      exportFull: acc.exportFull + num(t.exportFull),
      exportEmpty: acc.exportEmpty + num(t.exportEmpty),
      importFull: acc.importFull + num(t.importFull),
      importEmpty: acc.importEmpty + num(t.importEmpty),
    }),
    { exportFull: 0, exportEmpty: 0, importFull: 0, importEmpty: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}
      {overview?.sourceIssues?.length > 0 && (
        <div className="flex flex-wrap items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900" role="status">
          <span className="font-black uppercase tracking-wide">Feed not connected on this server:</span>
          {overview.sourceIssues.map((src) => (
            <code key={src} className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-inset ring-amber-200">{src}</code>
          ))}
          <span className="basis-full text-amber-800">Figures from that source show as zero until its tables are migrated.</span>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 2xl:grid-cols-9">
        <KpiTile title="EIR movements" value={eir.movements} previous={p.eir?.movements} icon={Container} tone="navy" loading={loading}
          sub={`${fmtNum(eir.trailers)} trailers`} onClick={() => onOpenTab("eir")} />
        <KpiTile title="Export" value={eir.export} previous={p.eir?.export} icon={ArrowUpFromLine} tone="sky" loading={loading}
          sub={`${fmtNum(dir.exportFull)} full · ${fmtNum(dir.exportEmpty)} empty`} onClick={() => onOpenTab("eir", { movementType: "Export" })} />
        <KpiTile title="Import" value={eir.import} previous={p.eir?.import} icon={ArrowDownToLine} tone="orange" loading={loading}
          sub={`${fmtNum(dir.importFull)} full · ${fmtNum(dir.importEmpty)} empty`} onClick={() => onOpenTab("eir", { movementType: "Import" })} />
        <KpiTile title="Inside terminal now" value={eir.openInside} icon={Warehouse} tone="slate" loading={loading}
          sub="EIR in without gate-out" onClick={() => onOpenTab("eir", { openOnly: "true" })} />
        <KpiTile title="Form 13 issued" value={k.form13?.forms} previous={p.form13?.forms} icon={FileCheck2} tone="emerald" loading={loading}
          sub={`${fmtNum(k.form13?.containers)} containers`} onClick={() => onOpenTab("form13")} />
        <KpiTile title="Weighments" value={wb.weighments} previous={p.weighbridge?.weighments} icon={Scale} tone="teal" loading={loading}
          sub={`${fmtNum(wb.vehicles)} vehicles`} onClick={() => onOpenTab("weighbridge")} />
        <KpiTile title="Customs OOC released" value={cus.ooc} previous={p.customs?.ooc} icon={ShieldCheck} tone="green" loading={loading}
          sub={`${fmtNum(cus.rapiscan?.total)} scans · ${fmtNum(cus.examinations?.total)} exams`} onClick={() => onOpenTab("customs", { recordType: "OOC" })} />
        <KpiTile title="Rapiscan mismatch" value={cus.rapiscan?.mismatch} previous={p.customs?.rapiscan?.mismatch} invert icon={ScanLine} tone="rose" loading={loading}
          sub={`${fmtNum(cus.rapiscan?.clean)} clean`} onClick={() => onOpenTab("customs", { recordType: "RAPISCAN", status: "Mismatch" })} />
        <KpiTile title="Gate failures" value={gate.failed} previous={p.gate?.failed} invert icon={DoorOpen} tone="slate" loading={loading}
          sub={`${fmtNum(gate.passed)} passed · ${fmtNum(gate.pending)} pending`} onClick={() => onOpenTab("gate", { status: "FAILED" })} />
      </div>

      {/* Trend */}
      <ChartCard
        title="Movement trend"
        subtitle={`Terminal gate-in / gate-out and weighbridge tickets per ${bucket}`}
        icon={Activity}
        legend={TREND_LEGEND}
        loading={loading}
        empty={empty(series)}
        height={280}
        table={{
          columns: [
            { key: "bucket", label: bucket === "hour" ? "Hour" : "Day", format: (v) => fmtBucket(v, bucket) },
            { key: "eirIn", label: "EIR in" },
            { key: "eirOut", label: "EIR out" },
            { key: "weighments", label: "Weighments" },
            { key: "netKg", label: "Net weight", format: (v) => fmtWeight(v) },
            { key: "ooc", label: "OOC" },
            { key: "scans", label: "Scans" },
          ],
          rows: series,
        }}
        action={
          <span className="hidden items-center gap-3 text-[11px] font-bold text-slate-500 md:inline-flex">
            <span>Σ in <b className="tabular-nums text-slate-800">{fmtNum(sumSeries("eirIn"))}</b></span>
            <span>Σ out <b className="tabular-nums text-slate-800">{fmtNum(sumSeries("eirOut"))}</b></span>
          </span>
        }
      >
        <TrendChart data={series} bucket={bucket} />
      </ChartCard>

      {/* Row: terminal mix + dwell */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Terminal mix"
          subtitle="EIR movements by terminal · hue = direction, tint = full/empty"
          icon={Anchor}
          legend={TERMINAL_MIX_LEGEND}
          loading={loading}
          empty={empty(bd.terminal)}
          table={{
            columns: [
              { key: "name", label: "Terminal" },
              { key: "exportFull", label: "Exp full" },
              { key: "exportEmpty", label: "Exp empty" },
              { key: "importFull", label: "Imp full" },
              { key: "importEmpty", label: "Imp empty" },
              { key: "openInside", label: "Inside" },
              { key: "total", label: "Total" },
            ],
            rows: bd.terminal || [],
          }}
        >
          <TerminalMixChart data={bd.terminal} />
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          title="Terminal dwell"
          subtitle="Minutes between EIR gate-in and gate-out"
          icon={Timer}
          legend={DWELL_LEGEND}
          loading={loading}
          empty={empty(dwell.terminalDwell)}
          table={{
            columns: [
              { key: "name", label: "Terminal" },
              { key: "samples", label: "Samples" },
              { key: "avgMinutes", label: "Avg", format: fmtMinutes },
              { key: "medianMinutes", label: "Median", format: fmtMinutes },
              { key: "p90Minutes", label: "P90", format: fmtMinutes },
            ],
            rows: dwell.terminalDwell || [],
          }}
        >
          <DwellChart data={dwell.terminalDwell} />
          {dwell.eirToOoc?.length > 0 && (
            <div className="mx-2 mt-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <span className="font-black text-slate-700 dark:text-slate-100">Import gate-in → Customs OOC: </span>
              {dwell.eirToOoc.map((r) => (
                <span key={r.name} className="mr-3 inline-block">
                  {r.name} <b className="tabular-nums">{fmtMinutes(r.avgMinutes)}</b> avg
                </span>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Row: hour profile + customs + gate */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Arrivals by hour of day"
          subtitle="EIR gate-in count · darker bar = longer average dwell"
          icon={Clock3}
          loading={loading}
          empty={empty(dwell.byHour)}
          table={{
            columns: [
              { key: "hour", label: "Hour (IST)", format: (v) => `${String(v).padStart(2, "0")}:00` },
              { key: "gateIn", label: "Gate-in" },
              { key: "avgMinutes", label: "Avg dwell", format: (v) => (v === null ? "—" : fmtMinutes(v)) },
            ],
            rows: dwell.byHour || [],
          }}
        >
          <HourProfileChart data={dwell.byHour} />
        </ChartCard>

        <ChartCard
          title="Customs clearance"
          subtitle="Scan, examination and release outcomes"
          icon={ShieldCheck}
          loading={loading}
          empty={!loading && !num(cus.ooc) && !num(cus.rapiscan?.total) && !num(cus.examinations?.total)}
          emptyHint={overview?.feeds && !overview.feeds.customs_ooc && !overview.feeds.customs_rapiscan ? "The Customs integration has not sent any OOC or Rapiscan records yet." : "No customs records in the selected period."}
          height={220}
        >
          <CustomsStatusRows customs={cus} />
        </ChartCard>

        <ChartCard
          title="Gate verification outcomes"
          subtitle="Hardware reads per gate"
          icon={DoorOpen}
          legend={GATE_LEGEND}
          loading={loading}
          empty={empty(bd.gate)}
          emptyHint={overview?.feeds && !overview.feeds.gate_verification_events ? "Gate hardware events are not connected on this server yet." : "No gate events in the selected period."}
          table={{
            columns: [
              { key: "name", label: "Gate" },
              { key: "passed", label: "Passed" },
              { key: "pending", label: "Pending" },
              { key: "failed", label: "Failed" },
              { key: "total", label: "Total" },
            ],
            rows: bd.gate || [],
          }}
        >
          <GateOutcomeChart data={bd.gate} />
        </ChartCard>
      </div>

      {/* Row: rankings */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Top shipping lines" subtitle="EIR movements" icon={Boxes} loading={loading} empty={empty(bd.line)}
          table={{ columns: [{ key: "name", label: "Line" }, { key: "export", label: "Export" }, { key: "import", label: "Import" }, { key: "total", label: "Total" }], rows: bd.line || [] }}>
          <RankedBars data={bd.line} valueKey="total" color={S[0]} />
        </ChartCard>
        <ChartCard title="Cargo by net weight" subtitle="Weighbridge tickets" icon={Weight} loading={loading} empty={empty(bd.cargo)}
          table={{ columns: [{ key: "name", label: "Cargo" }, { key: "total", label: "Tickets" }, { key: "netKg", label: "Net", format: fmtWeight }], rows: bd.cargo || [] }}>
          <RankedBars data={bd.cargo} valueKey="netKg" format={fmtWeight} color={S[1]} />
        </ChartCard>
        <ChartCard title="Top clients by weight" subtitle="Weighbridge tickets" icon={Users} loading={loading} empty={empty(bd.client)}
          table={{ columns: [{ key: "name", label: "Client" }, { key: "total", label: "Tickets" }, { key: "netKg", label: "Net", format: fmtWeight }], rows: bd.client || [] }}>
          <RankedBars data={bd.client} valueKey="netKg" format={fmtWeight} color={S[1]} />
        </ChartCard>
        <ChartCard title="Weighbridge utilisation" subtitle="Tickets per weighbridge" icon={Truck} loading={loading} empty={empty(bd.weighbridge)}
          table={{ columns: [{ key: "name", label: "Weighbridge" }, { key: "total", label: "Tickets" }, { key: "export", label: "Export" }, { key: "import", label: "Import" }, { key: "netKg", label: "Net", format: fmtWeight }, { key: "avgNetKg", label: "Avg", format: fmtWeight }], rows: bd.weighbridge || [] }}>
          <RankedBars data={bd.weighbridge} valueKey="total" color={S[2]} />
        </ChartCard>
      </div>

      <ExceptionsPanel exceptions={overview?.exceptions} loading={loading} onOpen={(ex) => { const { tab, ...filters } = ex.link || {}; onOpenTab(tab || "eir", filters); }} />
    </div>
  );
}
