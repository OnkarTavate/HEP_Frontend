"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  approveVvipPass,
  getVvipPass,
  listVvipPassQueue,
  rejectVvipPass,
  returnVvipPass,
} from "@/lib/vvipPassApi";

const statusStyle = {
  UNDER_REVIEW:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300",
  RETURNED:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300",
};

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
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatVisitDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const InfoCard = ({ icon: Icon, label, value, children }) => (
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

export default function TrafficVvipPassPage() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reasonModal, setReasonModal] = useState(null);
  const [reasonText, setReasonText] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const data = await listVvipPassQueue(status ? { status } : {});
      setRequests(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load VVIP requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listVvipPassQueue(status ? { status } : {});
        if (!cancelled) setRequests(data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Failed to load VVIP requests.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((item) =>
      [
        item.referenceNo,
        item.departmentName,
        item.visitPurpose,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [requests, search]);

  const openDetail = async (id) => {
    try {
      setDetailLoading(true);
      const detail = await getVvipPass(id);
      setSelectedRequest(detail);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open VVIP request.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      await approveVvipPass(selectedRequest.id);
      setSelectedRequest(null);
      await loadRequests();
      setSuccessMessage("VVIP pass approved successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve VVIP request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setReasonText("");
    setReasonModal("reject");
  };

  const handleReturn = async () => {
    if (!selectedRequest) return;
    setReasonText("");
    setReasonModal("return");
  };

  const submitReasonAction = async () => {
    if (!selectedRequest || !reasonModal) return;
    const reason = reasonText.trim();

    if (!reason) {
      setError(
        reasonModal === "reject"
          ? "Please enter rejection reason."
          : "Please enter revert reason.",
      );
      return;
    }

    try {
      setActionLoading(true);
      if (reasonModal === "reject") {
        await rejectVvipPass(selectedRequest.id, reason);
        setSuccessMessage("VVIP pass rejected successfully.");
      } else {
        await returnVvipPass(selectedRequest.id, reason);
        setSuccessMessage("VVIP pass reverted to HOD successfully.");
      }
      setReasonModal(null);
      setReasonText("");
      setSelectedRequest(null);
      await loadRequests();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${reasonModal === "reject" ? "reject" : "revert"} VVIP request.`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Traffic Approval
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#0a1e4d] dark:text-stone-100">
            VVIP Pass Requests
          </h1>
        </div>
        <Button
          type="button"
          onClick={loadRequests}
          className="h-auto gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 dark:border-white/10 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-stone-100 dark:focus:ring-orange-400/10"
              placeholder="Search reference, department, purpose"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-950 dark:text-stone-100 dark:focus:ring-orange-400/10"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="UNDER_REVIEW">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RETURNED">Reverted</option>
            <option value="">All</option>
          </select>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0a1e4d] text-white">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Reference
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Department
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Visit Date
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Persons
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Vehicles
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-widest">
                  Status
                </th>
                <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading && (
                <tr>
                  <td colSpan="7" className="p-10 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                  </td>
                </tr>
              )}
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="p-10 text-center text-sm font-semibold text-slate-400 dark:text-stone-500"
                  >
                    No VVIP pass requests found.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredRequests.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-orange-50/50 dark:hover:bg-orange-400/10"
                  >
                    <td className="px-5 py-4 text-sm font-black text-[#0a1e4d] dark:text-stone-100">
                      {item.referenceNo}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-stone-300">
                      {item.departmentName || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-stone-300">
                      {formatVisitDate(item.visitDate)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-stone-300">
                      {item.personsCount ?? 0}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-stone-300">
                      {item.vehiclesCount ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyle[item.status] || statusStyle.RETURNED}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          className="h-auto gap-2 rounded-xl bg-[#0a1e4d] px-4 py-2 text-xs font-bold text-white hover:bg-[#14306f]"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedRequest(null)}
                className="text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>

            <div className="max-h-[calc(92vh-145px)] space-y-5 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
              {detailLoading ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <InfoCard
                      icon={BadgeCheck}
                      label="Status"
                      value={selectedRequest.status}
                    />
                    <InfoCard
                      icon={FileText}
                      label="Department"
                      value={selectedRequest.departmentName}
                    />
                    <InfoCard
                      icon={CalendarDays}
                      label="Validity"
                    >
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
                    </InfoCard>
                    <InfoCard
                      icon={UserRound}
                      label="No. of Passes"
                      value={selectedRequest.noOfPasses}
                    />
                  </div>

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

                  <DetailTable
                    title="VVIP Persons"
                    icon={UserRound}
                    rows={selectedRequest.persons || []}
                    columns={[
                      ["name", "Name"],
                      ["designation", "Designation"],
                      ["mobile", "Mobile"],
                      ["idProofType", "ID Type"],
                      ["idProofNo", "ID Number"],
                    ]}
                  />

                  <DetailTable
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

            {selectedRequest.status === "UNDER_REVIEW" && (
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReturn}
                  className="h-auto gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert
                </Button>
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="h-auto gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="h-auto gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {reasonModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between bg-[#0a1e4d] px-6 py-4 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-orange-300">
                  {selectedRequest?.referenceNo}
                </p>
                <h2 className="text-xl font-black">
                  {reasonModal === "reject" ? "Reject VVIP Pass" : "Revert to HOD"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="rounded-full p-2 text-white hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-stone-300">
                {reasonModal === "reject" ? "Rejection Reason" : "Revert Reason for HOD"}
              </label>
              <textarea
                value={reasonText}
                onChange={(event) => setReasonText(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-stone-100 dark:focus:ring-orange-400/10"
                placeholder={
                  reasonModal === "reject"
                    ? "Enter why this request is rejected"
                    : "Enter what HOD needs to correct"
                }
              />
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setReasonModal(null)}
                  className="h-auto rounded-xl px-5 py-3 text-sm font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={submitReasonAction}
                  className={`h-auto gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60 ${
                    reasonModal === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  }`}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {reasonModal === "reject" ? "Reject" : "Revert"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailTable({ title, icon: Icon, rows, columns }) {
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
