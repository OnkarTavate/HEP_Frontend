"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card wrapper for one chart: title, subtitle, optional legend, a chart/table
 * toggle (accessibility relief for low-contrast series), loading and empty states.
 */
export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  legend,
  loading,
  empty,
  emptyHint = "No records for the selected filters.",
  table,
  action,
  className,
  height = 260,
  children,
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] transition-shadow hover:shadow-[0_16px_40px_-14px_rgba(10,30,77,0.22)] dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0a1e4d] via-[#1b3a8a] to-orange-400" />
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0a1e4d] to-[#1b3a8a] text-white shadow-md ring-1 ring-inset ring-white/30">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-extrabold leading-tight text-[#0a1e4d] dark:text-slate-100">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-pressed={showTable}
              title={showTable ? "Show chart" : "Show as table"}
            >
              {showTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </header>

      {legend && !showTable && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-1">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-black/10"
                style={{ background: l.color, opacity: l.opacity ?? 1 }}
                aria-hidden
              />
              {l.icon ? <l.icon className="h-3 w-3" style={{ color: l.color }} /> : null}
              {l.label}
            </span>
          ))}
        </div>
      )}

      <div className="relative flex-1 px-3 pb-4 pt-1" style={{ minHeight: height }}>
        {loading ? (
          <div className="absolute inset-3 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ) : empty ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-bold text-slate-500">Nothing to plot</p>
            <p className="text-xs text-slate-400">{emptyHint}</p>
          </div>
        ) : showTable && table ? (
          <div className="max-h-[320px] overflow-auto px-2">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c.key} className="border-b border-slate-200 px-2 py-1.5 text-left font-black uppercase tracking-wide text-slate-500 dark:border-slate-700">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="odd:bg-slate-50/60 dark:odd:bg-slate-800/40">
                    {table.columns.map((c) => (
                      <td key={c.key} className="px-2 py-1.5 tabular-nums text-slate-700 dark:text-slate-200">
                        {c.format ? c.format(r[c.key], r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
