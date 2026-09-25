"use client";

/**
 * ApplicantLinkCard.jsx
 * ---------------------
 * The applicant's upload link, shown to the department rather than hidden
 * behind a "Resend Invitation Email" button.
 *
 * Officers routinely need to read the link out on the phone, paste it into a
 * message, or let a visitor scan it at a counter — none of which was possible
 * when the only way to move the link was an email nobody could see.
 */

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Copy, Check, Send, QrCode, AlertCircle } from "lucide-react";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/**
 * @param {string}  link         the applicant URL, encrypted and built server-side
 * @param {boolean} tokenActive  whether the link still accepts submissions
 * @param {boolean} expired      whether its window has already closed; the
 *                               caller already derives this from the shared
 *                               validity helper, and reading the clock here
 *                               would make the component non-idempotent
 * @param {string}  tokenExpiresAt
 * @param {boolean} reusable     true when the pass accepts multiple batches
 * @param {Function} onResend
 */
export default function ApplicantLinkCard({
  link,
  tokenActive,
  expired = false,
  tokenExpiresAt,
  reusable = false,
  onResend,
  resending = false,
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const usable = tokenActive && !expired;

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable over plain HTTP on some browsers — the link
      // is on screen and selectable, so this is not worth interrupting for.
      setCopied(false);
    }
  };

  if (!link) return null;

  return (
    <div
      className={`rounded-2xl ring-1 p-5 ${
        usable ? "bg-sky-50 ring-sky-200" : "bg-slate-50 ring-slate-200"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Link2 className={`h-4 w-4 shrink-0 ${usable ? "text-sky-600" : "text-slate-400"}`} />
        <p className={`text-sm font-bold ${usable ? "text-sky-800" : "text-slate-600"}`}>
          Applicant Upload Link
        </p>
        {reusable && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
            Reusable
          </span>
        )}
        {!usable && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-600">
            <AlertCircle className="h-3 w-3" />
            {expired ? "Expired" : "Inactive"}
          </span>
        )}
        {usable && tokenExpiresAt && (
          <span className="text-[11px] text-sky-600">
            · open until {dateFmt.format(new Date(tokenExpiresAt))}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3">
        {usable
          ? reusable
            ? "Share this with the organisation — it accepts every batch until the bulk pass expires."
            : "Share this with the applicant so they can upload their visitor details."
          : "This link is no longer accepting submissions. Resend the invitation to issue a fresh one."}
      </p>

      {/* The link itself, selectable and copyable */}
      <div className="flex flex-col sm:flex-row gap-2">
        <code className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-[11px] font-mono text-slate-700 break-all select-all">
          {link}
        </code>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-100 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-100 transition"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR
          </button>
        </div>
      </div>

      {/* For handing the link to someone standing at the counter */}
      {showQr && (
        <div className="mt-4 flex flex-col items-center gap-2 py-4 rounded-xl bg-white ring-1 ring-slate-200">
          <QRCodeSVG value={link} size={168} level="M" includeMargin />
          <p className="text-[11px] text-slate-400">Scan to open the upload page</p>
        </div>
      )}

      {onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Send className="h-4 w-4" />
          {resending ? "Sending…" : "Resend Invitation Email"}
        </button>
      )}
    </div>
  );
}
