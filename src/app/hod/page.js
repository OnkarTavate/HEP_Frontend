"use client";

import Link from "next/link";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";

export default function HodPage() {
  return (
    <section className="mx-auto max-w-7xl py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-stone-100">
            HOD Dashboard
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Create and manage VVIP pass requests from the VVIP Pass section.
          </p>
        </div>

        <Link
          href="/hod/vvip-pass"
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.98]"
        >
          <BadgeCheck className="h-5 w-5" />
          Create VVIP Pass
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-stone-400">
                VVIP Pass
              </p>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-stone-100">
                Request Form
              </h3>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Submit new VVIP requests for Traffic approval.
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
              <BadgeCheck className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-stone-400">
                Status
              </p>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-stone-100">
                Track Requests
              </h3>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Submitted, approved, reverted and rejected lists are inside VVIP Pass.
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-stone-300">
              <FileText className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-stone-400">
                Approval
              </p>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-stone-100">
                Traffic Review
              </h3>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Traffic approves, rejects, or reverts VVIP requests.
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
