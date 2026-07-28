"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Car,
  Clock3,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadVvipQrPdf,
  getVvipPass,
  listVvipPasses,
  viewVvipQrPdf,
} from "@/lib/vvipPassApi";

const AGENT_FILE_BASE = (
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

const fileUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${AGENT_FILE_BASE}/${String(path).replace(/^\/+/, "")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = {
  UNDER_REVIEW: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Reverted",
};

const statusChip = {
  UNDER_REVIEW:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300",
  RETURNED:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
};

export default function HodVvipPassRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [activeStatus, setActiveStatus] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const reloadRequestTracking = async () => {
    try {
      setTrackingLoading(true);
      setTrackingError("");
      const data = await listVvipPasses();
      setRequests(data);
    } catch (error) {
      setTrackingError(
        error?.response?.data?.message || "Failed to load VVIP pass requests.",
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      try {
        setTrackingLoading(true);
        setTrackingError("");
        const data = await listVvipPasses();
        if (!cancelled) setRequests(data);
      } catch (error) {
        if (!cancelled) {
          setTrackingError(
            error?.response?.data?.message || "Failed to load VVIP pass requests.",
          );
        }
      } finally {
        if (!cancelled) setTrackingLoading(false);
      }
    };

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        label: "All Requests",
        value: requests.length,
        status: "",
        icon: FileText,
        tone: "text-orange-500 bg-orange-100 dark:bg-orange-400/10 dark:text-orange-300",
      },
      {
        label: "Submitted",
        value: requests.filter((request) => request.status === "UNDER_REVIEW").length,
        status: "UNDER_REVIEW",
        icon: Clock3,
        tone: "text-amber-500 bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300",
      },
      {
        label: "Approved",
        value: requests.filter((request) => request.status === "APPROVED").length,
        status: "APPROVED",
        icon: ShieldCheck,
        tone: "text-emerald-500 bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300",
      },
      {
        label: "Reverted",
        value: requests.filter((request) => request.status === "RETURNED").length,
        status: "RETURNED",
        icon: RotateCcw,
        tone: "text-sky-500 bg-sky-100 dark:bg-sky-400/10 dark:text-sky-300",
      },
      {
        label: "Rejected",
        value: requests.filter((request) => request.status === "REJECTED").length,
        status: "REJECTED",
        icon: XCircle,
        tone: "text-red-500 bg-red-100 dark:bg-red-400/10 dark:text-red-300",
      },
    ],
    [requests],
  );

  const filteredRequests = useMemo(() => {
    if (!activeStatus) return requests;
    return requests.filter((request) => request.status === activeStatus);
  }, [activeStatus, requests]);

  const showReasonColumn = ["REJECTED", "RETURNED"].includes(activeStatus);

  const openRequestDetail = async (id) => {
    try {
      setDetailLoading(true);
      setTrackingError("");
      const detail = await getVvipPass(id);
      setSelectedRequest(detail);
    } catch (error) {
      setTrackingError(error?.response?.data?.message || "Failed to open VVIP request.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadQr = async (request) => {
    try {
      setTrackingError("");
      await downloadVvipQrPdf(request.id, request.referenceNo);
    } catch (error) {
      setTrackingError(
        error?.response?.data?.message || "Failed to download VVIP QR PDF.",
      );
    }
  };

  const handleViewQr = async (request) => {
    try {
      setTrackingError("");
      await viewVvipQrPdf(request.id);
    } catch (error) {
      setTrackingError(
        error?.response?.data?.message || "Failed to view VVIP QR PDF.",
      );
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 dark:text-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mt-1 text-3xl font-bold text-[#0a1e4d] dark:text-white">
            VVIP Pass Requests
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-stone-400">
            Track submitted, approved, reverted and rejected VVIP passes.
          </p>
        </div>
        <Link
          href="/hod/vvip-pass"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Create VVIP Pass
        </Link>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#0a1e4d] dark:text-white">
            <FileText className="h-5 w-5 text-orange-500" />
            Request Status
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={reloadRequestTracking}
            className="h-auto rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider"
          >
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            const isActive = activeStatus === card.status;

            return (
              <button
                key={card.label}
                type="button"
                onClick={() => setActiveStatus(card.status)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950 ${
                  isActive
                    ? "border-orange-300 bg-orange-50 ring-4 ring-orange-100 dark:border-orange-400/50 dark:bg-orange-400/10 dark:ring-orange-400/10"
                    : "border-slate-200 bg-white dark:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900 dark:text-stone-100">
                      {card.value}
                    </p>
                  </div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {trackingError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
            {trackingError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          {trackingLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading VVIP requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-400">
              No {activeStatus ? statusLabel[activeStatus].toLowerCase() : "VVIP"} requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0a1e4d] text-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Visit Date
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Persons
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Vehicles
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Status
                    </th>
                    {showReasonColumn && (
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                        Reason
                      </th>
                    )}
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredRequests.slice(0, 10).map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-orange-50/50 dark:hover:bg-orange-400/10"
                    >
                      <td className="px-4 py-3 text-sm font-black text-[#0a1e4d] dark:text-stone-100">
                        {request.referenceNo}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-stone-300">
                        {formatDate(request.visitDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-stone-300">
                        {request.personsCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-stone-300">
                        {request.vehiclesCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusChip[request.status] || statusChip.RETURNED}`}>
                          {statusLabel[request.status] || request.status}
                        </span>
                      </td>
                      {showReasonColumn && (
                        <td className="max-w-[240px] px-4 py-3 text-sm font-semibold text-slate-600 dark:text-stone-300">
                          {request.rejectedReason || "-"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => openRequestDetail(request.id)}
                            className="h-auto gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          {request.status === "APPROVED" && (
                            <>
                              <Button
                                type="button"
                                onClick={() => handleViewQr(request)}
                                className="h-auto gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0a1e4d] ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-stone-100 dark:ring-white/10 dark:hover:bg-white/10"
                              >
                                <Eye className="h-4 w-4" />
                                View QR
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDownloadQr(request)}
                                className="h-auto gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </>
                          )}
                          {request.status === "RETURNED" && (
                            <Link
                              href={`/hod/vvip-pass?id=${request.id}`}
                              className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                            >
                              Edit / Resubmit
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between bg-[#0a1e4d] px-6 py-4 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-orange-300">
                  {selectedRequest.referenceNo}
                </p>
                <h2 className="text-xl font-black">VVIP Pass Request</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl p-2 text-white transition hover:bg-white/10"
                aria-label="Close request details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-72px)] space-y-5 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
              {detailLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <RequestInfoCard
                      icon={BadgeCheck}
                      label="Status"
                      value={statusLabel[selectedRequest.status] || selectedRequest.status}
                    />
                    <RequestInfoCard
                      icon={FileText}
                      label="Department"
                      value={selectedRequest.departmentName}
                    />
                    <RequestInfoCard icon={CalendarDays} label="Validity">
                      <div className="mt-1 space-y-1 text-xs font-bold text-[#0a1e4d] dark:text-stone-100">
                        <p>
                          <span className="mr-1 text-slate-400 dark:text-stone-500">From:</span>
                          {formatDate(selectedRequest.validityFrom)}
                        </p>
                        <p>
                          <span className="mr-4 text-slate-400 dark:text-stone-500">To:</span>
                          {formatDate(selectedRequest.validityTo)}
                        </p>
                      </div>
                    </RequestInfoCard>
                    <RequestInfoCard
                      icon={Users}
                      label="No. of Passes"
                      value={selectedRequest.noOfPasses}
                    />
                  </div>

                  {["REJECTED", "RETURNED"].includes(selectedRequest.status) && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-400/20 dark:bg-red-400/10">
                      <h3 className="mb-2 text-sm font-black uppercase tracking-widest text-red-700 dark:text-red-300">
                        {selectedRequest.status === "RETURNED"
                          ? "Revert Reason"
                          : "Rejection Reason"}
                      </h3>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                        {selectedRequest.rejectedReason || "-"}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-[#0a1e4d] dark:text-stone-100">
                      Purpose / Remarks
                    </h3>
                    <p className="text-sm font-semibold text-slate-600 dark:text-stone-300">
                      {selectedRequest.visitPurpose || selectedRequest.remarks || "-"}
                    </p>
                    {selectedRequest.remarks && selectedRequest.visitPurpose && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-stone-400">
                        {selectedRequest.remarks}
                      </p>
                    )}
                  </div>

                  <RequestDetailTable
                    title="VVIP Persons"
                    icon={Users}
                    rows={selectedRequest.persons || []}
                    columns={[
                      ["name", "Name"],
                      ["designation", "Designation"],
                      ["mobile", "Mobile"],
                      ["idProofType", "ID Type"],
                      ["idProofNo", "ID Number"],
                    ]}
                  />

                  <RequestDetailTable
                    title="Vehicles"
                    icon={Car}
                    rows={selectedRequest.vehicles || []}
                    columns={[
                      ["vehicleNo", "Vehicle No."],
                      ["vehicleType", "Vehicle Type"],
                      ["driverName", "Driver"],
                      ["driverMobile", "Driver Mobile"],
                      ["rcBookPath", "RC Book", "file"],
                      ["insuranceDocumentPath", "Insurance", "file"],
                    ]}
                  />
                </>
              )}
            </div>

            {selectedRequest.status === "APPROVED" && (
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-slate-950">
                <Button
                  type="button"
                  onClick={() => handleViewQr(selectedRequest)}
                  className="h-auto gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0a1e4d] ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-stone-100 dark:ring-white/10 dark:hover:bg-white/10"
                >
                  <Eye className="h-4 w-4" />
                  View QR
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadQr(selectedRequest)}
                  className="h-auto gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Download QR PDF
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestInfoCard({ icon: Icon, label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-stone-500">
            {label}
          </p>
          {children || (
            <p className="truncate text-sm font-extrabold text-[#0a1e4d] dark:text-stone-100">
              {value || "-"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestDetailTable({ title, icon: Icon, rows, columns }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/10">
        <Icon className="h-5 w-5 text-orange-500" />
        <h3 className="text-sm font-black uppercase tracking-widest text-[#0a1e4d] dark:text-stone-100">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#0a1e4d] text-white">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-widest">
                SNo.
              </th>
              {columns.map(([, label]) => (
                <th
                  key={label}
                  className="px-4 py-3 text-xs font-black uppercase tracking-widest"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-8 text-center text-sm font-semibold text-slate-400 dark:text-stone-500"
                >
                  No records added.
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.id || index}>
                <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-stone-400">
                  {String(index + 1).padStart(2, "0")}
                </td>
                {columns.map(([key, , type]) => (
                  <td
                    key={key}
                    className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-stone-300"
                  >
                    {type === "file" && row[key] ? (
                      <a
                        href={fileUrl(row[key])}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 hover:bg-orange-100 dark:bg-orange-400/10 dark:text-orange-300"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </a>
                    ) : (
                      row[key] || "-"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
