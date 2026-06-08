"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  ShieldBan,
  ShieldCheck,
  Search,
  Plus,
  X,
  Eye,
  Truck,
  User,
  CreditCard,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  FileText,
  ChevronRight,
  Ban,
  Loader2,
  ArrowRight,
  CircleDot,
  Banknote,
  ClipboardCheck,
  Send,
  Camera,
  MapPin,
  Download,
  Wallet,
  Globe,
} from "lucide-react";

// Inline IndianRupee SVG icon component to match Lucide style
const IndianRupee = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M6 3h12M6 8h12M6 13h4a5.5 5.5 0 0 0 0-11M9 13l9 9" />
  </svg>
);

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API;

/* ─────────── Reason Code Config ─────────── */
const REASON_CODES = [
  { code: "001", label: "001 - Unauthorized parking", penalty: 0 },
  { code: "002", label: "002 - Tampering of documents", penalty: 10000 },
  { code: "003", label: "003 - Misbehaviour with port officials", penalty: 0 },
  { code: "004", label: "004 - Criminal offense inside port", penalty: 0 },
  { code: "005", label: "005 - Unauthorized entry without passes caught", penalty: 0 },
  { code: "006", label: "006 - Traffic Violation", penalty: 5000 },
  { code: "007", label: "007 - Others", penalty: 0 },
];

/* ─────────── Entity type config ─────────── */
const ENTITY_TYPES = [
  { value: "VEHICLE", label: "Vehicle", icon: Truck, placeholder: "e.g. TN01AB1234", idLabel: "Vehicle Registration Number" },
  { value: "PERSON", label: "Person", icon: User, placeholder: "e.g. 1234 5678 9012", idLabel: "Aadhaar Number" },
  { value: "DRIVER", label: "Driver", icon: CreditCard, placeholder: "e.g. TN01 20200001234", idLabel: "Driving License / Aadhaar Number" },
  { value: "COMPANY", label: "Company / Firm", icon: Building2, placeholder: "e.g. COMP-001", idLabel: "User ID", disabled: true },
];

const SCENARIOS = [
  { value: "TRAFFIC_VIOLATION", label: "Traffic Violation" },
  { value: "FORGED_DOCUMENTS", label: "Forged / Incorrect Documents" },
  { value: "DAMAGES", label: "Damages within Port Premises" },
];

