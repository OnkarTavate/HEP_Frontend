import CargoAnalyticsDashboard from "@/components/cargo-analytics/CargoAnalyticsDashboard";

export const metadata = { title: "Cargo Analytics · Traffic Manager · APACS" };

export default function TrafficManagerCargoAnalyticsPage() {
  return <CargoAnalyticsDashboard basePath="/traffic_manager" />;
}
