"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { CheckCircle2, Download, Loader2, AlertCircle, QrCode } from "lucide-react";
import { toast } from "sonner";

const QR_API = process.env.NEXT_PUBLIC_QR_API || "http://localhost:5007/api";

export default function BulkPassApprovedPage() {
  const params = useParams();
  const [batchId, setBatchId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  // The URL carries an AES-encrypted batch id. Capture it, stash in
  // sessionStorage, then strip it from the address bar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = params?.id;
    if (p) {
      sessionStorage.setItem("bulk_pass_approved_id", p);
      setBatchId(p);
      window.history.replaceState(null, "", "/bulk_pass_approved");
    } else {
      const stored = sessionStorage.getItem("bulk_pass_approved_id");
      if (stored) setBatchId(stored);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!batchId) return;
    let objectUrl = null;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${QR_API}/qr/bulk-pass-view/${batchId}`, {
          responseType: "blob",
        });
        if (!alive) return;
        objectUrl = URL.createObjectURL(res.data);
        setPdfUrl(objectUrl);
      } catch (err) {
        if (!alive) return;
        const status = err?.response?.status;
        if (status === 403) {
          setError("This pass is not yet approved. Please check back once it has been approved.");
        } else if (status === 404) {
          setError("Pass not found. Please verify your link.");
        } else {
          setError("Could not load your pass. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [batchId]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `BulkPass.pdf`;
    a.click();
    toast.success("Download started.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-emerald-50/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl bg-white ring-1 ring-stone-200/70 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.20)] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-black">Bulk Pass Approved</h1>
              <p className="text-sm text-white/90">Your group port-entry QR pass is ready.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-stone-500">Loading your pass…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-stone-700">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-stone-700">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-bold">Your QR Pass</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
              </div>

              {/* PDF preview */}
              <div className="rounded-2xl ring-1 ring-stone-200 overflow-hidden bg-stone-100">
                <iframe
                  src={pdfUrl}
                  title="Bulk Pass QR"
                  className="w-full"
                  style={{ height: "70vh", border: "none" }}
                />
              </div>

              <div className="mt-5 px-5 py-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                <p className="text-xs text-amber-700 leading-relaxed">
                  Show this QR pass at the gate for scanning. The QR is valid only for the approved
                  date range. Keep your pass document confidential.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
