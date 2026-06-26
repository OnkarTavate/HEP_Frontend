"use client";

/**
 * Admin · All Passes
 * ──────────────────────────────────────────────────────────────────────
 * A read-only master directory of every pass request in the system
 * (all departments, all statuses). Backed by the same
 * `get-agent-pass-requests` endpoint used by the approval queues — for an
 * Admin role the backend returns records across all departments.
 *
 * Capabilities:
 *   • Stat cards (total / pending / processed)
 *   • Status filter (All / Pending / Processed) + debounced search
 *   • Server-side pagination
 *   • Read-only details drawer (company profile + persons + vehicles)
 */

import React, { useState, useEffect, useCallback } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import axios from "axios";
import { toast } from "sonner";
import {
  Search,
  FileText,
  Users,
  Truck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Eye,
  RefreshCw,
  Filter,
  Loader2,
  Phone,
  Mail,
  CreditCard,
} from "lucide-react";

const AGENT_API =
  process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_CLASS = {
  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  processed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  reverted:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
};

const EntityStatusBadge = ({ status }) => {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const key = String(status).toLowerCase();
  const cls =
    STATUS_CLASS[key] ||
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {String(status).toUpperCase()}
    </span>
  );
};

const InfoChip = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
      {label ? `${label}: ` : ""}
      {value || "N/A"}
    </span>
  </div>
);

