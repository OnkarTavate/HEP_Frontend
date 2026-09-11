"use client";
import DeptPortalScaffold from "@/components/DeptPortalScaffold";
import { DollarSign, Construction } from "lucide-react";

export default function FinanceDashboard() {
  return (
    <DeptPortalScaffold
      allowedRoles={["finance"]}
      portalTitle="Finance Portal"
      portalSubtitle="Finance Department — Chennai Port Authority"
      accentColor="#0d9488"
      HeaderIcon={DollarSign}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-100 text-teal-600">
          <Construction className="h-8 w-8" strokeWidth={2} />
        </span>
        <h2 className="text-2xl font-extrabold text-slate-700">Finance Portal</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          Finance-specific features are being developed. This portal is correctly
          gated — only Finance-role users can reach this page.
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 text-xs font-bold text-teal-700">
          🏗 Coming Soon
        </span>
      </div>
    </DeptPortalScaffold>
  );
}
