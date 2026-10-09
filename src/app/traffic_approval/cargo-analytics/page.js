import CargoAnalyticsDashboard from "@/components/cargo-analytics/CargoAnalyticsDashboard";

export const metadata = { title: "Cargo Analytics · Traffic Department · APACS" };

export default function TrafficCargoAnalyticsPage() {
  return <CargoAnalyticsDashboard basePath="/traffic_approval" />;
}
