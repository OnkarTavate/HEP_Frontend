"use client";
import DeptPortalScaffold from "@/components/DeptPortalScaffold";
import { HardHat, Construction } from "lucide-react";

export default function SafetyDashboard() {
  return (
    <DeptPortalScaffold
      allowedRoles={["safety officer", "fire safety officer"]}
      portalTitle="Safety Portal"
      portalSubtitle="Safety Department — Chennai Port Authority"
      accentColor="#b45309"
      HeaderIcon={HardHat}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
          <Construction className="h-8 w-8" strokeWidth={2} />
        </span>
        <h2 className="text-2xl font-extrabold text-slate-700">Safety Portal</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          Safety-specific features are being developed. This portal is correctly
          gated — only Safety Officer and Fire Safety Officer role users can reach this page.
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-bold text-amber-700">
          🏗 Coming Soon
        </span>
      </div>
    </DeptPortalScaffold>
  );
}
