"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import PaginationBar from "@/components/ui/PaginationBar";

const BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

export default function UserAccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 20,
  });

  // Global Stats State
  const [stats, setStats] = useState({
    totalCount: 0,
    activeCount: 0,
    inactiveCount: 0,
  });

  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Authentication & Access Control Check
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const userRole = (parsedUser.role || "").toLowerCase();
      if (userRole !== "admin" && userRole !== "administrator") {
        router.push("/");
        return;
      }
      setUser(parsedUser);
    } else {
      router.push("/");
    }
  }, [router]);

  // Search Debouncing (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search query change
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users when dependencies change
  useEffect(() => {
    if (user) {
      fetchUsers(page, pageSize, debouncedSearch);
    }
  }, [page, pageSize, debouncedSearch, user]);

  const fetchUsers = async (pageNum = page, limitNum = pageSize, searchStr = debouncedSearch) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${BASE_URL}/user/dept-admin-users`, {
        params: {
          page: pageNum,
          limit: limitNum,
          search: searchStr,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(res.data?.data || []);
      setPaginationMeta(
        res.data?.pagination || {
          totalRecords: 0,
          totalPages: 1,
          currentPage: pageNum,
          pageSize: limitNum,
        }
      );
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to fetch departmental users");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (targetUser, newStatus) => {
    setConfirmModal(null);
    setActionLoading(targetUser.id);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.patch(
        `${BASE_URL}/user/update-user-approval`,
        { userId: targetUser.id, status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (s) => s < 500,
        }
      );
      if (res.data?.success) {
        toast.success(
          newStatus
            ? `${targetUser.userName} activated successfully`
            : `${targetUser.userName} deactivated successfully`,
          {
            description: newStatus
              ? "User can now login. An activation email has been sent."
              : "User login has been blocked. A notification email has been sent.",
          }
        );
        fetchUsers(page, pageSize, debouncedSearch);
      } else {
        toast.error(res.data?.message || "Failed to update user status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  if (loading && users.length === 0) {
    return (
      <div className="relative w-full h-full min-h-0 overflow-hidden p-4">
        <div className="h-10 w-64 rounded-xl bg-stone-300/60 dark:bg-white/10 animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white dark:bg-slate-800/60 ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white dark:bg-slate-800/60 ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse" />
        <div className="pointer-events-none absolute inset-x-0 top-[42%] flex justify-center">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/85 dark:bg-[#1f232d]/90 backdrop-blur-md ring-1 ring-stone-200/70 dark:ring-white/10 shadow-lg">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
              <Users className="h-4 w-4" strokeWidth={2.5} />
              <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
            </span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">Loading user accounts</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto p-4 lg:p-6 bg-[#f8f9fb]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-400/25 flex-shrink-0">
            <Users className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight">
              User Account Management
            </h1>
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">
              Manage departmental user access and permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admin/account-deletion-requests"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[13px] font-semibold transition-all active:scale-[0.97]"
          >
            <UserX className="h-3.5 w-3.5" />
            Deletion Requests
          </Link>
          <button
            onClick={() => fetchUsers(page, pageSize, debouncedSearch)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold transition-all shadow-sm active:scale-[0.97]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Users", value: stats.totalCount, icon: Users, accent: "bg-slate-900 text-white" },
          { label: "Active Users", value: stats.activeCount, icon: UserCheck, accent: "bg-emerald-500 text-white" },
          { label: "Inactive Users", value: stats.inactiveCount, icon: UserX, accent: "bg-red-500 text-white" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.accent}`}>
              <card.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[26px] font-black text-slate-900 tabular-nums leading-none tracking-tight">{card.value}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-900/5 transition-all w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email, department…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent w-full text-[13px] text-slate-700 placeholder:text-slate-400"
            />
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto relative">
          {users.length === 0 ? (
            <div className="py-20 text-center text-stone-400 dark:text-stone-500">
              <Users className="h-12 w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-base font-semibold">
                {searchQuery ? "No users match your search." : "No departmental users found."}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? "Try a different search term." : "Create users from the Admin Console."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <colgroup>
                <col style={{ width: "48px" }} />
                <col style={{ width: "220px" }} />
                <col />
                <col style={{ width: "200px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "150px" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  {["#", "User", "Contact", "Department", "Created", "Status", "Action"].map((col, i) => (
                    <th key={col} className={`px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 ${i === 6 ? "text-center" : ""} ${i === 2 ? "hidden md:table-cell" : ""} ${i >= 3 && i <= 4 ? "hidden lg:table-cell" : ""}`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const isActive = u.status === "active";
                  const initial = (u.userName || "?").charAt(0).toUpperCase();
                  const createdDate = u.createdAt
                    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(u.createdAt))
                    : "—";

                  // Correct index matching database offset
                  const displayIndex = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-5 py-3.5 text-[13px] text-slate-400 font-medium tabular-nums">{displayIndex}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center font-bold text-[13px] text-white shadow-sm flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate">{u.userName}</p>
                            <p className="text-[12px] text-slate-400 truncate md:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-[13px] text-slate-700 flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                            {u.email}
                          </p>
                          <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-300 flex-shrink-0" />
                            {u.phoneNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-[13px] text-slate-700 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                            {u.departmentName}
                          </p>
                          <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-slate-300 flex-shrink-0" />
                            {u.roleName}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-300 flex-shrink-0" />
                          {createdDate}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border tracking-wide ${isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {actionLoading === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto" />
                        ) : isActive ? (
                          <button
                            onClick={() => setConfirmModal({ user: u, action: "deactivate" })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-[0.96] transition-all"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(u, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 active:scale-[0.96] transition-all"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Activate
                          </button>
                        )}
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
            currentPage={paginationMeta.currentPage}
            totalPages={paginationMeta.totalPages}
            totalRecords={paginationMeta.totalRecords}
            pageSize={paginationMeta.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && setConfirmModal(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[420px] overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">Deactivate Account?</h3>
                  <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                    <strong className="text-slate-800">{confirmModal.user.userName}</strong> will be unable to login until reactivated.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <Mail className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-800 font-medium truncate">{confirmModal.user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <Building2 className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-500">Dept:</span>
                  <span className="text-slate-800 font-medium">{confirmModal.user.departmentName}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(confirmModal.user, false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all"
              >
                <UserX className="h-4 w-4" />
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
