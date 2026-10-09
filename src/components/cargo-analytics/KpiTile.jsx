"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtNum, pctDelta } from "./format";

/**
 * Tile gradients use the 700–900 stops so solid white text clears WCAG AA:
 * orange-700 4.9:1 · emerald-700 5.1:1 · green-700 5.0:1 · sky-700 5.9:1 ·
 * rose-700 6.0:1 · slate-700 8.6:1 · teal-700 5.3:1 · navy 11+:1.
 */
const TONES = {
  navy: "from-[#0a1e4d] to-[#1b3a8a] shadow-[#0a1e4d]/40",
  orange: "from-orange-700 to-amber-800 shadow-orange-700/40",
  emerald: "from-emerald-700 to-teal-800 shadow-emerald-700/40",
  green: "from-green-700 to-green-900 shadow-green-700/40",
  sky: "from-sky-700 to-blue-900 shadow-sky-700/40",
  rose: "from-rose-700 to-rose-900 shadow-rose-700/40",
  slate: "from-slate-700 to-slate-900 shadow-slate-700/40",
  teal: "from-teal-700 to-cyan-900 shadow-teal-700/40",
};

/**
 * Hero-number tile. `value` is already formatted if `formatted` is passed; else
 * fmtNum. `previous` enables a delta chip against the prior equal-length period.
 * `invert` marks metrics where a rise is bad (exceptions, failures).
 */
export default function KpiTile({
  title,
  value,
  formatted,
  previous,
  invert = false,
  icon: Icon,
  tone = "navy",
  sub,
  loading,
  onClick,
}) {
  const hasPrev = previous !== undefined && previous !== null;
  const delta = hasPrev ? pctDelta(value, previous) : null;
  const up = delta > 0.5;
  const down = delta < -0.5;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const Wrapper = onClick ? "button" : "div";
  const deltaText = hasPrev
    ? `${up ? "Up" : down ? "Down" : "Flat"} ${Math.abs(delta).toLocaleString("en-IN", { maximumFractionDigits: 0 })}% versus the previous period of equal length${invert ? (good ? " (improvement)" : bad ? " (worse)" : "") : ""}`
    : undefined;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative isolate flex min-h-[122px] min-w-0 flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-left text-white ring-1 ring-inset ring-white/25 shadow-[0_14px_38px_-14px_var(--tw-shadow-color)] transition-all duration-300",
        TONES[tone] || TONES.navy,
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_50px_-16px_var(--tw-shadow-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
      )}
      title={onClick ? `Open ${title.toLowerCase()}` : undefined}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-inset ring-white/40">
          {Icon ? <Icon className="h-4 w-4" strokeWidth={2.4} /> : null}
        </span>
        {hasPrev && !loading && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ring-1 ring-inset",
              good && "bg-emerald-300/25 text-emerald-50 ring-emerald-100/50",
              bad && "bg-rose-300/30 text-rose-50 ring-rose-100/50",
              !good && !bad && "bg-white/15 text-white ring-white/25",
            )}
            title={deltaText}
            aria-label={deltaText}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : down ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta).toLocaleString("en-IN", { maximumFractionDigits: 0 })}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="relative mt-3 h-8 w-24 animate-pulse rounded-lg bg-white/30" />
      ) : (
        <p className="relative mt-3 break-words text-[24px] font-black leading-none tabular-nums tracking-tight drop-shadow-sm sm:text-3xl">
          {formatted ?? fmtNum(value)}
        </p>
      )}
      <p className="relative mt-1.5 text-[11px] font-bold uppercase leading-tight tracking-wider text-white">{title}</p>
      {sub && !loading && <p className="relative mt-1 truncate text-[11.5px] font-semibold text-white/90">{sub}</p>}
    </Wrapper>
  );
}
