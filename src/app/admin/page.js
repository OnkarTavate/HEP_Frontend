"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Search,
  ShieldAlert,
  UserPlus,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API;
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [formOptions, setFormOptions] = useState({
    roles: [],
    departments: [],
  });
  const [newAdmin, setNewAdmin] = useState({
    userName: "",
    email: "",
    phoneNumber: "",
    roleId: "",
    departmentId: "",
    password: "APPROVAL",
    confirmPassword: "APPROVAL",
  });
  const [createMessage, setCreateMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Ensure only Admins can access this page
      const userRole = (parsedUser.role || "").toLowerCase();
      if (userRole !== "admin" && userRole !== "administrator") {
        router.push("/");
        return;
      }
      setUser(parsedUser);
      fetchDashboardData();
      fetchFormOptions();
    } else {
      router.push("/");
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/user/agent-users`);
      setRequests(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/roles`),
        axios.get(`${BASE_URL}/user/departments`),
      ]);
      setFormOptions({
        roles: rolesRes.data.data || [],
        departments: deptsRes.data.data || [],
      });
    } catch (error) {
      console.error("Failed to fetch form options", error);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.password !== newAdmin.confirmPassword) {
      return setCreateMessage({
        type: "error",
        text: "Passwords do not match",
      });
    }
    const token = localStorage.getItem("accessToken");
    try {
      await axios.post(`${AUTH_BASE_URL}/admin/create-dept-user`, newAdmin,{
        headers:{
          Authorization: `Bearer ${token}`
        }
      }),
      setCreateMessage({
        type: "success",
        text: "Account successfully created!",
      });

      // Reset form
      setNewAdmin({
        userName: "",
        email: "",
        phoneNumber: "",
        roleId: "",
        departmentId: "",
        password: "APPROVAL",
        confirmPassword: "APPROVAL",
      });

      // Refresh the table to show new changes
      fetchDashboardData();

      // Close modal after 2 seconds
      setTimeout(() => setShowCreateAdmin(false), 2000);
    } catch (error) {
      setCreateMessage({
        type: "error",
        text: error.response?.data?.message || "Error creating user.",
      });
    }
  };

  if (loading || !user)
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading Admin Console...
      </div>
    );

  const pendingCount = requests.filter(
    (r) => r.status === "pending" || !r.status,
  ).length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filteredData = requests.filter(
    (req) =>
      req.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.entityName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalCount = requests.length;
  const approvalProgress = totalCount
    ? Math.round((approvedCount / totalCount) * 100)
    : 0;

  return (
    <div className="w-full h-full flex flex-col gap-3 lg:gap-4 min-h-0 overflow-hidden">
      {/* ── Intro / CTA bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Let&apos;s take a look at your admin console activity today.
        </p>
        <Button
          onClick={() => setShowCreateAdmin(true)}
          className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-[#1f1f1f] rounded-full px-5 py-2.5 font-medium shadow-lg hover:scale-[1.02] transition"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Create Department Admin
        </Button>
      </div>

      {/* ── Top Grid: Activity bubbles + Quick stats ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        {/* Pass Activity (Workout-card analogue) */}
        <div className="lg:col-span-2 bg-[#d6cebf] dark:bg-[#272a36] rounded-[28px] p-5 relative overflow-hidden min-h-[230px]">
          <h2 className="text-xl font-semibold text-[#1f1f1f] dark:text-stone-100">
            Pass Activity
          </h2>
          <p className="text-stone-700 dark:text-stone-400 text-sm mb-3">
            Snapshot for today
          </p>

          {/* Bubble stats — compact, sized to fit without clipping */}
          <div className="relative w-full h-[150px]">
            <div className="absolute top-2 left-24 sm:left-32 w-20 h-20 bg-[#1d1d1d] rounded-full flex items-center justify-center text-white shadow-xl z-10">
              <div className="text-center">
                <p className="font-bold text-base leading-none">{totalCount}</p>
                <p className="text-[9px] uppercase tracking-wider mt-1">Total</p>
              </div>
            </div>

            <div className="absolute top-0 right-2 sm:right-12 w-32 h-32 sm:w-36 sm:h-36 bg-amber-300/80 rounded-full blur-[1px] flex items-center justify-center shadow-xl">
              <div className="text-center text-black">
                <p className="font-bold text-xl leading-none">{approvedCount}</p>
                <p className="text-xs mt-1">Approved</p>
              </div>
            </div>

            <div className="absolute bottom-0 left-28 sm:left-36 w-24 h-24 bg-orange-300/80 rounded-full blur-[1px] flex items-center justify-center shadow-lg">
              <div className="text-center text-black">
                <p className="font-bold text-lg leading-none">{pendingCount}</p>
                <p className="text-xs mt-1">Pending</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-5 space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-amber-400" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-orange-400" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1.5 rounded-full bg-black dark:bg-stone-200" />
              <span>Total</span>
            </div>
          </div>
        </div>

        {/* Right: dark stats panel (Calendar analogue — already dark, just polish for theme) */}
        <div className="bg-[#1f232d] dark:bg-[#0f1117] dark:ring-1 dark:ring-white/5 text-white rounded-[28px] p-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Console Health</h2>
            <span className="text-stone-400 text-xs">Live</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#2b313d] rounded-xl p-3">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                Companies
              </p>
              <p className="text-xl font-bold mt-0.5">{totalCount}</p>
            </div>
            <div className="bg-[#2b313d] rounded-xl p-3">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                Pending
              </p>
              <p className="text-xl font-bold mt-0.5 text-orange-300">
                {pendingCount}
              </p>
            </div>
            <div className="bg-[#2b313d] rounded-xl p-3">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                Approved
              </p>
              <p className="text-xl font-bold mt-0.5 text-amber-300">
                {approvedCount}
              </p>
            </div>
            <div className="bg-[#2b313d] rounded-xl p-3">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                Rejected
              </p>
              <p className="text-xl font-bold mt-0.5 text-red-300">
                {rejectedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: takes all remaining vertical space; only the records list scrolls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left column: 2 stacked stat-cards */}
        <div className="flex flex-col gap-3 lg:gap-4 min-h-0 overflow-hidden">
          {/* Approval progress dial */}
          <div className="bg-white dark:bg-[#1f232d] rounded-[24px] p-4 shadow-sm dark:ring-1 dark:ring-white/5 flex-1 min-h-0 flex flex-col">
            <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-stone-100">
              Approval Rate
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs mb-3">
              Approved out of total
            </p>

            <div className="flex items-center justify-between flex-1">
              <Button
                onClick={() => setShowCreateAdmin(true)}
                className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-[#1f1f1f] px-3 py-1.5 rounded-full text-xs h-auto"
              >
                Add Admin
              </Button>

              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#fb923c ${approvalProgress * 3.6}deg, #fed7aa 0deg)`,
                }}
              >
                <div className="absolute inset-2 rounded-full bg-white dark:bg-[#1f232d] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-base font-bold text-[#1f1f1f] dark:text-stone-100 leading-none">
                      {approvalProgress}%
                    </p>
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-0.5">
                      Approved
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending progress bar */}
          <div className="bg-white dark:bg-[#1f232d] rounded-[24px] p-4 shadow-sm dark:ring-1 dark:ring-white/5 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-stone-100">
                  Pending Queue
                </h3>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                  Awaiting review
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#1f1f1f] dark:text-stone-100 leading-none">
                  {pendingCount}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Open
                </p>
              </div>
            </div>

            <div className="relative mb-2 mt-auto">
              <div className="w-full h-2.5 bg-stone-200 dark:bg-white/10 rounded-full" />
              <div
                className="absolute top-0 left-0 h-2.5 bg-[#1f1f1f] dark:bg-amber-400 rounded-full transition-all"
                style={{
                  width: totalCount
                    ? `${Math.min(100, (pendingCount / totalCount) * 100)}%`
                    : "0%",
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>0</span>
              <span>{totalCount} companies</span>
            </div>
          </div>
        </div>

        {/* Right column: Habit-style records list — only this card scrolls */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1f232d] rounded-[28px] p-4 shadow-sm dark:ring-1 dark:ring-white/5 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 gap-4 shrink-0">
            <h2 className="text-lg font-semibold text-[#1f1f1f] dark:text-stone-100 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Pass Overview
            </h2>

            <div className="hidden sm:flex bg-[#f6f2ee] dark:bg-white/5 px-4 py-2 rounded-full items-center gap-2 w-64 dark:border dark:border-white/10">
              <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              />
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden mb-4 bg-[#f6f2ee] dark:bg-white/5 px-4 py-2 rounded-full flex items-center gap-2 dark:border dark:border-white/10">
            <Search className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent w-full text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
            />
          </div>

          <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {filteredData.map((req) => {
              const status = (req.status || "pending").toLowerCase();
              const statusColor =
                status === "approved"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : status === "rejected"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
              const initial = (req.entityName || "?")
                .charAt(0)
                .toUpperCase();
              return (
                <div
                  key={req.id}
                  className="bg-[#f6f2ee] dark:bg-white/5 dark:border dark:border-white/10 rounded-2xl p-4 flex items-center justify-between hover:shadow-md dark:hover:bg-white/10 transition gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-amber-200 dark:from-amber-500 dark:to-orange-500 flex items-center justify-center font-bold text-[#1f1f1f] shadow-sm shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[#1f1f1f] dark:text-stone-100 truncate">
                        {req.entityName || "Unknown"}
                      </h4>
                      <p className="text-sm text-stone-500 dark:text-stone-400 truncate">
                        {req.referenceNumber} · {req.email || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <span className="hidden md:inline-flex bg-white dark:bg-white/10 text-stone-700 dark:text-stone-300 px-3 py-1 rounded-full text-xs font-semibold border border-stone-200 dark:border-white/10">
                      {req.userTypeName || "Agent"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusColor}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="py-16 text-center text-stone-400 dark:text-stone-500">
                <ShieldAlert className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
                <p className="text-sm font-medium">No records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE NEW ACCOUNT MODAL */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1f232d] dark:ring-1 dark:ring-white/10 rounded-3xl shadow-2xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto relative">
            <button
              onClick={() => setShowCreateAdmin(false)}
              className="absolute top-5 right-5 text-slate-400 dark:text-stone-400 hover:text-red-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="p-10">
              <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-stone-100 mb-2">
                Create a new account
              </h2>
              <p className="text-sm text-slate-500 dark:text-stone-400 mb-6 border-b border-slate-200 dark:border-white/10 pb-5">
                Register a new department admin to the system.
              </p>

              {createMessage.text && (
                <div
                  className={`p-3 mb-4 rounded-lg text-sm font-medium ${createMessage.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30" : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30"}`}
                >
                  {createMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold">
                    User name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmin.userName}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, userName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b17ff]/30 focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold dark:text-stone-100">
                    Email Id
                  </label>
                  <input
                    type="email"
                    required
                    value={newAdmin.email}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b17ff]/30 focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold dark:text-stone-100">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmin.phoneNumber}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b17ff]/30 focus:border-[#2b17ff] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold dark:text-stone-100">
                    Roles
                  </label>
                  <select
                    required
                    value={newAdmin.roleId}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, roleId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b17ff]/30 focus:border-[#2b17ff] text-sm bg-white dark:bg-white/5 dark:text-stone-100"
                  >
                    <option value="">-- Select --</option>
                    {formOptions.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold">
                    Department
                  </label>
                  <select
                    required
                    value={newAdmin.departmentId}
                    onChange={(e) =>
                      setNewAdmin({ ...newAdmin, departmentId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b17ff]/30 focus:border-[#2b17ff] text-sm bg-white dark:bg-white/5 dark:text-stone-100"
                  >
                    <option value="">-- Select --</option>
                    {formOptions.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    readOnly
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-stone-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300 mb-1.5 font-semibold">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={newAdmin.confirmPassword}
                    readOnly
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-stone-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="pt-3 sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-[#2b17ff] hover:bg-[#1a0ecc] text-white rounded-xl px-6 py-3.5 text-base font-bold shadow-md transition-all"
                  >
                    Register User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
