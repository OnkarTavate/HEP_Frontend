"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BulkPassListRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/bulk_pass?tab=list");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );
}
