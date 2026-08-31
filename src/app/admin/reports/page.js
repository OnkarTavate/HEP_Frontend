"use client";

import { useMemo, useState } from "react";
import { FileBarChart, RotateCcw, Zap } from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import { reports } from "@/lib/reports";

const REPORT_ORDER_STORAGE_KEY = "admin-report-card-order-v2";

export default function ReportsPage() {
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

        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-xs">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orderedReports.map((report, index) => {
            const isDragged = draggedIndex === index;
            const isOver = dragOverIndex === index;

            return (
              <div
                key={report.slug}
                draggable
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
      </section>
    </main>
  );
}
