"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPublicRequestsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/bulk_pass?tab=public");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="h-9 w-9 rounded-full border-[3px] border-amber-400 border-t-transparent animate-spin" />
      <p className="text-sm text-slate-400">Redirecting to Bulk Pass Console…</p>
    </div>
  );
}
