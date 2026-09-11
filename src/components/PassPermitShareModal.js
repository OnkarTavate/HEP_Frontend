"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Share2, X, XCircle } from "lucide-react";
import axios from "axios";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

/**
 * PassPermitShareModal
 *
 * Shown after Complete Review brings a pass to COMPLETED. The backend shares
 * the Port Entry Permit with iPortman automatically as part of that request;
 * this reports how it went and lets the approver share it again if it failed.
 *
 * Mount it only while there is a result to show — each mount starts from
 * `initialResult`, so no state carries over between passes.
 *
 * Props:
 *   onClose        – () => void
 *   passRequestId  – number   – the completed pass
 *   referenceNo    – string   – shown to the approver
 *   initialResult  – { pushed: boolean, message: string } – from the Complete response
 */
export default function PassPermitShareModal({
  onClose,
  passRequestId,
  referenceNo,
  initialResult,
}) {
  const [result, setResult] = useState(initialResult);
  const [sharing, setSharing] = useState(false);

  const shareAgain = async () => {
    setSharing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${AGENT_API}/pass-request/share-pass-permit`,
        { passRequestId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setResult({ pushed: res.data?.pushed === true, message: res.data?.message });
    } catch (err) {
      setResult({
        pushed: false,
        message: err?.response?.data?.message || "Could not share the pass permit.",
      });
    } finally {
      setSharing(false);
    }
  };

  const pushed = result?.pushed === true;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#0a1e4d]" />
            <h3 className="text-base font-bold text-[#0a1e4d]">Share Pass Permit</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sharing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Pass{" "}
            <span className="font-semibold text-slate-800">{referenceNo || `#${passRequestId}`}</span>{" "}
            is completed. Its Port Entry Permit is shared with iPortman.
          </p>

          {sharing ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sharing pass permit…
            </div>
          ) : pushed ? (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Pass permit shared with iPortman.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pass permit was not shared.
                {result?.message ? <span className="block font-normal">{result.message}</span> : null}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sharing}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
          {!pushed && (
            <button
              type="button"
              onClick={shareAgain}
              disabled={sharing}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#0a1e4d] bg-[#0a1e4d] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0a1e4d]/90 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Share Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