const STATUS_CONFIG = {
  BLACKLISTED: { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Blacklisted" },
  UNBLACKLIST_REQUESTED: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Unblacklist Requested" },
  UNBLACKLISTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Unblacklisted" },
};

const PENALTY_STATUS_CONFIG = {
  NOT_APPLICABLE: { color: "text-slate-400", label: "N/A" },
  PENDING: { color: "text-amber-600 font-bold", label: "Pending" },
  PAID: { color: "text-emerald-600 font-bold", label: "Paid" },
};

const validateVehicleRegNo = (val) => {
  const clean = val.replace(/\s/g, "");
  const regex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i;
  return regex.test(clean);
};

const validateAadhar = (val) => {
  const clean = val.replace(/\s/g, "");
  return /^\d{12}$/.test(clean);
};

const validateDL = (val) => {
  const clean = val.replace(/[-\s]/g, "");
  return /^[A-Z]{2}[0-9]{13}$/i.test(clean);
};

const validateDriverID = (val) => {
  return validateAadhar(val) || validateDL(val);
};

/* ─────────── Main Page ─────────── */
export default function ATMBlacklistPage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Mock Wallet Balance
  const [walletBalance, setWalletBalance] = useState(45250);

  // Create Modal & Form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    entity_type: "VEHICLE",
    identifier: "",
    entity_name: "",
    reason: "",
    scenario: "",
    has_penalty: false,
    penalty_amount: "",
    reason_code: "001",
    authorizing_officer: "",
    geotag_latitude: "",
    geotag_longitude: "",
    geotag_accuracy: "",
    permit_one_gate_out: false,
  });
  const [supportingFile, setSupportingFile] = useState(null);
  const [geotagStatus, setGeotagStatus] = useState("No location tagged");
  const [createLoading, setCreateLoading] = useState(false);

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("WALLET");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [complianceNotes, setComplianceNotes] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        setCreateForm((prev) => ({
          ...prev,
          authorizing_officer: u.username ? u.username.split("@")[0] : "ATM Officer",
        }));
      }
    }
  }, [isCreateOpen]);

  /* ── Fetch data ── */
  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (activeTab === "active") params.set("status", "BLACKLISTED");
      else if (activeTab === "requests") params.set("status", "UNBLACKLIST_REQUESTED");
      if (entityFilter) params.set("entity_type", entityFilter);
      if (searchInput) params.set("search", searchInput);

      const res = await axios.get(`${ADMIN_API}/blacklist/list?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load blacklist entries");
    } finally {
      setLoading(false);
    }
  }, [activeTab, entityFilter, searchInput]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/blacklist/stats`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [fetchEntries, fetchStats]);

  /* ── Geotagging simulation ── */
  const captureGeotag = () => {
    setGeotagStatus("Fetching GPS coordinates...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          const acc = position.coords.accuracy.toFixed(1);
          setCreateForm((prev) => ({
            ...prev,
            geotag_latitude: lat,
            geotag_longitude: lon,
            geotag_accuracy: acc,
          }));
          setGeotagStatus(`Tagged: Lat ${lat}, Lon ${lon} (±${acc}m)`);
          toast.success("Geotag captured successfully!");
        },
        (error) => {
          console.warn("GPS access denied, using Port default location:", error.message);
          // Default Port coordinate: Chennai Port
          const lat = "13.082700";
          const lon = "80.270700";
          const acc = "15.00";
          setCreateForm((prev) => ({
            ...prev,
            geotag_latitude: lat,
            geotag_longitude: lon,
            geotag_accuracy: acc,
          }));
          setGeotagStatus(`Default Port GPS: Lat ${lat}, Lon ${lon}`);
          toast.info("Using Chennai Port default GPS tag.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGeotagStatus("Geolocation not supported");
      toast.warning("Browser does not support GPS Geotagging.");
    }
  };

  /* ── Auto-calculate penalty based on Reason Code ── */
  const handleReasonCodeChange = (code) => {
    const selected = REASON_CODES.find((r) => r.code === code);
    if (selected) {
      if (selected.penalty > 0) {
        setCreateForm((prev) => ({
          ...prev,
          reason_code: code,
          has_penalty: true,
          penalty_amount: selected.penalty.toString(),
        }));
      } else {
        setCreateForm((prev) => ({
          ...prev,
          reason_code: code,
          has_penalty: false,
          penalty_amount: "",
        }));
      }
    }
  };

  /* ── Create blacklist entry ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.identifier.trim() || !createForm.reason.trim()) {
      toast.warning("Please fill in all required fields");
      return;
    }
    if (createForm.entity_type === "VEHICLE" && !validateVehicleRegNo(createForm.identifier)) {
      toast.warning("Please enter a valid Vehicle Registration Number (e.g. TN-01-AB-1234)");
      return;
    }
    if (createForm.entity_type === "PERSON" && !validateAadhar(createForm.identifier)) {
      toast.warning("Please enter a valid 12-digit Aadhaar Number");
      return;
    }
    if (createForm.entity_type === "DRIVER" && !validateDriverID(createForm.identifier)) {
      toast.warning("Please enter a valid Driver ID (12-digit Aadhaar or Driving License)");
      return;
    }
    if (createForm.has_penalty && (!createForm.penalty_amount || parseFloat(createForm.penalty_amount) <= 0)) {
      toast.warning("Please enter a valid penalty amount");
      return;
    }

    setCreateLoading(true);
    try {
      const formData = new FormData();
      formData.append("entity_type", createForm.entity_type);
      formData.append("identifier", createForm.identifier.trim().toUpperCase());
      formData.append("entity_name", createForm.entity_name);
      formData.append("reason", createForm.reason);
      formData.append("scenario", createForm.scenario || "TRAFFIC_VIOLATION");
      formData.append("has_penalty", createForm.has_penalty);
      formData.append("penalty_amount", createForm.has_penalty ? parseFloat(createForm.penalty_amount) : 0);
      formData.append("reason_code", createForm.reason_code);
      formData.append("authorizing_officer", createForm.authorizing_officer);
      formData.append("geotag_latitude", createForm.geotag_latitude);
      formData.append("geotag_longitude", createForm.geotag_longitude);
      formData.append("geotag_accuracy", createForm.geotag_accuracy);
      formData.append("permit_one_gate_out", createForm.permit_one_gate_out);

      if (supportingFile) {
        formData.append("supporting_document", supportingFile);
      }

      const res = await axios.post(`${ADMIN_API}/blacklist/create`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        toast.success("Entity blacklisted successfully", {
          description: `${createForm.entity_type}: ${createForm.identifier}`,
        });
        setIsCreateOpen(false);
        setCreateForm({
          entity_type: "VEHICLE", identifier: "", entity_name: "",
          reason: "", scenario: "", has_penalty: false, penalty_amount: "",
          reason_code: "001", authorizing_officer: currentUser?.username?.split("@")[0] || "ATM",
          geotag_latitude: "", geotag_longitude: "", geotag_accuracy: "",
          permit_one_gate_out: false,
        });
        setSupportingFile(null);
        setGeotagStatus("No location tagged");
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create blacklist entry";
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── Open detail modal ── */
  const openDetail = async (id) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const res = await axios.get(`${ADMIN_API}/blacklist/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setDetailEntry(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load entry details");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── E2E checkout execution ── */
  const executePayment = async () => {
    if (paymentMethod === "WALLET") {
      const amount = parseFloat(detailEntry.penalty_amount);
      if (walletBalance < amount) {
        toast.error("Insufficient balance in your Port Wallet.");
        return;
      }
    }

    setActionLoading(true);
    try {
      const txnId = `TXN-W${Date.now()}`;
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/pay-penalty`,
        {
          remarks: paymentRemarks || `Penalty paid successfully via ${paymentMethod}`,
          payment_method: paymentMethod,
          transaction_id: txnId,
        },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        if (paymentMethod === "WALLET") {
          setWalletBalance((prev) => prev - parseFloat(detailEntry.penalty_amount));
        }
        toast.success("Penalty payment completed successfully!");
        setDetailEntry(res.data.data);
        setIsCheckoutOpen(false);
        setPaymentRemarks("");
        setCardNumber("");
        setCardExpiry("");
        setCardCvv("");
        setCardName("");
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCompliance = async () => {
    if (!complianceNotes.trim()) {
      toast.warning("Please enter compliance notes");
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/submit-compliance`,
        { compliance_notes: complianceNotes },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Compliance notes submitted");
        setDetailEntry(res.data.data);
        setComplianceNotes("");
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit compliance");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestUnblacklist = async () => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/request-unblacklist`,
        { remarks: actionRemarks || "Requesting unblacklist after compliance" },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Unblacklist request submitted for Traffic Approval");
        setDetailEntry(res.data.data);
        setActionRemarks("");
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request unblacklist");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Direct release unblocking (ATM Privilege) ── */
  const handleDirectUnblock = async () => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/direct-unblock`,
        { remarks: actionRemarks || "Directly unblocked & reinstated by ATM" },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Entity directly unblocked and released!");
        setDetailEntry(res.data.data);
        setActionRemarks("");
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Direct release failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Active entity type config lookup ── */
  const getEntityConfig = (type) =>
    ENTITY_TYPES.find((t) => t.value === type) || ENTITY_TYPES[0];

  /* ── Export reports (CSV / MD) ── */
  const exportReport = (format) => {
    if (entries.length === 0) {
      toast.warning("No records to export.");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const reportType = activeTab === "active" ? "active_blacklist" : activeTab === "requests" ? "unblacklist_requests" : "blacklist_history";
    const filename = `${reportType}_report_${timestamp}.${format}`;

    let fileContent = "";

    if (format === "csv") {
      const headers = ["ID", "Type", "Identifier", "Name", "Reason", "Reason Code", "Penalty", "Penalty Status", "Status", "Date"];
      const rows = entries.map((e) => [
        e.id,
        e.entity_type,
        e.identifier,
        e.entity_name || "—",
        e.reason.replace(/"/g, '""'),
        e.reason_code || "N/A",
        e.has_penalty ? e.penalty_amount : 0,
        e.penalty_status,
        e.status,
        new Date(e.blacklisted_at).toLocaleDateString("en-IN"),
      ]);

      fileContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    } else if (format === "md") {
      const title = reportType.replace(/_/g, " ").toUpperCase();
      fileContent = `# Port Access Control - ${title} Report (${timestamp})\n\n`;
      fileContent += `| ID | Type | Identifier | Name | Reason | Reason Code | Penalty (₹) | Penalty Status | Status | Date |\n`;
      fileContent += `|---|---|---|---|---|---|---|---|---|---|\n`;

      entries.forEach((e) => {
        const name = e.entity_name || "—";
        const amt = e.has_penalty ? parseFloat(e.penalty_amount).toLocaleString("en-IN") : "0";
        const dateStr = new Date(e.blacklisted_at).toLocaleDateString("en-IN");
        fileContent += `| ${e.id} | ${e.entity_type} | **${e.identifier}** | ${name} | ${e.reason} | ${e.reason_code || "N/A"} | ${amt} | ${e.penalty_status} | ${e.status} | ${dateStr} |\n`;
      });
    }

    const blob = new Blob([fileContent], { type: format === "csv" ? "text/csv;charset=utf-8;" : "text/markdown;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${format.toUpperCase()} successfully: ${filename}`);
  };

  /* ── Tabs ── */
  const tabs = [
    { id: "active", label: "Active Blacklist", count: stats?.active_blacklisted || 0 },
    { id: "requests", label: "Unblacklist Requests", count: stats?.pending_unblacklist || 0 },
    { id: "all", label: "All Records", count: stats?.total || 0 },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          {
            label: "Active Blacklisted",
            value: stats?.active_blacklisted || 0,
            icon: ShieldBan,
            color: "text-red-600",
            bgIcon: "bg-red-50",
            ring: "ring-red-200/60",
          },
          {
            label: "Pending Unblacklist",
            value: stats?.pending_unblacklist || 0,
            icon: Clock,
            color: "text-amber-600",
            bgIcon: "bg-amber-50",
            ring: "ring-amber-200/60",
          },
          {
            label: "Pending Penalties",
            value: stats?.pending_penalties || 0,
            icon: IndianRupee,
            color: "text-orange-600",
            bgIcon: "bg-orange-50",
            ring: "ring-orange-200/60",
          },
          {
            label: "Total Unblacklisted",
            value: stats?.total_unblacklisted || 0,
            icon: ShieldCheck,
            color: "text-emerald-600",
            bgIcon: "bg-emerald-50",
            ring: "ring-emerald-200/60",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl p-4 sm:p-5 ring-1 ${card.ring} shadow-lg flex flex-col gap-2 hover:shadow-xl transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                {card.label}
              </span>
              <span className={`flex items-center justify-center h-8 w-8 rounded-xl ${card.bgIcon}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={2.5} />
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Page header + Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl ring-1 ring-slate-200/50 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldBan className="h-6 w-6 text-red-500" strokeWidth={2.5} />
            ATM Blacklist Portal
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Blacklist and unblock vehicles, persons, and drivers (Wallet & Gateway payment enabled)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Wallet Balance Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 mr-2 shadow-sm">
            <Wallet className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span>Port Wallet: ₹{walletBalance.toLocaleString("en-IN")}</span>
          </div>
          <button
            onClick={() => { fetchEntries(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Blacklist Entity
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchInput(""); setEntityFilter(""); }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-slate-800 text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
              activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/60 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            <ShieldBan className="h-4 w-4 text-red-500" />
            {activeTab === "active" ? "Active Blacklist" : activeTab === "requests" ? "Pending Unblacklist" : "All Records"}
          </h3>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
            {/* Export buttons */}
            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={() => exportReport("csv")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => exportReport("md")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                <FileText className="h-3.5 w-3.5" /> MD
              </button>
            </div>
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full md:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-red-400 appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value} disabled={t.disabled}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by ID, Name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-red-400"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {["Type", "Identifier", "Name", "Reason / Code", "Penalty", "Status", "Date"].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider ${h === "Status" ? "text-center" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading entries...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <ShieldBan className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const eConfig = getEntityConfig(entry.entity_type);
                  const sConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.BLACKLISTED;
                  const pConfig = PENALTY_STATUS_CONFIG[entry.penalty_status] || PENALTY_STATUS_CONFIG.NOT_APPLICABLE;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => openDetail(entry.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center justify-center h-8 w-8 rounded-lg ${entry.status === "UNBLACKLISTED" ? "bg-emerald-50" : "bg-red-50"}`}>
                            <eConfig.icon className={`h-4 w-4 ${entry.status === "UNBLACKLISTED" ? "text-emerald-600" : "text-red-500"}`} strokeWidth={2} />
                          </span>
                          <span className="text-xs font-bold text-slate-600 uppercase">{eConfig.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800 font-mono tracking-wide">
                        {entry.identifier}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {entry.entity_name || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">{entry.reason}</div>
                        {entry.reason_code && (
                          <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Code {entry.reason_code}</span>
                        )}
                        {entry.permit_one_gate_out && (
                          <span className={`text-[9px] font-bold ml-1.5 px-1 py-0.5 rounded ${entry.gate_out_used ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
                            {entry.gate_out_used ? "Final Gate OUT Used" : "Permitted 1 Gate OUT"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {entry.has_penalty ? (
                          <div>
                            <p className="text-sm font-bold text-slate-800">₹{parseFloat(entry.penalty_amount || 0).toLocaleString("en-IN")}</p>
                            <span className={`text-[10px] ${pConfig.color}`}>{pConfig.label}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">No Penalty</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${sConfig.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">
                        {new Date(entry.blacklisted_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* CREATE BLACKLIST MODAL                       */}
      {/* ════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-500 to-red-700 text-white shrink-0">
              <div className="flex items-center gap-3">
                <ShieldBan className="h-6 w-6" />
                <h2 className="text-lg font-bold">Blacklist Entity</h2>
              </div>
              <button
                onClick={() => { setIsCreateOpen(false); setSupportingFile(null); setGeotagStatus("No location tagged"); }}
                className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Entity Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entity Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ENTITY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      disabled={type.disabled}
                      onClick={() => setCreateForm((f) => ({ ...f, entity_type: type.value, identifier: "" }))}
                      className={`flex items-center gap-2 p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        type.disabled ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" :
                        createForm.entity_type === type.value
                          ? "border-red-500 bg-red-50 text-red-700 font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <type.icon className="h-4 w-4 shrink-0" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Code (001 - 007) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason Code</label>
                <select
                  value={createForm.reason_code}
                  onChange={(e) => handleReasonCodeChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-400 appearance-none cursor-pointer"
                >
                  {REASON_CODES.map((rc) => (
                    <option key={rc.code} value={rc.code}>{rc.label}</option>
                  ))}
                </select>
              </div>

              {/* Identifier */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {getEntityConfig(createForm.entity_type).idLabel} <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const type = createForm.entity_type;
                  const hasValue = !!createForm.identifier.trim();
                  
                  let isValid = true;
                  let helperText = "";
                  let formatText = "";
                  if (type === "VEHICLE") {
                    isValid = validateVehicleRegNo(createForm.identifier);
                    formatText = "Format: TN-01-AB-1234 or TN01AB1234";
                    helperText = isValid ? "Valid Vehicle Registration format" : "Invalid Vehicle Registration format";
                  } else if (type === "PERSON") {
                    isValid = validateAadhar(createForm.identifier);
                    formatText = "Format: 12-digit Aadhaar Number";
                    helperText = isValid ? "Valid Aadhaar format" : "Aadhaar must be exactly 12 digits";
                  } else if (type === "DRIVER") {
                    isValid = validateDriverID(createForm.identifier);
                    formatText = "Format: 12-digit Aadhaar or Driving License (e.g. TN0120200001234)";
                    helperText = isValid ? "Valid Driver ID format" : "Must be a 12-digit Aadhaar or 15-digit Driving License";
                  }

                  let borderClass = "border-slate-200 focus:border-red-400 focus:ring-red-500/10";
                  if (hasValue) {
                    borderClass = isValid 
                      ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/10" 
                      : "border-red-500 focus:border-red-600 focus:ring-red-500/10";
                  }

                  return (
                    <>
                      <input
                        type="text"
                        value={createForm.identifier}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (type === "PERSON") {
                            val = val.replace(/\D/g, "").slice(0, 12);
                          } else if (type === "VEHICLE") {
                            val = val.toUpperCase().slice(0, 13);
                          } else if (type === "DRIVER") {
                            val = val.toUpperCase().slice(0, 16);
                          }
                          setCreateForm((f) => ({ ...f, identifier: val }));
                        }}
                        placeholder={getEntityConfig(type).placeholder}
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all ${borderClass}`}
                        required
                      />
                      {hasValue && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium animate-in fade-in duration-200">
                          {isValid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              <span className="text-emerald-600 font-semibold">{helperText}</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                              <span className="text-red-500 font-semibold">{helperText}. {formatText}</span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Entity Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={createForm.entity_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entity_name: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
                />
              </div>

              {/* Scenario */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scenario</label>
                <select
                  value={createForm.scenario}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scenario: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-red-400 appearance-none cursor-pointer"
                >
                  <option value="">Select scenario...</option>
                  {SCENARIOS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Reason Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Describe the reason for blacklisting..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none resize-none transition-all"
                  required
                />
              </div>

              {/* Authorizing Officer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Authorizing Officer</label>
                <input
                  type="text"
                  value={createForm.authorizing_officer}
                  onChange={(e) => setCreateForm((f) => ({ ...f, authorizing_officer: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
                  required
                />
              </div>

              {/* Geotagged Photograph Upload & Capturer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Supporting Document / Photograph</label>
                  <button
                    type="button"
                    onClick={captureGeotag}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700 transition"
                  >
                    <MapPin className="h-3 w-3 text-red-500" /> Get GPS Tag
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    setSupportingFile(e.target.files[0]);
                    if (e.target.files[0]) {
                      captureGeotag(); // Auto-geotag on file select
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{geotagStatus}</span>
                </div>
              </div>

              {/* Vehicle Gate OUT Checkbox */}
              {createForm.entity_type === "VEHICLE" && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permit_one_gate_out}
                      onChange={(e) => setCreateForm((f) => ({ ...f, permit_one_gate_out: e.target.checked }))}
                      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-sm font-bold text-blue-800">Permit 1 final Gate OUT transaction</span>
                      <p className="text-[10px] text-blue-600">Ensures cargo movement is not disrupted before block takes effect.</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Penalty Toggle / Amount */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.has_penalty}
                    onChange={(e) => setCreateForm((f) => ({ ...f, has_penalty: e.target.checked, penalty_amount: "" }))}
                    className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-700">This blacklisting includes a penalty</span>
                </label>
                {createForm.has_penalty && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Penalty Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={createForm.penalty_amount}
                        onChange={(e) => setCreateForm((f) => ({ ...f, penalty_amount: e.target.value }))}
                        placeholder="e.g. 5000"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3.5 bg-gradient-to-r from-red-500 to-red-700 text-white text-sm font-bold tracking-wider uppercase rounded-xl hover:from-red-600 hover:to-red-800 shadow-lg shadow-red-500/20 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createLoading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><ShieldBan className="h-4 w-4" /> Confirm Blacklist</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* DETAIL / VIEW MODAL                          */}
      {/* ════════════════════════════════════════════ */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-bold">
                  Blacklist Entry #{detailEntry?.id || "..."}
                </h2>
              </div>
              <button
                onClick={() => { setIsDetailOpen(false); setDetailEntry(null); setComplianceNotes(""); setActionRemarks(""); }}
                className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                <p className="text-sm text-slate-500">Loading details...</p>
              </div>
            ) : detailEntry ? (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Status + Entity Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const eConf = getEntityConfig(detailEntry.entity_type);
                      return (
                        <span className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-50">
                          <eConf.icon className="h-6 w-6 text-red-500" />
                        </span>
                      );
                    })()}
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 font-mono">{detailEntry.identifier}</p>
                      <p className="text-sm text-slate-500">{detailEntry.entity_name || "—"} • {detailEntry.entity_type}</p>
                    </div>
                  </div>
                  {(() => {
                    const sConf = STATUS_CONFIG[detailEntry.status] || STATUS_CONFIG.BLACKLISTED;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${sConf.color}`}>
                        <span className={`w-2 h-2 rounded-full ${sConf.dot}`} />
                        {sConf.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Authorizing Officer</p>
                    <p className="text-sm font-semibold text-slate-700">{detailEntry.authorizing_officer || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Blacklisted On</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(detailEntry.blacklisted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reason Code</p>
                    <p className="text-sm font-bold text-red-600">{detailEntry.reason_code ? `Code ${detailEntry.reason_code}` : "007 - Others"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Penalty</p>
                    {detailEntry.has_penalty ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800">₹{parseFloat(detailEntry.penalty_amount || 0).toLocaleString("en-IN")}</p>
                        <span className={`text-[10px] ${PENALTY_STATUS_CONFIG[detailEntry.penalty_status]?.color}`}>{PENALTY_STATUS_CONFIG[detailEntry.penalty_status]?.label}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No Penalty</p>
                    )}
                  </div>
                  {detailEntry.geotag_latitude && (
                    <div className="col-span-2 flex items-center gap-1 text-xs text-slate-600 font-semibold bg-slate-200/50 p-2 rounded border border-slate-200">
                      <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                      <span>Evidence Geotag: Lat {detailEntry.geotag_latitude}, Lon {detailEntry.geotag_longitude} (±{detailEntry.geotag_accuracy}m)</span>
                    </div>
                  )}
                  {detailEntry.supporting_document_path && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Supporting Photo/Evidence</p>
                      <a
                        href={`${ADMIN_API.replace("/api", "")}/${detailEntry.supporting_document_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 mt-1"
                      >
                        <Camera className="h-4 w-4" /> View Geotagged Photo
                      </a>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reason</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{detailEntry.reason}</p>
                  </div>
                  {detailEntry.compliance_notes && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Compliance Notes</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-white p-2 rounded border border-slate-200">{detailEntry.compliance_notes}</p>
                    </div>
                  )}
                  {detailEntry.reinstatement_justification && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reinstatement Justification</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-emerald-50/50 p-2 rounded border border-emerald-200">{detailEntry.reinstatement_justification}</p>
                    </div>
                  )}
                </div>

                {/* ── Action Panels (context-dependent) ── */}
                {detailEntry.status === "BLACKLISTED" && (
                  <div className="space-y-3">
                    {/* Step 1: Pay Penalty (if applicable) */}
                    {detailEntry.has_penalty && detailEntry.penalty_status === "PENDING" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-amber-800 font-bold text-sm">
                          <span className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Step 1: Pay Penalty
                          </span>
                          <span className="text-xs bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">Required</span>
                        </div>
                        <p className="text-xs text-amber-700">Please clear the penalty of ₹{parseFloat(detailEntry.penalty_amount).toLocaleString("en-IN")} via Wallet or Payment Gateway.</p>
                        <button
                          onClick={() => setIsCheckoutOpen(true)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow"
                        >
                          <CreditCard className="h-4 w-4" />
                          Proceed to Checkout
                        </button>
                      </div>
                    )}

                    {/* Step 2: Submit Compliance */}
                    {(!detailEntry.has_penalty || detailEntry.penalty_status === "PAID") && !detailEntry.compliance_notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                          <ClipboardCheck className="h-5 w-5" />
                          {detailEntry.has_penalty ? "Step 2" : "Step 1"}: Submit Compliance / Corrective Actions
                        </div>
                        <textarea
                          rows={2}
                          value={complianceNotes}
                          onChange={(e) => setComplianceNotes(e.target.value)}
                          placeholder="Describe the corrective actions taken..."
                          className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                        />
                        <button
                          onClick={handleSubmitCompliance}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                          Submit Compliance
                        </button>
                      </div>
                    )}

                    {/* Step 3: Request Unblacklist / Direct Release */}
                    {(!detailEntry.has_penalty || detailEntry.penalty_status === "PAID") && detailEntry.compliance_notes && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <Send className="h-5 w-5" />
                          {detailEntry.has_penalty ? "Step 3" : "Step 2"}: Reopen / Release Request
                        </div>
                        <p className="text-xs text-emerald-700">Enter remarks to unblock this entity.</p>
                        <input
                          type="text"
                          value={actionRemarks}
                          onChange={(e) => setActionRemarks(e.target.value)}
                          placeholder="Additional remarks/justification"
                          className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleRequestUnblacklist}
                            disabled={actionLoading}
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5"
                          >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Request Traffic Approval
                          </button>
                          <button
                            onClick={handleDirectUnblock}
                            disabled={actionLoading}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5 shadow"
                          >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            Direct Unblock (ATM)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {detailEntry.status === "UNBLACKLIST_REQUESTED" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <Clock className="h-5 w-5" />
                      Awaiting Traffic Approval
                    </div>
                    <p className="text-xs text-amber-700">This unblacklist request has been sent to the Senior Traffic Department. ATM can also unblock directly if required:</p>
                    <input
                      type="text"
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      placeholder="Remarks for direct release..."
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleDirectUnblock}
                      disabled={actionLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Direct Release (Bypass Queue)
                    </button>
                  </div>
                )}

                {detailEntry.status === "UNBLACKLISTED" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      Entity has been unblacklisted
                    </div>
                    {detailEntry.unblacklisted_by_name && (
                      <p className="text-xs text-emerald-700 mt-1">
                        Approved by {detailEntry.unblacklisted_by_name} on{" "}
                        {detailEntry.unblacklisted_at ? new Date(detailEntry.unblacklisted_at).toLocaleDateString("en-IN") : "—"}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Audit Trail ── */}
                {detailEntry.auditLog && detailEntry.auditLog.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Audit Trail
                    </h4>
                    <div className="space-y-0 relative">
                      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />
                      {detailEntry.auditLog.map((log, i) => (
                        <div key={log.id || i} className="relative flex items-start gap-3 py-2">
                          <span className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 shrink-0 ${
                            log.action.includes("BLACKLISTED") && !log.action.includes("UN") ? "bg-red-50 border-red-300" :
                            log.action.includes("PAID") ? "bg-amber-50 border-amber-300" :
                            log.action.includes("COMPLIANCE") ? "bg-blue-50 border-blue-300" :
                            log.action.includes("APPROVED") || log.action === "UNBLACKLISTED" || log.action === "REINSTATED" ? "bg-emerald-50 border-emerald-300" :
                            log.action.includes("REJECTED") ? "bg-red-50 border-red-300" :
                            "bg-slate-50 border-slate-300"
                          }`}>
                            <CircleDot className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700">
                              {log.action.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.performed_by_name || "System"} • {new Date(log.createdAt).toLocaleString("en-IN")}
                            </p>
                            {log.remarks && (
                              <p className="text-xs text-slate-600 mt-0.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.remarks}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* MOCK PAYMENT CHECKOUT GATEWAY               */}
      {/* ════════════════════════════════════════════ */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950 text-white shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold">Secure Penalty Payment</h2>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Amount Due</span>
                <span className="text-lg font-extrabold text-slate-800">₹{parseFloat(detailEntry?.penalty_amount || 0).toLocaleString("en-IN")}</span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("WALLET")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      paymentMethod === "WALLET"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    Port Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("GATEWAY")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      paymentMethod === "GATEWAY"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Globe className="h-4 w-4 text-amber-500" />
                    Card / UPI
                  </button>
                </div>
              </div>

              {/* Method Details */}
              {paymentMethod === "WALLET" ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Your Wallet Balance:</span>
                    <span className="font-extrabold">₹{walletBalance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/60 pt-1.5 font-bold">
                    <span>Remaining Balance:</span>
                    <span>₹{(walletBalance - parseFloat(detailEntry?.penalty_amount || 0)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50 animate-in slide-in-from-bottom-2 duration-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Credit Card Details (Simulator)</span>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, "").replace(/(\d{4})/g, "$1 ").trim().substring(0, 19))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.substring(0, 3))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Payment remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Paid online reference / counter #"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Action */}
              <button
                onClick={executePayment}
                disabled={actionLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition shadow active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                Authorize Payment of ₹{parseFloat(detailEntry?.penalty_amount || 0).toLocaleString("en-IN")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
