"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Search,
  ShieldAlert,
  UserPlus,
  X,
  Shield,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radar,
  Anchor,
  Clock,
  Container,
  Wind,
  Droplets,
  ArrowUpCircle,
  CloudSun,
  ChevronDown,
  GripVertical,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PaginationBar from "@/components/ui/PaginationBar";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_LIMIT = 20;
  const [paginationMeta, setPaginationMeta] = useState({ totalRecords: 0, totalPages: 1, currentPage: 1, pageSize: PAGE_LIMIT });
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // ── Drag & Drop Stat Card Order ──
  const [cardOrder, setCardOrder] = useState(["total", "approved", "pending", "rejected"]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin-card-order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setCardOrder(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragOverIndex !== idx) setDragOverIndex(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newOrder = [...cardOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(idx, 0, draggedItem);
    setCardOrder(newOrder);
    localStorage.setItem("admin-card-order", JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const resetCardOrder = () => {
    const defaultOrder = ["total", "approved", "pending", "rejected"];
    setCardOrder(defaultOrder);
    localStorage.removeItem("admin-card-order");
    toast.success("Card layout reset to default!");
  };

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Live clock for the Chennai Port status strip
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const portClock = useMemo(
    () => ({
      time: new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now),
      date: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(now),
    }),
    [now],
  );

  const fetchDashboardData = async (page = currentPage, query = searchQuery) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${BASE_URL}/user/agent-users`, {
        params: {
          page,
          limit: PAGE_LIMIT,
          search: query || undefined,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data.data || [];
      setRequests(data);
      setPaginationMeta(response.data.pagination || { totalRecords: 0, totalPages: 1, currentPage: page, pageSize: PAGE_LIMIT });
      if (response.data.counts) {
        setCounts(response.data.counts);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [rolesRes, deptsRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/roles`, { headers: authHeaders }),
        axios.get(`${BASE_URL}/user/departments`, { headers: authHeaders }),
      ]);
      setFormOptions({
        roles: rolesRes.data.data || [],
        departments: deptsRes.data.data || [],
      });
    } catch (error) {
      console.error("Failed to fetch form options", error);
    }
  };

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
      const timer = setTimeout(() => {
        setUser(parsedUser);
        fetchDashboardData(1, "");
        fetchFormOptions();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData(1, searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage !== 1) {
      fetchDashboardData(currentPage, searchQuery);
    }
  }, [currentPage]);

  const validateForm = () => {
    const errors = {};
    const userName = (newAdmin.userName || "").trim();
    if (!userName) {
      errors.userName = "Username is required";
    } else if (userName.length < 3) {
      errors.userName = "Username must be at least 3 characters";
    }

    const email = (newAdmin.email || "").trim();
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    const phone = (newAdmin.phoneNumber || "").replace(/\D/g, "");
    if (!phone) {
      errors.phoneNumber = "Phone number is required";
    } else if (phone.length !== 10) {
      errors.phoneNumber = "Phone number must be exactly 10 digits";
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phoneNumber = "Enter a valid Indian mobile number";
    }

    if (!newAdmin.roleId) errors.roleId = "Please select a role";
    if (!newAdmin.departmentId)
      errors.departmentId = "Please select a department";

    return errors;
  };

  const resetCreateForm = () => {
    setNewAdmin({
      userName: "",
      email: "",
      phoneNumber: "",
      roleId: "",
      departmentId: "",
      password: "APPROVAL",
      confirmPassword: "APPROVAL",
    });
    setFieldErrors({});
    setCreateMessage({ type: "", text: "" });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateMessage({ type: "", text: "" });

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateMessage({
        type: "error",
        text: "Please fix the highlighted fields.",
      });
      return;
    }
    setFieldErrors({});

    if (newAdmin.password !== newAdmin.confirmPassword) {
      return setCreateMessage({
        type: "error",
        text: "Passwords do not match",
      });
    }

    setSubmitting(true);
    const token = localStorage.getItem("accessToken");
    try {
      await axios.post(`${AUTH_BASE_URL}/admin/create-dept-user`, newAdmin, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      setTimeout(() => {
        setShowCreateAdmin(false);
        setCreateMessage({ type: "", text: "" });
      }, 2000);
    } catch (error) {
      setCreateMessage({
        type: "error",
        text: error.response?.data?.message || "Error creating user.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user)
    return (
      <div className="relative w-full h-full min-h-0 overflow-hidden">
        {/* Live port strip placeholder */}
        <div className="h-14 rounded-[20px] bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black animate-pulse mb-4" />

        {/* Intro / CTA bar placeholder */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-stone-300/60 dark:bg-white/10 animate-pulse" />
            <div className="h-3 w-64 rounded bg-stone-300/40 dark:bg-white/5 animate-pulse" />
          </div>
          <div className="h-10 w-56 rounded-full bg-[#1f1f1f]/90 dark:bg-amber-400/40 animate-pulse" />
        </div>

        {/* Top grid: Pass Activity + Quick stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
          <div
            className="lg:col-span-2 rounded-[28px] bg-[#d6cebf] dark:bg-[#272a36] min-h-[230px] animate-pulse"
            style={{ animationDelay: "100ms" }}
          />
          <div
            className="rounded-[28px] bg-[#1f232d] dark:bg-[#1f232d] min-h-[230px] animate-pulse"
            style={{ animationDelay: "180ms" }}
          />
        </div>

        {/* Two side-by-side panels (Approval Rate + Pending Queue) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-4">
          <div
            className="h-44 rounded-[24px] bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse"
            style={{ animationDelay: "240ms" }}
          />
          <div
            className="h-44 rounded-[24px] bg-white dark:bg-[#1f232d] ring-1 ring-stone-200/60 dark:ring-white/5 animate-pulse"
            style={{ animationDelay: "320ms" }}
          />
        </div>

        {/* Recent requests list */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[#f6f2ee] dark:bg-white/5 ring-1 ring-stone-200/60 dark:ring-white/10 animate-pulse"
              style={{ animationDelay: `${380 + i * 80}ms` }}
            />
          ))}
        </div>

        {/* Floating loader chip */}
        <div className="pointer-events-none absolute inset-x-0 top-[42%] flex justify-center">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/85 dark:bg-[#1f232d]/90 backdrop-blur-md ring-1 ring-stone-200/70 dark:ring-white/10 shadow-lg">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[#1f1f1f] shrink-0">
              <Shield className="h-4 w-4" strokeWidth={2.5} />
              <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/60 animate-ping" />
            </span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-wide">
              Loading admin console
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    );

  const pendingCount = counts.pending;
  const approvedCount = counts.approved;
  const rejectedCount = counts.rejected;
  const totalCount = counts.total;

  const filteredData = requests;

  const approvalProgress = totalCount
    ? Math.round((approvedCount / totalCount) * 100)
    : 0;

  return (
    <div className="w-full h-full flex flex-col gap-3 lg:gap-4 overflow-y-auto p-2 sm:p-3 lg:p-4">
      {/* ── Chennai Port live ops + weather strip ───────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 dark:bg-slate-950/70 border border-slate-800 dark:border-white/5 backdrop-blur-md text-white shadow-lg shrink-0">
        <svg
          aria-hidden
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-8 w-full text-amber-400/10"
        >
          <path
            fill="currentColor"
            d="M0,64 C240,128 480,0 720,32 C960,64 1200,128 1440,64 L1440,120 L0,120 Z"
          />
        </svg>

        <div className="relative px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {/* Status pill + location */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40 shrink-0">
              <Radar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/50 animate-ping" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                  Port Operational
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 truncate">
                <span className="font-semibold text-white">Chennai Port</span>
                <span className="text-stone-500 hidden sm:inline"> • Bay of Bengal</span>
              </p>
            </div>
          </div>

          <span className="hidden md:inline-block h-5 w-px bg-white/10" />

          {/* Compact ops chips — hidden on smallest screens, shown from xs */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-slate-800/40 ring-1 ring-slate-700/50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px]">
              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-300" />
              <span className="text-stone-400 hidden xs:inline">Gates</span>
              <span className="font-semibold text-emerald-300 tabular-nums">4/4</span>
            </span>
            <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-slate-800/40 ring-1 ring-slate-700/50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px]">
              <Anchor className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-300" />
              <span className="text-stone-400 hidden xs:inline">Vessels</span>
              <span className="font-semibold text-amber-300 tabular-nums">7</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-800/40 ring-1 ring-slate-700/50 px-2 py-0.5 text-[11px]">
              <Clock className="h-3 w-3 text-orange-300" />
              <span className="text-stone-400">Queue</span>
              <span className="font-semibold text-orange-300 tabular-nums">12</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-800/40 ring-1 ring-slate-700/50 px-2 py-0.5 text-[11px]">
              <Container className="h-3 w-3 text-fuchsia-300" />
              <span className="text-stone-400">TEU</span>
              <span className="font-semibold text-fuchsia-300 tabular-nums">1,284</span>
            </span>
          </div>

          <span className="hidden md:inline-block h-5 w-px bg-white/10" />

          {/* Weather — hidden on mobile */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 ring-1 ring-sky-400/20 px-2.5 py-1 text-[11px]">
            <CloudSun className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-bold text-white tabular-nums">32°C</span>
            <span className="text-stone-300 hidden md:inline">Partly Cloudy</span>
            <span className="text-stone-500 hidden md:inline">·</span>
            <Wind className="h-3 w-3 text-sky-300 hidden md:inline" />
            <span className="text-stone-300 tabular-nums hidden md:inline">14 SSW</span>
            <span className="text-stone-500 hidden md:inline">·</span>
            <Droplets className="h-3 w-3 text-sky-300" />
            <span className="text-stone-300 tabular-nums">78%</span>
          </div>

          {/* Tide — hidden on mobile */}
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 ring-1 ring-cyan-400/20 px-2.5 py-1 text-[11px]">
            <ArrowUpCircle className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-stone-400">High</span>
            <span className="font-semibold text-cyan-300 tabular-nums">13:42</span>
            <span className="text-stone-500 tabular-nums">1.2m</span>
          </div>

          {/* Live clock — always visible, compact on mobile */}
          <div className="ml-auto text-right leading-tight shrink-0">
            <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-amber-200">
              {portClock.time}
            </p>
            <p className="text-[9px] sm:text-[10px] text-stone-400">{portClock.date} · IST</p>
          </div>
        </div>
      </div>

      {/* ── Intro / CTA bar ─────────────────────────────── */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
              Admin Overview
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm sm:text-base mt-0.5">
              Let&apos;s take a look at your admin console activity today.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateAdmin(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 dark:from-amber-400 dark:to-orange-400 text-white dark:text-[#1f1f1f] rounded-2xl w-full sm:w-auto px-5 sm:px-7 py-4 sm:py-5 text-sm sm:text-base font-extrabold shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all ring-2 ring-amber-300/40 dark:ring-amber-200/40"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            <span className="relative flex items-center justify-center gap-2">
              <span className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/25 dark:bg-black/15 shrink-0">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.6} />
              </span>
              <span className="tracking-wide">Create Department Admin</span>
            </span>
          </Button>
        </div>
      </div>

      {/* ── Top Grid: Activity cards + Quick stats ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        {/* Pass Activity — fully responsive grid layout */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 lg:p-6 relative overflow-hidden border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:scale-[1.005] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-300/40 dark:bg-amber-400/15 blur-3xl" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-800 dark:text-stone-100 tracking-tight">
            Pass Activity
          </h2>
          <p className="text-slate-500 dark:text-stone-400 text-xs sm:text-sm font-medium mb-3">
            Snapshot for today
          </p>

          {/* Drag instruction & Reset layout */}
          <div className="flex items-center justify-between gap-2 text-[10px] bg-amber-500/5 rounded-xl px-3 py-1.5 border border-amber-500/10 mb-3 shrink-0">
            <p className="text-amber-800 dark:text-amber-400/80 font-medium flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 animate-bounce text-amber-500" />
              Drag stat cards using grip icon to reorder.
            </p>
            <button
              onClick={resetCardOrder}
              className="flex items-center gap-0.5 font-bold uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors shrink-0"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Reset
            </button>
          </div>

          {/* Responsive stats cards — 2 cols on mobile, 4 on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pb-1">
            {cardOrder.map((cardKey, index) => {
              const cardData = {
                total: {
                  label: "Total Requests",
                  value: totalCount,
                  icon: Shield,
                  color: "text-slate-800 dark:text-stone-100",
                  bgIcon: "bg-slate-100 dark:bg-slate-800",
                  footnote: "All submitted passes today",
                },
                approved: {
                  label: "Approved Passes",
                  value: approvedCount,
                  icon: CheckCircle2,
                  color: "text-emerald-600 dark:text-emerald-400",
                  bgIcon: "bg-emerald-50 dark:bg-emerald-500/10",
                  footnote: `${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}% approval rate`,
                },
                pending: {
                  label: "Pending Passes",
                  value: pendingCount,
                  icon: Clock,
                  color: "text-amber-600 dark:text-amber-400",
                  bgIcon: "bg-amber-50 dark:bg-amber-500/10",
                  footnote: "Awaiting port decision",
                },
                rejected: {
                  label: "Rejected Passes",
                  value: rejectedCount,
                  icon: AlertCircle,
                  color: "text-red-600 dark:text-red-400",
                  bgIcon: "bg-red-50 dark:bg-red-500/10",
                  footnote: "Applications denied entry",
                },
              }[cardKey];

              const isDragged = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={cardKey}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={
                    "transition-all duration-200 flex flex-1 " +
                    (isDragged ? "opacity-30 scale-95" : "") +
                    (isOver ? "border-2 border-dashed border-amber-500 rounded-3xl p-1 bg-amber-500/5 shadow-inner scale-[1.02]" : "")
                  }
                >
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 shadow-sm hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md transition-all duration-300 flex flex-col gap-2 relative group flex-1 text-left">
                    {/* Grip handle */}
                    <div className="absolute top-3 right-3 text-stone-300 dark:text-slate-600 group-hover:text-stone-400 dark:group-hover:text-slate-450 transition-colors cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 z-10">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex items-center justify-between pr-6">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                        {cardData.label}
                      </span>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${cardData.bgIcon}`}>
                        <cardData.icon className={`h-4.5 w-4.5 ${cardData.color}`} strokeWidth={2.5} />
                      </span>
                    </div>

                    <p className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${cardData.color}`}>
                      {cardData.value}
                    </p>

                    {cardData.footnote && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                        {cardData.footnote}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Health stats panel */}
        <div className="bg-slate-900 dark:bg-[#0b0f19] border border-slate-800 dark:border-white/5 text-white rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:scale-[1.005] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 ease-in-out">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Console Health</h2>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/10 ring-1 ring-emerald-400/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-grow">
            {[
              { label: "Companies", value: totalCount, color: "text-slate-100" },
              { label: "Pending", value: pendingCount, color: "text-orange-300" },
              { label: "Approved", value: approvedCount, color: "text-amber-300" },
              { label: "Rejected", value: rejectedCount, color: "text-red-300" },
            ].map((t) => (
              <div
                key={t.label}
                className="bg-slate-800/60 hover:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700/50 transition-colors"
              >
                <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  {t.label}
                </p>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1 sm:mt-1.5 tabular-nums leading-none ${t.color}`}>
                  {t.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: stat-cards + records list ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 pb-4">
        {/* Approval progress dial */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out flex flex-col gap-3 sm:gap-4 min-h-[180px]">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-stone-100 tracking-tight">
              Approval Rate
            </h3>
            <p className="text-slate-500 dark:text-stone-400 text-xs sm:text-sm">
              Approved out of total
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={() => setShowCreateAdmin(true)}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold h-auto shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" strokeWidth={2.5} />
              Add Admin
            </Button>

            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-md shadow-amber-200/40 dark:shadow-amber-500/10 shrink-0"
              style={{
                background: `conic-gradient(#f59e0b ${approvalProgress * 3.6}deg, rgba(251,146,60,0.18) 0deg)`,
              }}
            >
              <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-stone-100 leading-none tabular-nums">
                    {approvalProgress}%
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-stone-400 uppercase tracking-wider mt-0.5 sm:mt-1 font-bold">
                    Done
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending progress bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out flex flex-col gap-3 min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-stone-100 flex items-center gap-1.5 tracking-tight">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 dark:text-orange-300" />
                Pending Queue
              </h3>
              <p className="text-slate-500 dark:text-stone-400 text-xs sm:text-sm mt-1">
                Awaiting review
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-300 leading-none tabular-nums">
                {pendingCount}
              </p>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-stone-400 mt-1 sm:mt-1.5 font-bold">
                Open
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <div className="relative mb-2">
              <div className="w-full h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full" />
              <div
                className="absolute top-0 left-0 h-2.5 sm:h-3 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all shadow-sm"
                style={{
                  width: totalCount
                    ? `${Math.min(100, (pendingCount / totalCount) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span>0</span>
              <span>{totalCount} companies</span>
            </div>
          </div>
        </div>

        {/* Right column: records list — scrolls on all screen sizes */}
        <div className="sm:col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:scale-[1.005] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out flex flex-col min-h-[350px] max-h-[500px] sm:max-h-[600px]">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3 shrink-0">
            <h2 className="text-base sm:text-xl font-extrabold text-slate-800 dark:text-stone-100 flex items-center gap-2 tracking-tight">
              <span className="flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
              </span>
              <span className="truncate">System Pass Overview</span>
            </h2>

            <div className="hidden sm:flex bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl items-center gap-2 min-w-[140px] max-w-[200px] border border-slate-200/60 dark:border-slate-700">
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="outline-none bg-transparent w-full text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden mb-3 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-200/60 dark:border-slate-700">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent w-full text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
                  className="bg-slate-50/75 dark:bg-slate-800/30 border border-slate-100/80 dark:border-slate-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between hover:shadow-md hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all duration-200 gap-2 sm:gap-4"
                >
                  <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-orange-300 to-amber-200 dark:from-amber-500 dark:to-orange-500 flex items-center justify-center font-bold text-sm text-[#1f1f1f] shadow-sm shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800 dark:text-stone-100 truncate text-sm sm:text-base">
                        {req.entityName || "Unknown"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {req.referenceNumber}
                        <span className="hidden sm:inline"> · {req.email || "—"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <span
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${statusColor}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="py-12 sm:py-16 text-center text-stone-400 dark:text-stone-500">
                <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-stone-300 dark:text-stone-600 mb-2 sm:mb-3" />
                <p className="text-sm font-medium">No records found.</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <PaginationBar
              currentPage={paginationMeta.currentPage}
              totalPages={paginationMeta.totalPages}
              totalRecords={paginationMeta.totalRecords}
              pageSize={paginationMeta.pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* CREATE NEW ACCOUNT MODAL */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800/80 rounded-t-[28px] sm:rounded-[28px] shadow-2xl w-full sm:max-w-[680px] max-h-[95vh] sm:max-h-[92vh] overflow-y-auto relative">
            {/* Decorative banner header */}
            <div className="relative h-24 sm:h-32 bg-gradient-to-br from-amber-300 via-orange-300 to-amber-400 dark:from-amber-500 dark:via-orange-500 dark:to-amber-400 rounded-t-[28px] overflow-hidden shrink-0">
              <div className="absolute -top-6 -left-4 w-24 h-24 bg-white/30 rounded-full blur-xl" />
              <div className="absolute -bottom-8 right-6 w-36 h-36 bg-orange-500/30 rounded-full blur-xl" />
              {/* Mobile drag indicator */}
              <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/50" />
              <button
                onClick={() => {
                  setShowCreateAdmin(false);
                  setFieldErrors({});
                  setCreateMessage({ type: "", text: "" });
                }}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/30 hover:bg-white/60 active:scale-95 backdrop-blur-sm flex items-center justify-center text-slate-900 transition-all"
                aria-label="Close"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Floating icon badge */}
            <div className="absolute top-[68px] sm:top-[92px] left-5 sm:left-8 h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] rounded-xl sm:rounded-2xl bg-slate-900 dark:bg-slate-950 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900">
              <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-amber-300" />
            </div>

            <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-12 sm:pt-16">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-stone-100">
                Create a new account
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-stone-400 mt-1 mb-4 sm:mb-5">
                Register a new department admin to access the console.
              </p>

              {createMessage.text && (
                <div
                  className={`p-3 sm:p-3.5 mb-4 sm:mb-5 rounded-xl text-sm font-medium flex items-start gap-2.5 ${createMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                    }`}
                >
                  {createMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <span>{createMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateAdmin} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-5 gap-y-3 sm:gap-y-4">
                {/* User name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    User name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.userName}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, userName: e.target.value });
                        if (fieldErrors.userName)
                          setFieldErrors({ ...fieldErrors, userName: "" });
                      }}
                      placeholder="e.g. Aarav Sharma"
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2.5 border bg-slate-50/50 dark:bg-slate-800/40 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 text-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldErrors.userName
                        ? "border-red-400 focus:ring-red-500/10 focus:border-red-500 dark:border-red-500/60"
                        : "border-slate-200 dark:border-slate-800/80 focus:ring-amber-500/10 focus:border-amber-400 dark:focus:ring-amber-500/20 dark:focus:border-amber-500"
                        }`}
                    />
                  </div>
                  {fieldErrors.userName && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.userName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, email: e.target.value });
                        if (fieldErrors.email)
                          setFieldErrors({ ...fieldErrors, email: "" });
                      }}
                      placeholder="name@company.com"
                      className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2.5 border bg-slate-50/50 dark:bg-slate-800/40 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 text-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldErrors.email
                        ? "border-red-400 focus:ring-red-500/10 focus:border-red-500 dark:border-red-500/60"
                        : "border-slate-200 dark:border-slate-800/80 focus:ring-amber-500/10 focus:border-amber-400 dark:focus:ring-amber-500/20 dark:focus:border-amber-500"
                        }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <span className="absolute left-8 sm:left-9 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pointer-events-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={newAdmin.phoneNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setNewAdmin({ ...newAdmin, phoneNumber: digitsOnly });
                        if (fieldErrors.phoneNumber)
                          setFieldErrors({ ...fieldErrors, phoneNumber: "" });
                      }}
                      placeholder="98765 43210"
                      className={`w-full pl-[52px] sm:pl-[58px] pr-3 sm:pr-3.5 py-2.5 border bg-slate-50/50 dark:bg-slate-800/40 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 text-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500 tracking-wide ${fieldErrors.phoneNumber
                        ? "border-red-400 focus:ring-red-500/10 focus:border-red-500 dark:border-red-500/60"
                        : "border-slate-200 dark:border-slate-800/80 focus:ring-amber-500/10 focus:border-amber-400 dark:focus:ring-amber-500/20 dark:focus:border-amber-500"
                        }`}
                    />
                  </div>
                  {fieldErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
                    <select
                      value={newAdmin.roleId}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, roleId: e.target.value });
                        if (fieldErrors.roleId)
                          setFieldErrors({ ...fieldErrors, roleId: "" });
                      }}
                      className={`w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 border bg-slate-50/50 dark:bg-slate-800/40 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 text-sm transition appearance-none ${fieldErrors.roleId
                        ? "border-red-400 focus:ring-red-500/10 focus:border-red-500 dark:border-red-500/60"
                        : "border-slate-200 dark:border-slate-800/80 focus:ring-amber-500/10 focus:border-amber-400 dark:focus:ring-amber-500/20 dark:focus:border-amber-500"
                        }`}
                    >
                      <option value="">-- Select role --</option>
                      {formOptions.roles.map((r) => (
                        <option key={r.id} value={r.id} className="dark:bg-slate-900">
                          {r.roleName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
                  </div>
                  {fieldErrors.roleId && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.roleId}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Department
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
                    <select
                      value={newAdmin.departmentId}
                      onChange={(e) => {
                        setNewAdmin({
                          ...newAdmin,
                          departmentId: e.target.value,
                        });
                        if (fieldErrors.departmentId)
                          setFieldErrors({ ...fieldErrors, departmentId: "" });
                      }}
                      className={`w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 border bg-slate-50/50 dark:bg-slate-800/40 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-4 text-sm transition appearance-none ${fieldErrors.departmentId
                        ? "border-red-400 focus:ring-red-500/10 focus:border-red-500 dark:border-red-500/60"
                        : "border-slate-200 dark:border-slate-800/80 focus:ring-amber-500/10 focus:border-amber-400 dark:focus:ring-amber-500/20 dark:focus:border-amber-500"
                        }`}
                    >
                      <option value="">-- Select department --</option>
                      {formOptions.departments.map((d) => (
                        <option key={d.id} value={d.id} className="dark:bg-slate-900">
                          {d.departmentName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
                  </div>
                  {fieldErrors.departmentId && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.departmentId}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.password}
                      readOnly
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2.5 border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                    Default temporary password.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 sm:mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.confirmPassword}
                      readOnly
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-3.5 py-2.5 border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                    User can change after first login.
                  </p>
                </div>

                {/* Action buttons — stacked full-width on mobile, row on sm+ */}
                <div className="pt-2 sm:pt-3 sm:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdmin(false);
                      setFieldErrors({});
                      setCreateMessage({ type: "", text: "" });
                    }}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.98] transition-all duration-200"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-900 text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Register Admin
                      </>
                    )}
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
