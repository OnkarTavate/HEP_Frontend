"use client";
import DeptPortalScaffold from "@/components/DeptPortalScaffold";
import { DoorOpen, Construction } from "lucide-react";

export default function GateDashboard() {
  return (
    <DeptPortalScaffold
      allowedRoles={["gate operator", "weigh bridge"]}
      portalTitle="Gate & Weighbridge Portal"
      portalSubtitle="Gate / Weighbridge Department — Chennai Port Authority"
      accentColor="#6d28d9"
      HeaderIcon={DoorOpen}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
          <Construction className="h-8 w-8" strokeWidth={2} />
        </span>
        <h2 className="text-2xl font-extrabold text-slate-700">Gate &amp; Weighbridge Portal</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          Gate and Weighbridge features are being developed. This portal is correctly
          gated — only Gate Operator and Weigh Bridge role users can reach this page.
        </p>
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-4 py-1.5 text-xs font-bold text-violet-700">
          🏗 Coming Soon
        </span>
      </div>
    </DeptPortalScaffold>
  );
}
