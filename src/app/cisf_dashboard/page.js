"use client";
import DeptPortalScaffold from "@/components/DeptPortalScaffold";
import { Shield, Construction } from "lucide-react";

export default function CisfDashboard() {
  return (
    <DeptPortalScaffold
      allowedRoles={["cisf", "commandant"]}
      portalTitle="CISF Portal"
      portalSubtitle="CISF Department — Chennai Port Authority"
      accentColor="#1d4ed8"
      HeaderIcon={Shield}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
          <Construction className="h-8 w-8" strokeWidth={2} />
        </span>
        <h2 className="text-2xl font-extrabold text-slate-700">CISF Portal</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          CISF-specific features are being developed. This portal is correctly
          gated — only CISF and Commandant role users can reach this page.
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-xs font-bold text-blue-700">
          🏗 Coming Soon
        </span>
      </div>
    </DeptPortalScaffold>
  );
}
