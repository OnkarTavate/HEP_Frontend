"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /traffic_approval/bulk-pass/dashboard → /traffic_approval/bulk-pass
export default function BulkPassDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/traffic_approval/bulk-pass");
  }, [router]);
  return null;
}
