"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Sparkles,
  Layers,
  Mail,
  ThumbsUp,
  ThumbsDown,
  Gavel,
  History,
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
  NOTIFIED: { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <Mail className="h-3.5 w-3.5 text-indigo-500" />, dot: "bg-indigo-500" },
  PAID: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, dot: "bg-emerald-500" },
  EXCEPTION_REQUESTED: { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />, dot: "bg-amber-500 animate-bounce" },
  EXCEPTION_APPROVED: { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Check className="h-3.5 w-3.5 text-blue-500" />, dot: "bg-blue-500" },
  EXCEPTION_REJECTED: { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="h-3.5 w-3.5 text-rose-500" />, dot: "bg-rose-500" },
  WAIVED: { bg: "bg-slate-100 text-slate-600 border-slate-200", icon: <Ban className="h-3.5 w-3.5 text-slate-400" />, dot: "bg-slate-400" },
};

const formatPassType = (passType, dateFrom, dateTo) => {
  if (passType) {
    const pt = String(passType).trim().toUpperCase();
    if (pt === "DAILY" || pt === "1") return "Daily";
    if (pt === "MONTHLY" || pt === "2") return "Monthly";
    if (pt === "YEARLY" || pt === "ANNUAL" || pt === "3") return "Annual";
    return pt.charAt(0).toUpperCase() + pt.slice(1).toLowerCase();
  }
  if (!dateFrom || !dateTo) return "—";
  const diff = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return "Daily";
  if (diff <= 90) return "Monthly";
  return "Annual";
};

// An approved exception is functionally a waiver, and a rejected exception simply
// falls back to being payable — the Charges log only ever needs to reflect these
// three end-states. Appeals in progress live exclusively in the Appeals tab.
const effectiveStatus = (status) => {
  if (status === "EXCEPTION_APPROVED") return "WAIVED";
  if (status === "EXCEPTION_REJECTED") return "PENDING";
  return status;
};

// Unique key for a detected (un-levied) overstay row, used for bulk selection.
const detectedKey = (item) =>
  `${item.entity_type}|${item.entity_id ?? ""}|${item.pass_request_id ?? ""}|${item.identifier}|${item.date_from}`;

// Shared identity key across detected rows and charge rows.
const overstayIdentityKey = (item) =>
  `${item.entity_type}|${item.entity_id ?? ""}|${item.pass_request_id ?? ""}`;

/* ─── Date-range quick filter ─── */
const DATE_RANGE_OPTIONS = [
  { key: "ALL", label: "All Time" },
  { key: "7D", label: "Past 1 Week" },
  { key: "30D", label: "Past 1 Month" },
  { key: "CUSTOM", label: "Custom" },
];
const dateRangeCutoff = (rangeKey) => {
  const now = new Date();
  if (rangeKey === "7D") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (rangeKey === "30D") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
};

/* ─── Generic sort helper ─── */
const DATE_SORT_KEYS = ["date_from", "date_to", "levied_at"];
const NUM_SORT_KEYS = ["id", "overstay_days", "current_overstay_days", "daily_rate", "total_amount", "current_total_amount"];
const sortData = (data, key, direction) => {
  if (!key) return data;
  const dir = direction === "desc" ? -1 : 1;
  return [...data].sort((a, b) => {
    let av = a[key];
    let bv = b[key];
    if (DATE_SORT_KEYS.includes(key)) {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else if (NUM_SORT_KEYS.includes(key)) {
      av = parseFloat(av) || 0;
      bv = parseFloat(bv) || 0;
    } else {
      if (key === "pass_type") {
        av = formatPassType(a.pass_type || a.passType, a.date_from, a.date_to).toLowerCase();
        bv = formatPassType(b.pass_type || b.passType, b.date_from, b.date_to).toLowerCase();
      } else if (key === "identifier") {
        const getDisplayValue = (item) => {
          if (item.entity_type === "VEHICLE") {
            // Vehicles: sort by registration number
            return (item.identifier || "").toLowerCase();
          }

          // Persons: sort by name, fallback to identifier
          return (item.entity_name || item.identifier || "").toLowerCase();
        };

        av = getDisplayValue(a);
        bv = getDisplayValue(b);
      } else {
        av = (av ?? "").toString().toLowerCase();
        bv = (bv ?? "").toString().toLowerCase();
      }
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

/* ─── Sortable table header cell ─── */
const SortTh = ({ label, sortKey, sortConfig, onSort, className = "", align = "left" }) => (
  <th
    onClick={() => onSort(sortKey)}
    className={`px-3 py-2.5 cursor-pointer select-none hover:bg-white/10 transition-colors ${align === "center" ? "text-center" : ""} ${className}`}
    title={`Sort by ${label}`}
  >
    <span className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center w-full" : ""}`}>
      {label}
      {sortConfig.key === sortKey ? (
        sortConfig.direction === "asc" ? <ChevronUp className="h-3 w-3 text-amber-300" /> : <ChevronDown className="h-3 w-3 text-amber-300" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-30" />
      )}
    </span>
  </th>
);

/* ─── Friendly big toggle switch (replaces small checkboxes) ─── */
const ToggleSwitch = ({ checked, onChange, disabled, size = "md" }) => {
  const dims = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex ${dims} shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block ${knob} transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? translate : "translate-x-1"
        }`}
      />
    </button>
  );
};

/* ─── Date range button group (used in every tab) ─── */
const DateRangeControl = ({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  onResetCustom,
  applyDisabled,
  resetDisabled,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
            value === opt.key ? "bg-[#0a1e4d] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>

    {value === "CUSTOM" && (
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
        <CalendarDays className="h-3 w-3 text-slate-500" />
        <input
          type="date"
          value={customFrom}
          onChange={(e) => onCustomFromChange(e.target.value)}
          className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#0a1e4d]/20"
          aria-label="Custom range start date"
        />
        <span className="text-[10px] font-bold text-slate-500">to</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => onCustomToChange(e.target.value)}
          className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#0a1e4d]/20"
          aria-label="Custom range end date"
        />
        <button
          onClick={onApplyCustom}
          disabled={applyDisabled}
          className="px-2.5 py-1 rounded-md bg-[#0a1e4d] text-white text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
        <button
          onClick={onResetCustom}
          disabled={resetDisabled}
          className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>
    )}
  </div>
);

/* ─── Pass-block toggle strip, embedded inside every action window ─── */
/* ─── Pass-block toggle strip, embedded inside every action window ─── */
const PassBlockToggleStrip = ({ enabled, saving, onToggle, locked, lockedReason }) => (
  <div className="px-6 py-3 bg-red-50/70 border-b border-red-100">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-red-800 flex items-center gap-1.5">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          Stop New Passes for This Company
        </p>
        <p className="text-[10px] text-red-600/80 mt-0.5">
          {enabled
            ? "This is ON — this company can't get new passes until this fine is paid."
            : "This is OFF — this company can still get new passes as normal."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {saving && <RefreshCw className="h-3.5 w-3.5 text-red-500 animate-spin" />}
        <ToggleSwitch checked={enabled} onChange={onToggle} disabled={saving || locked} />
      </div>
    </div>

    {locked && (
      <p className="mt-2 flex items-start gap-1.5 text-[10px] font-semibold text-slate-500 bg-white/70 border border-red-100 rounded-lg px-2.5 py-1.5">
        <span>🔒</span>
        <span>{lockedReason || "This is currently set for every company at once, so it can't be changed just for this one."}</span>
      </p>
    )}
  </div>
);

export default function ATMOverstayPage() {
  const [activeTab, setActiveTab] = useState("detect");
  const [loading, setLoading] = useState(false);
  const [detectedList, setDetectedList] = useState([]);
  const [chargesList, setChargesList] = useState([]);
  const [appealsList, setAppealsList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [passTypeFilter, setPassTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("ALL");
  // Draft values edited in the custom range inputs.
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  // Applied values actually used by filtering logic.
  const [appliedCustomDateFrom, setAppliedCustomDateFrom] = useState("");
  const [appliedCustomDateTo, setAppliedCustomDateTo] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [savingAutoEmail, setSavingAutoEmail] = useState(false);
  const [passBlockEnabled, setPassBlockEnabled] = useState(true);
  const [savingPassBlock, setSavingPassBlock] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Pagination — 50 rows per tab by default
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Levy Modal
  const [levyModalOpen, setLevyModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [levyNotes, setLevyNotes] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal (also hosts exception approve/reject decisions)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCharge, setDetailCharge] = useState(null);
  // Per-company pass block used by action modals when global block is OFF
  const [companyPassBlocked, setCompanyPassBlocked] = useState(false);
  const [savingCompanyPassBlock, setSavingCompanyPassBlock] = useState(false);
  const [modalAgentId, setModalAgentId] = useState(null);

  // Notify loading state (keyed by charge id)
  const [notifying, setNotifying] = useState({});
  const [decidingException, setDecidingException] = useState({});
  // Waive-from-modal state
  const [waivingFromModal, setWaivingFromModal] = useState(false);

  // Bulk selection (Detected Overstays tab)
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const onSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      return { key, direction: "asc" };
    });
  };

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

  // Fetches the full charges log; status narrowing (Pending/Paid/Waived, with
  // exception decisions folded in) happens client-side via effectiveStatus().
  const fetchCharges = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/charges`, { headers: getAuthHeaders() });
      if (res.data?.success) setChargesList(res.data.data || []);
    } catch (err) {
      console.error("Fetch overstay charges error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to load levied charges");
    } finally { setLoading(false); }
  };

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/charges?status=EXCEPTION_REQUESTED`, { headers: getAuthHeaders() });
      if (res.data?.success) setAppealsList(res.data.data || []);
    } catch (err) {
      console.error("Fetch appeals error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to load appeals");
    } finally { setLoading(false); }
  };

  const fetchAutoEmailSetting = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/settings/auto-email`, { headers: getAuthHeaders() });
      if (res.data?.success) setAutoEmailEnabled(!!res.data.data.value);
    } catch (err) {
      console.error("Failed to fetch auto-email setting:", err);
    }
  };
  const fetchPassBlockSetting = async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/settings/pass-block`, { headers: getAuthHeaders() });
      if (res.data?.success) setPassBlockEnabled(!!res.data.data.value);
    } catch (err) {
      console.error("Failed to fetch pass-block setting:", err);
    }
  };
  useEffect(() => {
    fetchDetected();
    fetchCharges();
    fetchAppeals();
    fetchAutoEmailSetting();
    fetchPassBlockSetting();
  }, []);

  const handleToggleAutoEmail = async () => {
    const next = !autoEmailEnabled;
    setSavingAutoEmail(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/overstay/settings/auto-email`,
        { enabled: next },
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setAutoEmailEnabled(next);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update setting");
    } finally {
      setSavingAutoEmail(false);
    }
  };

