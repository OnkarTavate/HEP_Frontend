"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Route,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PaginationBar from "@/components/ui/PaginationBar";
import { downloadTraffic } from "./api";
import useTrafficData from "./useTrafficData";
import { PILL_STYLES } from "./tableSpecs";
import { fmtNum } from "./format";

const BTN_GHOST =
  "inline-flex h-[34px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11.5px] font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const BTN_PRIMARY =
  "inline-flex h-[34px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0a1e4d] to-[#1b3a8a] px-3.5 text-[11.5px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(10,30,77,0.6)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const inputCls =
  "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function DebouncedText({ value, onChange, ...rest }) {
  const [v, setV] = useState(value || "");
  const [synced, setSynced] = useState(value || "");
  if ((value || "") !== synced) {
    setSynced(value || "");
    setV(value || "");
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if ((value || "") !== v) onChange(v);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return <input {...rest} value={v} onChange={(e) => setV(e.target.value)} className={inputCls} />;
}

function Cell({ col, row }) {
  const raw = row[col.key];
  const isEmpty = raw === null || raw === undefined || raw === "";
  if (isEmpty) return <span className="text-slate-400">{col.empty ?? "—"}</span>;
  const text = col.format ? col.format(raw, row) : String(raw);
  const flagged = col.flagIf ? col.flagIf(raw, row) : false;
  if (col.pill) {
    const tone = col.pill[raw] || "slate";
    return (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide ring-1 ring-inset", PILL_STYLES[tone])}>
        {text}
      </span>
    );
  }
  if (col.badge) {
    return <span className="inline-flex rounded-md bg-[#0a1e4d]/5 px-2 py-0.5 text-[11px] font-black text-[#0a1e4d] ring-1 ring-inset ring-[#0a1e4d]/10 dark:bg-white/10 dark:text-white dark:ring-white/10">{text}</span>;
  }
  return (
    <span
      className={cn(
        col.mono && "font-mono text-[11.5px] tracking-tight",
        col.strong && "font-extrabold text-slate-900 dark:text-white",
        flagged && "rounded-md bg-rose-50 px-1.5 py-0.5 font-black text-rose-700 ring-1 ring-inset ring-rose-200",
        col.wide && "line-clamp-2 max-w-[360px]",
      )}
      title={col.wide ? text : undefined}
    >
      {text}
    </span>
  );
}

/**
 * Generic server-driven table for one feed. Filters / page / sort live in the
 * URL (via `state` + `set`), so the view is shareable and refresh-safe.
 */
