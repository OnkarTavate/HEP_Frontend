"use client";

import { useMemo, useState } from "react";
import { FileBarChart, RotateCcw, Search, X, Zap } from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import { reports } from "@/lib/reports";

const REPORT_ORDER_STORAGE_KEY = "admin-report-card-order-v2";

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      ),
    []
  );

  const reportSlugs = useMemo(
    () => sortedReports.map((report) => report.slug),
    [sortedReports]
  );
  const [cardOrder, setCardOrder] = useState(() => {
    if (typeof window === "undefined") return reportSlugs;

    const saved = localStorage.getItem(REPORT_ORDER_STORAGE_KEY);
    if (!saved) return reportSlugs;

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return reportSlugs;

      const validSaved = parsed.filter((slug) => reportSlugs.includes(slug));
      const missing = reportSlugs.filter((slug) => !validSaved.includes(slug));
      return [...validSaved, ...missing];
    } catch {
      return reportSlugs;
    }
  });
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const orderedReports = useMemo(() => {
    const reportMap = new Map(
      sortedReports.map((report) => [report.slug, report])
    );
    return cardOrder
      .map((slug) => reportMap.get(slug))
      .filter(Boolean);
  }, [cardOrder, sortedReports]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return orderedReports;

    return orderedReports.filter((report) =>
      [report.title, report.description, report.slug]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(query))
    );
  }, [orderedReports, searchQuery]);

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newOrder = [...cardOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(idx, 0, draggedItem);

    setCardOrder(newOrder);
    localStorage.setItem(REPORT_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const resetCardOrder = () => {
    setCardOrder(reportSlugs);
    localStorage.setItem(
      REPORT_ORDER_STORAGE_KEY,
      JSON.stringify(reportSlugs)
    );
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <main className="h-full min-h-0 overflow-hidden p-4 lg:p-6 bg-[#f8f9fb]">
      <section className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-400/25 flex-shrink-0">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight">
              Reports
            </h1>
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">
              Access operational reports for Chennai Port Authority.
            </p>
          </div>
        </div>

        <div className="relative mb-3 shrink-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reports by name or purpose..."
            aria-label="Search reports"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear report search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 px-3 py-2 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-amber-400/80">
            <Zap className="h-4 w-4 animate-bounce text-amber-500" />
            Drag and drop report cards to arrange your view.
          </p>
          <button
            type="button"
            onClick={resetCardOrder}
            className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
            title="Reset report order"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Order
          </button>
        </div>

        <div className="grid min-h-0 content-start gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredReports.map((report, index) => {
            const isDragged = draggedIndex === index;
            const isOver = dragOverIndex === index;

            return (
              <div
                key={report.slug}
                draggable={!searchQuery}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={
                  "transition-all duration-200 " +
                  (isDragged ? "opacity-35 scale-95" : "") +
                  (isOver
                    ? "rounded-3xl border-2 border-dashed border-amber-500 bg-amber-500/5 p-1 shadow-inner scale-[1.02]"
                    : "")
                }
              >
                <ReportCard report={report} />
              </div>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <div className="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No reports match “{searchQuery.trim()}”.
          </div>
        )}
      </section>
    </main>
  );
}
