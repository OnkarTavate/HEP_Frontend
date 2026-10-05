import { notFound } from "next/navigation";
import { renderReportPage } from "@/app/admin/reports/[reportType]/page";

const ALLOWED_REPORTS = new Set(["all-pass-issuance-report", "pass-approval-report", "shift-wise-approval-rejection", "vehicle-master", "bulk-pass-report", "material-movement-report", "blacklisting-report", "gate-wise-in-out-summary", "gate-lane-wise-in-out-summary"]);

export default async function TrafficReportPage(props) {
  const { reportType } = await props.params;
  if (!ALLOWED_REPORTS.has(reportType)) notFound();
  return renderReportPage(props, "/traffic_approval/reports");
}
