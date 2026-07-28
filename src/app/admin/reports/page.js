import { FileBarChart } from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import { reports } from "@/lib/reports";

export default function ReportsPage() {
  return (
    <main className="h-full overflow-y-auto p-6 lg:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <FileBarChart className="mb-3 h-9 w-9 text-orange-500" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Reports
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access operational reports for Chennai Port Authority.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reports.map((report) => (
            <ReportCard key={report.slug} report={report} />
          ))}
        </div>
      </section>
    </main>
  );
}