export default function DataTableTab({ spec, state, set, apiParams, options, onJourney }) {
  const page = Number(state.page || 1);
  const limit = Number(state.limit || 25);
  const sortBy = state.sortBy || spec.defaultSort.by;
  const sortOrder = state.sortOrder || spec.defaultSort.order;

  const tabParams = useMemo(() => {
    const out = {};
    spec.filters.forEach((f) => {
      if (state[f.key]) out[f.key] = state[f.key];
    });
    return out;
  }, [spec, state]);

  const params = { ...apiParams, ...tabParams, page, limit, sortBy, sortOrder };
  const { data, loading, error, refetch } = useTrafficData(spec.endpoint, params);
  const rows = data?.data || [];
  const total = data?.pagination?.totalRecords || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [hiddenCols, setHiddenCols] = useState(() => new Set(spec.columns.filter((c) => c.hidden).map((c) => c.key)));
  const [showCols, setShowCols] = useState(false);
  const [exporting, setExporting] = useState(null);

  const visibleCols = spec.columns.filter((c) => !hiddenCols.has(c.key));
  const activeTabFilters = spec.filters.filter((f) => state[f.key]);

  const toggleSort = (col) => {
    if (!col.sortKey) return;
    if (sortBy === col.sortKey) set({ sortBy, sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    else set({ sortBy: col.sortKey, sortOrder: "DESC" });
  };

  const doExport = async (format) => {
    try {
      setExporting(format);
      const name = await downloadTraffic(spec.endpoint, { ...apiParams, ...tabParams, sortBy, sortOrder }, format, spec.exportName);
      toast.success(`Export ready: ${name}`, { description: `${fmtNum(total)} filtered rows (max 50,000).` });
    } catch (e) {
      toast.error("Export failed", { description: e?.message });
    } finally {
      setExporting(null);
    }
  };

  const optionList = (f) => {
    if (f.options) return f.options.map((o) => ({ value: o, label: o }));
    const src = options?.[f.optionsKey] || [];
    return src.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o[f.optionValue || "value"], label: o[f.optionLabel || "label"] || o.value }));
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_-10px_rgba(10,30,77,0.14)] dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0a1e4d] via-[#1b3a8a] to-orange-400" />

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div>
          <h2 className="text-base font-black leading-tight text-[#0a1e4d] dark:text-white">{spec.title}</h2>
          <p className="mt-0.5 text-[11.5px] font-semibold text-slate-500">
            {spec.subtitle} · <span className="tabular-nums text-slate-700 dark:text-slate-200">{loading && !data ? "…" : fmtNum(total)}</span> rows match
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={refetch} className={BTN_GHOST} title="Refresh">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <div className="relative">
            <button type="button" onClick={() => setShowCols((v) => !v)} className={BTN_GHOST} aria-expanded={showCols}>
              <Columns3 className="h-3.5 w-3.5" /> Columns ({visibleCols.length}/{spec.columns.length})
            </button>
            {showCols && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                {spec.columns.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(c.key)}
                      onChange={() =>
                        setHiddenCols((s) => {
                          const n = new Set(s);
                          if (n.has(c.key)) n.delete(c.key);
                          else n.add(c.key);
                          return n;
                        })
                      }
                      className="accent-orange-500"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => doExport("csv")} disabled={!!exporting || !total} className={BTN_GHOST}>
            <Download className="h-3.5 w-3.5" /> {exporting === "csv" ? "Exporting…" : "CSV"}
          </button>
          <button type="button" onClick={() => doExport("xlsx")} disabled={!!exporting || !total} className={BTN_PRIMARY}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> {exporting === "xlsx" ? "Exporting…" : "Excel"}
          </button>
          <button type="button" onClick={() => window.print()} className={BTN_GHOST} title="Print this page">
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Tab filters */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" /> {spec.title.split(" — ")[0]} filters
          {activeTabFilters.length > 0 && (
            <button
              type="button"
              onClick={() => set(Object.fromEntries(activeTabFilters.map((f) => [f.key, ""])))}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold normal-case tracking-normal text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
            >
              <X className="h-3 w-3" /> Clear {activeTabFilters.length}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {spec.filters.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{f.label}</span>
              {f.type === "select" ? (
                <select name={f.key} value={state[f.key] || ""} onChange={(e) => set({ [f.key]: e.target.value })} className={inputCls}>
                  <option value="">All</option>
                  {optionList(f).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === "toggle" ? (
                <button
                  type="button"
                  onClick={() => set({ [f.key]: state[f.key] === "true" ? "" : "true" })}
                  aria-pressed={state[f.key] === "true"}
                  className={cn(
                    "h-9 rounded-xl border px-3 text-left text-xs font-bold transition",
                    state[f.key] === "true"
                      ? "border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-400/30"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
                  )}
                >
                  {state[f.key] === "true" ? "✓ " : ""}Only
                </button>
              ) : (
                <DebouncedText name={f.key} type={f.type === "number" ? "number" : "text"} value={state[f.key]} placeholder={f.placeholder} onChange={(v) => set({ [f.key]: v })} />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        {error && <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="sticky top-0 z-10">
              {visibleCols.map((c) => {
                const active = sortBy === c.sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                      active && "text-[#0a1e4d] dark:text-white",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                    aria-sort={c.sortKey ? (active ? (sortOrder === "ASC" ? "ascending" : "descending") : "none") : undefined}
                  >
                    {c.sortKey ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1 py-1 text-[10.5px] font-black uppercase tracking-wider text-inherit hover:text-[#0a1e4d] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:hover:text-white",
                          c.align === "right" && "flex-row-reverse",
                        )}
                        title={active ? `Sorted ${sortOrder === "ASC" ? "ascending" : "descending"} · click to flip` : `Sort by ${c.label}`}
                      >
                        {c.label}
                        {active ? (sortOrder === "ASC" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      <span className="inline-flex px-1 py-1">{c.label}</span>
                    )}
                  </th>
                );
              })}
              <th scope="col" className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={visibleCols.length + 1} className="px-3 py-2">
                      <div className="h-7 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              : rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="px-3 py-14 text-center">
                      <p className="text-sm font-bold text-slate-500">No rows match these filters</p>
                      <p className="mt-1 text-xs text-slate-400">Try a wider date range or clear a filter above.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const j = spec.journey?.(row);
                    return (
                      <tr
                        key={row.id ?? `${row.recordType || ""}-${i}`}
                        onClick={(e) => {
                          if (!j || e.target.closest("button, a")) return;
                          onJourney?.(j);
                        }}
                        className={cn(
                          "group transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-orange-50/60 focus-within:bg-orange-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 dark:hover:bg-slate-700/50",
                          j && "cursor-pointer",
                          loading && "opacity-60",
                        )}
                      >
                        {visibleCols.map((c) => (
                          <td
                            key={c.key}
                            className={cn(
                              "whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-200",
                              c.align === "right" && "text-right tabular-nums",
                              c.align === "center" && "text-center",
                            )}
                          >
                            <Cell col={c} row={row} />
                          </td>
                        ))}
                        <td className="border-b border-slate-100 px-2 py-2 text-right dark:border-slate-800">
                          {j && (
                            <button
                              type="button"
                              onClick={() => onJourney?.(j)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-black text-[#0a1e4d] opacity-60 ring-1 ring-inset ring-[#0a1e4d]/20 transition hover:bg-[#0a1e4d] hover:text-white hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-orange-400 group-hover:opacity-100 dark:text-white dark:ring-white/30"
                              title={`Trace ${j.container || j.vehicle} across all feeds`}
                            >
                              <Route className="h-3 w-3" /> Journey
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-4">
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          pageSize={limit}
          loading={loading}
          onPageChange={(p) => set({ page: p })}
          onPageSizeChange={(l) => set({ limit: l, page: 1 })}
          pageSizeOptions={[10, 25, 50, 100, 200]}
        />
      </div>

    </section>
  );
}
