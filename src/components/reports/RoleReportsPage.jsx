"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Search, X } from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import { reports } from "@/lib/reports";

export default function RoleReportsPage({ title, description, reportSlugs, basePath }) {
  const [searchQuery, setSearchQuery] = useState("");
  const availableReports = useMemo(() => {
    const allowed = new Set(reportSlugs);
    return reports.filter((report) => allowed.has(report.slug)).sort((a, b) => a.title.localeCompare(b.title));
  }, [reportSlugs]);
  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableReports;
    return availableReports.filter((report) => [report.title, report.description].filter(Boolean).some((value) => value.toLowerCase().includes(query)));
  }, [availableReports, searchQuery]);

  return (
    <main className="h-full min-h-0 overflow-auto p-4 lg:p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10"><FileBarChart className="h-5 w-5 text-orange-500" /></span>
          <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{description}</p></div>
        </div>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search reports by name or purpose..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear report search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>}
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredReports.map((report) => <ReportCard key={report.slug} report={report} basePath={basePath} />)}
        </div>
      </section>
    </main>
  );
}
