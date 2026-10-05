"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import axios from "axios";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import PaginationBar from "@/components/ui/PaginationBar";

/* ------------------------------------------------------------------
   Configuration and shared styles
------------------------------------------------------------------- */

const SESSION_KEY = "apacs_vendor_material_token";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const API_BASE = (
  process.env.NEXT_PUBLIC_AGENT_API || ""
).replace(/\/+$/, "");

const PAGE_SIZE = 10;

const EMPTY_COUNTS = {
  total: 0,
  pending: 0,
  approved: 0,
  reverted: 0,
  rejected: 0,
};

const FILTERS = [
  { value: "ALL", label: "All requests", countKey: "total" },
  { value: "PENDING", label: "Pending", countKey: "pending" },
  { value: "APPROVED", label: "Approved", countKey: "approved" },
  { value: "REVERTED", label: "Reverted", countKey: "reverted" },
  { value: "REJECTED", label: "Rejected", countKey: "rejected" },
];

const STATUS_STYLES = {
  PENDING: {
    label: "Pending",
    Icon: Clock3,
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  APPROVED: {
    label: "Approved",
    Icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  REVERTED: {
    label: "Reverted",
    Icon: RotateCcw,
    className: "bg-orange-50 text-orange-800 ring-orange-200",
  },
  REJECTED: {
    label: "Rejected",
    Icon: XCircle,
    className: "bg-rose-50 text-rose-800 ring-rose-200",
  },
};

const PERMIT_TYPES = {
  REGULAR: {
    label: "REGULAR",
    className:
      "border-orange-200 bg-orange-50 text-orange-800",
  },
  SURPLUS: {
    label: "SURPLUS",
    className:
      "border-violet-200 bg-violet-50 text-violet-800",
  },
};

const secondaryButtonCls =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "border border-slate-300 bg-white px-4 py-2.5 text-sm " +
  "font-semibold text-slate-700 transition hover:bg-slate-50 " +
  "focus-visible:outline-none focus-visible:ring-4 " +
  "focus-visible:ring-orange-500/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------
   Formatting helpers
------------------------------------------------------------------- */

function readToken() {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);

    return TOKEN_PATTERN.test(token || "")
      ? token
      : null;
  } catch {
    return null;
  }
}

function formatDate(value, includeTime = true) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatQuantity(value) {
  return (
    value === null ||
    value === undefined ||
    value === ""
  )
    ? "—"
    : String(value);
}

function safeCount(value) {
  const count = Number(value);

  return Number.isSafeInteger(count) && count >= 0
    ? count
    : 0;
}

function requestItems(request) {
  return Array.isArray(request?.items)
    ? request.items.filter(
        (item) =>
          item &&
          typeof item === "object"
      )
    : [];
}

function StatusBadge({ status }) {
  const normalized =
    status === "SUBMITTED"
      ? "PENDING"
      : status;

  const style = STATUS_STYLES[normalized] || {
    label: "Unknown",
    Icon: AlertCircle,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  const Icon = style.Icon;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap " +
        "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
        "ring-1 ring-inset " +
        style.className
      }
    >
      <Icon size={13} aria-hidden="true" />
      {style.label}
    </span>
  );
}

