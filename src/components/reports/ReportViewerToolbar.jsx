"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildTableHtml(title, columns, rows) {
  const head = columns
    .map((column) => `<th>${escapeCell(column.label)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeCell(row[column.key])}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeCell(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { font-size: 20px; margin: 0 0 16px; text-align: center; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0b16e8; color: #ffffff; text-align: center; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>${escapeCell(title)}</h1>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCsvCell(row[column.key])).join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}

function ToolbarButton({ children, disabled, href, onClick, title }) {
  const className = `h-10 min-w-10 px-3 border-r border-slate-200 dark:border-slate-700 inline-flex items-center justify-center text-xl text-slate-700 dark:text-slate-200 ${
    disabled
      ? "pointer-events-none opacity-35"
      : "hover:bg-slate-100 dark:hover:bg-slate-800"
  }`;

  if (href) {
    return (
      <Link href={href} className={className} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}

export default function ReportViewerToolbar({
  title,
  columns,
  rows,
  targetId,
  currentPage = 1,
  totalPages = 1,
  firstHref,
  previousHref,
  nextHref,
  lastHref,
  showPagination = true,
  showTools = true,
}) {
  const router = useRouter();
  const [draftPageInput, setDraftPageInput] = useState(null);
  const [zoom, setZoom] = useState("100%");
  const disabled = !rows?.length;
  const pageInput = draftPageInput ?? String(currentPage);

  const saveAsExcel = () => {
    const csv = buildCsv(columns, rows);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyZoom = (value) => {
    setZoom(value);

    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    target.style.zoom = value;
  };

  const printOrSavePdf = () => {
    const html = buildTableHtml(title, columns, rows);
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const goToTypedPage = () => {
    const parsed = Number.parseInt(pageInput, 10);
    setDraftPageInput(null);
    if (!Number.isFinite(parsed)) return;

    const page = Math.min(Math.max(parsed, 1), totalPages);
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="flex min-h-12 flex-wrap items-center border-y border-slate-200 dark:border-slate-700 text-sm">
        {showPagination && (
          <>
            <ToolbarButton href={firstHref} disabled={currentPage <= 1} title="First page">
              ⇤
            </ToolbarButton>
            <ToolbarButton href={previousHref} disabled={currentPage <= 1} title="Previous page">
              ‹
            </ToolbarButton>

            <div className="flex h-10 items-center gap-2 border-r border-slate-200 dark:border-slate-700 px-4">
              <input
                value={pageInput}
                onChange={(event) => setDraftPageInput(event.target.value)}
                onBlur={goToTypedPage}
                onKeyDown={(event) => {
                  if (event.key === "Enter") goToTypedPage();
                }}
                className="h-8 w-12 border border-slate-300 bg-white text-center text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Page number"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                of {totalPages}
              </span>
            </div>

            <ToolbarButton href={nextHref} disabled={currentPage >= totalPages} title="Next page">
              ›
            </ToolbarButton>
            <ToolbarButton href={lastHref} disabled={currentPage >= totalPages} title="Last page">
              ⇥
            </ToolbarButton>
          </>
        )}

        {showTools && (
          <>
            <div className="flex h-10 items-center border-r border-slate-200 dark:border-slate-700 px-4">
              <select
                value={zoom}
                onChange={(event) => applyZoom(event.target.value)}
                className="h-8 w-28 border border-slate-300 bg-white px-2 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Zoom"
              >
                {["75%", "90%", "100%", "125%", "150%", "200%"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex h-10 items-center border-r border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={saveAsExcel}
                disabled={disabled}
                className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Excel"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={printOrSavePdf}
                disabled={disabled}
                className="h-10 px-3 text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Save as PDF"
              >
                PDF
              </button>
            </div>

            <ToolbarButton onClick={printOrSavePdf} disabled={disabled} title="Print">
              ⎙
            </ToolbarButton>
          </>
        )}
      </div>

      <div className="sr-only" aria-live="polite">
        Report zoom selected {zoom}
      </div>
    </div>
  );
}
