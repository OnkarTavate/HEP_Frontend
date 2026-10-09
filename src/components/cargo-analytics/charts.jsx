"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { CHART_INK, SEQUENTIAL_BLUE, SERIES, STATUS } from "./palette";
import { fmtBucket, fmtMinutes, fmtNum, fmtWeight, num } from "./format";

const S = SERIES.light;
const axisProps = {
  tick: { fontSize: 11, fill: CHART_INK.text, fontWeight: 600 },
  axisLine: { stroke: CHART_INK.grid },
  tickLine: false,
};
const gridProps = { stroke: CHART_INK.grid, strokeDasharray: "2 4", vertical: false };

function TooltipBox({ active, payload, label, title, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="mb-1 font-black text-slate-800 dark:text-slate-100">{title ? title(label, payload) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center justify-between gap-4 font-semibold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color || p.fill, opacity: p.payload?.__opacity?.[p.dataKey] ?? 1 }} />
            {p.name}
          </span>
          <span className="tabular-nums text-slate-900 dark:text-white">{formatter ? formatter(p.value, p.dataKey, p.payload) : fmtNum(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * 1. Movement trend: EIR gate-in (area) + gate-out (line) + weighments (line)
 * ------------------------------------------------------------------------ */
export const TREND_LEGEND = [
  { label: "EIR gate-in", color: S[0] },
  { label: "EIR gate-out", color: S[1] },
  { label: "Weighments", color: S[2] },
];

export function TrendChart({ data, bucket }) {
  const rows = (data || []).map((d) => ({ ...d, label: fmtBucket(d.bucket, bucket) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="eirInFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={S[0]} stopOpacity={0.28} />
            <stop offset="100%" stopColor={S[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip cursor={{ stroke: CHART_INK.axis, strokeDasharray: "3 3" }} content={<TooltipBox />} />
        <Area type="monotone" dataKey="eirIn" name="EIR gate-in" stroke={S[0]} strokeWidth={2} fill="url(#eirInFill)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
        <Line type="monotone" dataKey="eirOut" name="EIR gate-out" stroke={S[1]} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
        <Line type="monotone" dataKey="weighments" name="Weighments" stroke={S[2]} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 2. Terminal mix: Export/Import × Full/Empty (hue = direction, tint = state)
 * ------------------------------------------------------------------------ */
export const TERMINAL_MIX_LEGEND = [
  { label: "Export · Full", color: S[0] },
  { label: "Export · Empty", color: S[0], opacity: 0.4 },
  { label: "Import · Full", color: S[1] },
  { label: "Import · Empty", color: S[1], opacity: 0.4 },
];

export function TerminalMixChart({ data }) {
  const rows = (data || []).map((d) => ({
    ...d,
    __opacity: { exportEmpty: 0.4, importEmpty: 0.4 },
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: -10, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<TooltipBox />} />
        <Bar dataKey="exportFull" name="Export · Full" stackId="a" fill={S[0]} stroke="#fff" strokeWidth={1} />
        <Bar dataKey="exportEmpty" name="Export · Empty" stackId="a" fill={S[0]} fillOpacity={0.4} stroke="#fff" strokeWidth={1} />
        <Bar dataKey="importFull" name="Import · Full" stackId="a" fill={S[1]} stroke="#fff" strokeWidth={1} />
        <Bar dataKey="importEmpty" name="Import · Empty" stackId="a" fill={S[1]} fillOpacity={0.4} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="total" position="top" formatter={(v) => fmtNum(v)} style={{ fontSize: 11, fontWeight: 800, fill: CHART_INK.textStrong }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 3. Ranked horizontal bars (single sequential hue, direct value labels)
 * ------------------------------------------------------------------------ */
export function RankedBars({ data, valueKey = "total", nameKey = "name", format = fmtNum, color = S[0], height = 260 }) {
  const rows = (data || []).slice(0, 10);
  const max = Math.max(...rows.map((r) => num(r[valueKey])), 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" hide domain={[0, max * 1.05]} />
        <YAxis type="category" dataKey={nameKey} width={120} {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
        <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<TooltipBox formatter={(v) => format(v)} />} />
        <Bar dataKey={valueKey} name="Value" radius={[0, 4, 4, 0]} fill={color}>
          {rows.map((r, i) => (
            <Cell key={i} fill={color} fillOpacity={0.55 + 0.45 * (num(r[valueKey]) / max)} />
          ))}
          <LabelList dataKey={valueKey} position="right" formatter={(v) => format(v)} style={{ fontSize: 11, fontWeight: 800, fill: CHART_INK.textStrong }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 4. Dwell per terminal: median vs p90 minutes
 * ------------------------------------------------------------------------ */
export const DWELL_LEGEND = [
  { label: "Median dwell", color: S[0] },
  { label: "90th percentile", color: S[1] },
];

export function DwellChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data || []} margin={{ top: 16, right: 12, left: -6, bottom: 0 }} barCategoryGap="30%" barGap={4}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => fmtMinutes(v)} />
        <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<TooltipBox formatter={(v) => fmtMinutes(v)} />} />
        <Bar dataKey="medianMinutes" name="Median dwell" fill={S[0]} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="medianMinutes" position="top" formatter={(v) => fmtMinutes(v)} style={{ fontSize: 10.5, fontWeight: 800, fill: CHART_INK.textStrong }} />
        </Bar>
        <Bar dataKey="p90Minutes" name="90th percentile" fill={S[1]} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="p90Minutes" position="top" formatter={(v) => fmtMinutes(v)} style={{ fontSize: 10.5, fontWeight: 800, fill: CHART_INK.textStrong }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 5. Hour-of-day profile: gate-in count, bar tint = average dwell (sequential)
 * ------------------------------------------------------------------------ */
export function HourProfileChart({ data }) {
  const byHour = new Map((data || []).map((d) => [Number(d.hour), d]));
  const rows = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}h`,
    gateIn: num(byHour.get(h)?.gateIn),
    avgMinutes: byHour.get(h)?.avgMinutes ?? null,
  }));
  const maxDwell = Math.max(...rows.map((r) => num(r.avgMinutes)), 1);
  const tint = (v) => {
    if (v === null || v === undefined) return SEQUENTIAL_BLUE[1];
    const idx = Math.min(SEQUENTIAL_BLUE.length - 1, Math.floor((num(v) / maxDwell) * (SEQUENTIAL_BLUE.length - 1)));
    return SEQUENTIAL_BLUE[idx];
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...axisProps} interval={2} />
        <YAxis {...axisProps} allowDecimals={false} width={40} />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
          content={
            <TooltipBox
              title={(l) => `${l} IST`}
              formatter={(v, key) => (key === "avgMinutes" ? (v === null ? "—" : fmtMinutes(v)) : fmtNum(v))}
            />
          }
        />
        <Bar dataKey="gateIn" name="Gate-in count" radius={[3, 3, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.hour} fill={tint(r.avgMinutes)} />
          ))}
        </Bar>
        <Bar dataKey="avgMinutes" name="Avg dwell" hide />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 6. Gate outcomes per gate (status colours + icon legend)
 * ------------------------------------------------------------------------ */
export const GATE_LEGEND = [
  { label: "Passed", color: STATUS.good, icon: CheckCircle2 },
  { label: "Pending", color: STATUS.warning, icon: Clock },
  { label: "Failed", color: STATUS.critical, icon: XCircle },
];

export function GateOutcomeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data || []} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke={CHART_INK.grid} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={130} {...axisProps} />
        <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<TooltipBox />} />
        <Bar dataKey="passed" name="Passed" stackId="s" fill={STATUS.good} stroke="#fff" strokeWidth={1} />
        <Bar dataKey="pending" name="Pending" stackId="s" fill={STATUS.warning} stroke="#fff" strokeWidth={1} />
        <Bar dataKey="failed" name="Failed" stackId="s" fill={STATUS.critical} stroke="#fff" strokeWidth={1} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="total" position="right" formatter={(v) => fmtNum(v)} style={{ fontSize: 11, fontWeight: 800, fill: CHART_INK.textStrong }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------------------
 * 7. Customs status rows (proportional bars with icon + label, never colour-alone)
 * ------------------------------------------------------------------------ */
export function CustomsStatusRows({ customs }) {
  const rapi = customs?.rapiscan || {};
  const exam = customs?.examinations || {};
  const rows = [
    {
      title: "Rapiscan scans",
      total: num(rapi.total),
      parts: [
        { label: "Clean", value: num(rapi.clean), color: STATUS.good, icon: CheckCircle2 },
        { label: "Mismatch", value: num(rapi.mismatch), color: STATUS.critical, icon: XCircle },
      ],
    },
    {
      title: "Physical examinations",
      total: num(exam.total),
      parts: [
        { label: "No discrepancy", value: num(exam.total) - num(exam.discrepancy), color: STATUS.good, icon: CheckCircle2 },
        { label: "Discrepancy", value: num(exam.discrepancy), color: STATUS.serious, icon: AlertTriangle },
      ],
    },
    {
      title: "Out of Charge granted",
      total: num(customs?.ooc),
      parts: [{ label: "OOC released", value: num(customs?.ooc), color: S[0], icon: CheckCircle2 }],
    },
  ];
  return (
    <div className="flex flex-col gap-4 px-2 pt-2">
      {rows.map((r) => (
        <div key={r.title}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{r.title}</p>
            <p className="text-sm font-black tabular-nums text-[#0a1e4d] dark:text-white">{fmtNum(r.total)}</p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {r.parts.map((p) =>
              p.value > 0 ? (
                <span
                  key={p.label}
                  style={{ width: `${(p.value / Math.max(r.total, 1)) * 100}%`, background: p.color }}
                  className="h-full border-r-2 border-white last:border-r-0 dark:border-slate-900"
                  title={`${p.label}: ${fmtNum(p.value)}`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {r.parts.map((p) => (
              <span key={p.label} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <p.icon className="h-3.5 w-3.5" style={{ color: p.color }} />
                {p.label}
                <span className="tabular-nums text-slate-900 dark:text-white">{fmtNum(p.value)}</span>
                {r.total > 0 && <span className="text-slate-400">({Math.round((p.value / r.total) * 100)}%)</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { fmtWeight };
