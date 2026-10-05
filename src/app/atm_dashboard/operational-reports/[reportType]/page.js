import { notFound } from "next/navigation";
import { renderReportPage } from "@/app/admin/reports/[reportType]/page";

const ALLOWED_REPORTS = new Set(["blacklisting-report", "card-penalty-report", "card-inventory-summary", "revenue-report"]);

export default async function ATMReportPage(props) {
  const { reportType } = await props.params;
  if (!ALLOWED_REPORTS.has(reportType)) notFound();
  return renderReportPage(props, "/atm_dashboard/operational-reports");
}
