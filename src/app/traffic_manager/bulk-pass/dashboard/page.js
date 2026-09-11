"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /traffic_manager/bulk-pass/dashboard → /traffic_manager/bulk-pass
export default function BulkPassDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    setTimeout(() => router.replace("/traffic_manager/bulk-pass"), 0);
  }, [router]);
  return null;
}
