"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Search,
  UserX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Calendar,
  Globe,
  FileText,
  X,
  Eye,
  ChevronRight,
  ShieldCheck,
  BadgeAlert,
} from "lucide-react";
import { toast } from "sonner";
import PaginationBar from "@/components/ui/PaginationBar";

const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toUpperCase();
  if (s === "PENDING")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        Pending
      </span>
    );
  if (s === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 tracking-wide">
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        Approved
      </span>
    );
  if (s === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 tracking-wide">
        <XCircle className="h-3 w-3 flex-shrink-0" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 tracking-wide">
      {status}
    </span>
  );
};

const UserTypePill = ({ isAgent }) =>
  isAgent ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200/60">
      Agent
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200/60">
      Port User
    </span>
  );

// ─── Stat Card ───────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, accent, sub }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex items-center gap-4">
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <p className="text-[26px] font-black text-slate-900 tabular-nums leading-none tracking-tight">
        {value}
      </p>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1 truncate">
        {label}
      </p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountDeletionRequestsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });
  const [activeModal, setActiveModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Auth
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const role = parsed.role?.toLowerCase();
        if (role !== "admin" && role !== "administrator") {
          toast.error("Access restricted: Administrator privilege required");
          router.replace("/admin");
          return;
        }
        setCurrentUser(parsed);
      } catch {
        router.replace("/");
      }
    } else {
      router.replace("/");
    }
  }, [router]);

  // Debounce
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [searchQuery]);

  // Fetch
  const fetchRequests = useCallback(
    async (
      targetPage = page,
      targetLimit = pageSize,
      targetSearch = debouncedSearch,
      targetStatus = statusFilter
    ) => {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const q = new URLSearchParams({
          page: String(targetPage),
          limit: String(targetLimit),
          ...(targetSearch && { search: targetSearch }),
          ...(targetStatus && targetStatus !== "ALL" && { status: targetStatus }),
        });
        let res;
        try {
          res = await axios.get(
            `${ADMIN_API}/user/deletion-requests?${q.toString()}`,
            { headers, withCredentials: true }
          );
        } catch {
          res = await axios.get(
            `${AUTH_API}/admin/deletion-requests?${q.toString()}`,
            { headers, withCredentials: true }
          );
        }
        if (res.data?.success) {
          const list = res.data.data || [];
          setRequests(list);
          setPaginationMeta(
            res.data.pagination || {
              totalRecords: list.length,
              totalPages: 1,
              currentPage: targetPage,
              pageSize: targetLimit,
            }
          );
        }
      } catch (err) {
        console.error("Failed to load deletion requests:", err);
        toast.error("Could not load account deletion requests");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch, statusFilter]
  );

  useEffect(() => {
    if (currentUser) fetchRequests(page, pageSize, debouncedSearch, statusFilter);
  }, [currentUser, fetchRequests, page, pageSize, debouncedSearch, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0;
    requests.forEach((r) => {
      const s = (r.status || "").toUpperCase();
      if (s === "PENDING") pending++;
      else if (s === "APPROVED") approved++;
      else if (s === "REJECTED") rejected++;
    });
    return {
      total: paginationMeta.totalRecords || requests.length,
      pending,
      approved,
      rejected,
    };
  }, [paginationMeta.totalRecords, requests]);

  // Action
  const handleConfirmAction = async () => {
    if (!activeModal?.item?.id) return;
    setIsSubmittingAction(true);
    const token = localStorage.getItem("accessToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const targetStatus = activeModal.type === "APPROVE" ? "APPROVED" : "REJECTED";
    try {
      let res;
      const payload = { status: targetStatus, adminNotes: adminNotes.trim() };
      try {
        res = await axios.patch(
          `${ADMIN_API}/user/deletion-requests/${activeModal.item.id}`,
          payload,
          { headers, withCredentials: true }
        );
      } catch {
        res = await axios.patch(
          `${AUTH_API}/admin/deletion-requests/${activeModal.item.id}`,
          payload,
          { headers, withCredentials: true }
        );
      }
      if (res.data?.success) {
        toast.success(
          targetStatus === "APPROVED"
            ? `Request #${activeModal.item.id} approved — account deactivated.`
            : `Request #${activeModal.item.id} rejected.`
        );
        setActiveModal(null);
        setAdminNotes("");
        fetchRequests();
      } else {
        toast.error(res.data?.message || "Failed to process request");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error while processing");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const TABS = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto p-4 lg:p-6 bg-[#f8f9fb]">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-2.5">
            <Link
              href="/admin/user-accounts"
              className="text-[12px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              User Accounts
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-[12px] font-semibold text-red-500">
              Deletion Requests
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-500/20 flex-shrink-0">
              <UserX className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight">
                Account Deletion Requests
              </h1>
              <p className="text-[13px] text-slate-400 font-medium mt-0.5">
                Review and authorise user account deactivation requests
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchRequests(page, pageSize, debouncedSearch, statusFilter)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold transition-all shadow-sm active:scale-[0.97] flex-shrink-0 mt-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={FileText}
          accent="bg-slate-900 text-white"
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={Clock}
          accent="bg-amber-500 text-white"
        />
        <StatCard
          label="Approved & Deactivated"
          value={stats.approved}
          icon={CheckCircle2}
          accent="bg-emerald-500 text-white"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          accent="bg-rose-500 text-white"
        />
      </div>

      {/* ── Main Table Card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">

          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-lg">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-900/5 transition-all w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by ID, email, reason…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent w-full text-[13px] text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-red-400" />
              <p className="text-[13px] font-medium">Loading requests…</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-[14px] font-bold text-slate-700">No deletion requests found</p>
              <p className="text-[12px] text-slate-400 max-w-xs text-center">
                {searchQuery || statusFilter !== "ALL"
                  ? "No requests match your current filters."
                  : "All accounts are in good standing. No deletion requests yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              {/* Column widths */}
              <colgroup>
                <col style={{ width: "110px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "180px" }} />
                <col />
                <col style={{ width: "140px" }} />
                <col style={{ width: "170px" }} />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  {[
                    "Request",
                    "Account / User",
                    "Origin",
                    "Reason",
                    "Status",
                    "Actions",
                  ].map((col, i) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 ${
                        i === 5 ? "text-center" : ""
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {requests.map((req, idx) => {
                  const isAgent =
                    req.loginId?.startsWith("190") || req.userType === "agent";
                  const isPending = (req.status || "").toUpperCase() === "PENDING";

                  return (
                    <tr
                      key={req.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${
                        idx % 2 === 0 ? "" : "bg-slate-50/30"
                      }`}
                    >
                      {/* Request ID + Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-[13px] font-bold text-slate-800 font-mono">
                          #{req.id}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          {formatDateShort(req.createdAt)}
                        </p>
                      </td>

                      {/* Account / User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-slate-900 font-mono">
                            {req.loginId}
                          </span>
                          <UserTypePill isAgent={isAgent} />
                        </div>
                        {req.email && (
                          <p className="text-[12px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {req.email}
                          </p>
                        )}
                      </td>

                      {/* Origin */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                          <Globe className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                          <span className="font-medium">{req.ipAddress || "—"}</span>
                        </div>
                        {req.userAgent && (
                          <p
                            className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5"
                            title={req.userAgent}
                          >
                            {req.userAgent.split(" ")[0]}
                          </p>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-slate-600 line-clamp-2 max-w-sm leading-relaxed">
                          {req.reason || (
                            <span className="text-slate-300 italic">No reason provided</span>
                          )}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                        {req.reviewedBy && (
                          <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                            by {req.reviewedBy}
                            <br />
                            {formatDateShort(req.reviewedAt)}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveModal({ type: "DETAILS", item: req })}
                            title="View details"
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => {
                                  setAdminNotes("");
                                  setActiveModal({ type: "APPROVE", item: req });
                                }}
                                title="Approve — deactivate account"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold shadow-sm shadow-red-600/20 transition-all active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setAdminNotes("");
                                  setActiveModal({ type: "REJECT", item: req });
                                }}
                                title="Reject request"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-semibold transition-all active:scale-95"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-300 font-medium italic">
                              Processed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <PaginationBar
            pagination={paginationMeta}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl border border-slate-100 overflow-hidden">

            {/* ── DETAILS modal ── */}
            {activeModal.type === "DETAILS" && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <FileText className="h-4.5 w-4.5 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-slate-900">
                        Request #{activeModal.item.id}
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Submitted {formatDate(activeModal.item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Login ID", value: activeModal.item.loginId, mono: true },
                      {
                        label: "Account Type",
                        value:
                          activeModal.item.userType === "agent"
                            ? "External Agent"
                            : "Port Staff",
                      },
                      { label: "Email", value: activeModal.item.email || "—" },
                      {
                        label: "Status",
                        value: <StatusBadge status={activeModal.item.status} />,
                        raw: true,
                      },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                          {f.label}
                        </p>
                        {f.raw ? (
                          f.value
                        ) : (
                          <p
                            className={`text-[13px] font-semibold text-slate-800 truncate ${
                              f.mono ? "font-mono" : ""
                            }`}
                          >
                            {f.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reason */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      Applicant's Reason
                    </p>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-[13px] text-slate-700 leading-relaxed">
                      {activeModal.item.reason || (
                        <span className="italic text-slate-400">No reason provided.</span>
                      )}
                    </div>
                  </div>

                  {/* Admin notes */}
                  {activeModal.item.adminNotes && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                        Admin Notes
                      </p>
                      <div className="bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3 text-[13px] text-amber-900 leading-relaxed">
                        {activeModal.item.adminNotes}
                      </div>
                    </div>
                  )}

                  {/* Technical */}
                  <div className="pt-1 border-t border-slate-100 space-y-1">
                    <p className="text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-500">IP:</span>{" "}
                      {activeModal.item.ipAddress || "—"}
                    </p>
                    <p
                      className="text-[11px] text-slate-400 truncate"
                      title={activeModal.item.userAgent}
                    >
                      <span className="font-semibold text-slate-500">Client:</span>{" "}
                      {activeModal.item.userAgent || "—"}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 transition-all"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ── APPROVE / REJECT modal ── */}
            {(activeModal.type === "APPROVE" || activeModal.type === "REJECT") && (
              <>
                {/* Header */}
                <div
                  className={`px-6 py-5 border-b ${
                    activeModal.type === "APPROVE"
                      ? "border-red-100 bg-red-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activeModal.type === "APPROVE"
                          ? "bg-red-100 text-red-600"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {activeModal.type === "APPROVE" ? (
                        <BadgeAlert className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                        {activeModal.type === "APPROVE"
                          ? "Authorise Account Deletion?"
                          : "Reject Deletion Request?"}
                      </h2>
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                        {activeModal.type === "APPROVE" ? (
                          <>
                            This will immediately{" "}
                            <strong className="text-red-600">deactivate</strong> the
                            account{" "}
                            <span className="font-mono font-bold text-slate-800">
                              {activeModal.item.loginId}
                            </span>
                            . All active sessions will be revoked. This cannot be
                            undone without manual intervention.
                          </>
                        ) : (
                          <>
                            The account{" "}
                            <span className="font-mono font-bold text-slate-800">
                              {activeModal.item.loginId}
                            </span>{" "}
                            will remain active and the user will be notified.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                      Admin Remarks{" "}
                      <span className="normal-case font-medium text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        activeModal.type === "APPROVE"
                          ? "e.g. Verified business closure documents. Approved as per policy."
                          : "e.g. Account still active and required. User advised to use password reset."
                      }
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3.5 py-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-400 text-slate-900 placeholder:text-slate-400 resize-none transition-all"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={handleConfirmAction}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-60 ${
                      activeModal.type === "APPROVE"
                        ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20"
                        : "bg-slate-800 hover:bg-slate-900 shadow-md shadow-slate-900/10"
                    }`}
                  >
                    {isSubmittingAction && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {activeModal.type === "APPROVE"
                      ? "Confirm & Deactivate"
                      : "Confirm Rejection"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