const handleTogglePassBlock = async () => {
  const next = !passBlockEnabled;
  if (
    next &&
    !confirm(
      "Block every company with an unpaid fine from getting new passes?\n\nThis applies to ALL companies at once, not just one."
    )
  ) {
    return;
  }
  setSavingPassBlock(true);
  try {
    const res = await axios.patch(
      `${ADMIN_API}/overstay/settings/pass-block`,
      { enabled: next },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success) {
      setPassBlockEnabled(next);
      toast.success(
        next
          ? "Done — every company with an unpaid fine is now blocked from new passes."
          : "Done — companies can get new passes again, even with unpaid fines."
      );
    }
  } catch (err) {
    toast.error(err.response?.data?.message || "Couldn't update this setting — please try again");
  } finally {
    setSavingPassBlock(false);
  }
};

  useEffect(() => {
    setPage(1);
    setExpandedRowId(null);
    setSortConfig({ key: null, direction: "asc" });
    setSelectedKeys(new Set());
    if (activeTab === "detect") fetchDetected();
    else if (activeTab === "appeals") fetchAppeals();
    else fetchCharges();
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateRangeFilter, statusFilter, appliedCustomDateFrom, appliedCustomDateTo]);

  const isCustomRangeInvalid = useMemo(() => {
    if (!customDateFrom || !customDateTo) return false;
    return new Date(customDateFrom) > new Date(customDateTo);
  }, [customDateFrom, customDateTo]);

  const applyCustomDateRange = () => {
    if (isCustomRangeInvalid) {
      toast.error("Custom range is invalid: 'From' date cannot be after 'To' date.");
      return;
    }
    setAppliedCustomDateFrom(customDateFrom);
    setAppliedCustomDateTo(customDateTo);
  };

  const resetCustomDateRange = () => {
    setCustomDateFrom("");
    setCustomDateTo("");
    setAppliedCustomDateFrom("");
    setAppliedCustomDateTo("");
    setDateRangeFilter("ALL");
  };

  /* ─── ACTIONS ─── */
  const loadCompanyPassBlock = async (agentId) => {
    if (!agentId) {
      setModalAgentId(null);
      setCompanyPassBlocked(false);
      return;
    }
    setModalAgentId(agentId);
    try {
      const res = await axios.get(`${ADMIN_API}/overstay/settings/pass-block/agent/${agentId}`, { headers: getAuthHeaders() });
      if (res.data?.success) {
        setCompanyPassBlocked(!!res.data.data.value);
      }
    } catch {
      setCompanyPassBlocked(false);
    }
  };

  const openLevyModal = async (item) => {
    const numericRate = parseFloat(item?.daily_rate || 0) || 0;
    const matchedDetected = detectedList.find((d) => overstayIdentityKey(d) === overstayIdentityKey(item));
    const detectedRate = parseFloat(matchedDetected?.daily_rate || 0) || 0;

    // NOTIFIED rows are persisted with daily_rate=0 by design until levy;
    // hydrate the modal preview from detect data when available.
    const hydratedItem = {
      ...item,
      daily_rate: numericRate > 0 ? numericRate : (detectedRate > 0 ? detectedRate : item?.daily_rate),
      overstay_days: item?.overstay_days ?? matchedDetected?.overstay_days,
      category: item?.category || matchedDetected?.category,
    };

    setSelectedEntity(hydratedItem);
    setLevyNotes("");
    setCustomRate(hydratedItem.daily_rate || "");
    await loadCompanyPassBlock(item.agent_id || null);
    setLevyModalOpen(true);
  };

  const handleLevySubmit = async () => {
    if (!selectedEntity) return;
    setSubmitting(true);
    try {
      const rate = parseFloat(customRate || selectedEntity.daily_rate || 0) || 0;
      const rawDays = selectedEntity.overstay_days ?? 0;
      const days = isNaN(parseInt(rawDays, 10)) ? 0 : Math.max(0, parseInt(rawDays, 10));
      const total = rate * days;
      const payload = {
        entity_type: selectedEntity.entity_type,
        entity_id: selectedEntity.entity_id || null,
        pass_request_id: selectedEntity.pass_request_id || null,
        agent_id: selectedEntity.agent_id || null,
        identifier: selectedEntity.identifier,
        entity_name: selectedEntity.entity_name || "",
        pass_no: selectedEntity.pass_no || "",
        pass_type: selectedEntity.pass_type || selectedEntity.passType || null,
        date_from: selectedEntity.date_from || null,
        date_to: selectedEntity.date_to || null,
        overstay_days: days,
        daily_rate: rate,
        total_amount: total,
        notes: levyNotes.trim(),
      };
      const res = await axios.post(`${ADMIN_API}/overstay/levy`, payload, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success(`Levied ${fmtMoney(total)} on ${selectedEntity.identifier}`);
        setLevyModalOpen(false);
        await fetchDetected();
        await fetchCharges();
        if (res.data.data?.id && autoEmailEnabled) {
          handleNotify(res.data.data.id);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to levy charge");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveException = async (chargeId) => {
    if (!confirm("Approve this exception request? This will resolve the charge (equivalent to a waiver) and cannot be undone.")) return;
    setDecidingException((prev) => ({ ...prev, [chargeId]: "approving" }));
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${chargeId}/approve-exception`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("Exception approved — charge resolved");
        setDetailModalOpen(false);
        fetchCharges();
        fetchAppeals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve exception");
    } finally {
      setDecidingException((prev) => ({ ...prev, [chargeId]: false }));
    }
  };

  const handleRejectException = async (chargeId) => {
    if (!confirm("Reject this exception request? The agent will be able to pay the original fine instead.")) return;
    setDecidingException((prev) => ({ ...prev, [chargeId]: "rejecting" }));
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${chargeId}/reject-exception`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("Exception rejected — agent can now pay the fine");
        setDetailModalOpen(false);
        fetchCharges();
        fetchAppeals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject exception");
    } finally {
      setDecidingException((prev) => ({ ...prev, [chargeId]: false }));
    }
  };

  const handleWaive = async (chargeId) => {
    if (!confirm("Are you sure you want to manually waive this overstay charge?")) return;
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${chargeId}/waive`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("Charge waived successfully");
        fetchCharges();
        fetchAppeals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to waive charge");
    }
  };

  // Waive from the levy modal — always active.
  const handleWaiveFromModal = async () => {
    if (!selectedEntity?.id) {
      if (!confirm("Mark this entity as resolved? This creates a WAIVED record so it won't reappear in Detected Overstays.")) return;
      setWaivingFromModal(true);
      try {
        const res = await axios.post(
          `${ADMIN_API}/overstay/waive-detected`,
          {
            entity_type: selectedEntity.entity_type,
            entity_id: selectedEntity.entity_id,
            pass_request_id: selectedEntity.pass_request_id,
            agent_id: selectedEntity.agent_id,
            identifier: selectedEntity.identifier,
            entity_name: selectedEntity.entity_name,
            pass_no: selectedEntity.pass_no,
            date_from: selectedEntity.date_from,
            date_to: selectedEntity.date_to,
            overstay_days: selectedEntity.overstay_days,
          },
          { headers: getAuthHeaders() }
        );
        if (res.data?.success) {
          toast.success(res.data.message || "Marked as resolved");
          setLevyModalOpen(false);
          fetchDetected();
          fetchCharges();
          setActiveTab("charges");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to mark as resolved");
      } finally {
        setWaivingFromModal(false);
      }
      return;
    }

    if (!confirm("Are you sure you want to waive this overstay charge?")) return;
    setWaivingFromModal(true);
    try {
      const res = await axios.patch(`${ADMIN_API}/overstay/${selectedEntity.id}/waive`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success("Charge waived successfully");
        setLevyModalOpen(false);
        fetchDetected();
        fetchCharges();
        if (autoEmailEnabled) {
          handleNotify(selectedEntity.id);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to waive charge");
    } finally {
      setWaivingFromModal(false);
    }
  };

  const handleNotify = async (chargeId) => {
    setNotifying((prev) => ({ ...prev, [chargeId]: true }));
    try {
      const res = await axios.post(`${ADMIN_API}/overstay/${chargeId}/notify`, {}, { headers: getAuthHeaders() });
      if (res.data?.success) {
        toast.success(res.data.message || "Notification email sent");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setNotifying((prev) => ({ ...prev, [chargeId]: false }));
    }
  };

  const handleNotifyDetected = async (item) => {
    const key = `detected-${item.entity_id}-${item.entity_type}`;
    setNotifying((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await axios.post(`${ADMIN_API}/overstay/notify-detected`, {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        pass_request_id: item.pass_request_id,
        agent_id: item.agent_id,
        company_name: item.company_name,
        login_id: item.login_id,
        identifier: item.identifier,
        entity_name: item.entity_name,
        pass_no: item.pass_no,
        pass_type: item.pass_type || item.passType || null,
        category: item.category,
        date_from: item.date_from,
        date_to: item.date_to,
        overstay_days: item.overstay_days
      }, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Expiry reminder sent to agent");
        setLevyModalOpen(false);
        await fetchDetected();
        await fetchCharges();
        setActiveTab("charges");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setNotifying((prev) => ({ ...prev, [key]: false }));
    }
  };

  const openDetailModal = async (charge) => {
    setDetailCharge(charge);
    await loadCompanyPassBlock(charge.agent_id || null);
    setDetailModalOpen(true);
  };

const handleToggleCompanyPassBlock = async () => {
  if (passBlockEnabled) return;
  if (!modalAgentId) return;
  const next = !companyPassBlocked;
  setSavingCompanyPassBlock(true);
  try {
    const res = await axios.patch(
      `${ADMIN_API}/overstay/settings/pass-block/agent/${modalAgentId}`,
      { enabled: next },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success) {
      setCompanyPassBlocked(next);
      toast.success(
        next
          ? "Done — this company can't get new passes until they pay."
          : "Done — this company can get new passes again."
      );
    }
  } catch (err) {
    toast.error(err.response?.data?.message || "Couldn't update this setting — please try again");
  } finally {
    setSavingCompanyPassBlock(false);
  }
};

  /* ─── Bulk selection & bulk actions (Detected Overstays tab) ─── */
  const toggleSelectRow = (item) => {
    const k = detectedKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const pageKeys = paginatedData.map(detectedKey);
    const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) pageKeys.forEach((k) => next.delete(k));
      else pageKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleBulkLevy = async () => {
    const items = filteredDetected.filter((i) => selectedKeys.has(detectedKey(i)));
    if (items.length === 0) return;
    if (!confirm(`Levy overstay fines for ${items.length} selected entit${items.length !== 1 ? "ies" : "y"} using their calculated daily rates?`)) return;
    setBulkProcessing(true);
    let success = 0, failed = 0;
    for (const item of items) {
      try {
        const rate = parseFloat(item.daily_rate || 0) || 0;
        const days = Math.max(0, parseInt(item.overstay_days || 0, 10) || 0);
        const total = rate * days;
        const res = await axios.post(`${ADMIN_API}/overstay/levy`, {
          entity_type: item.entity_type,
          entity_id: item.entity_id || null,
          pass_request_id: item.pass_request_id || null,
          agent_id: item.agent_id || null,
          identifier: item.identifier,
          entity_name: item.entity_name || "",
          pass_no: item.pass_no || "",
          pass_type: item.pass_type || item.passType || null,
          date_from: item.date_from || null,
          date_to: item.date_to || null,
          overstay_days: days,
          daily_rate: rate,
          total_amount: total,
          notes: "Bulk levy",
        }, { headers: getAuthHeaders() });
        if (res.data?.success) {
          success++;
          if (res.data.data?.id && autoEmailEnabled) handleNotify(res.data.data.id);
        } else failed++;
      } catch (err) {
        failed++;
      }
    }
    setBulkProcessing(false);
    setSelectedKeys(new Set());
    fetchDetected();
    fetchCharges();
    if (success) toast.success(`Levied ${success} charge${success !== 1 ? "s" : ""}`);
    if (failed) toast.error(`${failed} failed to levy`);
  };

  const handleBulkNotify = async () => {
    const items = filteredDetected.filter((i) => selectedKeys.has(detectedKey(i)));
    if (items.length === 0) return;
    if (!confirm(`Send overstay reminder notifications for ${items.length} selected entit${items.length !== 1 ? "ies" : "y"}?`)) return;

    setBulkProcessing(true);
    let success = 0, failed = 0;

    for (const item of items) {
      try {
        const res = await axios.post(
          `${ADMIN_API}/overstay/notify-detected`,
          {
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            pass_request_id: item.pass_request_id,
            agent_id: item.agent_id,
            company_name: item.company_name,
            login_id: item.login_id,
            identifier: item.identifier,
            entity_name: item.entity_name,
            pass_no: item.pass_no,
            pass_type: item.pass_type || item.passType || null,
            category: item.category,
            date_from: item.date_from,
            date_to: item.date_to,
            overstay_days: item.overstay_days,
          },
          { headers: getAuthHeaders() }
        );

        if (res.data?.success) success++; else failed++;
      } catch {
        failed++;
      }
    }

    setBulkProcessing(false);
    setSelectedKeys(new Set());
    await fetchDetected();
    await fetchCharges();
    if (success) toast.success(`Notified ${success} entit${success !== 1 ? "ies" : "y"}`);
    if (failed) toast.error(`${failed} failed to notify`);
    if (success) setActiveTab("charges");
  };

  const handleBulkWaive = async () => {
    const items = filteredDetected.filter((i) => selectedKeys.has(detectedKey(i)));
    if (items.length === 0) return;
    if (!confirm(`Mark ${items.length} selected entit${items.length !== 1 ? "ies" : "y"} as resolved (waived)?`)) return;
    setBulkProcessing(true);
    let success = 0, failed = 0;
    for (const item of items) {
      try {
        if (item.id) {
          const res = await axios.patch(`${ADMIN_API}/overstay/${item.id}/waive`, {}, { headers: getAuthHeaders() });
          if (res.data?.success) success++; else failed++;
        } else {
          const res = await axios.post(`${ADMIN_API}/overstay/waive-detected`, {
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            pass_request_id: item.pass_request_id,
            agent_id: item.agent_id,
            identifier: item.identifier,
            entity_name: item.entity_name,
            pass_no: item.pass_no,
            date_from: item.date_from,
            date_to: item.date_to,
            overstay_days: item.overstay_days,
          }, { headers: getAuthHeaders() });
          if (res.data?.success) success++; else failed++;
        }
      } catch (err) {
        failed++;
      }
    }
    setBulkProcessing(false);
    setSelectedKeys(new Set());
    fetchDetected();
    fetchCharges();
    if (success) toast.success(`Waived ${success} entit${success !== 1 ? "ies" : "y"}`);
    if (failed) toast.error(`${failed} failed to waive`);
  };

  /* ─── FILTERS, DATE RANGE, SORT & PAGINATION ─── */
  const notifiedIdentityKeys = useMemo(() => {
    const keys = new Set();
    chargesList
      .filter((c) => c.status === "NOTIFIED")
      .forEach((c) => keys.add(overstayIdentityKey(c)));
    return keys;
  }, [chargesList]);

  const searchedDetected = useMemo(() => {
    const visibleDetected = detectedList.filter((i) => !notifiedIdentityKeys.has(overstayIdentityKey(i)));
    if (!searchQuery) return visibleDetected;
    const q = searchQuery.toLowerCase();
    return visibleDetected.filter((i) =>
      i.identifier?.toLowerCase().includes(q) ||
      i.entity_name?.toLowerCase().includes(q) ||
      i.pass_no?.toLowerCase().includes(q) ||
      i.company_name?.toLowerCase().includes(q) ||
      i.login_id?.toLowerCase().includes(q)
    );
  }, [detectedList, searchQuery, notifiedIdentityKeys]);

  // Charges log shows levied + reminder-only rows. Appeals in progress
  // live exclusively in the Appeals tab, while NOTIFIED remains visible here.
  const chargesTabBase = useMemo(() => {
    return chargesList
      .filter((c) => c.status !== "EXCEPTION_REQUESTED")
      .filter((c) => statusFilter === "ALL" || effectiveStatus(c.status) === statusFilter);
  }, [chargesList, statusFilter]);

  const searchedCharges = useMemo(() => {
    if (!searchQuery) return chargesTabBase;
    const q = searchQuery.toLowerCase();
    return chargesTabBase.filter((i) =>
      i.identifier?.toLowerCase().includes(q) ||
      i.entity_name?.toLowerCase().includes(q) ||
      i.company_name?.toLowerCase().includes(q) ||
      i.pass_no?.toLowerCase().includes(q) ||
      i.login_id?.toLowerCase().includes(q)
    );
  }, [chargesTabBase, searchQuery]);

  const searchedAppeals = useMemo(() => {
    if (!searchQuery) return appealsList;
    const q = searchQuery.toLowerCase();
    return appealsList.filter((i) =>
      i.identifier?.toLowerCase().includes(q) ||
      i.entity_name?.toLowerCase().includes(q) ||
      i.company_name?.toLowerCase().includes(q) ||
      i.pass_no?.toLowerCase().includes(q) ||
      i.login_id?.toLowerCase().includes(q)
    );
  }, [appealsList, searchQuery]);

  const applyDateRange = useCallback((list) => {
    if (dateRangeFilter === "CUSTOM") {
      if (!appliedCustomDateFrom && !appliedCustomDateTo) return list;

      const from = appliedCustomDateFrom ? new Date(`${appliedCustomDateFrom}T00:00:00`) : null;
      const to = appliedCustomDateTo ? new Date(`${appliedCustomDateTo}T23:59:59.999`) : null;

      return list.filter((i) => {
        if (!i.date_to) return false;
        const d = new Date(i.date_to);
        if (isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    const cutoff = dateRangeCutoff(dateRangeFilter);
    if (!cutoff) return list;
    return list.filter((i) => i.date_to && new Date(i.date_to) >= cutoff);
  }, [dateRangeFilter, appliedCustomDateFrom, appliedCustomDateTo]);

  const applyPassTypeFilter = useCallback((list) => {
    if (passTypeFilter === "ALL") return list;
    return list.filter((i) => {
      const formatted = formatPassType(i.pass_type || i.passType, i.date_from, i.date_to);
      if (passTypeFilter === "DAILY") return formatted === "Daily";
      if (passTypeFilter === "MONTHLY") return formatted === "Monthly";
      if (passTypeFilter === "ANNUAL" || passTypeFilter === "YEARLY") return formatted === "Annual";
      return true;
    });
  }, [passTypeFilter]);

  const rangedDetected = useMemo(
    () => applyPassTypeFilter(applyDateRange(searchedDetected)),
    [searchedDetected, applyDateRange, applyPassTypeFilter]
  );
  const rangedCharges = useMemo(
    () => applyPassTypeFilter(applyDateRange(searchedCharges)),
    [searchedCharges, applyDateRange, applyPassTypeFilter]
  );
  const rangedAppeals = useMemo(
    () => applyPassTypeFilter(applyDateRange(searchedAppeals)),
    [searchedAppeals, applyDateRange, applyPassTypeFilter]
  );

  const filteredDetected = useMemo(() => sortData(rangedDetected, sortConfig.key, sortConfig.direction), [rangedDetected, sortConfig]);
  const filteredCharges = useMemo(() => sortData(rangedCharges, sortConfig.key, sortConfig.direction), [rangedCharges, sortConfig]);
  const filteredAppeals = useMemo(() => sortData(rangedAppeals, sortConfig.key, sortConfig.direction), [rangedAppeals, sortConfig]);

  const currentList = activeTab === "detect" ? filteredDetected : activeTab === "appeals" ? filteredAppeals : filteredCharges;
  const totalItems = currentList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedData = useMemo(() => {
    return currentList.slice(startIndex, startIndex + pageSize);
  }, [currentList, startIndex, pageSize]);

  const detectStats = useMemo(() => {
    const persons = rangedDetected.filter(
                      (d) => ["PERSON", "DRIVER"].includes(d.entity_type)
                    ).length;
    const vehicles = rangedDetected.filter((d) => d.entity_type === "VEHICLE").length;
    const totalFine = rangedDetected.reduce((s, d) => s + (d.total_amount || 0), 0);
    const maxDays = rangedDetected.reduce((m, d) => Math.max(m, parseInt(d.overstay_days || 0, 10)), 0);
    return { persons, vehicles, totalFine, maxDays, total: rangedDetected.length };
  }, [rangedDetected]);

  const chargeStats = useMemo(() => {
    const pending = rangedCharges.filter((c) => effectiveStatus(c.status) === "PENDING");
    const paid = rangedCharges.filter((c) => c.status === "PAID");

    const liveAmount = (c) =>
      ["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(c.status)
        ? parseFloat(c.current_total_amount || 0)
        : parseFloat(c.total_amount || 0);

    const totalPending = pending.reduce((s, c) => s + liveAmount(c), 0);
    const totalCollected = paid.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0);
    return { pending: pending.length, paid: paid.length, totalPending, totalCollected, total: rangedCharges.length };
  }, [rangedCharges]);

  const appealStats = useMemo(() => {
    const totalContested = rangedAppeals.reduce((s, c) => s + parseFloat(c.current_total_amount || c.total_amount || 0), 0);
    const oldestDays = rangedAppeals.reduce((m, c) => Math.max(m, parseInt(c.current_overstay_days || c.overstay_days || 0, 10)), 0);
    const persons = rangedAppeals.filter((d) => d.entity_type === "PERSON").length;
    const vehicles = rangedAppeals.filter((d) => d.entity_type === "VEHICLE").length;
    return { total: rangedAppeals.length, totalContested, oldestDays, persons, vehicles };
  }, [rangedAppeals]);

  /* ─── Shared row-action cell for Charges / Appeals tables ─── */
  const renderChargeActions = (charge) => {
    const eff = effectiveStatus(charge.status);
    const isDecidable = charge.status === "EXCEPTION_REQUESTED";
    const isActionable = eff !== "PAID" && eff !== "WAIVED" && !isDecidable;
    const isNotified = charge.status === "NOTIFIED";

    return (
      <div className="flex items-center gap-1.5 justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); openDetailModal(charge); }}
          className="p-1.5 border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-all shadow-sm"
          title={isDecidable ? "Review exception & decide" : "View Full Details"}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>

        {isNotified && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openLevyModal(charge);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm"
            title="Levy payable fine for this notified overstay"
          >
            <ShieldAlert className="h-3 w-3" />
            Levy
          </button>
        )}

        {isActionable && (
          <button
            onClick={(e) => { e.stopPropagation(); handleWaive(charge.id); }}
            className="px-3 py-1.5 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 text-red-600 rounded-lg text-[11px] font-bold transition-all shadow-sm"
          >
            Waive
          </button>
        )}

        {isActionable && !isNotified && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNotify(charge.id); }}
            disabled={notifying[charge.id]}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-600 disabled:opacity-60 rounded-lg text-[11px] font-bold transition-all shadow-sm"
            title="Send overstay reminder email to agent"
          >
            {notifying[charge.id] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            {notifying[charge.id] ? "…" : "Notify"}
          </button>
        )}
      </div>
    );
  };

  const chargeTableHead = (
    <tr>
      <th className="px-3 py-2.5 w-16 text-center">SI No.</th>
      <SortTh label="Company / Agent" sortKey="company_name" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Entity & Identifier" sortKey="identifier" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Pass No" sortKey="pass_no" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Pass Entry Date" sortKey="date_from" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Pass Expiry Date" sortKey="date_to" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Pass Type" sortKey="pass_type" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Overstay / Rate" sortKey="overstay_days" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Total Penalty" sortKey="total_amount" sortConfig={sortConfig} onSort={onSort} />
      <SortTh label="Status" sortKey="status" sortConfig={sortConfig} onSort={onSort} />
      <th className="px-3 py-2.5 text-center">Actions</th>
    </tr>
  );
  const passTypeColor = (passType) => {
    const type = String(passType || "").toLowerCase();

    if (type.includes("daily")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (type.includes("monthly")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }

    if (type.includes("yearly") || type.includes("annual")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    return "bg-slate-100 text-slate-700 border-slate-200";
  };
  const renderChargeRow = (charge, idx) => {
    const eff = effectiveStatus(charge.status);
    const sc = statusConfig[eff] || statusConfig.PENDING;
    const sev = severityColor(
      ["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(charge.status)
        ? charge.current_overstay_days
        : charge.overstay_days
    );

    return (
      <tr
        key={charge.id}
        onClick={() => openDetailModal(charge)}
        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
      >
        <td className="px-3 py-2 font-mono font-bold text-slate-500 text-center">
          {startIndex + idx + 1}
        </td>

        <td className="px-3 py-2">
          <p className="font-bold text-slate-800">{charge.company_name || "—"}</p>
          <p className="text-[10px] text-slate-400 font-mono">{charge.login_id || "Agent #" + charge.agent_id}</p>
        </td>

        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider border ${
              charge.entity_type === "VEHICLE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-teal-50 text-teal-700 border-teal-200"
            }`}>
              {charge.entity_type === "VEHICLE" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {charge.entity_type === "VEHICLE" ? "VEH" : "PER"}
            </span>
            <div>
              {charge.entity_name && charge.entity_name !== charge.identifier ? (
                <>
                  <p className="font-bold text-slate-800">{charge.entity_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{charge.identifier}</p>
                </>
              ) : (
                <p className="font-bold text-slate-800">{charge.identifier}</p>
              )}
            </div>
          </div>
        </td>

        <td className="px-3 py-2 font-mono font-semibold text-slate-600">{charge.pass_no || "—"}</td>

        <td className="px-3 py-2 font-semibold text-emerald-700">
          <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {fmtDate(charge.date_from)}
          </span>
        </td>

        <td className="px-3 py-2 font-semibold text-red-600">
          <span className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
            {fmtDate(charge.date_to)}
          </span>
        </td>
        <td className="px-3 py-2 font-bold text-slate-700">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-extrabold text-[11px] ${passTypeColor(
              charge.pass_type || charge.passType
            )}`}
          >
            {formatPassType(
              charge.pass_type || charge.passType,
              charge.date_from,
              charge.date_to
            )}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[10px] border ${sev.bg}`}>
            {["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(charge.status)
              ? charge.current_overstay_days
              : charge.overstay_days}d
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{fmtMoney(charge.daily_rate)}/d</p>
        </td>

        <td className="px-3 py-2 font-black text-slate-900 text-sm">
          {fmtMoney(
            ["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(charge.status)
              ? charge.current_total_amount
              : charge.total_amount
          )}
        </td>

        <td className="px-3 py-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${sc.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {eff.replace(/_/g, " ")}
          </span>
        </td>

        <td className="px-3 py-2 text-center">{renderChargeActions(charge)}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-3 font-sans text-slate-800 pb-6">

      {/* ══════════════ COMPACT TOP HEADER ══════════════ */}
      <div className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] rounded-2xl px-4 py-3 text-white shadow-lg relative overflow-hidden border border-white/10">
        <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
          <Clock className="w-32 h-32 text-white" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> ATM Pass Section Control
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              Overstay Charges Management
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20" title="Automatically email the company as soon as a fine is charged">
              <div className="leading-tight">
                <p className="text-white text-[12px] font-bold">Email Companies Automatically</p>
                <p className="text-white/60 text-[10px]">{autoEmailEnabled ? "On — reminders sent for you" : "Off — you send them manually"}</p>
              </div>
              <ToggleSwitch checked={autoEmailEnabled} onChange={handleToggleAutoEmail} disabled={savingAutoEmail} size="sm" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20" title="Block every company with an unpaid fine from getting new passes">
              <div className="leading-tight">
                <p className="text-white text-[12px] font-bold">Block All Unpaid Companies</p>
                <p className="text-white/60 text-[10px]">{passBlockEnabled ? "On — new passes blocked everywhere" : "Off — passes still allowed"}</p>
              </div>
              <ToggleSwitch checked={passBlockEnabled} onChange={handleTogglePassBlock} disabled={savingPassBlock} size="sm" />
            </div>

            <button
              onClick={() => {
                fetchDetected();
                fetchCharges();
                fetchAppeals();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-all active:scale-95 shrink-0 min-h-[40px]"
            >
              <RefreshCw
                className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`}
              />
              <div className="leading-tight text-left">
                <p className="text-white text-[12px] font-bold">Refresh Data</p>
                <p className="text-white/60 text-[10px]">
                  Reload all overstay information
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════ TAB NAVIGATION & CONTROLS ══════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">

        <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab("detect")}
            className={`px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "detect" ? "bg-[#0a1e4d] text-white shadow-md shadow-[#0a1e4d]/20" : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            Detected Overstays
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === "detect" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {filteredDetected.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("charges")}
            className={`px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "charges" ? "bg-[#0a1e4d] text-white shadow-md shadow-[#0a1e4d]/20" : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileText className="h-3 w-3 text-blue-400" />
            Levied/Notified Charges Log
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === "charges" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {filteredCharges.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("appeals")}
            className={`px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "appeals" ? "bg-[#0a1e4d] text-white shadow-md shadow-[#0a1e4d]/20" : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Gavel className="h-3 w-3 text-amber-400" />
            Appeals
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === "appeals" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {filteredAppeals.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeControl
            value={dateRangeFilter}
            onChange={(val) => { setDateRangeFilter(val); setPage(1); }}
            customFrom={customDateFrom}
            customTo={customDateTo} 
            onCustomFromChange={setCustomDateFrom}
            onCustomToChange={setCustomDateTo}
            onApplyCustom={applyCustomDateRange}
            onResetCustom={resetCustomDateRange}
            applyDisabled={isCustomRangeInvalid}
            resetDisabled={!customDateFrom && !customDateTo && !appliedCustomDateFrom && !appliedCustomDateTo}
          />

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={passTypeFilter}
              onChange={(e) => {
                setPassTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Pass Types</option>
              <option value="DAILY">Daily Pass</option>
              <option value="MONTHLY">Monthly Pass</option>
              <option value="ANNUAL">Annual Pass</option>
            </select>
          </div>

          {activeTab === "charges" && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="NOTIFIED">NOTIFIED</option>
                <option value="PAID">PAID</option>
                <option value="WAIVED">WAIVED</option>
              </select>
            </div>
          )}

          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Pass No, Company, Name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full md:w-60 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#0a1e4d]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ══════════════ STATS CARDS BAR (compact) ══════════════ */}
      {activeTab === "detect" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total Overstays", value: detectStats.total, color: "border-slate-200", textColor: "text-[#0a1e4d]", icon: <Layers className="h-3 w-3 text-blue-600" /> },
            { label: "Person Overstays", value: detectStats.persons, color: "border-teal-200 bg-teal-50/30", textColor: "text-teal-700", icon: <User className="h-3 w-3 text-teal-600" /> },
            { label: "Vehicle Overstays", value: detectStats.vehicles, color: "border-blue-200 bg-blue-50/30", textColor: "text-blue-700", icon: <Truck className="h-3 w-3 text-blue-600" /> },
            { label: "Max Overstay", value: `${detectStats.maxDays} Days`, color: "border-amber-200 bg-amber-50/30", textColor: "text-amber-700", icon: <Timer className="h-3 w-3 text-amber-600" /> },
            { label: "Uncollected Fine", value: fmtMoney(detectStats.totalFine), color: "border-red-200 bg-red-50/30", textColor: "text-red-700", icon: <CircleDollarSign className="h-3 w-3 text-red-600" /> },
          ].map((card, idx) => (
            <div key={idx} className={`bg-white rounded-lg border ${card.color} px-2.5 py-1.5 shadow-sm transition-all hover:shadow-md`}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                {card.icon} {card.label}
              </p>
              <p className={`text-base font-black ${card.textColor} mt-0.5`}>{card.value}</p>
            </div>
          ))}
        </div>
      ) : activeTab === "charges" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Total Levied", value: chargeStats.total, color: "border-slate-200", textColor: "text-[#0a1e4d]", icon: <FileText className="h-3 w-3 text-slate-600" /> },
            { label: "Pending Payment", value: chargeStats.pending, color: "border-red-200 bg-red-50/30", textColor: "text-red-700", icon: <Clock className="h-3 w-3 text-red-600" /> },
            { label: "Fully Settled", value: chargeStats.paid, color: "border-emerald-200 bg-emerald-50/30", textColor: "text-emerald-700", icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" /> },
            { label: "Pending Amount", value: fmtMoney(chargeStats.totalPending), color: "border-amber-200 bg-amber-50/30", textColor: "text-amber-700", icon: <TrendingUp className="h-3 w-3 text-amber-600" /> },
            { label: "Total Collected", value: fmtMoney(chargeStats.totalCollected), color: "border-emerald-200 bg-emerald-50/30", textColor: "text-emerald-700", icon: <Banknote className="h-3 w-3 text-emerald-600" /> },
          ].map((card, idx) => (
            <div key={idx} className={`bg-white rounded-lg border ${card.color} px-2.5 py-1.5 shadow-sm transition-all hover:shadow-md`}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                {card.icon} {card.label}
              </p>
              <p className={`text-base font-black ${card.textColor} mt-0.5`}>{card.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Open Appeals", value: appealStats.total, color: "border-amber-200 bg-amber-50/30", textColor: "text-amber-700", icon: <Gavel className="h-3 w-3 text-amber-600" /> },
            { label: "Person Appeals", value: appealStats.persons, color: "border-teal-200 bg-teal-50/30", textColor: "text-teal-700", icon: <User className="h-3 w-3 text-teal-600" /> },
            { label: "Vehicle Appeals", value: appealStats.vehicles, color: "border-blue-200 bg-blue-50/30", textColor: "text-blue-700", icon: <Truck className="h-3 w-3 text-blue-600" /> },
            { label: "Longest Wait", value: `${appealStats.oldestDays} Days`, color: "border-rose-200 bg-rose-50/30", textColor: "text-rose-700", icon: <History className="h-3 w-3 text-rose-600" /> },
            { label: "Amount Contested", value: fmtMoney(appealStats.totalContested), color: "border-red-200 bg-red-50/30", textColor: "text-red-700", icon: <CircleDollarSign className="h-3 w-3 text-red-600" /> },
          ].map((card, idx) => (
            <div key={idx} className={`bg-white rounded-lg border ${card.color} px-2.5 py-1.5 shadow-sm transition-all hover:shadow-md`}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                {card.icon} {card.label}
              </p>
              <p className={`text-base font-black ${card.textColor} mt-0.5`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ BULK ACTION BAR (Detected Overstays tab) ══════════════ */}
      {activeTab === "detect" && selectedKeys.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs font-bold text-amber-800">
            {selectedKeys.size} entit{selectedKeys.size !== 1 ? "ies" : "y"} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedKeys(new Set())}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkNotify}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-indigo-300 hover:border-indigo-400 bg-white hover:bg-indigo-50 text-indigo-700 disabled:opacity-60 rounded-lg text-[11px] font-bold transition-all shadow-sm"
            >
              {bulkProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Bulk Notify Selected
            </button>
            <button
              onClick={handleBulkWaive}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-amber-300 hover:border-amber-400 bg-white hover:bg-amber-100 text-amber-700 disabled:opacity-60 rounded-lg text-[11px] font-bold transition-all shadow-sm"
            >
              {bulkProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Bulk Waive Selected
            </button>
            <button
              onClick={handleBulkLevy}
              disabled={bulkProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white disabled:opacity-60 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-95"
            >
              {bulkProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              Bulk Levy Selected
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN DATA TABLE (this now gets the bulk of the page) */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col">

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-330px)] min-h-[420px] custom-scrollbar">
          {loading ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#0a1e4d]" />
              <p className="font-bold text-sm text-slate-700">Querying database for overstay records...</p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="font-bold text-slate-700 text-base">No Matching Records Found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                All passes are within valid dates or your current filter query returned zero entries.
              </p>
            </div>
          ) : activeTab === "detect" ? (

            /* ──────────────── TAB 1: DETECTED OVERSTAYS LIST ──────────────── */
            <table className="w-full min-w-[1250px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="px-3 py-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-amber-400 cursor-pointer"
                      checked={paginatedData.length > 0 && paginatedData.every((item) => selectedKeys.has(detectedKey(item)))}
                      onChange={toggleSelectAllOnPage}
                      title="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <SortTh label="Type" sortKey="entity_type" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Identifier & Name" sortKey="identifier" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Firm / Company" sortKey="company_name" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Pass Ref #" sortKey="pass_no" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Pass Entry Date" sortKey="date_from" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Pass Expiry Date" sortKey="date_to" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Pass Type" sortKey="pass_type" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Overstay" sortKey="overstay_days" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Calculated Fine" sortKey="total_amount" sortConfig={sortConfig} onSort={onSort} />
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedData.map((item, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  const rowKey = detectedKey(item);
                  const isSelected = selectedKeys.has(rowKey);

                  return (
                    <tr
                      key={idx}
                      onClick={() => openLevyModal(item)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${isSelected ? "bg-amber-50/60" : ""}`}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-400 text-center">{globalIdx}</td>

                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider border ${
                          item.entity_type === "VEHICLE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}>
                          {item.entity_type === "VEHICLE" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {item.entity_type === "VEHICLE" ? "VEH" : "PER"}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        {item.entity_type === "VEHICLE" ? (
                          <>
                            {/* Vehicle Number - Primary */}
                            <p className="font-extrabold text-[#0a1e4d] uppercase font-mono text-sm">
                              {item.identifier}
                            </p>

                            {/* Vehicle Name (Bus/Truck/etc.) */}
                            {item.entity_name && item.entity_name !== item.identifier && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                {item.entity_name}
                              </p>
                            )}

                            {item.vehicle_type_name && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                <Car className="h-2.5 w-2.5" />
                                {item.vehicle_type_name}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Person Name - Primary */}
                            <p className="font-extrabold text-[#0a1e4d] text-sm">
                              {item.entity_name || item.identifier}
                            </p>

                            {/* Employee ID / Aadhaar / Identifier */}
                            <p className="text-[11px] text-slate-500 font-mono uppercase">
                              {item.identifier}
                            </p>
                          </>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-800">{item.company_name || "—"}</p>
                        {item.login_id && <p className="text-[10px] text-slate-400 font-mono">{item.login_id}</p>}
                      </td>

                      <td className="px-3 py-2 font-mono font-semibold text-slate-600">{item.pass_no || "—"}</td>

                      <td className="px-3 py-2 font-semibold text-emerald-700">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <CalendarDays className="h-3 w-3 text-emerald-500" />
                          {fmtDate(item.date_from)}
                        </span>
                      </td>

                      <td className="px-3 py-2 font-semibold text-red-600">
                        <span className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          <CalendarClock className="h-3 w-3 text-red-500" />
                          {fmtDate(item.date_to)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-extrabold text-[11px] ${passTypeColor(
                            item.pass_type || item.passType
                          )}`}
                        >
                          {formatPassType(
                            item.pass_type || item.passType,
                            item.date_from,
                            item.date_to
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-black text-red-700 bg-red-100/70 px-2 py-0.5 rounded-full border border-red-200">
                          {item.overstay_days} day{parseInt(item.overstay_days, 10) !== 1 ? "s" : ""}
                        </span>
                      </td>

                      <td className="px-3 py-2 font-black text-slate-900 text-sm">{fmtMoney(item.total_amount)}</td>

                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); openLevyModal(item); }}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-lg font-bold shadow-md hover:from-red-700 hover:to-rose-800 transition-all flex items-center gap-1.5 mx-auto active:scale-95"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Review & Levy
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (

            /* ──────────────── TAB 2 (Charges) & TAB 3 (Appeals) ──────────────── */
            <table className="w-full min-w-[1250px] text-left border-collapse whitespace-nowrap">
              <thead className="bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-20 shadow-md">
                {chargeTableHead}
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedData.map((charge, idx) => renderChargeRow(charge, idx))}
              </tbody>
            </table>
          )}
        </div>

        {/* ══════════════ FOOTER PAGINATION BAR ══════════════ */}
        {totalItems > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">

            <div className="flex items-center gap-3 text-slate-500 font-semibold">
              <span>
                Showing <strong className="text-slate-900">{Math.min(startIndex + 1, totalItems)}</strong> to{" "}
                <strong className="text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</strong> of{" "}
                <strong className="text-slate-900">{totalItems}</strong> entries
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
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

            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>

              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
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
                          className={`px-3 py-1 rounded-lg font-bold transition-all shadow-sm ${
                            page === p ? "bg-gradient-to-r from-[#0a1e4d] to-[#122b68] text-white shadow-blue-950/20" : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
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
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ LEVY CHARGE MODAL ══════════════ */}
      {levyModalOpen && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">

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

<PassBlockToggleStrip
  enabled={passBlockEnabled || companyPassBlocked}
  saving={savingCompanyPassBlock}
  onToggle={handleToggleCompanyPassBlock}
  locked={passBlockEnabled}
  lockedReason="Right now every company is blocked, because the site-wide setting is turned on. Turn that off first if you want to control this company on its own."
/>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

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

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pass Validity &amp; Type</p>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-200">
                      {formatPassType(selectedEntity.pass_type || selectedEntity.passType, selectedEntity.date_from, selectedEntity.date_to)} Pass
                    </span>
                  </div>
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
                {selectedEntity?.status === "NOTIFIED" && !(parseFloat(customRate || selectedEntity.daily_rate || 0) > 0) && (
                  <p className="mt-1 text-[10px] font-semibold text-amber-700">
                    Reminder rows store rate as 0 until levy. Final daily rate will be auto-calculated by the system on levy.
                  </p>
                )}
              </div>

              {(() => {
                const total = parseFloat(customRate || selectedEntity.daily_rate || 0) * parseInt(selectedEntity.overstay_days || 0, 10);
                return (
                  <div className="bg-gradient-to-br from-red-50 to-rose-100/50 p-4 rounded-2xl border border-red-200">
                    <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest mb-1">Calculated Total Fine</p>
                    <p className="text-xs text-red-700 font-mono mb-2">
                      {selectedEntity.overstay_days} days × {fmtMoney(customRate || selectedEntity.daily_rate)}/day
                    </p>
                    <p className="text-3xl font-black text-red-900">{fmtMoney(total)}</p>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Official Remarks / Justification
                </label>
                <textarea
                  rows={3}
                  value={levyNotes}
                  onChange={(e) => setLevyNotes(e.target.value)}
                  placeholder="Provide reason or other details for levying this overstay fine (optional)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#0a1e4d]/20 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setLevyModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (selectedEntity?.id) {
                      handleNotify(selectedEntity.id);
                    } else {
                      handleNotifyDetected(selectedEntity);
                    }
                  }}
                  disabled={notifying[selectedEntity?.id] || notifying[`detected-${selectedEntity?.entity_id}-${selectedEntity?.entity_type}`]}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-indigo-300 hover:border-indigo-400 bg-white hover:bg-indigo-50 text-indigo-700 disabled:opacity-60 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {(notifying[selectedEntity?.id] || notifying[`detected-${selectedEntity?.entity_id}-${selectedEntity?.entity_type}`]) ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {(notifying[selectedEntity?.id] || notifying[`detected-${selectedEntity?.entity_id}-${selectedEntity?.entity_type}`]) ? "Sending…" : "Notify"}
                </button>

                <button
                  onClick={handleWaiveFromModal}
                  disabled={waivingFromModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-amber-300 hover:border-amber-400 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-60 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title={!selectedEntity?.id ? "Mark as resolved — no charge has been levied yet" : "Waive this overstay charge and notify agent"}
                >
                  {waivingFromModal ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  {waivingFromModal ? "Waiving…" : "Waive Fine"}
                </button>

                <button
                  disabled={submitting}
                  onClick={handleLevySubmit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all"
                >
                  {submitting ? (
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Levying...</>
                  ) : (
                    <><ShieldAlert className="h-3.5 w-3.5" /> Levy Fine</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CHARGE DETAIL / EXCEPTION-DECISION MODAL ══════════════ */}
      {detailModalOpen && detailCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0a1e4d] via-[#122b68] to-[#0a1e4d] text-white flex justify-between items-center border-b border-white/10">
              <h3 className="font-black text-base flex items-center gap-2">
                {detailCharge.status === "EXCEPTION_REQUESTED" ? (
                  <><Gavel className="h-5 w-5 text-amber-300" /> Appeal Review — Ref</>
                ) : (
                  <><FileText className="h-5 w-5 text-blue-300" /> Charge Log Record </>
                )}
              </h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

<PassBlockToggleStrip
  enabled={passBlockEnabled || companyPassBlocked}
  saving={savingCompanyPassBlock}
  onToggle={handleToggleCompanyPassBlock}
  locked={passBlockEnabled}
  lockedReason="Right now every company is blocked, because the site-wide setting is turned on. Turn that off first if you want to control this company on its own."
/>

            <div className="px-6 pt-2">
              <p className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                {passBlockEnabled
                  ? "Blocked by Global Policy. Individual controls are disabled while Global Block is enabled."
                  : "Company-level control. This setting applies when Global Block is OFF."}
              </p>
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
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Validity Period &amp; Type</p>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-200">
                    {formatPassType(detailCharge.pass_type || detailCharge.passType, detailCharge.date_from, detailCharge.date_to)} Pass
                  </span>
                </div>
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
                  <p className="text-[10px] font-extrabold text-red-600 uppercase mb-1">
                    Penalty Breakdown {["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(detailCharge.status) && "(Live)"}
                  </p>
                  <p className="text-xs text-red-700 font-mono">
                    {["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(detailCharge.status)
                      ? detailCharge.current_overstay_days
                      : detailCharge.overstay_days} days × {fmtMoney(detailCharge.daily_rate)}/day
                  </p>
                </div>
                <p className="text-3xl font-black text-red-900">
                  {fmtMoney(
                    ["PENDING", "EXCEPTION_REQUESTED", "EXCEPTION_REJECTED"].includes(detailCharge.status)
                      ? detailCharge.current_total_amount
                      : detailCharge.total_amount
                  )}
                </p>
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

            {/* Footer — exception decisions live here now, not in the row */}
            {detailCharge.status === "EXCEPTION_REQUESTED" ? (
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleRejectException(detailCharge.id)}
                    disabled={!!decidingException[detailCharge.id]}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-300 hover:border-rose-400 bg-white hover:bg-rose-50 text-rose-700 disabled:opacity-60 rounded-xl text-xs font-bold transition-all shadow-sm"
                    title="Reject exception — agent can still pay the fine"
                  >
                    {decidingException[detailCharge.id] === "rejecting" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ThumbsDown className="h-3.5 w-3.5" />
                    )}
                    Reject & Levy
                  </button>
                  <button
                    onClick={() => handleApproveException(detailCharge.id)}
                    disabled={!!decidingException[detailCharge.id]}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all disabled:opacity-60"
                    title="Approve exception — resolves the charge as a waiver"
                  >
                    {decidingException[detailCharge.id] === "approving" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-3.5 w-3.5" />
                    )}
                    Approve & Waive
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
                {detailCharge.status === "NOTIFIED" && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openLevyModal(detailCharge);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Levy Now
                  </button>
                )}
                <button onClick={() => setDetailModalOpen(false)} className="px-5 py-2 bg-[#0a1e4d] hover:bg-[#0d2660] text-white font-bold rounded-xl text-xs transition-all shadow-md">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}