"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldAlert,
  FileText,
  User,
  Truck,
  Building,
  PlusCircle,
  Check,
  XCircle,
  Ban,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  Timer,
  Eye,
  Banknote,
  CircleDollarSign,
  TrendingUp,
  Car,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
  IdCard,
  Briefcase,
  Shield,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const getAuthHeaders = () => {
  let token = localStorage.getItem("accessToken");
  if (!token) return {};
  token = token.replace(/^["']|["']$/g, "");
  return { Authorization: `Bearer ${token}` };
};

/* ─── Formatters & Helpers ─── */
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtTime = (d, isExpiry = false) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const hasTime = dt.getHours() !== 0 || dt.getMinutes() !== 0 || dt.getSeconds() !== 0;
  if (hasTime) {
    return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  return isExpiry ? "11:59 PM (23:59)" : "12:00 AM (00:00)";
};
const fmtMoney = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const severityColor = (days) => {
  const d = parseInt(days, 10);
  if (d >= 30) return { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "CRITICAL OVERSTAY" };
  if (d >= 14) return { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "HIGH" };
  if (d >= 7) return { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "MEDIUM" };
  return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "LOW" };
};

const statusConfig = {
  PENDING: { bg: "bg-red-50 text-red-700 border-red-200", icon: <Clock className="h-3.5 w-3.5 text-red-500" />, dot: "bg-red-500 animate-pulse" },
  PAID: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, dot: "bg-emerald-500" },
  EXCEPTION_REQUESTED: { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />, dot: "bg-amber-500 animate-bounce" },
  EXCEPTION_APPROVED: { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Check className="h-3.5 w-3.5 text-blue-500" />, dot: "bg-blue-500" },
  EXCEPTION_REJECTED: { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="h-3.5 w-3.5 text-rose-500" />, dot: "bg-rose-500" },
  WAIVED: { bg: "bg-slate-100 text-slate-600 border-slate-200", icon: <Ban className="h-3.5 w-3.5 text-slate-400" />, dot: "bg-slate-400" },
};

const passDuration = (from, to) => {
  if (!from || !to) return "—";
  const diff = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
  return `${diff} day${diff !== 1 ? "s" : ""}`;
};

