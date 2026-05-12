"use client";

// Admin-scoped Company Approvals view.
// Reuses the Traffic team's component but renders inside the Admin layout.
import TrafficCompanyApprovals from "@/app/traffic_approval/companies/page";

export default function AdminCompanyApprovalsPage() {
  return <TrafficCompanyApprovals />;
}
