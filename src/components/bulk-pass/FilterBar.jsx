"use client";

import React from "react";
import { 
  Search, 
  CalendarDays, 
  X, 
  Filter 
} from "lucide-react";

/**
 * FilterBar Component for Admin Public Requests List Page
 * 
 * Provides comprehensive filtering capabilities:
 * - Status filter dropdown (All, Pending, Approved, Rejected)
 * - Date range filter (from date, to date)  
 * - Search input (filter by company name or email)
 * - Apply filters button
 * - Clear filters button
 * 
 * Requirements: 25.1, 25.2
 */
const FilterBar = ({
  // Filter state
  search,
  fromDate,
  toDate,
  statusFilter,
  
  // Filter handlers
  onSearchChange,
  onFromDateChange,
  onToDateChange,
  onStatusFilterChange,
  onApplyFilters,
  onClearFilters,
  
  // Display options
  placeholder = "Search by company name or email…",
  showApplyButton = false,
  showResultsCount = true,
  resultsCount = 0,
  
  // Status options for the dropdown
  statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "PENDING_ADMIN_APPROVAL", label: "Pending" },
    { value: "ACTIVE", label: "Approved" },
    { value: "REJECTED_BY_ADMIN", label: "Rejected" },
    { value: "EXPIRED", label: "Expired" },
  ],
  
  // Styling
  className = "",
}) => {
  const hasFilters = search || fromDate || toDate || (statusFilter && statusFilter !== "ALL");

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters({
        search: search?.trim(),
        fromDate,
        toDate,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Status Filter Dropdown */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
        <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <select
          value={statusFilter || "ALL"}
          onChange={(e) => onStatusFilterChange?.(e.target.value)}
          className="outline-none bg-transparent text-sm text-slate-600 min-w-[120px] cursor-pointer"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input 
          type="text" 
          placeholder={placeholder}
          value={search || ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border-2 border-slate-300 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition placeholder:text-slate-400 text-slate-800 shadow-sm" 
        />
        {search && (
          <button 
            onClick={() => onSearchChange?.("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date Range Filters */}
      <div className="flex items-center gap-2">
        {/* From Date */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input 
            type="date" 
            value={fromDate || ""} 
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="outline-none bg-transparent text-sm text-slate-600 w-[130px]"
            title="Filter from date"
          />
        </div>
        
        <span className="text-slate-300 text-xs font-medium">to</span>
        
        {/* To Date */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input 
            type="date" 
            value={toDate || ""} 
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="outline-none bg-transparent text-sm text-slate-600 w-[130px]"
            title="Filter to date"
          />
        </div>
      </div>

      {/* Apply Filters Button (optional) */}
      {showApplyButton && (
        <button 
          onClick={handleApplyFilters}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-[#1f1f1f] font-bold text-sm transition shadow-sm shrink-0"
          title="Apply filters"
        >
          <Filter className="h-4 w-4" strokeWidth={2.5} />
          Apply Filters
        </button>
      )}

      {/* Clear Filters Button */}
      {hasFilters && (
        <button 
          onClick={handleClearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
          title="Clear all filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}

      {/* Results Count */}
      {showResultsCount && (
        <span className="ml-auto text-xs text-slate-400 hidden sm:inline">
          {resultsCount} result{resultsCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};

export default FilterBar;