export default function ATMOverstayPage() {
  const [activeTab, setActiveTab] = useState("detect");
  const [loading, setLoading] = useState(false);
  const [detectedList, setDetectedList] = useState([]);
  const [chargesList, setChargesList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Expandable row state
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Levy Modal
  const [levyModalOpen, setLevyModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [levyNotes, setLevyNotes] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCharge, setDetailCharge] = useState(null);

  /* ─── FETCH DATA ─── */
  const fetchDetected = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/detect`, { headers: getAuthHeaders() });
      if (res.data?.success) setDetectedList(res.data.data || []);
    } catch (err) {
      console.error("Fetch detected overstays error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to load overstay detections");
    } finally { setLoading(false); }
  };

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "ALL" ? `${ADMIN_API}/overstay/charges?status=${statusFilter}` : `${ADMIN_API}/overstay/charges`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      if (res.data?.success) setChargesList(res.data.data || []);
    } catch (err) {
      console.error("Fetch overstay charges error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to load levied charges");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    setExpandedRowId(null);
    if (activeTab === "detect") fetchDetected();
    else fetchCharges();
  }, [activeTab, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  /* ─── ACTIONS ─── */
  const openLevyModal = (item) => {
    setSelectedEntity(item);
    setLevyNotes("");
    setCustomRate(item.daily_rate);
    setLevyModalOpen(true);
  };

  const handleLevySubmit = async () => {
    if (!selectedEntity) return;
    setSubmitting(true);
    try {
      const rate = parseFloat(customRate || selectedEntity.daily_rate);
      const days = parseInt(selectedEntity.overstay_days, 10);
      const total = rate * days;
      const payload = {
        entity_type: selectedEntity.entity_type,
        entity_id: selectedEntity.entity_id,
        pass_request_id: selectedEntity.pass_request_id,
        agent_id: selectedEntity.agent_id,
        identifier: selectedEntity.identifier,
        entity_name: selectedEntity.entity_name,
        pass_no: selectedEntity.pass_no,
        date_from: selectedEntity.date_from,
        date_to: selectedEntity.date_to,
        overstay_days: days,
        daily_rate: rate,
        total_amount: total,
        notes: levyNotes.trim(),
      };
      const res = await axios.post(`${ADMIN_API}/overstay/levy`, payload, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success(`Levied ${fmtMoney(total)} on ${selectedEntity.identifier}`);
        setLevyModalOpen(false);
        fetchDetected();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to levy charge");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaive = async (chargeId) => {
    if (!confirm("Are you sure you want to manually waive this overstay charge?")) return;
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${chargeId}/waive`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("Charge waived successfully");
        fetchCharges();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to waive charge");
    }
  };

  /* ─── FILTERS & PAGINATION COMPUTATIONS ─── */
  const filteredDetected = useMemo(() => {
    if (!searchQuery) return detectedList;
    const q = searchQuery.toLowerCase();
    return detectedList.filter((i) =>
      i.identifier?.toLowerCase().includes(q) ||
      i.entity_name?.toLowerCase().includes(q) ||
      i.pass_no?.toLowerCase().includes(q) ||
      i.company_name?.toLowerCase().includes(q) ||
      i.login_id?.toLowerCase().includes(q)
    );
  }, [detectedList, searchQuery]);

  const filteredCharges = useMemo(() => {
    if (!searchQuery) return chargesList;
    const q = searchQuery.toLowerCase();
    return chargesList.filter((i) =>
      i.identifier?.toLowerCase().includes(q) ||
      i.entity_name?.toLowerCase().includes(q) ||
      i.company_name?.toLowerCase().includes(q) ||
      i.pass_no?.toLowerCase().includes(q) ||
      i.login_id?.toLowerCase().includes(q)
    );
  }, [chargesList, searchQuery]);

  const currentList = activeTab === "detect" ? filteredDetected : filteredCharges;
  const totalItems = currentList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedData = useMemo(() => {
    return currentList.slice(startIndex, startIndex + pageSize);
  }, [currentList, startIndex, pageSize]);

  const detectStats = useMemo(() => {
    const persons = filteredDetected.filter((d) => d.entity_type === "PERSON").length;
    const vehicles = filteredDetected.filter((d) => d.entity_type === "VEHICLE").length;
    const totalFine = filteredDetected.reduce((s, d) => s + (d.total_amount || 0), 0);
    const maxDays = filteredDetected.reduce((m, d) => Math.max(m, parseInt(d.overstay_days || 0, 10)), 0);
    return { persons, vehicles, totalFine, maxDays, total: filteredDetected.length };
  }, [filteredDetected]);

  const chargeStats = useMemo(() => {
    const pending = filteredCharges.filter((c) => c.status === "PENDING");
    const paid = filteredCharges.filter((c) => c.status === "PAID");
    const totalPending = pending.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0);
    const totalCollected = paid.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0);
    return { pending: pending.length, paid: paid.length, totalPending, totalCollected, total: filteredCharges.length };
  }, [filteredCharges]);

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-10">
      
      {/* ══════════════ TOP HERO HEADER ══════════════ */}
      <div className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Clock className="w-64 h-64 text-white" />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> ATM Pass Section Control
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Overstay Charges Management
            </h2>
            <p className="text-xs md:text-sm text-blue-100/80 font-medium mt-1 max-w-2xl">
              Real-time pass expiry detection, automated penalty assessment, and full audit control (§5.6.7)
            </p>
          </div>

          <button
            onClick={() => (activeTab === "detect" ? fetchDetected() : fetchCharges())}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs shadow-inner backdrop-blur-md border border-white/20 transition-all active:scale-95 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ══════════════ TAB NAVIGATION & CONTROLS ══════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        
        {/* Main Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setActiveTab("detect")}
            className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "detect"
                ? "bg-[#0a1e4d] text-white shadow-md shadow-[#0a1e4d]/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Detected Overstays
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === "detect" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>{detectedList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("charges")}
            className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "charges"
                ? "bg-[#0a1e4d] text-white shadow-md shadow-[#0a1e4d]/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            Levied Charges Log
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === "charges" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>{chargesList.length}</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === "charges" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="EXCEPTION_REQUESTED">EXCEPTION REQUESTED</option>
                <option value="EXCEPTION_APPROVED">EXCEPTION APPROVED</option>
                <option value="EXCEPTION_REJECTED">EXCEPTION REJECTED</option>
                <option value="WAIVED">WAIVED</option>
              </select>
            </div>
          )}

          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Pass No, Company, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#0a1e4d]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ══════════════ STATS CARDS BAR ══════════════ */}
      {activeTab === "detect" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Overstays", value: detectStats.total, color: "border-slate-200", textColor: "text-[#0a1e4d]", icon: <Layers className="h-3.5 w-3.5 text-blue-600" /> },
            { label: "Person Overstays", value: detectStats.persons, color: "border-teal-200 bg-teal-50/30", textColor: "text-teal-700", icon: <User className="h-3.5 w-3.5 text-teal-600" /> },
            { label: "Vehicle Overstays", value: detectStats.vehicles, color: "border-blue-200 bg-blue-50/30", textColor: "text-blue-700", icon: <Truck className="h-3.5 w-3.5 text-blue-600" /> },
            { label: "Max Overstay", value: `${detectStats.maxDays} Days`, color: "border-amber-200 bg-amber-50/30", textColor: "text-amber-700", icon: <Timer className="h-3.5 w-3.5 text-amber-600" /> },
            { label: "Uncollected Fine", value: fmtMoney(detectStats.totalFine), color: "border-red-200 bg-red-50/30", textColor: "text-red-700", icon: <CircleDollarSign className="h-3.5 w-3.5 text-red-600" /> },
          ].map((card, idx) => (
            <div key={idx} className={`bg-white rounded-2xl border ${card.color} p-4 shadow-sm transition-all hover:shadow-md`}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                {card.icon} {card.label}
              </p>
              <p className={`text-xl font-black ${card.textColor} mt-1`}>{card.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Levied", value: chargeStats.total, color: "border-slate-200", textColor: "text-[#0a1e4d]", icon: <FileText className="h-3.5 w-3.5 text-slate-600" /> },
            { label: "Pending Payment", value: chargeStats.pending, color: "border-red-200 bg-red-50/30", textColor: "text-red-700", icon: <Clock className="h-3.5 w-3.5 text-red-600" /> },
            { label: "Fully Settled", value: chargeStats.paid, color: "border-emerald-200 bg-emerald-50/30", textColor: "text-emerald-700", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> },
            { label: "Pending Amount", value: fmtMoney(chargeStats.totalPending), color: "border-amber-200 bg-amber-50/30", textColor: "text-amber-700", icon: <TrendingUp className="h-3.5 w-3.5 text-amber-600" /> },
            { label: "Total Collected", value: fmtMoney(chargeStats.totalCollected), color: "border-emerald-200 bg-emerald-50/30", textColor: "text-emerald-700", icon: <Banknote className="h-3.5 w-3.5 text-emerald-600" /> },
          ].map((card, idx) => (
            <div key={idx} className={`bg-white rounded-2xl border ${card.color} p-4 shadow-sm transition-all hover:shadow-md`}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                {card.icon} {card.label}
              </p>
              <p className={`text-xl font-black ${card.textColor} mt-1`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN DATA TABLE LIST (SIDEWISE & VERTICAL SCROLL)*/}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col">
        
        {/* Scrollable Table viewport */}
        <div className="overflow-x-auto overflow-y-auto max-h-[580px] custom-scrollbar">
          {loading ? (
            <div className="p-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-10 w-10 animate-spin text-[#0a1e4d]" />
              <p className="font-bold text-sm text-slate-700">Querying database for overstay records...</p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-bold text-slate-700 text-base">No Matching Records Found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                All passes are within valid dates or your current filter query returned zero entries.
              </p>
            </div>
          ) : activeTab === "detect" ? (
            
            /* ──────────────── TAB 1: DETECTED OVERSTAYS LIST ──────────────── */
            <table className="w-full min-w-[1300px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">#</th>
                  <th className="px-4 py-4">Entity Type</th>
                  <th className="px-4 py-4">Identifier & Name</th>
                  <th className="px-4 py-4">Firm / Company</th>
                  <th className="px-4 py-4">Pass Ref #</th>
                  <th className="px-4 py-4">Entry Date</th>
                  <th className="px-4 py-4">Expiry Date</th>
                  <th className="px-4 py-4">Duration</th>
                  <th className="px-4 py-4">Overstay</th>
                  <th className="px-4 py-4">Severity</th>
                  <th className="px-4 py-4">Daily Rate</th>
                  <th className="px-4 py-4">Calculated Fine</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedData.map((item, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  const sev = severityColor(item.overstay_days);
                  const isExpanded = expandedRowId === `d-${idx}`;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : `d-${idx}`)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-400 text-center">{globalIdx}</td>
                        
                        {/* Type */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider border ${
                            item.entity_type === "VEHICLE"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}>
                            {item.entity_type === "VEHICLE" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {item.entity_type === "VEHICLE" ? "VEH" : "PER"}
                          </span>
                        </td>

                        {/* Identifier */}
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-[#0a1e4d] uppercase font-mono">{item.identifier}</p>
                          {item.entity_name && item.entity_name !== item.identifier && (
                            <p className="text-[11px] text-slate-500 font-medium">{item.entity_name}</p>
                          )}
                          {item.vehicle_type_name && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                              <Car className="h-2.5 w-2.5" /> {item.vehicle_type_name}
                            </p>
                          )}
                        </td>

                        {/* Company */}
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{item.company_name || "—"}</p>
                          {item.login_id && <p className="text-[10px] text-slate-400 font-mono">{item.login_id}</p>}
                        </td>

                        {/* Pass No */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-600">{item.pass_no || "—"}</td>

                        {/* Entry Date */}
                        <td className="px-4 py-3.5 font-semibold text-emerald-700">
                          <div>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              <CalendarDays className="h-3 w-3 text-emerald-500" />
                              {fmtDate(item.date_from)}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                              {fmtTime(item.date_from, false)}
                            </p>
                          </div>
                        </td>

                        {/* Expiry Date */}
                        <td className="px-4 py-3.5 font-semibold text-red-600">
                          <div>
                            <span className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                              <CalendarClock className="h-3 w-3 text-red-500" />
                              {fmtDate(item.date_to)}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                              {fmtTime(item.date_to, true)}
                            </p>
                          </div>
                        </td>

                        {/* Pass Duration */}
                        <td className="px-4 py-3.5 text-slate-500 font-medium">{passDuration(item.date_from, item.date_to)}</td>

                        {/* Overstay */}
                        <td className="px-4 py-3.5">
                          <span className="font-black text-red-700 bg-red-100/70 px-2.5 py-1 rounded-full border border-red-200">
                            {item.overstay_days} day{parseInt(item.overstay_days, 10) !== 1 ? "s" : ""}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[10px] border ${sev.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                            {sev.label}
                          </span>
                        </td>

                        {/* Daily Rate */}
                        <td className="px-4 py-3.5 font-bold text-slate-600">{fmtMoney(item.daily_rate)}/day</td>

                        {/* Total Fine */}
                        <td className="px-4 py-3.5 font-black text-slate-900 text-sm">{fmtMoney(item.total_amount)}</td>

                        {/* Action Button */}
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openLevyModal(item)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl font-bold shadow-md hover:from-red-700 hover:to-rose-800 transition-all flex items-center gap-1.5 mx-auto active:scale-95"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Levy Fine
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Detail Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={13} className="px-6 py-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pass Reference</p>
                                <p className="font-mono font-bold text-[#0a1e4d]">{item.pass_no || "N/A"}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Pass Request ID: #{item.pass_request_id || "N/A"}</p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Validity Timeline</p>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{fmtDate(item.date_from)}</span>
                                  <ArrowRight className="h-3 w-3 text-slate-400" />
                                  <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">{fmtDate(item.date_to)}</span>
                                </div>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calculation Breakdown</p>
                                <p className="font-mono text-slate-700">
                                  <span className="font-bold">{item.overstay_days}</span> days × <span className="font-bold">{fmtMoney(item.daily_rate)}</span> = <span className="font-black text-red-700 text-sm">{fmtMoney(item.total_amount)}</span>
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Port Firm</p>
                                <p className="font-bold text-slate-800">{item.company_name || "Direct Holder"}</p>
                                <p className="text-[10px] text-slate-400">Agent ID: #{item.agent_id}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            
            /* ──────────────── TAB 2: LEVIED CHARGES LOG ──────────────── */
            <table className="w-full min-w-[1300px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="px-4 py-4 w-16">Ref #</th>
                  <th className="px-4 py-4">Company / Agent</th>
                  <th className="px-4 py-4">Entity & Identifier</th>
                  <th className="px-4 py-4">Pass No</th>
                  <th className="px-4 py-4">Entry Date</th>
                  <th className="px-4 py-4">Expiry Date</th>
                  <th className="px-4 py-4">Overstay / Rate</th>
                  <th className="px-4 py-4">Total Penalty</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedData.map((charge) => {
                  const sc = statusConfig[charge.status] || statusConfig.PENDING;
                  const sev = severityColor(charge.overstay_days);

                  return (
                    <tr key={charge.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-500">#{charge.id}</td>

                      {/* Company */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{charge.company_name || "—"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{charge.login_id || "Agent #" + charge.agent_id}</p>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider border ${
                            charge.entity_type === "VEHICLE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}>
                            {charge.entity_type === "VEHICLE" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {charge.entity_type === "VEHICLE" ? "VEH" : "PER"}
                          </span>
                          <div>
                            <p className="font-extrabold text-[#0a1e4d] uppercase font-mono">{charge.identifier}</p>
                            {charge.entity_name && charge.entity_name !== charge.identifier && (
                              <p className="text-[10px] text-slate-500 font-medium">{charge.entity_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pass No */}
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-600">{charge.pass_no || "—"}</td>

                      {/* Entry Date */}
                      <td className="px-4 py-3.5 font-semibold text-emerald-700">
                        <div>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {fmtDate(charge.date_from)}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                            {fmtTime(charge.date_from, false)}
                          </p>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3.5 font-semibold text-red-600">
                        <div>
                          <span className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {fmtDate(charge.date_to)}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                            {fmtTime(charge.date_to, true)}
                          </p>
                        </div>
                      </td>

                      {/* Overstay / Rate */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[10px] border ${sev.bg}`}>
                          {charge.overstay_days}d
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{fmtMoney(charge.daily_rate)}/d</p>
                      </td>

                      {/* Total Penalty */}
                      <td className="px-4 py-3.5 font-black text-slate-900 text-sm">{fmtMoney(charge.total_amount)}</td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border ${sc.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {charge.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => { setDetailCharge(charge); setDetailModalOpen(true); }}
                            className="p-1.5 border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all shadow-sm"
                            title="View Full Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {charge.status !== "PAID" && charge.status !== "WAIVED" && (
                            <button
                              onClick={() => handleWaive(charge.id)}
                              className="px-3 py-1.5 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 text-red-600 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                            >
                              Waive
                            </button>
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

        {/* ══════════════ FOOTER PAGINATION BAR ══════════════ */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            
            {/* Info */}
            <div className="flex items-center gap-4 text-slate-500 font-semibold">
              <span>
                Showing <strong className="text-slate-900">{Math.min(startIndex + 1, totalItems)}</strong> to{" "}
                <strong className="text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</strong> of{" "}
                <strong className="text-slate-900">{totalItems}</strong> entries
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0a1e4d]/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400 font-bold">…</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-sm ${
                            page === p
                              ? "bg-gradient-to-r from-[#0a1e4d] to-[#122b68] text-white shadow-blue-950/20"
                              : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ LEVY CHARGE MODAL ══════════════ */}
      {levyModalOpen && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white flex justify-between items-center border-b border-white/10">
              <h3 className="font-black text-base flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-red-400" /> Levy Overstay Fine
              </h3>
              <button
                onClick={() => setLevyModalOpen(false)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Entity card summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${
                    selectedEntity.entity_type === "VEHICLE" ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-teal-50 border-teal-200 text-teal-600"
                  }`}>
                    {selectedEntity.entity_type === "VEHICLE" ? <Truck className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-extrabold text-[#0a1e4d] uppercase text-sm font-mono">{selectedEntity.identifier}</p>
                    <p className="text-xs text-slate-500 font-medium">{selectedEntity.entity_name || selectedEntity.entity_type} • {selectedEntity.company_name || "N/A"}</p>
                  </div>
                </div>

                {/* Validity timeline */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pass Validity Period</p>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="text-center flex-1 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <p className="text-[9px] font-bold text-emerald-600 uppercase">Entry</p>
                      <p className="font-mono font-bold text-emerald-800 mt-0.5">{fmtDate(selectedEntity.date_from)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="text-center flex-1 bg-red-50 p-2 rounded-lg border border-red-200">
                      <p className="text-[9px] font-bold text-red-600 uppercase">Expiry</p>
                      <p className="font-mono font-bold text-red-800 mt-0.5">{fmtDate(selectedEntity.date_to)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-500">Total Overstay:</span>
                  <span className="font-black text-red-700 bg-red-100/80 px-2.5 py-0.5 rounded-full border border-red-200">
                    {selectedEntity.overstay_days} Days Overdue
                  </span>
                </div>
              </div>

              {/* Daily Rate field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Daily Penalty Rate (₹)
                </label>
                <input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#0a1e4d]/20 transition-all"
                />
              </div>

              {/* Total Calculation Card */}
              <div className="bg-gradient-to-br from-red-50 to-rose-100/50 p-4 rounded-2xl border border-red-200">
                <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest mb-1">Calculated Total Fine</p>
                <p className="text-xs text-red-700 font-mono mb-1">
                  {selectedEntity.overstay_days} days × {fmtMoney(customRate || selectedEntity.daily_rate)}/day
                </p>
                <p className="text-3xl font-black text-red-900">
                  {fmtMoney(parseFloat(customRate || selectedEntity.daily_rate) * parseInt(selectedEntity.overstay_days, 10))}
                </p>
              </div>

              {/* Official Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Official Remarks / Justification
                </label>
                <textarea
                  rows={3}
                  value={levyNotes}
                  onChange={(e) => setLevyNotes(e.target.value)}
                  placeholder="Provide reason or terminal location details..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0a1e4d]/20 transition-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setLevyModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleLevySubmit}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                {submitting ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Levying...</>
                ) : (
                  <><ShieldAlert className="h-3.5 w-3.5" /> Confirm &amp; Levy Fine</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CHARGE DETAIL MODAL ══════════════ */}
      {detailModalOpen && detailCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white flex justify-between items-center border-b border-white/10">
              <h3 className="font-black text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-300" /> Charge Log Record #{detailCharge.id}
              </h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {(() => {
                  const sc = statusConfig[detailCharge.status] || statusConfig.PENDING;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full border ${sc.bg}`}>
                      {sc.icon} {detailCharge.status.replace(/_/g, " ")}
                    </span>
                  );
                })()}
                <span className="text-[11px] font-mono text-slate-400">Levied: {fmtDateTime(detailCharge.levied_at)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Company</p>
                  <p className="font-bold text-slate-800 mt-1">{detailCharge.company_name || "Direct Pass Holder"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Agent Login</p>
                  <p className="font-bold text-slate-800 mt-1 font-mono">{detailCharge.login_id || "Agent #" + detailCharge.agent_id}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Entity &amp; ID</p>
                  <p className="font-extrabold text-[#0a1e4d] font-mono mt-1">{detailCharge.entity_type} — {detailCharge.identifier}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pass No</p>
                  <p className="font-mono font-bold text-slate-800 mt-1">{detailCharge.pass_no || "N/A"}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Validity Period</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-center flex-1">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">Entry</p>
                    <p className="font-mono font-bold text-emerald-800">{fmtDate(detailCharge.date_from)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 mx-2" />
                  <div className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 text-center flex-1">
                    <p className="text-[9px] font-bold text-red-600 uppercase">Expired</p>
                    <p className="font-mono font-bold text-red-800">{fmtDate(detailCharge.date_to)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-extrabold text-red-600 uppercase mb-1">Penalty Breakdown</p>
                  <p className="text-xs text-red-700 font-mono">{detailCharge.overstay_days} days × {fmtMoney(detailCharge.daily_rate)}/day</p>
                </div>
                <p className="text-3xl font-black text-red-900">{fmtMoney(detailCharge.total_amount)}</p>
              </div>

              {detailCharge.payment_method && (
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs">
                  <p className="text-[10px] font-extrabold text-emerald-600 uppercase mb-1">Payment Settlement</p>
                  <p className="text-emerald-800 font-medium">Method: <strong>{detailCharge.payment_method}</strong> | Transaction Ref: <strong className="font-mono">{detailCharge.transaction_id || "—"}</strong></p>
                </div>
              )}

              {detailCharge.exception_reason && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs">
                  <p className="text-[10px] font-extrabold text-amber-600 uppercase mb-1">Exception Request Justification</p>
                  <p className="text-amber-900 font-medium">&ldquo;{detailCharge.exception_reason}&rdquo;</p>
                  {detailCharge.exception_decided_by && (
                    <p className="text-amber-700 text-[11px] mt-1.5 pt-1.5 border-t border-amber-200/60">
                      Decided by: <strong>{detailCharge.exception_decided_by}</strong> at {fmtDateTime(detailCharge.exception_decided_at)}
                    </p>
                  )}
                </div>
              )}

              {detailCharge.notes && (
                <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-xs">
                  <p className="text-[10px] font-extrabold text-blue-600 uppercase mb-1">Official Notes</p>
                  <p className="text-blue-900 font-medium">{detailCharge.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setDetailModalOpen(false)} className="px-5 py-2 bg-[#0a1e4d] hover:bg-[#0d2660] text-white font-bold rounded-xl text-xs transition-all shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
