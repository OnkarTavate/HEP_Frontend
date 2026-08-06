"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { FaceValidationResult } from "@/types/face";

type FaceStatusProps = {
  validation: FaceValidationResult;
};

export default function FaceStatus({ validation }: FaceStatusProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <ul className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        {validation.checks.map((check) => (
          <li key={check.key} className="flex items-start gap-2">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            )}
            <div className="leading-tight">
              <p className={check.passed ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {check.label}
              </p>
              <p className="min-h-[14px] text-[11px] text-slate-500">
                {!check.passed ? check.reason : "\u00A0"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}