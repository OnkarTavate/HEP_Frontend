"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorPassApprovedRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = sessionStorage.getItem("vendor_pass_approved_id");
      if (id) {
        router.replace(`/vendor_pass_approved/${id}`);
      } else {
        router.replace("/");
      }
    }
  }, [router]);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      alignItems: "center",
      justifyContent: "center",
      background: "#f9fafb",
      fontFamily: "sans-serif",
      color: "#6b7280"
    }}>
      <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
        Loading session...
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
