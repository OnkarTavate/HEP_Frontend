"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Clock3, Filter, Link2, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DATE_PRESETS, SHIFTS, detectPreset, detectShift, presetRange } from "./useQueryState";
import { prettyDateRangeLabel } from "./format";

/* Active chip is white-on-navy (≈15:1) like the incumbent dashboard's period tabs;
   inactive chips are white/85 on navy (≈11:1). No white-on-orange anywhere. */
const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2359]";
const chipOff = "bg-white/10 text-white/85 hover:bg-white/20 ring-1 ring-inset ring-white/15";
const chipOn = "bg-white text-[#0a1e4d] shadow-md shadow-black/30 ring-1 ring-inset ring-white";

const selectCls =
  "h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white outline-none backdrop-blur focus:border-orange-300 focus:ring-2 focus:ring-orange-300/50 [&>option]:text-slate-900";

const PRESET_CHIPS = DATE_PRESETS.filter((p) => p.key !== "custom");
const SHIFT_TITLES = {
  shift1: "07:00 to 14:00 IST",
  shift2: "14:00 to 21:00 IST",
  shift3: "21:00 to 07:00 IST the next morning (overnight)",
};

function ActiveDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden />;
}

function FilterControls({ state, set, options, preset, shift, search, setSearch, onCopyLink, reset, stacked = false }) {
  const customRange = preset === "custom";
  return (
    <>
      {/* Row 1: period presets + range */}
      <div className={cn("flex flex-wrap items-center gap-2", stacked && "flex-col items-stretch")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
            <CalendarDays className="h-3.5 w-3.5" /> Period
          </span>
          {PRESET_CHIPS.map((p) => {
            const on = preset === p.key;
            return (
              <button key={p.key} type="button" onClick={() => set(presetRange(p.key))} className={cn(chipBase, on ? chipOn : chipOff)} aria-pressed={on}>
                {on && <ActiveDot />}
                {p.label}
              </button>
            );
          })}
        </div>
        <div className={cn("flex flex-wrap items-center gap-2", !stacked && "ml-auto")}>
          {customRange && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#0a1e4d]">
              <ActiveDot /> Custom range
            </span>
          )}
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
            From
            <input
              type="date"
              name="fromDate"
              value={state.from || ""}
              max={state.to || undefined}
              onChange={(e) => set({ from: e.target.value })}
              className={cn(selectCls, "[color-scheme:dark]", customRange && "border-orange-300 ring-2 ring-orange-300/50")}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
            To
            <input
              type="date"
              name="toDate"
              value={state.to || ""}
              min={state.from || undefined}
              onChange={(e) => set({ to: e.target.value })}
              className={cn(selectCls, "[color-scheme:dark]", customRange && "border-orange-300 ring-2 ring-orange-300/50")}
            />
          </label>
        </div>
      </div>

      {/* Row 2: shift + dimensions + search */}
      <div className={cn("flex flex-wrap items-center gap-2", stacked && "flex-col items-stretch")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
            <Clock3 className="h-3.5 w-3.5" /> Shift
          </span>
          {SHIFTS.map((s) => {
            const on = shift === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => set({ fromTime: s.fromTime, toTime: s.toTime })}
                className={cn(chipBase, on ? chipOn : chipOff)}
                aria-pressed={on}
                title={SHIFT_TITLES[s.key]}
              >
                {on && <ActiveDot />}
                {s.key === "shift3" ? "Shift 3 · 21–07 overnight" : s.label}
              </button>
            );
          })}
        </div>

        <div className={cn("flex flex-wrap items-center gap-2", !stacked && "ml-auto")}>
          <span className="inline-flex items-center text-white/70" aria-hidden>
            <Filter className="h-3.5 w-3.5" />
          </span>
          <select name="terminal" aria-label="Terminal" value={state.terminal || ""} onChange={(e) => set({ terminal: e.target.value })} className={selectCls}>
            <option value="">All terminals</option>
            {(options?.terminals || []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="weighbridge" aria-label="Weighbridge" value={state.weighbridge || ""} onChange={(e) => set({ weighbridge: e.target.value })} className={selectCls}>
            <option value="">All weighbridges</option>
            {(options?.weighbridges || []).map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <select name="movement" aria-label="Movement" value={state.movement || ""} onChange={(e) => set({ movement: e.target.value })} className={selectCls}>
            <option value="">Export + Import</option>
            <option value="Export">Export</option>
            <option value="Import">Import</option>
          </select>
          <label className={cn("relative", stacked && "w-full")}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
            <input
              type="search"
              name="search"
              aria-label="Search across feeds"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && set({ q: e.currentTarget.value })}
              placeholder="Container, vehicle, EIR, serial…"
              className={cn(selectCls, "w-56 pl-8 placeholder:text-white/50", stacked && "w-full")}
            />
          </label>
          <button type="button" onClick={onCopyLink} className={cn(chipBase, chipOff, "h-9 rounded-xl px-3")} title="Copy a link to this exact view">
            <Link2 className="h-3.5 w-3.5" /> Copy link
          </button>
          <button type="button" onClick={reset} className={cn(chipBase, chipOff, "h-9 rounded-xl px-3")} title="Back to last 30 days, no filters">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>
    </>
  );
}

export default function GlobalFilterBar({ state, set, reset, options, loading }) {
  const preset = detectPreset(state.from, state.to);
  const shift = detectShift(state.fromTime, state.toTime);
  const [search, setSearch] = useState(state.q || "");
  const [syncedQ, setSyncedQ] = useState(state.q || "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if ((state.q || "") !== syncedQ) {
    // URL changed from outside (reset, chip, deep link): adopt it.
    setSyncedQ(state.q || "");
    setSearch(state.q || "");
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((state.q || "") !== search) set({ q: search });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied", { description: "Anyone with Traffic access will open this exact view." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy", { description: "Copy the address from the browser bar instead." });
    }
  };

  const activeChips = [
    state.terminal && { k: "terminal", label: `Terminal: ${state.terminal}` },
    state.weighbridge && { k: "weighbridge", label: `Weighbridge: ${state.weighbridge}` },
    state.movement && { k: "movement", label: `Movement: ${state.movement}` },
    state.q && { k: "q", label: `Search: “${state.q}”` },
    shift !== "all" && { k: "shift", label: `Time: ${state.fromTime || "…"}–${state.toTime || "…"} IST` },
  ].filter(Boolean);

  const controlProps = { state, set, options, preset, shift, search, setSearch, onCopyLink, reset };

  return (
    <section
      aria-label="Cargo analytics filters"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a1e4d] via-[#12275f] to-[#1b1856] p-4 text-white shadow-[0_18px_50px_-20px_rgba(10,30,77,0.6)] ring-1 ring-inset ring-white/10 sm:p-5"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Desktop / tablet: full controls */}
      <div className="relative hidden flex-col gap-4 sm:flex">
        <FilterControls {...controlProps} />
      </div>

      {/* Mobile: one summary line + a sheet */}
      <div className="relative flex items-center justify-between gap-3 sm:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{prettyDateRangeLabel(state.from, state.to)}</p>
          <p className="truncate text-[11px] font-semibold text-white/85">
            {shift === "all" ? "All day" : SHIFTS.find((s) => s.key === shift)?.label || "Custom time"}
            {activeChips.length ? ` · ${activeChips.length} filter${activeChips.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setSheetOpen(true)} className={cn(chipBase, chipOn, "h-10 shrink-0 rounded-xl px-3.5")}>
          <SlidersHorizontal className="h-4 w-4" /> Filters{activeChips.length ? ` (${activeChips.length})` : ""}
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-0 bg-gradient-to-b from-[#0f2359] to-[#0a1e4d] p-5 text-white [&_[data-slot=sheet-close]]:text-white">
            <SheetTitle className="text-base font-black text-white">Filters</SheetTitle>
            <SheetDescription className="text-xs text-white/85">Applies to every tab. All times IST.</SheetDescription>
            <div className="mt-2 flex flex-col gap-5">
              <FilterControls {...controlProps} stacked />
              <button type="button" onClick={() => setSheetOpen(false)} className="h-11 rounded-xl bg-white text-sm font-black text-[#0a1e4d]">
                Done
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Summary + active chips (all sizes) */}
      <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs sm:mt-4">
        <span className="hidden font-bold text-white/95 sm:inline">{prettyDateRangeLabel(state.from, state.to)}</span>
        <span className="hidden text-white/50 sm:inline">·</span>
        <span className="text-white/80">All times IST</span>
        {loading && (
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white" role="status">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" /> Updating
          </span>
        )}
        {copied && (
          <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200">
            <Check className="h-3 w-3" /> Link copied
          </span>
        )}
        {activeChips.map((c) => (
          <button
            key={c.k}
            type="button"
            onClick={() => (c.k === "shift" ? set({ fromTime: "", toTime: "" }) : set({ [c.k]: "" }))}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/20 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            title={`Remove ${c.label}`}
          >
            {c.label} <X className="h-3 w-3" />
          </button>
        ))}
      </div>
    </section>
  );
}
