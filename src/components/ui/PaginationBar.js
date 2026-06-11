"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Reusable pagination bar component.
 *
 * @param {Object} props
 * @param {number} props.currentPage    - Current active page (1-indexed)
 * @param {number} props.totalPages     - Total number of pages
 * @param {number} props.totalRecords   - Total number of records across all pages
 * @param {number} props.pageSize       - Records per page
 * @param {Function} props.onPageChange - Callback with new page number
 * @param {boolean} [props.loading]     - If true, disables controls
 */
export default function PaginationBar({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  loading = false,
}) {
  if (totalRecords === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  // Generate visible page numbers (show max 5 pages around current)
  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Ensure we show at least 5 pages when possible
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const btnBase =
    "inline-flex items-center justify-center h-9 min-w-[36px] px-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const btnDefault =
    "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60";
  const btnActive =
    "bg-[#0a1e4d] text-white dark:bg-amber-500 dark:text-black shadow-md";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-1 w-full">
      {/* Record count */}
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tabular-nums">
        Showing{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {start}–{end}
        </span>{" "}
        of{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {totalRecords}
        </span>{" "}
        records
      </p>

      {/* Page controls & size selector */}
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="pl-2 pr-6 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            className={`${btnBase} ${btnDefault}`}
            disabled={!canPrev || loading}
            onClick={() => onPageChange(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous */}
          <button
            className={`${btnBase} ${btnDefault}`}
            disabled={!canPrev || loading}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers[0] > 1 && (
            <span className="px-1 text-slate-400 text-sm">…</span>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`${btnBase} ${page === currentPage ? btnActive : btnDefault
                }`}
              disabled={loading}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <span className="px-1 text-slate-400 text-sm">…</span>
          )}

          {/* Next */}
          <button
            className={`${btnBase} ${btnDefault}`}
            disabled={!canNext || loading}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            className={`${btnBase} ${btnDefault}`}
            disabled={!canNext || loading}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