function PermitTypeBadge({ type, prominent = false }) {
  const style = PERMIT_TYPES[type] || {
    label: "UNKNOWN",
    className:
      "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap " +
        "rounded-lg border font-extrabold tracking-wide " +
        (prominent
          ? "px-3.5 py-2 text-sm "
          : "px-3 py-1.5 text-xs ") +
        style.className
      }
    >
      <ShieldCheck
        size={prominent ? 16 : 14}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {children ?? "—"}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------
   Material details tables
------------------------------------------------------------------- */

function MaterialItemsTable({ title, items, approved }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-50/70 to-white px-4 py-3.5 sm:px-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#0a1e4d]">
          <Package
            size={16}
            className="text-orange-600"
            aria-hidden="true"
          />
          {title}
        </h3>

        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <caption className="sr-only">
            {title}
          </caption>

          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium text-slate-500">
            <tr>
              {[
                "S.No.",
                "Item name",
                "Qty",
                "Unit",
                "Description",
                "Approved qty",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No {title.toLowerCase()} in this request.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={String(item.id ?? index)}
                  className="align-top transition hover:bg-orange-50/25"
                >
                  <td className="w-16 px-4 py-4 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="min-w-[170px] px-4 py-4">
                    <p className="max-w-56 break-words font-semibold text-slate-900">
                      {item.name || "—"}
                    </p>

                    {item.isHazardous && (
                      <span className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        Hazardous
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {item.quantityMode === "UNSPECIFIED"
                      ? "Unspecified"
                      : formatQuantity(item.requestedQty)}
                  </td>

                  <td className="px-4 py-4">
                    {item.unitName || "—"}
                  </td>

                  <td className="px-4 py-4">
                    <p className="max-w-64 whitespace-pre-wrap break-words leading-5 text-slate-500">
                      {item.description || "—"}
                    </p>
                  </td>

                  <td className="px-4 py-4 font-semibold text-emerald-800">
                    {approved &&
                    item.quantityMode !== "UNSPECIFIED"
                      ? formatQuantity(item.approvedQty)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Accessible request details dialog
------------------------------------------------------------------- */

function RequestDetailsModal({ request, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const items = requestItems(request);

  const returnableItems = items.filter(
    (item) => item.materialType === "RETURNABLE"
  );

  const nonReturnableItems = items.filter(
    (item) => item.materialType === "NON_RETURNABLE"
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    if (dialog && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }

      document.body.style.overflow = previousOverflow;

      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const showMovementDetails =
    Boolean(request.vehicleNumber) ||
    Boolean(request.personName) ||
    Boolean(request.aadhaarMasked);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="vendor-request-dialog-title"
      aria-describedby="vendor-request-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="shrink-0 bg-[#0a1e4d] px-5 py-5 text-white sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-300">
                APACS · Material Movement
              </p>

              <h2
                id="vendor-request-dialog-title"
                className="mt-1.5 break-all text-lg font-bold sm:text-xl"
              >
                {request.referenceNumber}
              </h2>

              <p
                id="vendor-request-dialog-description"
                className="mt-2 text-xs leading-5 text-slate-300"
              >
                Submitted {formatDate(request.submittedAt)} IST
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close request details"
              className="shrink-0 rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/40"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain bg-slate-50/60 p-5 sm:p-7">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Material permit type
                </p>

                <PermitTypeBadge
                  type={request.requestType}
                  prominent
                />
              </div>

              <StatusBadge status={request.status} />
            </div>

            <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Submitted on">
                {formatDate(request.submittedAt)}
              </Detail>

              {request.status === "APPROVED" && (
                <Detail label="Approved on">
                  {formatDate(request.approvedAt)}
                </Detail>
              )}

              {request.status === "REJECTED" && (
                <Detail label="Rejected on">
                  {formatDate(request.rejectedAt)}
                </Detail>
              )}

              <Detail label="Materials included">
                {items.length}
              </Detail>
            </dl>

            {showMovementDetails && (
              <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                {request.vehicleNumber && (
                  <Detail label="Vehicle number">
                    {request.vehicleNumber}
                  </Detail>
                )}

                {request.personName && (
                  <Detail label="Person name">
                    {request.personName}
                  </Detail>
                )}

                {request.aadhaarMasked && (
                  <Detail label="Aadhaar number">
                    {request.aadhaarMasked}
                  </Detail>
                )}
              </dl>
            )}
          </section>

          {request.vendorRemarks && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-semibold text-[#0a1e4d]">
                Your remarks
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                {request.vendorRemarks}
              </p>
            </section>
          )}

          <MaterialItemsTable
            title="Returnable materials"
            items={returnableItems}
            approved={request.status === "APPROVED"}
          />

          <MaterialItemsTable
            title="Non-returnable materials"
            items={nonReturnableItems}
            approved={request.status === "APPROVED"}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <p className="text-[11px] text-slate-400">
            All displayed times are in IST.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#0a1e4d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12316e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------
   Submitted requests page
------------------------------------------------------------------- */

export default function VendorSubmittedRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState(EMPTY_COUNTS);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: PAGE_SIZE,
  });

  const [state, setState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const token = readToken();

    if (!token) {
      router.replace("/");
      return;
    }

    if (!API_BASE) {
      setState("error");
      setErrorMessage(
        "The application service is not configured."
      );
      return;
    }

    const controller = new AbortController();

    async function loadRequests() {
      setState("loading");
      setErrorMessage("");

      try {
        const response = await axios.get(
          `${API_BASE}/vendor-material-pass/public/vendor-links/${encodeURIComponent(token)}/requests`,
          {
            params: {
              page,
              limit: PAGE_SIZE,
              search: search || undefined,
              status:
                statusFilter === "ALL"
                  ? undefined
                  : statusFilter,
            },
            signal: controller.signal,
            withCredentials: false,
            timeout: 20000,
          }
        );

        if (controller.signal.aborted) {
          return;
        }

        const data = response.data;

        if (
          !data?.success ||
          !Array.isArray(data.data)
        ) {
          throw new Error(
            "The server returned an invalid response."
          );
        }

        const meta = data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalRecords: data.data.length,
          pageSize: PAGE_SIZE,
        };

        const lastPage = Math.max(
          1,
          safeCount(meta.totalPages)
        );

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        const nextCounts = {};

        for (const key of Object.keys(EMPTY_COUNTS)) {
          nextCounts[key] = safeCount(data.counts?.[key]);
        }

        setRequests(
          data.data.filter(
            (request) =>
              request &&
              typeof request === "object"
          )
        );

        setCounts(nextCounts);
        setPagination(meta);
        setState("ready");
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        setRequests([]);
        setCounts(EMPTY_COUNTS);

        setErrorMessage(
          error.response?.status === 410
            ? "This application link is no longer available. Contact the department for access."
            : "Could not load submitted requests. Please try again."
        );

        setState(
          error.response?.status === 410
            ? "unavailable"
            : "error"
        );
      }
    }

    loadRequests();

    return () => controller.abort();
  }, [page, refreshKey, router, search, statusFilter]);

  const closeDetails = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  function changeStatus(nextStatus) {
    setStatusFilter(nextStatus);
    setPage(1);
  }

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  function openRow(event, request) {
    /*
     * Allow users to select/copy table text without
     * unexpectedly opening the details dialog.
     */
    if (
      window.getSelection()?.toString().trim()
    ) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, select, textarea")
    ) {
      return;
    }

    setSelectedRequest(request);
  }

  const loading = state === "loading";
  const hasSearch = Boolean(search);
  const hasFilter = statusFilter !== "ALL";

  return (
    <div className="min-h-screen min-w-0 bg-slate-50 px-4 py-7 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-[#0a1e4d] text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"
          />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                  <ShieldCheck
                    size={25}
                    className="text-orange-300"
                    aria-hidden="true"
                  />
                </span>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300">
                    APACS · Material Movement
                  </p>

                  <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                    Submitted requests
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                    Track your material pass requests and view the
                    materials included in each submission.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/vendor-material-pass")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white bg-white px-4 py-2.5 text-sm font-semibold text-[#0a1e4d] shadow-sm transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/30"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to application
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-2 border-t border-white/15 bg-white/5 px-6 py-3 text-xs text-slate-200 sm:px-8">
            <FileText
              size={15}
              className="text-emerald-300"
              aria-hidden="true"
            />
            Select a request to view its full details.
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-[#0a1e4d]">
                  <FileText
                    size={19}
                    className="text-orange-600"
                    aria-hidden="true"
                  />
                  Your requests
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Search by request reference or material name.
                </p>
              </div>

              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className={secondaryButtonCls}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>

            <div className="relative max-w-lg">
              <label
                htmlFor="submitted-request-search"
                className="sr-only"
              >
                Search by request reference or material name
              </label>

              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                id="submitted-request-search"
                type="search"
                maxLength={100}
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Search reference or material name"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <div
              className="flex flex-wrap gap-2"
              aria-label="Filter requests by status"
            >
              {FILTERS.map((filter) => {
                const active = statusFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeStatus(filter.value)}
                    className={
                      "inline-flex items-center gap-2 rounded-xl " +
                      "border px-3.5 py-2 text-xs font-semibold " +
                      "transition focus-visible:outline-none " +
                      "focus-visible:ring-4 focus-visible:ring-orange-500/15 " +
                      (active
                        ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50")
                    }
                  >
                    {filter.label}

                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] " +
                        (active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {counts[filter.countKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="max-w-full overflow-x-auto"
            aria-busy={loading}
          >
            <table className="w-full min-w-[820px] text-left">
              <caption className="sr-only">
                Submitted vendor material requests.
                Select a request reference to view its details.
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-medium text-slate-500">
                <tr>
                  {[
                    "S.No.",
                    "Request reference",
                    "Material permit type",
                    "Submitted on",
                    "Materials",
                    "Status",
                    "",
                  ].map((heading, index) => (
                    <th
                      key={heading || index}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3.5"
                    >
                      {heading || (
                        <span className="sr-only">
                          View details
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <span
                        role="status"
                        className="inline-flex items-center gap-2 text-slate-500"
                      >
                        <Loader2
                          size={18}
                          className="animate-spin text-orange-600"
                          aria-hidden="true"
                        />
                        Loading requests…
                      </span>
                    </td>
                  </tr>
                ) : state === "error" || state === "unavailable" ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <div
                        role="alert"
                        className="flex flex-col items-center gap-3 text-center"
                      >
                        <AlertCircle
                          size={27}
                          className="text-orange-600"
                          aria-hidden="true"
                        />

                        <p className="max-w-md text-sm leading-6 text-slate-600">
                          {errorMessage}
                        </p>

                        {state === "error" && (
                          <button
                            type="button"
                            onClick={refresh}
                            className={secondaryButtonCls}
                          >
                            <RefreshCw size={15} aria-hidden="true" />
                            Try again
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-14 text-center"
                    >
                      <FileText
                        size={28}
                        className="mx-auto text-slate-300"
                        aria-hidden="true"
                      />

                      <h3 className="mt-3 text-sm font-semibold text-[#0a1e4d]">
                        {hasSearch || hasFilter
                          ? "No matching requests"
                          : "No requests submitted yet"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {hasSearch || hasFilter
                          ? "Try another reference, material name or status."
                          : "Requests submitted through this link will appear here."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  requests.map((request, index) => {
                    const items = requestItems(request);

                    const rowNumber =
                      (
                        (pagination.currentPage || page) - 1
                      ) *
                        (pagination.pageSize || PAGE_SIZE) +
                      index +
                      1;

                    return (
                      <tr
                        key={String(request.id)}
                        onClick={(event) =>
                          openRow(event, request)
                        }
                        className="group cursor-pointer align-middle transition-colors hover:bg-orange-50/50 focus-within:bg-orange-50/50"
                      >
                        <td className="px-4 py-5 text-slate-400">
                          {rowNumber}
                        </td>

                        <td className="px-4 py-5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRequest(request)
                            }
                            aria-label={`View request ${request.referenceNumber}`}
                            className="rounded-md text-left font-bold text-[#0a1e4d] transition group-hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/20"
                          >
                            {request.referenceNumber}
                          </button>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Click to view details
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          <PermitTypeBadge
                            type={request.requestType}
                          />
                        </td>

                        <td className="whitespace-nowrap px-4 py-5">
                          <p className="font-medium text-slate-700">
                            {formatDate(request.submittedAt, false)}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {formatTime(request.submittedAt)} IST
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            <Package size={13} aria-hidden="true" />
                            {items.length}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <StatusBadge status={request.status} />
                        </td>

                        <td className="px-4 py-5 text-right">
                          <span
                            aria-hidden="true"
                            className="inline-flex rounded-lg bg-slate-50 p-2 text-slate-400 transition group-hover:bg-orange-100 group-hover:text-orange-700 group-focus-within:bg-orange-100 group-focus-within:text-orange-700"
                          >
                            <ArrowUpRight size={17} />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {state === "ready" &&
            pagination.totalRecords > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                <PaginationBar
                  currentPage={pagination.currentPage || page}
                  totalPages={pagination.totalPages || 1}
                  totalRecords={pagination.totalRecords || 0}
                  pageSize={pagination.pageSize || PAGE_SIZE}
                  onPageChange={setPage}
                  loading={false}
                />
              </div>
            )}
        </section>
      </div>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}