export default function AdminAllPassesPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search + filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | processed
  const [sortBy, setSortBy] = useState("DATE_DESC");

  // Pagination
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [globalCounts, setGlobalCounts] = useState({
    total: 0,
    pending: 0,
    processed: 0,
  });

  // Details drawer
  const [selected, setSelected] = useState(null);

  // Debounce search → reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPasses = useCallback(
    async (isPoll = false) => {
      try {
        if (!isPoll) setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(
          `${AGENT_API}/pass-request/get-agent-pass-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: currentPage,
              limit: pageSize,
              search: debouncedSearch || undefined,
              // "all" sends no status so the API returns every record
              status: statusFilter === "all" ? undefined : statusFilter,
              sortOrder:
                sortBy === "DATE_ASC"
                  ? "ASC"
                  : sortBy === "EXPIRY_SOON"
                    ? "EXPIRY_SOON"
                    : "DESC",
            },
          },
        );

        if (response.data && response.data.success) {
          const newRequests = response.data.data || [];
          const newMeta = response.data.pagination || {};
          const newCounts =
            response.data.counts || { total: 0, pending: 0, processed: 0 };

          setRequests((prev) =>
            JSON.stringify(newRequests) === JSON.stringify(prev)
              ? prev
              : newRequests,
          );
          setPaginationMeta((prev) =>
            JSON.stringify(newMeta) === JSON.stringify(prev) ? prev : newMeta,
          );
          setGlobalCounts((prev) =>
            JSON.stringify(newCounts) === JSON.stringify(prev)
              ? prev
              : newCounts,
          );
        } else {
          setRequests((prev) => (prev.length === 0 ? prev : []));
        }
      } catch (error) {
        console.error("Failed to fetch passes", error);
        if (!isPoll) toast.error("Failed to load passes.");
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, statusFilter, sortBy],
  );

  useEffect(() => {
    fetchPasses(false);
    const interval = setInterval(() => fetchPasses(true), 8000);
    return () => clearInterval(interval);
  }, [fetchPasses]);

  const totalForActiveFilter =
    statusFilter === "pending"
      ? globalCounts.pending
      : statusFilter === "processed"
        ? globalCounts.processed
        : globalCounts.total;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans relative">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        <button
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className="text-left bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-slate-200/60 dark:ring-white/5 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Passes
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-stone-100 tabular-nums">
            {globalCounts.total}
          </p>
        </button>

        <button
          onClick={() => {
            setStatusFilter("pending");
            setCurrentPage(1);
          }}
          className="text-left bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-amber-200/60 dark:ring-amber-500/10 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              Pending
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
            {globalCounts.pending}
          </p>
        </button>

        <button
          onClick={() => {
            setStatusFilter("processed");
            setCurrentPage(1);
          }}
          className="text-left col-span-2 sm:col-span-1 bg-white dark:bg-[#1e293b] rounded-2xl p-4 sm:p-5 ring-1 ring-emerald-200/60 dark:ring-emerald-500/10 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Processed
            </span>
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums">
            {globalCounts.processed}
          </p>
        </button>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-stone-100 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" strokeWidth={2.5} />
            All Passes
          </h2>
          <p className="text-sm text-slate-500 dark:text-stone-400 mt-0.5">
            Master directory of every pass request across all departments
          </p>
        </div>
        <button
          onClick={() => {
            setCurrentPage(1);
            fetchPasses();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 text-sm font-bold shadow hover:opacity-90 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl ring-1 ring-slate-200/60 dark:ring-white/5 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "processed", label: "Processed" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setStatusFilter(opt.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === opt.id
                    ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 shadow"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search ref, company, name, reg no..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-400"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  title="Clear search"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-700/40">
                {["Ref No", "Company Details", "Entities", "Applied On", "Approved By", "Status", "View"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                        h === "Status" || h === "View" ? "text-center" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading passes...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No passes found.</p>
                  </td>
                </tr>
              ) : (
                requests.map((pass) => {
                  const statusKey = (pass.status || "").toLowerCase();
                  const statusClass =
                    STATUS_CLASS[statusKey] ||
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
                  return (
                    <tr
                      key={pass.originType === "VENDOR" ? `vpr-${pass.id}` : pass.id}
                      onClick={() => setSelected(pass)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-[#0a1e4d] dark:text-stone-200 font-mono">
                        {pass.referenceNo || `REQ-${pass.id}`}
                        {pass.originType === "VENDOR" && (
                          <span className="ml-2 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                            VENDOR
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                            {(pass.entityName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-stone-100">
                              {pass.entityName || "—"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {pass.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-200 dark:border-blue-500/20">
                          {pass.persons?.length || 0} Persons | {pass.vehicles?.length || 0} Vehicles
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtDate(pass.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {pass.approvedBy || "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusClass}`}>
                          {(pass.status || "PENDING").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors">
                          <Eye className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card list (mobile) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/30">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
              <p className="text-sm font-medium">Loading passes...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Search className="h-10 w-10 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-medium">No passes found.</p>
            </div>
          ) : (
            requests.map((pass) => {
              const statusKey = (pass.status || "").toLowerCase();
              const statusClass =
                STATUS_CLASS[statusKey] ||
                "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
              return (
                <button
                  key={pass.originType === "VENDOR" ? `vpr-${pass.id}` : pass.id}
                  onClick={() => setSelected(pass)}
                  className="w-full text-left p-4 active:bg-slate-50 dark:active:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0">
                        {(pass.entityName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-stone-100 truncate">
                          {pass.entityName || "—"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {pass.email || "—"}
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusClass}`}>
                      {(pass.status || "PENDING").toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <span className="font-mono font-bold text-[#0a1e4d] dark:text-stone-200">
                      {pass.referenceNo || `REQ-${pass.id}`}
                    </span>
                    {pass.originType === "VENDOR" && (
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                        VENDOR
                      </span>
                    )}
                    <span className="text-blue-700 dark:text-blue-300 font-semibold">
                      {pass.persons?.length || 0}P · {pass.vehicles?.length || 0}V
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {fmtDate(pass.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 pb-4 pt-2">
          <PaginationBar
            currentPage={paginationMeta.currentPage || currentPage}
            totalPages={paginationMeta.totalPages || 1}
            totalRecords={paginationMeta.totalRecords ?? totalForActiveFilter}
            pageSize={paginationMeta.pageSize || pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Read-only details drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
            {/* header */}
            <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-4 bg-[#0a1e4d] dark:bg-slate-950 text-white">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-wide truncate">
                  Pass Details ·{" "}
                  <span className="font-mono text-amber-400">
                    {selected.referenceNo || `REQ-${selected.id}`}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50 space-y-5">
              {/* Company profile */}
              <div className="bg-white dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                  <div className="h-12 w-12 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Requesting Agency
                    </h4>
                    <p className="text-lg font-bold text-[#0a1e4d] dark:text-stone-100">
                      {selected.entityName || "N/A"}
                    </p>
                  </div>
                  <span
                    className={`ml-auto px-3 py-1 rounded-full text-[11px] font-bold border ${
                      STATUS_CLASS[(selected.status || "").toLowerCase()] ||
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {(selected.status || "PENDING").toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoChip icon={Phone} value={selected.mobileNo} />
                  <InfoChip icon={Mail} value={selected.email} />
                  <InfoChip icon={FileText} label="GST" value={selected.gstinNumber} />
                  <InfoChip icon={CreditCard} label="PAN" value={selected.panNumber} />
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Applied on {fmtDate(selected.createdAt)}
                  {selected.approvedBy ? ` · Processed by ${selected.approvedBy}` : ""}
                </div>
              </div>

              {/* Persons */}
              {selected.persons && selected.persons.length > 0 && (
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/50">
                    <h4 className="text-xs font-black text-[#0a1e4d] dark:text-stone-100 uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-4 w-4" /> Personnel ({selected.persons.length})
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                        <tr>
                          {["Pass No", "Name & Type", "Aadhar / ID", "Status"].map((h) => (
                            <th key={h} className="p-3 font-semibold text-slate-600 dark:text-slate-300 uppercase text-xs">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                        {selected.persons.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3 font-mono font-bold text-xs text-slate-800 dark:text-stone-200">
                              {p.personPassNo || "—"}
                            </td>
                            <td className="p-3 font-bold text-[#0a1e4d] dark:text-stone-100">
                              {p.name}
                              <span className="block font-medium text-xs text-slate-500 dark:text-slate-400">
                                {p.hepTypeName || p.hepTypeId} • {p.passType}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                              {p.aadharNo || "—"}
                            </td>
                            <td className="p-3">
                              <EntityStatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vehicles */}
              {selected.vehicles && selected.vehicles.length > 0 && (
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/50">
                    <h4 className="text-xs font-black text-[#0a1e4d] dark:text-stone-100 uppercase tracking-widest flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Vehicles ({selected.vehicles.length})
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                        <tr>
                          {["Pass No", "Reg No", "Type", "Status"].map((h) => (
                            <th key={h} className="p-3 font-semibold text-slate-600 dark:text-slate-300 uppercase text-xs">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                        {selected.vehicles.map((v) => (
                          <tr key={v.id}>
                            <td className="p-3 font-mono font-bold text-xs text-slate-800 dark:text-stone-200">
                              {v.vehiclePassNo || "—"}
                            </td>
                            <td className="p-3 font-bold text-[#0a1e4d] dark:text-stone-100 uppercase">
                              {v.registrationNo}
                            </td>
                            <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                              {v.vehicleTypeName} • {v.passType}
                            </td>
                            <td className="p-3">
                              <EntityStatusBadge status={v.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(!selected.persons || selected.persons.length === 0) &&
                (!selected.vehicles || selected.vehicles.length === 0) && (
                  <div className="text-center py-10 text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                    No persons or vehicles attached to this request.
                  </div>
                )}
            </div>

            {/* footer */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="h-9 px-5 rounded-xl text-sm font-bold text-white bg-slate-900 dark:bg-amber-400 dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
