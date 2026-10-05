import RoleReportsPage from "@/components/reports/RoleReportsPage";

const ATM_REPORTS = ["blacklisting-report", "card-penalty-report", "card-inventory-summary", "revenue-report"];

export default function ATMOperationalReportsPage() {
  return <RoleReportsPage title="ATM Reports" description="Blacklist, penalty, QR inventory, and revenue reports relevant to the ATM Pass Section." reportSlugs={ATM_REPORTS} basePath="/atm_dashboard/operational-reports" />;
}
