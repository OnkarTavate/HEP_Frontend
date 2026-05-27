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
    <div className="w-full h-full flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
      {/* ── Chennai Port live ops + weather strip ───────── */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#1a1d27] via-[#252836] to-[#1a1d27] dark:from-black dark:via-[#1a1d27] dark:to-black text-white shadow-md ring-1 ring-white/5 shrink-0">
        <svg
          aria-hidden
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-10 w-full text-amber-400/10"
        >
          <path
            fill="currentColor"
            d="M0,64 C240,128 480,0 720,32 C960,64 1200,128 1440,64 L1440,120 L0,120 Z"
          />
        </svg>

        <div className="relative px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {/* Status pill + location */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40 shrink-0">
              <Radar className="h-4 w-4 text-emerald-400" />
              <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/50 animate-ping" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                  Port Operational
                </span>
              </div>
              <p className="text-xs text-stone-300 truncate">
                <span className="font-semibold text-white">Chennai Port</span>{" "}
                <span className="text-stone-500">• Bay of Bengal</span>
              </p>
            </div>
          </div>

          <span className="hidden md:inline-block h-6 w-px bg-white/10" />

          {/* Compact ops chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span className="text-stone-400">Gates</span>
              <span className="font-semibold text-emerald-300 tabular-nums">4/4</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
              <Anchor className="h-3 w-3 text-amber-300" />
              <span className="text-stone-400">Vessels</span>
              <span className="font-semibold text-amber-300 tabular-nums">7</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
              <Clock className="h-3 w-3 text-orange-300" />
              <span className="text-stone-400">Queue</span>
              <span className="font-semibold text-orange-300 tabular-nums">12</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-0.5 text-[11px]">
              <Container className="h-3 w-3 text-fuchsia-300" />
              <span className="text-stone-400">TEU</span>
              <span className="font-semibold text-fuchsia-300 tabular-nums">1,284</span>
            </span>
          </div>

          <span className="hidden md:inline-block h-6 w-px bg-white/10" />

          {/* Weather chip */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 ring-1 ring-sky-400/20 px-2.5 py-1 text-[11px]">
            <CloudSun className="h-4 w-4 text-amber-300" />
            <span className="font-bold text-white tabular-nums">32°C</span>
            <span className="text-stone-300">Partly Cloudy</span>
            <span className="text-stone-500">·</span>
            <Wind className="h-3 w-3 text-sky-300" />
            <span className="text-stone-300 tabular-nums">14 SSW</span>
            <span className="text-stone-500">·</span>
            <Droplets className="h-3 w-3 text-sky-300" />
            <span className="text-stone-300 tabular-nums">78%</span>
          </div>

          {/* Tide chip */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 ring-1 ring-cyan-400/20 px-2.5 py-1 text-[11px]">
            <ArrowUpCircle className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-stone-400">High</span>
            <span className="font-semibold text-cyan-300 tabular-nums">13:42</span>
            <span className="text-stone-500 tabular-nums">1.2m</span>
          </div>

          {/* Live clock */}
          <div className="ml-auto text-right leading-tight">
            <p className="font-mono text-base font-bold tabular-nums text-amber-200">
              {portClock.time}
            </p>
            <p className="text-[10px] text-stone-400">{portClock.date} · IST</p>
          </div>
        </div>
      </div>

      {/* ── Intro / CTA bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
            Admin Overview
          </h2>
          <p className="text-stone-600 dark:text-stone-400 text-base mt-1">
            Let&apos;s take a look at your admin console activity today.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateAdmin(true)}
          className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 dark:from-amber-400 dark:to-orange-400 text-white dark:text-[#1f1f1f] rounded-2xl px-7 py-7 text-base font-extrabold shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 hover:scale-[1.03] transition-all ring-2 ring-amber-300/40 dark:ring-amber-200/40"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
          <span className="relative flex items-center gap-2.5">
            <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/25 dark:bg-black/15">
              <UserPlus className="h-5 w-5" strokeWidth={2.6} />
            </span>
            <span className="text-base sm:text-lg tracking-wide">
              Create Department Admin
            </span>
          </span>
        </Button>
      </div>

      {/* ── Top Grid: Activity bubbles + Quick stats ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 shrink-0">
        {/* Pass Activity — fully responsive bubble layout */}
        <div className="lg:col-span-2 bg-[#d6cebf] dark:bg-[#272a36] rounded-[28px] p-5 sm:p-6 relative overflow-hidden ring-1 ring-stone-300/50 dark:ring-white/5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-300/40 dark:bg-amber-400/15 blur-3xl" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
            Pass Activity
          </h2>
          <p className="text-stone-700 dark:text-stone-400 text-sm font-medium mb-4">
            Snapshot for today
          </p>

          {/* Responsive bubble stats */}
          <div className="flex flex-wrap items-center justify-around gap-4 pb-2">
            {/* Total bubble */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#1d1d1d] rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-white/40 dark:ring-white/10">
                <div className="text-center">
                  <p className="font-extrabold text-xl sm:text-2xl leading-none tabular-nums">{totalCount}</p>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-widest mt-1 font-bold">Total</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                <span className="w-7 h-2 rounded-full bg-black dark:bg-stone-200 inline-block" />
                Total
              </span>
            </div>

            {/* Approved bubble */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-28 h-28 sm:w-36 sm:h-36 bg-amber-300/85 rounded-full flex items-center justify-center shadow-xl ring-4 ring-amber-200/40">
                <div className="text-center text-black">
                  <p className="font-extrabold text-3xl sm:text-4xl leading-none tabular-nums">{approvedCount}</p>
                  <p className="text-xs mt-1 font-bold uppercase tracking-wider">Approved</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                <span className="w-7 h-2 rounded-full bg-amber-400 inline-block" />
                Approved
              </span>
            </div>

            {/* Pending bubble */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-orange-300/85 rounded-full flex items-center justify-center shadow-lg ring-4 ring-orange-200/40">
                <div className="text-center text-black">
                  <p className="font-extrabold text-2xl sm:text-3xl leading-none tabular-nums">{pendingCount}</p>
                  <p className="text-xs mt-1 font-bold uppercase tracking-wider">Pending</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                <span className="w-7 h-2 rounded-full bg-orange-400 inline-block" />
                Pending
              </span>
            </div>

            {/* Rejected bubble */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-400/80 rounded-full flex items-center justify-center shadow-lg ring-4 ring-red-200/40">
                <div className="text-center text-black">
                  <p className="font-extrabold text-xl sm:text-2xl leading-none tabular-nums">{rejectedCount}</p>
                  <p className="text-[9px] sm:text-xs mt-1 font-bold uppercase tracking-wider">Rejected</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                <span className="w-7 h-2 rounded-full bg-red-400 inline-block" />
                Rejected
              </span>
            </div>
          </div>
        </div>

        {/* Right: dark stats panel */}
        <div className="bg-[#1f232d] dark:bg-[#0f1117] ring-1 ring-white/5 text-white rounded-[28px] p-5 sm:p-6 flex flex-col shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold tracking-tight">Console Health</h2>
            <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 ring-1 ring-emerald-400/30 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Companies", value: totalCount, color: "text-stone-100" },
              { label: "Pending", value: pendingCount, color: "text-orange-300" },
              { label: "Approved", value: approvedCount, color: "text-amber-300" },
              { label: "Rejected", value: rejectedCount, color: "text-red-300" },
            ].map((t) => (
              <div
                key={t.label}
                className="bg-[#2b313d] hover:bg-[#333a48] rounded-2xl p-3 sm:p-4 ring-1 ring-white/5 transition-colors"
              >
                <p className="text-[11px] text-stone-400 uppercase tracking-wider font-bold">
                  {t.label}
                </p>
                <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 tabular-nums leading-none ${t.color}`}>
                  {t.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: stat-cards + records list ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Approval progress dial */}
        <div className="bg-white dark:bg-[#1f232d] rounded-[24px] p-5 ring-1 ring-stone-200/70 dark:ring-white/5 shadow-[0_8px_30px_-16px_rgba(15,23,42,0.18)] flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1f1f1f] dark:text-stone-100 tracking-tight">
              Approval Rate
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Approved out of total
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowCreateAdmin(true)}
              className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-[#1f1f1f] px-4 py-2.5 rounded-full text-sm font-bold h-auto shadow-md hover:scale-[1.03] transition"
            >
              <UserPlus className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
              Add Admin
            </Button>

            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-md shadow-amber-200/40 dark:shadow-amber-500/10"
              style={{
                background: `conic-gradient(#f59e0b ${approvalProgress * 3.6}deg, rgba(251,146,60,0.18) 0deg)`,
              }}
            >
              <div className="absolute inset-2 rounded-full bg-white dark:bg-[#1f232d] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-[#1f1f1f] dark:text-stone-100 leading-none tabular-nums">
                    {approvalProgress}%
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1 font-bold">
                    Approved
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending progress bar */}
        <div className="bg-white dark:bg-[#1f232d] rounded-[24px] p-5 ring-1 ring-stone-200/70 dark:ring-white/5 shadow-[0_8px_30px_-16px_rgba(15,23,42,0.18)] flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-extrabold text-[#1f1f1f] dark:text-stone-100 flex items-center gap-1.5 tracking-tight">
                <Clock className="h-5 w-5 text-orange-500 dark:text-orange-300" />
                Pending Queue
              </h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                Awaiting review
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-300 leading-none tabular-nums">
                {pendingCount}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mt-1.5 font-bold">
                Open
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <div className="relative mb-2">
              <div className="w-full h-3 bg-stone-200 dark:bg-white/10 rounded-full" />
              <div
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all shadow-sm"
                style={{
                  width: totalCount
                    ? `${Math.min(100, (pendingCount / totalCount) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold">
              <span>0</span>
              <span>{totalCount} companies</span>
            </div>
          </div>
        </div>

        {/* Right column: records list — scrolls on all screen sizes */}
        <div className="sm:col-span-2 lg:col-span-1 bg-white dark:bg-[#1f232d] rounded-[28px] p-5 ring-1 ring-stone-200/70 dark:ring-white/5 shadow-[0_8px_30px_-16px_rgba(15,23,42,0.18)] flex flex-col min-h-[280px] lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-4 shrink-0">
            <h2 className="text-xl md:text-2xl font-extrabold text-[#1f1f1f] dark:text-stone-100 flex items-center gap-2.5 tracking-tight">
              <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300">
                <Shield className="h-5 w-5" strokeWidth={2.5} />
              </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1f232d] dark:ring-1 dark:ring-white/10 rounded-[28px] shadow-2xl w-full max-w-[680px] max-h-[92vh] overflow-y-auto relative">
            {/* Decorative banner header */}
            <div className="relative h-32 bg-gradient-to-br from-amber-300 via-orange-300 to-amber-400 dark:from-amber-500 dark:via-orange-500 dark:to-amber-400 rounded-t-[28px] overflow-hidden">
              <div className="absolute -top-6 -left-4 w-24 h-24 bg-white/30 rounded-full blur-xl" />
              <div className="absolute -bottom-8 right-6 w-36 h-36 bg-orange-500/30 rounded-full blur-xl" />
              <button
                onClick={() => {
                  setShowCreateAdmin(false);
                  setFieldErrors({});
                  setCreateMessage({ type: "", text: "" });
                }}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/30 hover:bg-white/60 backdrop-blur-sm flex items-center justify-center text-[#1f1f1f] transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Floating icon badge — sibling of banner so it isn't clipped by overflow-hidden */}
            <div className="absolute top-[92px] left-8 h-[72px] w-[72px] rounded-2xl bg-[#1f1f1f] dark:bg-[#0f1117] flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-[#1f232d]">
              <UserPlus className="h-8 w-8 text-amber-300" />
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-16">
              <h2 className="text-2xl font-bold text-[#1f1f1f] dark:text-stone-100">
                Create a new account
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-5">
                Register a new department admin to access the console.
              </p>

              {createMessage.text && (
                <div
                  className={`p-3.5 mb-5 rounded-xl text-sm font-medium flex items-start gap-2.5 ${
                    createMessage.type === "success"
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

              <form onSubmit={handleCreateAdmin} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                {/* User name */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    User name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.userName}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, userName: e.target.value });
                        if (fieldErrors.userName)
                          setFieldErrors({ ...fieldErrors, userName: "" });
                      }}
                      placeholder="e.g. Aarav Sharma"
                      className={`w-full pl-10 pr-3.5 py-2.5 border bg-[#f6f2ee] dark:bg-white/5 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 text-sm transition placeholder:text-stone-400 dark:placeholder:text-stone-500 ${
                        fieldErrors.userName
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500 dark:border-red-500/60"
                          : "border-stone-200 dark:border-white/10 focus:ring-amber-200 focus:border-amber-400 dark:focus:ring-amber-500/30 dark:focus:border-amber-500"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, email: e.target.value });
                        if (fieldErrors.email)
                          setFieldErrors({ ...fieldErrors, email: "" });
                      }}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-3.5 py-2.5 border bg-[#f6f2ee] dark:bg-white/5 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 text-sm transition placeholder:text-stone-400 dark:placeholder:text-stone-500 ${
                        fieldErrors.email
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500 dark:border-red-500/60"
                          : "border-stone-200 dark:border-white/10 focus:ring-amber-200 focus:border-amber-400 dark:focus:ring-amber-500/30 dark:focus:border-amber-500"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-stone-500 dark:text-stone-400 font-medium pointer-events-none">
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
                      className={`w-full pl-[58px] pr-3.5 py-2.5 border bg-[#f6f2ee] dark:bg-white/5 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 text-sm transition placeholder:text-stone-400 dark:placeholder:text-stone-500 tracking-wide ${
                        fieldErrors.phoneNumber
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500 dark:border-red-500/60"
                          : "border-stone-200 dark:border-white/10 focus:ring-amber-200 focus:border-amber-400 dark:focus:ring-amber-500/30 dark:focus:border-amber-500"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none z-10" />
                    <select
                      value={newAdmin.roleId}
                      onChange={(e) => {
                        setNewAdmin({ ...newAdmin, roleId: e.target.value });
                        if (fieldErrors.roleId)
                          setFieldErrors({ ...fieldErrors, roleId: "" });
                      }}
                      className={`w-full pl-10 pr-3.5 py-2.5 border bg-[#f6f2ee] dark:bg-white/5 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 text-sm transition appearance-none ${
                        fieldErrors.roleId
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500 dark:border-red-500/60"
                          : "border-stone-200 dark:border-white/10 focus:ring-amber-200 focus:border-amber-400 dark:focus:ring-amber-500/30 dark:focus:border-amber-500"
                      }`}
                    >
                      <option value="">-- Select role --</option>
                      {formOptions.roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.roleId && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.roleId}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Department
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none z-10" />
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
                      className={`w-full pl-10 pr-3.5 py-2.5 border bg-[#f6f2ee] dark:bg-white/5 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 text-sm transition appearance-none ${
                        fieldErrors.departmentId
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500 dark:border-red-500/60"
                          : "border-stone-200 dark:border-white/10 focus:ring-amber-200 focus:border-amber-400 dark:focus:ring-amber-500/30 dark:focus:border-amber-500"
                      }`}
                    >
                      <option value="">-- Select department --</option>
                      {formOptions.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.departmentName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.departmentId && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.departmentId}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.password}
                      readOnly
                      className="w-full pl-10 pr-3.5 py-2.5 border border-stone-200 dark:border-white/10 rounded-xl bg-stone-100/70 dark:bg-white/5 text-stone-500 dark:text-stone-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                    Default temporary password.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newAdmin.confirmPassword}
                      readOnly
                      className="w-full pl-10 pr-3.5 py-2.5 border border-stone-200 dark:border-white/10 rounded-xl bg-stone-100/70 dark:bg-white/5 text-stone-500 dark:text-stone-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                    User can change after first login.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="pt-3 sm:col-span-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdmin(false);
                      setFieldErrors({});
                      setCreateMessage({ type: "", text: "" });
                    }}
                    className="px-6 py-3 rounded-full text-sm font-semibold border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-6 py-3 rounded-full text-sm font-semibold border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5 transition"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-full bg-[#1f1f1f] hover:bg-black dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-[#1f1f1f] text-sm font-bold shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
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
