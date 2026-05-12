"use client";

// Admin-scoped Pass Approvals view.
// Reuses the same component used by the Traffic Approval team, but renders
// inside the Admin layout so administrators are not redirected away.
import TrafficPassesPage from "@/app/traffic_approval/page";

export default function AdminPassApprovalsPage() {
  return <TrafficPassesPage />;
}
