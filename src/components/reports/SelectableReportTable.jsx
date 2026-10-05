"use client";

import { useMemo, useState } from "react";

function displayValue(value, column) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (column?.format === "datetime") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date);
    }
  }
  return String(value);
}

export default function SelectableReportTable({
  rows,
  columns,
  targetId,
  documentBaseUrl = "",
}) {
  const [selectedKeys, setSelectedKeys] = useState(() => {
    const populatedKeys = columns
      .filter((column) => rows.some((row) => row[column.key] != null && row[column.key] !== ""))
      .map((column) => column.key);
    return populatedKeys.length ? populatedKeys : columns.map((column) => column.key);
  });
  const visibleColumns = useMemo(
    () => columns.filter((column) => selectedKeys.includes(column.key)),
    [columns, selectedKeys],
  );

  function toggleColumn(key) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.length === 1 ? current : current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function documentUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = String(path).replace(/^\/+/, "");
    return `${documentBaseUrl.replace(/\/$/, "")}/${normalizedPath}`;
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <details className="relative w-fit">
          <summary className="cursor-pointer select-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Columns ({visibleColumns.length}/{columns.length})
          </summary>
          <div className="absolute left-0 z-30 mt-1 grid max-h-72 min-w-64 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {columns.map((column) => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  className="accent-amber-500"
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </details>
      </div>

      <div id={targetId} tabIndex={0} role="region" aria-label="Report results" className="report-scroll-area min-h-0 min-w-0 max-w-full flex-1 overflow-auto overscroll-contain origin-top-left focus-visible:outline-2 focus-visible:outline-orange-500">
        <table className="min-w-max w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-stone-500 shadow-sm dark:bg-slate-800">
            <tr>{visibleColumns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-2.5">{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr key={`${row.id || row.passId || row.requestNumber || row.identifier || "row"}-${index}`}>
                {visibleColumns.map((column) => {
                  const value = row[column.key];
                  const link = column.documentPathKey ? documentUrl(row[column.documentPathKey]) : "";
                  return (
                    <td key={column.key} className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      {link && value ? (
                        <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline hover:text-blue-500">
                          {displayValue(value, column)}
                        </a>
                      ) : displayValue(value, column)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
