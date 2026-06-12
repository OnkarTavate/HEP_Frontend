"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;

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
      const res = await axios.get(`${BASE_URL}/user/dept-admin-users`, {
        params: {
          page: pageNum,
          limit: limitNum,
          search: searchStr,
        },
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
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto p-2 sm:p-3 lg:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight flex items-center gap-3">
            <span className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20 shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </span>
            User Account Management
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm sm:text-base mt-1 ml-[52px] sm:ml-[60px]">
            Manage departmental user access and permissions
          </p>
        </div>
        <button
          onClick={() => fetchUsers(page, pageSize, debouncedSearch)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all active:scale-[0.97] shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        {[
          { label: "Total Users", value: stats.totalCount, icon: Users, bg: "bg-slate-900 dark:bg-slate-800", text: "text-white", ring: "ring-slate-200 dark:ring-slate-700" },
          { label: "Active", value: stats.activeCount, icon: UserCheck, bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-100 dark:ring-emerald-500/20" },
          { label: "Inactive", value: stats.inactiveCount, icon: UserX, bg: "bg-red-500", text: "text-white", ring: "ring-red-100 dark:ring-red-500/20" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800/80 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${card.bg} ${card.text} flex items-center justify-center ring-[3px] ${card.ring} shadow-md shrink-0`}>
              <card.icon className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-stone-100 tabular-nums leading-none">{card.value}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search Bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-400 transition-all w-full max-w-md">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent w-full text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-semibold animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating list...
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
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">#</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">Contact</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">Department</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">Created</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map((u, idx) => {
                  const isActive = u.status === "active";
                  const initial = (u.userName || "?").charAt(0).toUpperCase();
                  const createdDate = u.createdAt
                    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(u.createdAt))
                    : "—";

                  // Correct index matching database offset
                  const displayIndex = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400 font-medium tabular-nums">{displayIndex}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-500 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-[#1f1f1f] shadow-sm shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-stone-100 truncate text-sm">{u.userName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate md:hidden">{u.email}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate lg:hidden md:hidden">{u.departmentName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {u.email}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            {u.phoneNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {u.departmentName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                            {u.roleName}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          {createdDate}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        {actionLoading === u.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                        ) : isActive ? (
                          <button
                            onClick={() => setConfirmModal({ user: u, action: "deactivate" })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-[0.96] transition-all"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(u, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-[0.96] transition-all"
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

        {/* Pagination Bar Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 shrink-0">
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

      {/* Confirmation Modal — only for Deactivation */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800/80 w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 mb-4 shadow-inner">
                <AlertTriangle className="h-8 w-8" strokeWidth={2} />
              </span>
              <h3 className="text-xl font-extrabold text-[#1f1f1f] dark:text-white tracking-tight">
                Deactivate User Account?
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                Are you sure you want to deactivate <strong className="text-slate-800 dark:text-slate-200">{confirmModal.user.userName}</strong>?
                They will be <strong>unable to login</strong> until reactivated.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-[#1a1d27] border border-stone-200 dark:border-white/5 rounded-2xl px-4 py-3 mb-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-stone-500 dark:text-stone-400">Email:</span>
                <span className="text-stone-800 dark:text-white font-medium truncate">{confirmModal.user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-stone-500 dark:text-stone-400">Dept:</span>
                <span className="text-stone-800 dark:text-white font-medium">{confirmModal.user.departmentName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(confirmModal.user, false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
