"use client";

import { CheckCircle2, Ship } from "lucide-react";

export default function VendorPassSubmittedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-emerald-100 p-6">
      <div className="bg-white rounded-xl shadow-xl border border-emerald-200 max-w-md w-full p-8 text-center">
        <div className="flex justify-center">
          <Ship className="h-8 w-8 text-orange-500" />
        </div>
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mt-4" />
        <h1 className="text-xl font-bold text-slate-800 mt-4">
          Application Submitted
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Your vendor pass application has been sent for approval. You will be
          notified at the registered email once a decision is made.
        </p>
        <p className="text-xs text-slate-400 mt-6">
          You may close this window.
        </p>
      </div>
    </div>
  );
}
