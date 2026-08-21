"use client";

import React from "react";
import { CheckCircle2, X, Clock, Hash, RefreshCw } from "lucide-react";

/**
 * SuccessModal Component
 * 
 * Displays a success confirmation modal after bulk pass request submission
 * 
 * Props:
 * - isOpen: boolean - Controls modal visibility
 * - onClose: function - Handler for closing the modal
 * - onSubmitAnother: function - Handler for resetting form to submit another request
 * - trackingNumber: string - The tracking number returned from API (format: TEMP-{timestamp}-{random})
 * - submissionTimestamp: string - ISO timestamp of submission
 * 
 * Requirements: 24.1, 24.5
 */
export default function SuccessModal({
  isOpen,
  onClose,
  onSubmitAnother,
  trackingNumber,
  submissionTimestamp,
}) {
  if (!isOpen) return null;

  // Format timestamp for display
  const formatTimestamp = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1f232d] rounded-3xl shadow-2xl border border-stone-200/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-6 py-5 flex items-center justify-between text-white border-b border-emerald-400/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 font-extrabold shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                Request Submitted Successfully
              </h3>
              <p className="text-xs text-emerald-50 font-medium">
                Your bulk pass request has been received
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8">
          {/* Large Checkmark Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <CheckCircle2 className="h-16 w-16 text-white animate-in zoom-in duration-500" />
              </div>
            </div>
          </div>

          {/* Tracking Number - Prominently Displayed */}
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Tracking Number
              </span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-tight break-all">
                {trackingNumber || "N/A"}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1 font-medium">
                Save this number for tracking your request
              </p>
            </div>
          </div>

          {/* Submission Timestamp */}
          <div className="mb-6 flex items-center justify-center gap-2 text-stone-600 dark:text-stone-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">
              Submitted on: {formatTimestamp(submissionTimestamp)}
            </span>
          </div>

          {/* Success Message */}
          <div className="mb-8 p-5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed text-center">
              Your request has been submitted successfully. You will receive approval status via
              email within{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                2-3 business days
              </span>
              . Please check your inbox regularly for updates.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Submit Another Request Button */}
            <button
              onClick={onSubmitAnother}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#1f1f1f] font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <RefreshCw className="h-4 w-4" />
              Submit Another Request
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-stone-200 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 dark:text-stone-300 font-bold text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
