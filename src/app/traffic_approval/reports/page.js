import RoleReportsPage from "@/components/reports/RoleReportsPage";

const TRAFFIC_REPORTS = ["all-pass-issuance-report", "pass-approval-report", "shift-wise-approval-rejection", "vehicle-master", "bulk-pass-report", "material-movement-report", "blacklisting-report", "gate-wise-in-out-summary", "gate-lane-wise-in-out-summary"];

export default function TrafficReportsPage() {
  return <RoleReportsPage title="DTM / SDM Reports" description="Operational and approval reports relevant to Traffic Department officers." reportSlugs={TRAFFIC_REPORTS} basePath="/traffic_approval/reports" />;
}
