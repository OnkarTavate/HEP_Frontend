"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";

// ── Pagination component ─────────────────────────────────────────────────────
export default function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  pageSize, 
  pageSizeOptions = [10, 20, 50],
  onChangePage,
  onChangePageSize
}) {
  const totalPagesValue = totalPages || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPagesValue) {
      onChangePage?.(newPage);
    }
  };

  // Generate page numbers to display (show 5 pages at a time with ellipsis)
  const pageNumbers = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPagesValue, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        {/* Items per page selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">Rows per page:</span>
          <select 
            value={pageSize} 
            onChange={(e) => { onChangePageSize?.(Number(e.target.value)); onChangePage?.(1); }}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/40 cursor-pointer"
          >
            {pageSizeOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          
          {/* Page info */}
          <span className="ml-2">
            <span className="font-semibold text-slate-700">
              {totalItems === 0 ? "0" : `${startItem}–${endItem}`}
            </span>
            {" "}of{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span>
          </span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          {/* First page button */}
          <button 
            disabled={currentPage === 1 || totalPagesValue === 0} 
            onClick={() => handlePageChange(1)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Go to first page"
          >
            «
          </button>

          {/* Previous button */}
          <button 
            disabled={currentPage === 1 || totalPagesValue === 0} 
            onClick={() => handlePageChange(currentPage - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          {/* Page number buttons */}
          {pageNumbers.map((n, i) => {
            // Show ellipsis before the first page if there's a gap
            if (i === 0 && startPage > 1) {
              pageNumbers[i] = "startEllipsis";
            }
            // Show ellipsis after the last page if there's a gap
            if (i === pageNumbers.length - 1 && endPage < totalPagesValue) {
              pageNumbers[pageNumbers.length - 1] = "endEllipsis";
            }
            return null;
          })}

          {pageNumbers.map((n, i, arr) => {
            if (n === "startEllipsis") {
              return (
                <span key={`g-start`} className="px-2 text-slate-400 text-xs">
                  …
                </span>
              );
            }
            if (n === "endEllipsis") {
              return (
                <span key={`g-end`} className="px-2 text-slate-400 text-xs">
                  …
                </span>
              );
            }
            return (
              <button 
                key={n} 
                onClick={() => handlePageChange(n)}
                className={`min-w-[30px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  currentPage === n 
                    ? "bg-slate-900 text-white border border-slate-900" 
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {n}
              </button>
            );
          })}

          {/* Next button */}
          <button 
            disabled={currentPage === totalPagesValue || totalPagesValue === 0} 
            onClick={() => handlePageChange(currentPage + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Last page button */}
          <button 
            disabled={currentPage === totalPagesValue || totalPagesValue === 0} 
            onClick={() => handlePageChange(totalPagesValue)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Go to last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
