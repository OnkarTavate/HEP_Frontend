"use client";

import { BadgeCheck } from "lucide-react";

export default function HodVvipPassPage() {
  return (
    <section className="mx-auto max-w-7xl py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <BadgeCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">
            VVIP Pass
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            VVIP pass page placeholder.
          </p>
        </div>
      </div>
    </section>
  );
}
