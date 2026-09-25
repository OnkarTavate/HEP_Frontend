"use client";

/**
 * DocumentViewer.jsx
 * ------------------
 * Side-by-side view of one entry's photo and supporting documents.
 *
 * Documents used to open in a new browser tab, which threw the reviewing
 * officer out of the batch and made it impossible to compare a face against the
 * Aadhaar card it is supposed to match. Keeping both on screen is the whole
 * point of the review.
 *
 * Handles images inline and PDFs in an embedded frame, with a download link as
 * the fallback for anything the browser will not render.
 */

import React, { useEffect, useState } from "react";
import { X, FileText, Download, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl } from "@/lib/bulkPassApi";

const isPdf = (path) => /\.pdf(\?|$)/i.test(String(path || ""));
const isImage = (path) => /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(String(path || ""));

function DocumentFrame({ path, label }) {
  const [failed, setFailed] = useState(false);
  const src = fileUrl(path);

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-slate-300 gap-2">
        <ImageIcon className="h-8 w-8" />
        <p className="text-xs text-slate-400">No {label.toLowerCase()} on file</p>
      </div>
    );
  }

  if (isPdf(path)) {
    return (
      <object data={src} type="application/pdf" className="w-full h-full min-h-[320px] rounded-xl">
        {/* Some browsers refuse to embed PDFs; offer the file instead. */}
        <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
          <FileText className="h-8 w-8 text-slate-300" />
          <p className="text-xs text-slate-500">This browser cannot display the PDF inline.</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100"
          >
            <Download className="h-3.5 w-3.5" /> Open {label}
          </a>
        </div>
      </object>
    );
  }

  if (failed || !isImage(path)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-2 p-6 text-center">
        <FileText className="h-8 w-8 text-slate-300" />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100"
        >
          <Download className="h-3.5 w-3.5" /> Open {label}
        </a>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      onError={() => setFailed(true)}
      className="w-full h-full object-contain rounded-xl bg-slate-50"
    />
  );
}

/**
 * @param {object}   entry     the person or vehicle row being reviewed
 * @param {Function} onClose
 * @param {Function} onPrev/onNext  optional navigation between entries
 */
export default function DocumentViewer({ entry, onClose, onPrev, onNext, position }) {
  // Escape closes; arrows step between entries without touching the mouse.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (!entry) return null;

  const isVehicle = !!(entry.vehicleNumber && String(entry.vehicleNumber).trim());
  const docs = isVehicle
    ? Object.entries(entry.vehicleDocs && typeof entry.vehicleDocs === "object" ? entry.vehicleDocs : {})
        .filter(([, v]) => v)
        .map(([k, v]) => ({ label: DOC_LABELS[k] || k, path: v }))
    : [{ label: "Aadhaar Card", path: entry.aadhaarCardPath }];

  const title = isVehicle ? entry.vehicleNumber : entry.name || "Entry";
  const subtitle = isVehicle
    ? `${entry.vehicleType || "Vehicle"} · Driver ${entry.name || "—"}`
    : entry.aadhaar
    ? `Aadhaar XXXX XXXX ${String(entry.aadhaar).slice(-4)}`
    : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-5xl max-h-[94vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 font-mono truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {position && (
              <span className="text-xs text-slate-400 font-mono mr-2 hidden sm:inline">{position}</span>
            )}
            {onPrev && (
              <button onClick={onPrev} title="Previous (←)" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {onNext && (
              <button onClick={onNext} title="Next (→)" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} title="Close (Esc)" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Photo beside documents — the comparison the officer is actually making */}
        <div className="overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!isVehicle && (
            <figure className="flex flex-col gap-2">
              <figcaption className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Photograph
              </figcaption>
              <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden h-[300px] sm:h-[360px]">
                <DocumentFrame path={entry.photoPath} label="Photograph" />
              </div>
            </figure>
          )}

          {docs.map((doc, i) => (
            <figure key={i} className="flex flex-col gap-2">
              <figcaption className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {doc.label}
                </span>
                {doc.path && (
                  <a
                    href={fileUrl(doc.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:underline"
                  >
                    <Download className="h-3 w-3" /> Open
                  </a>
                )}
              </figcaption>
              <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden h-[300px] sm:h-[360px]">
                <DocumentFrame path={doc.path} label={doc.label} />
              </div>
            </figure>
          ))}
        </div>

        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Esc to close · ← → to move between entries
          </p>
          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Vehicle document keys → the labels an officer recognises.
const DOC_LABELS = {
  rc: "RC",
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  roadTax: "Road Tax",
  emission: "PUCC",
  driverAadhaarCard: "Driver Aadhaar",
  driverLicense: "Driving Licence",
};
