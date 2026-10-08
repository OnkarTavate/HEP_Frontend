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
  IdCard,
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
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PaginationBar from "@/components/ui/PaginationBar";
import { toast } from "sonner";
import DataIngestionProvidersMatrix from "@/components/admin/DataIngestionProvidersMatrix";

const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API || "http://localhost:5006/api";

/* ─────────────────────────────────────────
   DESIGN TOKENS
   Palette: dark navy + amber/gold accents (original)
   Poppins font. Refined spacing from redesign.
───────────────────────────────────────── */
const T = {
  // Backgrounds - Clean Crisp White Theme
  bgPage: "#f8fafc",
  bgCard: "#ffffff",
  bgStrip: "linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  bgMuted: "#f1f5f9",
  bgHover: "#f8fafc",

  // Borders
  borderBase: "#e2e8f0",
  borderMed: "#cbd5e1",
  borderStrong: "#94a3b8",

  // Typography - High Contrast Crisp Slate
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",

  // Accent — Warm Amber/Gold
  accent: "#d97706",
  accentLight: "rgba(245,158,11,0.08)",
  accentMid: "rgba(245,158,11,0.16)",
  accentGlow: "rgba(245,158,11,0.25)",

  // Status
  green: "#059669",
  greenLight: "#ecfdf5",
  greenBorder: "#a7f3d0",
  amber: "#d97706",
  amberLight: "#fffbeb",
  amberBorder: "#fde68a",
  orange: "#ea580c",
  orangeLight: "#fff7ed",
  orangeBorder: "#fed7aa",
  red: "#dc2626",
  redLight: "#fef2f2",
  redBorder: "#fecaca",
  slate: "#475569",
  slateLight: "#f1f5f9",
  slateBorder: "#cbd5e1",
  cyan: "#0284c7",
  cyanLight: "#f0f9ff",
  cyanBorder: "#bae6fd",
  violet: "#7c3aed",
  violetLight: "#f5f3ff",
  violetBorder: "#ddd6fe",

  // Shadows
  shadowSm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)",
  shadowLg: "0 10px 30px rgba(0,0,0,0.08)",
  shadowXl: "0 20px 50px rgba(0,0,0,0.12)",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  * { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rippleAnim {
    0%   { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes spinAnim { to { transform: rotate(360deg); } }
  @keyframes pulseGlow {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes progressFill {
    from { width: 0%; }
  }

  .anim-fade-up { animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .anim-spin    { animation: spinAnim 1s linear infinite; }
  .anim-pulse   { animation: pulseGlow 2s ease-in-out infinite; }

  .card-lift {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04) !important;
  }

  .inp {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 12px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 500;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    outline: none;
    padding: 11px 14px 11px 42px;
  }
  .inp:focus {
    background: #ffffff;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
  }
  .inp::placeholder { color: #94a3b8; font-weight: 400; }
  .inp.err {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.10);
  }

  .sel {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 12px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 500;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    outline: none;
    padding: 11px 40px 11px 42px;
    appearance: none;
  }
  .sel:focus {
    background: #ffffff;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
  }
  .sel.err {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.10);
  }
  .sel option { background: #ffffff; color: #0f172a; }

  .scb::-webkit-scrollbar { width: 5px; }
  .scb::-webkit-scrollbar-track { background: transparent; }
  .scb::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  .scb::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .row-hover { transition: background 0.15s, border-color 0.15s; }
  .row-hover:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }

  .btn-ghost {
    transition: background 0.15s, color 0.15s;
  }
  .btn-ghost:hover { background: #e2e8f0 !important; }

  .stat-card {
    transition: transform 0.22s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.22s cubic-bezier(0.16,1,0.3,1),
                border-color 0.22s;
  }
  .stat-card:hover {
    transform: translateY(-3px);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition: background 0.15s;
  }
`;

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

  const [cardOrder, setCardOrder] = useState(["total", "approved", "pending", "rejected"]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin-card-order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) setCardOrder(parsed);
      } catch (e) { }
    }
  }, []);

  const handleDragStart = (e, idx) => { setDraggedIndex(idx); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, idx) => { e.preventDefault(); if (dragOverIndex !== idx) setDragOverIndex(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newOrder = [...cardOrder];
    const [item] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(idx, 0, item);
    setCardOrder(newOrder);
    localStorage.setItem("admin-card-order", JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); };
  const resetCardOrder = () => {
    setCardOrder(["total", "approved", "pending", "rejected"]);
    localStorage.removeItem("admin-card-order");
    toast.success("Layout reset to default");
  };

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [formOptions, setFormOptions] = useState({ roles: [], departments: [] });
  const [newAdmin, setNewAdmin] = useState({
    userName: "", employeeId: "", email: "", phoneNumber: "",
    roleId: "", departmentId: "", password: "APPROVAL", confirmPassword: "APPROVAL",
  });
  const [createMessage, setCreateMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const portClock = useMemo(() => ({
    time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now),
    date: new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short" }).format(now),
  }), [now]);

  const fetchDashboardData = async (page = currentPage, query = searchQuery) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${BASE_URL}/user/agent-users`, {
        params: { page, limit: PAGE_LIMIT, search: query || undefined },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data.data || []);
      setPaginationMeta(response.data.pagination || { totalRecords: 0, totalPages: 1, currentPage: page, pageSize: PAGE_LIMIT });
      if (response.data.counts) setCounts(response.data.counts);
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
      setFormOptions({ roles: rolesRes.data.data || [], departments: deptsRes.data.data || [] });
    } catch (error) {
      console.error("Failed to fetch form options", error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const userRole = (parsedUser.role || "").toLowerCase();
      if (userRole !== "admin" && userRole !== "administrator") { router.push("/"); return; }
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
    const timer = setTimeout(() => { fetchDashboardData(1, searchQuery); setCurrentPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage !== 1) fetchDashboardData(currentPage, searchQuery);
  }, [currentPage]);

  const validateForm = () => {
    const errors = {};
    const userName = (newAdmin.userName || "").trim();
    if (!userName) errors.userName = "Username is required";
    else if (userName.length < 3) errors.userName = "Minimum 3 characters";
    const email = (newAdmin.email || "").trim();
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
    const employeeId = (newAdmin.employeeId || "").trim();
    if (!employeeId) errors.employeeId = "Employee ID is required";
    else if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]{1,49}$/.test(employeeId)) errors.employeeId = "Enter a valid employee ID";
    const phone = (newAdmin.phoneNumber || "").replace(/\D/g, "");
    if (!phone) errors.phoneNumber = "Phone number is required";
    else if (phone.length !== 10) errors.phoneNumber = "Must be exactly 10 digits";
    else if (!/^[6-9]\d{9}$/.test(phone)) errors.phoneNumber = "Enter a valid Indian mobile number";
    if (!newAdmin.roleId) errors.roleId = "Select a role";
    if (!newAdmin.departmentId) errors.departmentId = "Select a department";
    return errors;
  };

  const resetCreateForm = () => {
    setNewAdmin({ userName: "", employeeId: "", email: "", phoneNumber: "", roleId: "", departmentId: "", password: "APPROVAL", confirmPassword: "APPROVAL" });
    setFieldErrors({});
    setCreateMessage({ type: "", text: "" });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateMessage({ type: "", text: "" });
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateMessage({ type: "error", text: "Please fix the highlighted fields." });
      return;
    }
    setFieldErrors({});
    if (newAdmin.password !== newAdmin.confirmPassword) {
      return setCreateMessage({ type: "error", text: "Passwords do not match" });
    }
    setSubmitting(true);
    const token = localStorage.getItem("accessToken");
    try {
      await axios.post(`${AUTH_BASE_URL}/admin/create-dept-user`, newAdmin, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateMessage({ type: "success", text: "Account successfully created!" });
      setNewAdmin({ userName: "", employeeId: "", email: "", phoneNumber: "", roleId: "", departmentId: "", password: "APPROVAL", confirmPassword: "APPROVAL" });
      fetchDashboardData();
      setTimeout(() => { setShowCreateAdmin(false); setCreateMessage({ type: "", text: "" }); }, 2000);
    } catch (error) {
      setCreateMessage({ type: "error", text: error.response?.data?.message || "Error creating user." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ──── LOADING STATE ──── */
  if (loading || !user)
    return (
      <>
        <style>{styles}</style>
        <div style={{ background: T.bgPage, minHeight: "100%", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {[56, 80, 120, 200].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 18, background: "#e2e8f0", border: `1px solid ${T.borderBase}` }} className="anim-pulse" />
          ))}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 99, background: "#ffffff", border: `1px solid ${T.borderBase}`, backdropFilter: "blur(20px)", boxShadow: T.shadowMd }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #f59e0b, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield style={{ width: 16, height: 16, color: "#fff" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>Loading Admin Console…</span>
              <Loader2 style={{ width: 16, height: 16, color: T.accent }} className="anim-spin" />
            </div>
          </div>
        </div>
      </>
    );

  /* ──── COMPUTED ──── */
  const pendingCount = counts.pending;
  const approvedCount = counts.approved;
  const rejectedCount = counts.rejected;
  const totalCount = counts.total;
  const filteredData = requests;
  const approvalProgress = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

  const cardDefs = {
    total: {
      label: "Total Requests",
      value: totalCount,
      icon: Layers,
      accent: "#ffffff",
      labelColor: "rgba(255,255,255,0.85)",
      footnoteColor: "rgba(255,255,255,0.75)",
      bg: "linear-gradient(145deg, #1d4ed8 0%, #2563eb 55%, #1e40af 100%)",
      border: "rgba(255, 255, 255, 0.22)",
      iconBg: "rgba(255, 255, 255, 0.18)",
      glow: "0 10px 28px rgba(37, 99, 235, 0.28), 0 2px 6px rgba(0,0,0,0.06)",
      footnote: "All registered passes",
    },
    approved: {
      label: "Approved",
      value: approvedCount,
      icon: CheckCircle2,
      accent: "#ffffff",
      labelColor: "rgba(255,255,255,0.85)",
      footnoteColor: "rgba(255,255,255,0.75)",
      bg: "linear-gradient(145deg, #059669 0%, #10b981 55%, #047857 100%)",
      border: "rgba(255, 255, 255, 0.22)",
      iconBg: "rgba(255, 255, 255, 0.18)",
      glow: "0 10px 28px rgba(16, 185, 129, 0.28), 0 2px 6px rgba(0,0,0,0.06)",
      footnote: `${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}% approval rate`,
    },
    pending: {
      label: "Pending",
      value: pendingCount,
      icon: Clock,
      accent: "#ffffff",
      labelColor: "rgba(255,255,255,0.85)",
      footnoteColor: "rgba(255,255,255,0.75)",
      bg: "linear-gradient(145deg, #d97706 0%, #f59e0b 55%, #b45309 100%)",
      border: "rgba(255, 255, 255, 0.22)",
      iconBg: "rgba(255, 255, 255, 0.18)",
      glow: "0 10px 28px rgba(245, 158, 11, 0.28), 0 2px 6px rgba(0,0,0,0.06)",
      footnote: "Awaiting decision",
    },
    rejected: {
      label: "Rejected",
      value: rejectedCount,
      icon: AlertCircle,
      accent: "#ffffff",
      labelColor: "rgba(255,255,255,0.85)",
      footnoteColor: "rgba(255,255,255,0.75)",
      bg: "linear-gradient(145deg, #e11d48 0%, #f43f5e 55%, #be123c 100%)",
      border: "rgba(255, 255, 255, 0.22)",
      iconBg: "rgba(255, 255, 255, 0.18)",
      glow: "0 10px 28px rgba(244, 63, 94, 0.28), 0 2px 6px rgba(0,0,0,0.06)",
      footnote: "Applications denied",
    },
  };

  /* ──── FORM STYLES ──── */
  const LabelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    letterSpacing: "0.04em", textTransform: "uppercase",
    color: T.textSecondary, marginBottom: 7,
  };
  const IconStyle = (hasErr) => ({
    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
    width: 15, height: 15, color: hasErr ? T.red : T.textMuted,
    pointerEvents: "none", zIndex: 1,
  });
  const ErrStyle = {
    marginTop: 6, fontSize: 11.5, color: T.red,
    display: "flex", alignItems: "center", gap: 4, fontWeight: 500,
  };

  /* ──── STATUS BADGE CONFIG ──── */
  const statusConfig = {
    approved: { color: T.green, bg: T.greenLight, border: "rgba(16,185,129,0.2)" },
    rejected: { color: T.red, bg: T.redLight, border: "rgba(239,68,68,0.2)" },
    pending: { color: T.amber, bg: T.amberLight, border: "rgba(245,158,11,0.2)" },
  };

  return (
    <>
      <style>{styles}</style>
      <div
        className="scb"
        style={{
          width: "100%", minHeight: "100%",
          display: "flex", flexDirection: "column", gap: 20,
          background: T.bgPage,
          padding: "24px 24px 40px",
          overflowY: "auto",
        }}
      >

        {/* ─────────────────────────────────────────
            PORT OPS STRIP
        ───────────────────────────────────────── */}
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
              <p suppressHydrationWarning className="font-mono text-sm sm:text-base font-bold tabular-nums text-amber-200">
                {portClock.time}
              </p>
              <p suppressHydrationWarning className="text-[9px] sm:text-[10px] text-stone-400">{portClock.date} · IST</p>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            HEADER
        ───────────────────────────────────────── */}
        <div className="anim-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, animationDelay: "60ms" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(251,191,36,0.25)",
              }}>
                <Shield style={{ width: 17, height: 17, color: "#fff" }} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
                Admin Console
              </h1>
            </div>
            <p style={{ fontSize: 13.5, color: T.textSecondary, fontWeight: 500 }}>
              Welcome back,{" "}
              <span style={{ color: T.accent, fontWeight: 700 }}>{user?.userName || "Admin"}</span>
              {" "}— Chennai Port Authority
            </p>
          </div>

          <button
            onClick={() => setShowCreateAdmin(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 14,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              border: "none", color: "#0f1219",
              fontSize: 13.5, fontWeight: 800, cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 4px 20px rgba(251,191,36,0.28)",
              transition: "transform 0.18s, box-shadow 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.01)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(251,191,36,0.42)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(251,191,36,0.28)"; }}
          >
            <UserPlus style={{ width: 16, height: 16 }} />
            Create Dept Admin
          </button>
        </div>

        {/* ─────────────────────────────────────────
            STAT CARDS
        ───────────────────────────────────────── */}
        <div className="anim-fade-up" style={{ animationDelay: "120ms" }}>
          {/* Drag hint bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 12, padding: "7px 14px",
            borderRadius: 10, background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.22)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#b45309", fontWeight: 600 }}>
              <Zap style={{ width: 12, height: 12 }} />
              Drag cards to reorder your layout
            </span>
            <button
              onClick={resetCardOrder}
              className="btn-ghost"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", color: "#b45309",
                background: "none", border: "none", cursor: "pointer",
                padding: "3px 8px", borderRadius: 7,
              }}
            >
              <RotateCcw style={{ width: 10, height: 10 }} />
              Reset
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {cardOrder.map((cardKey, index) => {
              const card = cardDefs[cardKey];
              const IconComp = card.icon;
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
                  className="stat-card"
                  style={{
                    borderRadius: 20,
                    padding: "22px 20px",
                    background: isOver ? "rgba(251,191,36,0.15)" : card.bg,
                    border: isOver
                      ? "1.5px dashed rgba(251,191,36,0.6)"
                      : `1px solid ${card.border}`,
                    opacity: isDragged ? 0.35 : 1,
                    cursor: "grab",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: card.glow || "0 4px 20px rgba(0,0,0,0.35)",
                    transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  {/* Shimmer overlay */}
                  <div style={{
                    position: "absolute", top: -40, right: -40,
                    width: 120, height: 120, borderRadius: "50%",
                    background: "rgba(255,255,255,0.07)",
                    filter: "blur(28px)", pointerEvents: "none",
                  }} />
                  <div style={{
                    position: "absolute", bottom: -30, left: -20,
                    width: 90, height: 90, borderRadius: "50%",
                    background: "rgba(255,255,255,0.04)",
                    filter: "blur(20px)", pointerEvents: "none",
                  }} />

                  {/* Drag handle */}
                  <div style={{ position: "absolute", top: 14, right: 14, color: "rgba(255,255,255,0.45)", cursor: "grab" }}>
                    <GripVertical style={{ width: 13, height: 13 }} />
                  </div>

                  {/* Icon + Label row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingRight: 22 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: card.labelColor || "rgba(255,255,255,0.75)" }}>
                      {card.label}
                    </span>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: card.iconBg,
                      border: `1px solid ${card.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <IconComp style={{ width: 16, height: 16, color: card.accent || "#ffffff" }} />
                    </div>
                  </div>

                  {/* Value */}
                  <p style={{
                    fontSize: 36, fontWeight: 900, color: "#ffffff",
                    lineHeight: 1, fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.03em",
                  }}>
                    {card.value}
                  </p>

                  {/* Footnote */}
                  <p style={{ fontSize: 11.5, color: card.footnoteColor || "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: 500 }}>
                    {card.footnote}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────
            MAIN GRID — approval + pending | health
        ───────────────────────────────────────── */}
        <div className="anim-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, animationDelay: "180ms" }}>

          {/* Left column */}
          <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 16 }}>

            {/* Approval Rate Card */}
            <div
              className="card-lift"
              style={{
                borderRadius: 22, padding: "26px 28px",
                background: "#ffffff",
                border: `1px solid ${T.borderBase}`,
                display: "flex", alignItems: "center", gap: 28,
                overflow: "hidden", position: "relative",
                boxShadow: T.shadowSm,
              }}
            >
              {/* Soft gradient accent */}
              <div style={{ position: "absolute", bottom: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(52,211,153,0.06)", filter: "blur(40px)", pointerEvents: "none" }} />

              {/* Donut */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="9" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="url(#donutGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${approvalProgress * 2.513} 251.3`}
                    style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
                  />
                  <defs>
                    <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{approvalProgress}%</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted, marginTop: 3 }}>Done</span>
                </div>
              </div>

              {/* Text + mini stats */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <TrendingUp style={{ width: 15, height: 15, color: T.green }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em" }}>Approval Rate</h3>
                </div>
                <p style={{ fontSize: 12.5, color: T.textSecondary, marginBottom: 18 }}>Approved out of total submissions</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Approved", val: approvedCount, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
                    { label: "Rejected", val: rejectedCount, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                  ].map(({ label, val, color, bg, border }) => (
                    <div key={label} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
                      <p style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", marginTop: 3 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => setShowCreateAdmin(true)}
                className="btn-ghost"
                style={{
                  flexShrink: 0, padding: "10px 18px", borderRadius: 12,
                  background: "rgba(245,158,11,0.08)",
                  border: `1px solid rgba(245,158,11,0.22)`,
                  color: "#b45309", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <UserPlus style={{ width: 14, height: 14 }} />
                Add Admin
              </button>
            </div>

            {/* Pending Workload */}
            <div
              className="card-lift"
              style={{
                borderRadius: 22, padding: "26px 28px",
                background: "#ffffff",
                border: `1px solid ${T.borderBase}`,
                position: "relative", overflow: "hidden",
                boxShadow: T.shadowSm,
              }}
            >
              <div style={{ position: "absolute", top: -30, left: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(245,158,11,0.05)", filter: "blur(40px)", pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <Activity style={{ width: 15, height: 15, color: T.orange }} />
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.02em" }}>Pending Workload</h3>
                  </div>
                  <p style={{ fontSize: 12.5, color: T.textSecondary }}>Applications awaiting review</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 38, fontWeight: 900, color: T.orange, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{pendingCount}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: T.textMuted, marginTop: 4 }}>Open</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: `linear-gradient(90deg, ${T.amber}, ${T.orange})`,
                  width: totalCount ? `${Math.min(100, (pendingCount / totalCount) * 100)}%` : "0%",
                  boxShadow: "0 0 10px rgba(245,158,11,0.25)",
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>0</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>{totalCount} total</span>
              </div>
            </div>
          </div>

          {/* ── Console Health ── */}
          <div
            className="card-lift"
            style={{
              borderRadius: 22, padding: "24px 22px",
              background: "#ffffff",
              border: `1px solid ${T.borderBase}`,
              position: "relative", overflow: "hidden",
              boxShadow: T.shadowSm,
            }}
          >
            <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, borderRadius: "50%", background: "rgba(245,158,11,0.06)", filter: "blur(50px)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles style={{ width: 16, height: 16, color: "#d97706" }} />
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>Console Health</h2>
              </div>
              <span className="chip" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#059669" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} className="anim-pulse" />
                Live
              </span>
            </div>

            {/* Mini stat grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Total", value: totalCount, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
                { label: "Pending", value: pendingCount, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                { label: "Approved", value: approvedCount, color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
                { label: "Rejected", value: rejectedCount, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
              ].map(({ label, value, color, bg, border }) => (
                <div
                  key={label}
                  style={{ padding: "14px 12px", borderRadius: 14, background: bg, border: `1px solid ${border}`, cursor: "default", transition: "transform 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMuted, marginBottom: 7 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* System status */}
            <div style={{ borderRadius: 14, padding: "14px 16px", background: "#f8fafc", border: `1px solid ${T.borderBase}` }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: T.textMuted, marginBottom: 12 }}>System Status</p>
              {[
                { name: "Auth Service", ok: true },
                { name: "Approval Engine", ok: true },
                { name: "Port Gateway", ok: true },
              ].map(({ name, ok }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 500 }}>{name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: ok ? "#059669" : "#dc2626" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? "#059669" : "#dc2626", display: "inline-block" }} className="anim-pulse" />
                    {ok ? "Online" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            RECORDS LIST
        ───────────────────────────────────────── */}
        <div
          className="anim-fade-up"
          style={{
            borderRadius: 22, padding: "24px",
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.20), 0 20px 50px rgba(0,0,0,0.10)",
            display: "flex", flexDirection: "column", gap: 16,
            animationDelay: "240ms",
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Shield style={{ width: 17, height: 17, color: "#fbbf24" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 800, color: "#f1f5f9" }}>System Pass Overview</h2>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{paginationMeta.totalRecords} total records</p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", width: 240 }}>
              <Search style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#64748b" }} />
              <input
                type="text"
                placeholder="Search records…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px 10px 40px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "#e2e8f0",
                  fontSize: 13.5, fontWeight: 500,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.18s, box-shadow 0.18s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#f59e0b"; e.target.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.10)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

          {/* Row list */}
          <div className="scb" style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredData.map((req) => {
              const status = (req.status || "pending").toLowerCase();
              const initial = (req.entityName || "?").charAt(0).toUpperCase();
              const darkBadge = {
                approved: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.30)", color: "#6ee7b7" },
                pending:  { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.30)", color: "#fcd34d" },
                rejected: { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.30)",  color: "#fca5a5" },
              };
              const badge = darkBadge[status] || darkBadge.pending;
              return (
                <div
                  key={req.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 14,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    gap: 14,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: "linear-gradient(135deg, #f59e0b, #f97316)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 900, color: "#0f172a",
                      boxShadow: "0 2px 8px rgba(245,158,11,0.25)",
                    }}>
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {req.entityName || "Unknown"}
                      </h4>
                      <p style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                        {req.referenceNumber}
                        {req.email && <span style={{ color: "#475569" }}> · {req.email}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="chip"
                    style={{
                      flexShrink: 0,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      fontWeight: 800, fontSize: 10.5,
                    }}
                  >
                    {status}
                  </span>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div style={{ padding: "56px 0", textAlign: "center" }}>
                <ShieldAlert style={{ width: 38, height: 38, color: "#475569", margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: 13.5, color: "#64748b", fontWeight: 600 }}>No records found</p>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 4, opacity: 0.7 }}>Try adjusting your search query.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
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

        {/* ─────────────────────────────────────────
            DATA INGESTION
        ───────────────────────────────────────── */}
        <div className="anim-fade-up" style={{ animationDelay: "300ms" }}>
          <DataIngestionProvidersMatrix />
        </div>

        {/* ─────────────────────────────────────────
            CREATE ADMIN MODAL
        ───────────────────────────────────────── */}
        {showCreateAdmin && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
              background: "rgba(15,17,30,0.5)",
              backdropFilter: "blur(16px)",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateAdmin(false); setFieldErrors({}); setCreateMessage({ type: "", text: "" }); } }}
          >
            <div
              className="scb anim-fade-up"
              style={{
                width: "100%", maxWidth: 640, maxHeight: "92vh",
                overflowY: "auto", borderRadius: 28, position: "relative",
                background: "#ffffff",
                border: `1px solid ${T.borderBase}`,
                boxShadow: T.shadowXl,
              }}
            >
              {/* Modal header with gradient */}
              <div style={{
                height: 110, borderRadius: "28px 28px 0 0",
                position: "relative", overflow: "hidden",
                background: "linear-gradient(135deg, #92400e 0%, #b45309 35%, #d97706 65%, #f59e0b 100%)",
              }}>
                {/* Decorative blobs */}
                <div style={{ position: "absolute", top: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.10)", filter: "blur(30px)" }} />
                <div style={{ position: "absolute", bottom: -40, right: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(124,58,237,0.25)", filter: "blur(40px)" }} />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.25)" }} />

                {/* Close button */}
                <button
                  onClick={() => { setShowCreateAdmin(false); setFieldErrors({}); setCreateMessage({ type: "", text: "" }); }}
                  style={{
                    position: "absolute", top: 16, right: 16,
                    width: 34, height: 34, borderRadius: 10,
                    background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#fff", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Floating icon */}
              <div style={{
                position: "absolute", top: 76, left: 32,
                width: 68, height: 68, borderRadius: 18,
                background: "linear-gradient(135deg, #fef3c7, #fed7aa)",
                border: "3px solid #ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(245,158,11,0.25)",
              }}>
                <UserPlus style={{ width: 28, height: 28, color: "#d97706" }} />
              </div>

              {/* Body */}
              <div style={{ padding: "56px 32px 32px" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, letterSpacing: "-0.03em", marginBottom: 5 }}>
                  Create new account
                </h2>
                <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 26 }}>
                  Register a new department administrator to access the console.
                </p>

                {/* Status message */}
                {createMessage.text && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "13px 16px", borderRadius: 14, marginBottom: 22,
                    background: createMessage.type === "success" ? T.greenLight : T.redLight,
                    border: `1px solid ${createMessage.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}>
                    {createMessage.type === "success"
                      ? <CheckCircle2 style={{ width: 15, height: 15, color: T.green, flexShrink: 0, marginTop: 1 }} />
                      : <AlertCircle style={{ width: 15, height: 15, color: T.red, flexShrink: 0, marginTop: 1 }} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: createMessage.type === "success" ? T.green : T.red }}>
                      {createMessage.text}
                    </span>
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} noValidate style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>

                  {/* Username */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={LabelStyle}>Username</label>
                    <div style={{ position: "relative" }}>
                      <User style={IconStyle(fieldErrors.userName)} />
                      <input
                        type="text" value={newAdmin.userName}
                        onChange={(e) => { setNewAdmin({ ...newAdmin, userName: e.target.value }); if (fieldErrors.userName) setFieldErrors({ ...fieldErrors, userName: "" }); }}
                        placeholder="e.g. Aarav Sharma"
                        className={`inp ${fieldErrors.userName ? "err" : ""}`}
                      />
                    </div>
                    {fieldErrors.userName && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.userName}</p>}
                  </div>

                  {/* Employee ID */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={LabelStyle}>Employee ID</label>
                    <div style={{ position: "relative" }}>
                      <IdCard style={IconStyle(fieldErrors.employeeId)} />
                      <input
                        type="text" maxLength={50} value={newAdmin.employeeId}
                        onChange={(e) => { setNewAdmin({ ...newAdmin, employeeId: e.target.value }); if (fieldErrors.employeeId) setFieldErrors({ ...fieldErrors, employeeId: "" }); }}
                        placeholder="EMP-001"
                        className={`inp ${fieldErrors.employeeId ? "err" : ""}`}
                      />
                    </div>
                    {fieldErrors.employeeId && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.employeeId}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={LabelStyle}>Email</label>
                    <div style={{ position: "relative" }}>
                      <Mail style={IconStyle(fieldErrors.email)} />
                      <input
                        type="email" value={newAdmin.email}
                        onChange={(e) => { setNewAdmin({ ...newAdmin, email: e.target.value }); if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" }); }}
                        placeholder="name@company.com"
                        className={`inp ${fieldErrors.email ? "err" : ""}`}
                      />
                    </div>
                    {fieldErrors.email && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={LabelStyle}>Phone Number</label>
                    <div style={{ position: "relative" }}>
                      <Phone style={IconStyle(fieldErrors.phoneNumber)} />
                      <span style={{ position: "absolute", left: 36, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textMuted, fontWeight: 600, pointerEvents: "none", zIndex: 1 }}>+91</span>
                      <input
                        type="tel" inputMode="numeric" maxLength={10} value={newAdmin.phoneNumber}
                        onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); setNewAdmin({ ...newAdmin, phoneNumber: d }); if (fieldErrors.phoneNumber) setFieldErrors({ ...fieldErrors, phoneNumber: "" }); }}
                        placeholder="98765 43210"
                        className={`inp ${fieldErrors.phoneNumber ? "err" : ""}`}
                        style={{ paddingLeft: 60 }}
                      />
                    </div>
                    {fieldErrors.phoneNumber && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.phoneNumber}</p>}
                  </div>

                  {/* Role */}
                  <div>
                    <label style={LabelStyle}>Role</label>
                    <div style={{ position: "relative" }}>
                      <Briefcase style={IconStyle(fieldErrors.roleId)} />
                      <select
                        value={newAdmin.roleId}
                        onChange={(e) => { setNewAdmin({ ...newAdmin, roleId: e.target.value }); if (fieldErrors.roleId) setFieldErrors({ ...fieldErrors, roleId: "" }); }}
                        className={`sel ${fieldErrors.roleId ? "err" : ""}`}
                      >
                        <option value="">— Select role —</option>
                        {formOptions.roles.map((r) => <option key={r.id} value={r.id}>{r.roleName}</option>)}
                      </select>
                      <ChevronDown style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: T.textMuted, pointerEvents: "none", zIndex: 1 }} />
                    </div>
                    {fieldErrors.roleId && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.roleId}</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label style={LabelStyle}>Department</label>
                    <div style={{ position: "relative" }}>
                      <Building2 style={IconStyle(fieldErrors.departmentId)} />
                      <select
                        value={newAdmin.departmentId}
                        onChange={(e) => { setNewAdmin({ ...newAdmin, departmentId: e.target.value }); if (fieldErrors.departmentId) setFieldErrors({ ...fieldErrors, departmentId: "" }); }}
                        className={`sel ${fieldErrors.departmentId ? "err" : ""}`}
                      >
                        <option value="">— Select department —</option>
                        {formOptions.departments.map((d) => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                      </select>
                      <ChevronDown style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: T.textMuted, pointerEvents: "none", zIndex: 1 }} />
                    </div>
                    {fieldErrors.departmentId && <p style={ErrStyle}><AlertCircle style={{ width: 12, height: 12 }} />{fieldErrors.departmentId}</p>}
                  </div>

                  {/* Default Password (readonly) */}
                  <div>
                    <label style={LabelStyle}>Default Password</label>
                    <div style={{ position: "relative" }}>
                      <KeyRound style={IconStyle(false)} />
                      <input type="text" value={newAdmin.password} readOnly className="inp" style={{ opacity: 0.55, cursor: "not-allowed" }} />
                    </div>
                    <p style={{ marginTop: 5, fontSize: 11, color: T.textMuted }}>Temporary — user changes on first login</p>
                  </div>

                  {/* Confirm Password (readonly) */}
                  <div>
                    <label style={LabelStyle}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <KeyRound style={IconStyle(false)} />
                      <input type="text" value={newAdmin.confirmPassword} readOnly className="inp" style={{ opacity: 0.55, cursor: "not-allowed" }} />
                    </div>
                    <p style={{ marginTop: 5, fontSize: 11, color: T.textMuted }}>Auto-matched with default</p>
                  </div>

                  {/* Divider */}
                  <div style={{ gridColumn: "1 / -1", height: 1, background: T.borderBase, margin: "4px 0" }} />

                  {/* Action buttons */}
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => { setShowCreateAdmin(false); setFieldErrors({}); setCreateMessage({ type: "", text: "" }); }}
                      className="btn-ghost"
                      style={{
                        padding: "11px 22px", borderRadius: 12,
                        fontSize: 13.5, fontWeight: 700,
                        background: T.bgMuted, border: `1px solid ${T.borderBase}`,
                        color: T.textSecondary, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="btn-ghost"
                      style={{
                        padding: "11px 22px", borderRadius: 12,
                        fontSize: 13.5, fontWeight: 700,
                        background: T.bgMuted, border: `1px solid ${T.borderBase}`,
                        color: T.textSecondary, cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "11px 24px", borderRadius: 12,
                        fontSize: 13.5, fontWeight: 800,
                        background: submitting
                          ? "rgba(251,191,36,0.45)"
                          : "linear-gradient(135deg, #f59e0b, #f97316)",
                        border: "none", color: "#0f1219",
                        cursor: submitting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: submitting ? "none" : "0 4px 20px rgba(251,191,36,0.28)",
                        transition: "transform 0.18s, box-shadow 0.18s",
                      }}
                      onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(251,191,36,0.40)"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = submitting ? "none" : "0 4px 20px rgba(251,191,36,0.28)"; }}
                    >
                      {submitting
                        ? <><Loader2 style={{ width: 15, height: 15 }} className="anim-spin" />Creating…</>
                        : <><UserPlus style={{ width: 15, height: 15 }} />Register Admin</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
