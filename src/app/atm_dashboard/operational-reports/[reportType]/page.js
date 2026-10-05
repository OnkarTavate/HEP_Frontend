import { notFound } from "next/navigation";
import { renderReportPage } from "@/app/admin/reports/[reportType]/page";
import { getReport } from "@/lib/reports";

export default async function ATMReportPage(props) {
  const { reportType } = await props.params;
  if (!getReport(reportType)) notFound();
  return renderReportPage(props, "/atm_dashboard/operational-reports");
}
