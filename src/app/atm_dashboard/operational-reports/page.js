import RoleReportsPage from "@/components/reports/RoleReportsPage";
import { reports } from "@/lib/reports";

const ATM_REPORTS = reports.map((report) => report.slug);

export default function ATMOperationalReportsPage() {
  return <RoleReportsPage title="ATM Reports" description="View and search all available APACS operational reports." reportSlugs={ATM_REPORTS} basePath="/atm_dashboard/operational-reports" />;
}
