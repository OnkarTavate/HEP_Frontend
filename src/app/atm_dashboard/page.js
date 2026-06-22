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
  { value: "COMPANY", label: "Company / Firm", icon: Building2, placeholder: "e.g. COMP-001", idLabel: "User ID" },
];

const SCENARIOS = [
  { value: "TRAFFIC_VIOLATION", label: "Traffic Violation" },
  { value: "FORGED_DOCUMENTS", label: "Forged / Incorrect Documents" },
  { value: "DAMAGES", label: "Damages within Port Premises" },
];

const STATUS_CONFIG = {
  BLACKLISTED: { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Blacklisted" },
  PENDING_BLACKLIST: { color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500 animate-pulse", label: "Pending Approval" },
  UNBLACKLIST_REQUESTED: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Unblacklist Requested" },
  UNBLACKLISTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Unblacklisted" },
  REJECTED: { color: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400", label: "Rejected" },
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

const validateCompanyID = (val) => {
  const clean = val.trim();
  return /^(190\d{6}|[a-zA-Z0-9_-]{3,20})$/.test(clean);
};

const validateName = (val) => {
  const clean = val.trim();
  if (!clean) return true;
  return /^[a-zA-Z\s.-]{2,100}$/.test(clean);
};

const validateOfficer = (val) => {
  const clean = val.trim();
  return /^[a-zA-Z\s.]{3,50}$/.test(clean);
};

/* ─────────── Main Page ─────────── */
export default function ATMBlacklistPage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const canApproveBlacklist = 
    currentUser?.role?.toLowerCase() === "atm" || 
    currentUser?.username?.toLowerCase() === "atm";

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
  const [paymentMethod, setPaymentMethod] = useState("GATEWAY");
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
      else if (activeTab === "pending") params.set("status", "PENDING_BLACKLIST");
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

  /* ── Auto-calculate penalty based on Reason Code & Entity Type ── */
  const getInitialPenaltyForEntity = (entityType, reasonCode) => {
    const selected = REASON_CODES.find((r) => r.code === reasonCode);
    const codePenalty = selected ? selected.penalty : 0;
    if (entityType === "VEHICLE") {
      return Math.max(codePenalty, 1025);
    }
    return codePenalty;
  };

  const handleReasonCodeChange = (code) => {
    const penalty = getInitialPenaltyForEntity(createForm.entity_type, code);
    if (penalty > 0) {
      setCreateForm((prev) => ({
        ...prev,
        reason_code: code,
        has_penalty: true,
        penalty_amount: penalty.toString(),
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        reason_code: code,
        has_penalty: false,
        penalty_amount: "",
      }));
    }
  };

  const handleEntityTypeChange = (typeVal) => {
    const penalty = getInitialPenaltyForEntity(typeVal, createForm.reason_code);
    setCreateForm((prev) => ({
      ...prev,
      entity_type: typeVal,
      identifier: "",
      has_penalty: penalty > 0,
      penalty_amount: penalty > 0 ? penalty.toString() : "",
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.identifier.trim() || !createForm.reason.trim() || !createForm.authorizing_officer.trim()) {
      toast.warning("Please fill in all required fields (Identifier, Reason, and Authorizing Officer)");
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
    if (createForm.entity_type === "COMPANY" && !validateCompanyID(createForm.identifier)) {
      toast.warning("Please enter a valid Company ID (9-digit agent ID starting with 190, or alphanumeric username of 3-20 characters)");
      return;
    }
    if (createForm.entity_name.trim() && !validateName(createForm.entity_name)) {
      toast.warning("Entity Name can only contain letters, spaces, dots, and hyphens (2-100 characters)");
      return;
    }
    if (createForm.reason.trim().length < 10) {
      toast.warning("Reason description must be at least 10 characters long");
      return;
    }
    if (!validateOfficer(createForm.authorizing_officer)) {
      toast.warning("Authorizing Officer name must be 3-50 characters long and contain only letters, spaces, and dots");
      return;
    }
    if (createForm.reason_code === "001") {
      if (!createForm.geotag_latitude || !createForm.geotag_longitude) {
        toast.warning("Geotagged GPS coordinates are required for Unauthorized Parking (Reason Code 001). Please click 'Get GPS Tag' first.");
        return;
      }
      if (!supportingFile) {
        toast.warning("A supporting photograph is required as proof for Unauthorized Parking (Reason Code 001). Please select a file.");
        return;
      }
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
    if (!cardName.trim() || !cardNumber.trim()) {
      toast.warning("Please enter cardholder name and card number to proceed.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      toast.warning("Please enter a valid 16-digit card number.");
      return;
    }
    if (!cardExpiry.trim() || cardExpiry.length < 5) {
      toast.warning("Please enter a valid card expiry (MM/YY).");
      return;
    }
    if (!cardCvv.trim() || cardCvv.length < 3) {
      toast.warning("Please enter a valid 3-digit CVV.");
      return;
    }

    setActionLoading(true);
    try {
      const txnId = `TXN-W${Date.now()}`;
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/pay-penalty`,
        {
          remarks: paymentRemarks || `Penalty paid successfully via GATEWAY`,
          payment_method: "GATEWAY",
          transaction_id: txnId,
        },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
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

  /* ── Approve Blacklist Request ── */
  const handleApproveBlacklist = async () => {
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/approve-blacklist`,
        { remarks: actionRemarks || "Approved by ATM Pass Section" },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Blacklist request approved successfully!");
        setDetailEntry(res.data.data);
        setActionRemarks("");
        setIsDetailOpen(false);
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve blacklist");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Reject Blacklist Request ── */
  const handleRejectBlacklist = async () => {
    if (!actionRemarks.trim()) {
      toast.warning("Please provide rejection remarks/reason");
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/reject-blacklist`,
        { remarks: actionRemarks },
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        toast.success("Blacklist request rejected successfully");
        setDetailEntry(res.data.data);
        setActionRemarks("");
        setIsDetailOpen(false);
        fetchEntries();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject blacklist");
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
    { id: "pending", label: "Pending Blacklist", count: stats?.pending_blacklist || 0 },
    { id: "requests", label: "Unblacklist Requests", count: stats?.pending_unblacklist || 0 },
    { id: "all", label: "All Records", count: stats?.total || 0 },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          {
            label: "Active Blacklisted",
            value: stats?.active_blacklisted || 0,
            icon: ShieldBan,
            color: "text-red-600 dark:text-red-400",
            bgIcon: "bg-red-50 dark:bg-red-500/10",
            footnote: "Active blocked cases",
            onClick: () => { setActiveTab("active"); setSearchInput(""); setEntityFilter(""); },
          },
          {
            label: "Pending Unblacklist",
            value: stats?.pending_unblacklist || 0,
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bgIcon: "bg-amber-50 dark:bg-amber-500/10",
            footnote: "Awaiting review",
            onClick: () => { setActiveTab("requests"); setSearchInput(""); setEntityFilter(""); },
          },
          {
            label: "Pending Penalties",
            value: `₹${parseFloat(stats?.pending_penalties_sum || 0).toLocaleString("en-IN")}`,
            icon: IndianRupee,
            color: "text-orange-600 dark:text-orange-400",
            bgIcon: "bg-orange-50 dark:bg-orange-500/10",
            footnote: `${stats?.pending_penalties || 0} active penalties`,
            onClick: () => { setActiveTab("all"); setSearchInput(""); setEntityFilter(""); },
          },
          {
            label: "Total Unblacklisted",
            value: stats?.total_unblacklisted || 0,
            icon: ShieldCheck,
            color: "text-emerald-600 dark:text-emerald-400",
            bgIcon: "bg-emerald-50 dark:bg-emerald-500/10",
            footnote: "Restored entries",
            onClick: () => { setActiveTab("all"); setSearchInput(""); setEntityFilter(""); },
          },
        ].map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className="bg-white dark:bg-[#1e293b] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.08),0_8px_20px_-6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out cursor-pointer flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {card.label}
              </span>
              <span className={`flex items-center justify-center h-8 w-8 rounded-xl ${card.bgIcon}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={2.5} />
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${card.color}`}>
              {card.value}
            </p>
            {card.footnote && (
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                {card.footnote}
              </span>
            )}
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
            Blacklist and unblock vehicles, persons, and drivers (Gateway payment enabled)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => { fetchEntries(); fetchStats(); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold shadow-sm active:scale-95 transition-all w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Blacklist Entity
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 pb-0 overflow-x-auto no-scrollbar scroll-smooth shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchInput(""); setEntityFilter(""); }}
            className={`relative px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${
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
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-stretch sm:items-center">
            {/* Export buttons */}
            <div className="flex items-center gap-2 justify-between sm:justify-start">
              <button
                onClick={() => exportReport("csv")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm bg-white"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => exportReport("md")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm bg-white"
              >
                <FileText className="h-3.5 w-3.5" /> MD
              </button>
            </div>
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-650 focus:outline-none focus:border-red-400 appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value} disabled={t.disabled}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by ID, Name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-red-400"
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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-150 bg-white">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 mx-auto text-slate-350 mb-3 animate-spin" />
              <p className="text-sm font-semibold">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ShieldBan className="h-8 w-8 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold">No records found</p>
            </div>
          ) : (
            entries.map((entry) => {
              const eConfig = getEntityConfig(entry.entity_type);
              const sConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.BLACKLISTED;
              const pConfig = PENALTY_STATUS_CONFIG[entry.penalty_status] || PENALTY_STATUS_CONFIG.NOT_APPLICABLE;
              return (
                <div
                  key={entry.id}
                  onClick={() => openDetail(entry.id)}
                  className="p-4 space-y-3 hover:bg-slate-50/50 active:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex items-center justify-center h-8.5 w-8.5 rounded-xl ${entry.status === "UNBLACKLISTED" ? "bg-emerald-50" : "bg-red-50"}`}>
                        <eConfig.icon className={`h-4.5 w-4.5 ${entry.status === "UNBLACKLISTED" ? "text-emerald-600" : "text-red-500"}`} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 font-mono tracking-wide">
                          {entry.identifier}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {eConfig.label} {entry.entity_name ? `• ${entry.entity_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${sConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sConfig.dot}`} />
                      {sConfig.label}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason Description</span>
                        <p className="font-semibold text-slate-700 leading-snug">{entry.reason}</p>
                      </div>
                      {entry.reason_code && (
                        <span className="shrink-0 text-[9px] font-extrabold text-red-650 uppercase bg-red-100/50 border border-red-200 px-1.5 py-0.5 rounded">Code {entry.reason_code}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/50">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penalty Status</span>
                        {entry.has_penalty ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-extrabold text-slate-700">₹{parseFloat(entry.penalty_amount || 0).toLocaleString("en-IN")}</span>
                            <span className={`text-[10px] font-extrabold ${pConfig.color}`}>{pConfig.label}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-400 block mt-0.5">No Penalty</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date Blocked</span>
                        <span className="font-bold text-slate-650 block mt-0.5">
                          {new Date(entry.blacklisted_at || entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {entry.permit_one_gate_out && (
                      <div className={`inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded mt-1.5 ${entry.gate_out_used ? "bg-slate-200 text-slate-500" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
                        {entry.gate_out_used ? "Final Gate OUT Used" : "Permitted 1 final Gate OUT"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* CREATE BLACKLIST MODAL                       */}
      {/* ════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-4.5 bg-gradient-to-r from-slate-950 via-red-950 to-slate-950 text-white shrink-0 border-b border-red-500/20 shadow-md">
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

            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Entity Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entity Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ENTITY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      disabled={type.disabled}
                      onClick={() => handleEntityTypeChange(type.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-xs font-medium transition-all gap-1.5 ${
                        type.disabled ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" :
                        createForm.entity_type === type.value
                          ? "border-red-500 bg-red-50 text-red-700 font-bold"
                          : "border-slate-200 bg-white text-slate-650 hover:border-slate-350"
                      }`}
                    >
                      <type.icon className="h-5 w-5 shrink-0" />
                      <span className="text-[10px] tracking-tight">{type.label}</span>
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
                  } else if (type === "COMPANY") {
                    isValid = validateCompanyID(createForm.identifier);
                    formatText = "Format: 9-digit agent ID starting with 190, or alphanumeric/hyphen string (3-20 chars)";
                    helperText = isValid ? "Valid Company ID format" : "Invalid Company ID format";
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
                          } else if (type === "COMPANY") {
                            val = val.slice(0, 20);
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
                  placeholder="Provide reason for blacklisting..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Geotagging GPS Widget */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Geotag Coordinates</label>
                  <button
                    type="button"
                    onClick={captureGeotag}
                    className="text-xs font-bold text-red-700 flex items-center gap-1.5 bg-red-50/80 hover:bg-red-100/80 px-3 py-1.5 rounded-xl border border-red-200/50 transition-all duration-200 active:scale-95 shadow-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 animate-bounce" /> Get GPS Tag
                  </button>
                </div>
                <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                  createForm.geotag_latitude 
                    ? "bg-emerald-50/30 border-emerald-200 text-emerald-800" 
                    : "bg-slate-50/50 border-slate-200 text-slate-600"
                }`}>
                  {createForm.geotag_latitude ? (
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-bold leading-normal truncate">{geotagStatus}</span>
                </div>
              </div>

              {/* Upload Evidence Photograph Card */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Supporting Photograph / Proof</label>
                <div className="group relative border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-5 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-red-50/5 shadow-inner">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setSupportingFile(e.target.files[0]);
                      if (e.target.files[0]) {
                        captureGeotag(); // Auto-geotag on file select
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {supportingFile ? (
                    <div className="flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800 break-all">{supportingFile.name}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Loaded</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera className="mx-auto h-8 w-8 text-slate-400 group-hover:text-red-500 transition-colors mb-2" />
                      <span className="block text-xs font-bold text-slate-700">Click to upload photo evidence</span>
                      <span className="block text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG up to 5MB</span>
                    </div>
                  )}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-4.5 bg-gradient-to-r from-slate-950 via-red-950 to-slate-950 text-white shrink-0 border-b border-red-500/20 shadow-md">
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
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-100">
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

                    {/* Step 3: Request Unblacklist */}
                    {(!detailEntry.has_penalty || detailEntry.penalty_status === "PAID") && detailEntry.compliance_notes && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <Send className="h-5 w-5" />
                          {detailEntry.has_penalty ? "Step 3" : "Step 2"}: Request Unblacklisting
                        </div>
                        <p className="text-xs text-emerald-700">Enter remarks to submit unblacklisting request for Traffic Department approval.</p>
                        <input
                          type="text"
                          value={actionRemarks}
                          onChange={(e) => setActionRemarks(e.target.value)}
                          placeholder="Additional remarks/justification"
                          className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                        />
                        <button
                          onClick={handleRequestUnblacklist}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-1.5 shadow"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Request Traffic Approval
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {detailEntry.status === "PENDING_BLACKLIST" && (
                  canApproveBlacklist ? (
                    <div className="border-t border-slate-200 pt-5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="h-4 w-4 animate-pulse text-indigo-500" />
                        Awaiting ATM Pass Section Approval
                      </h4>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Remarks / Justification
                        </label>
                        <textarea
                          rows={2}
                          value={actionRemarks}
                          onChange={(e) => setActionRemarks(e.target.value)}
                          placeholder="Add decision remarks here (required if rejecting)..."
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleRejectBlacklist}
                          disabled={actionLoading}
                          className="flex-1 py-3 bg-white border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl hover:bg-red-50 hover:border-red-400 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Blacklist
                        </button>
                        <button
                          onClick={handleApproveBlacklist}
                          disabled={actionLoading}
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve Blacklist
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                        <Clock className="h-5 w-5 animate-pulse" />
                        Pending Blacklist Approval
                      </div>
                      <p className="text-xs text-indigo-750 leading-relaxed">
                        This blacklisting request has been successfully raised/initiated and is currently awaiting final approval by the ATM Pass Section.
                      </p>
                    </div>
                  )
                )}

                {detailEntry.status === "UNBLACKLIST_REQUESTED" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <Clock className="h-5 w-5 animate-pulse" />
                      Awaiting Traffic Approval
                    </div>
                    <p className="text-xs text-amber-755 leading-relaxed">
                      This unblacklisting request has been submitted and is currently awaiting review and approval by the Senior Traffic Department.
                    </p>
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
                      {detailEntry.auditLog.map((log, i) => {
                        const isFirst = i === 0;
                        const action = log.action;
                        let IconComp = CircleDot;
                        let iconColor = "text-slate-550";
                        let bgBorderClass = "bg-slate-50 border-slate-300";

                        if (action.includes("BLACKLISTED") && !action.includes("UN")) {
                          IconComp = ShieldBan;
                          iconColor = "text-red-650";
                          bgBorderClass = "bg-red-50 border-red-200";
                        } else if (action.includes("PAID")) {
                          IconComp = IndianRupee;
                          iconColor = "text-amber-600";
                          bgBorderClass = "bg-amber-50 border-amber-200";
                        } else if (action.includes("COMPLIANCE")) {
                          IconComp = ClipboardCheck;
                          iconColor = "text-blue-600";
                          bgBorderClass = "bg-blue-50 border-blue-200";
                        } else if (action.includes("APPROVED") || action === "UNBLACKLISTED" || action === "REINSTATED") {
                          IconComp = ShieldCheck;
                          iconColor = "text-emerald-600";
                          bgBorderClass = "bg-emerald-50 border-emerald-200";
                        } else if (action.includes("REJECTED")) {
                          IconComp = XCircle;
                          iconColor = "text-red-500";
                          bgBorderClass = "bg-red-50 border-red-200";
                        } else if (action.includes("CREATED") || action.includes("PENDING")) {
                          IconComp = Clock;
                          iconColor = "text-indigo-600";
                          bgBorderClass = "bg-indigo-50 border-indigo-200";
                        }

                        return (
                          <div key={log.id || i} className="relative flex items-start gap-4 py-2.5">
                            <div className="relative shrink-0">
                              {isFirst && (
                                <span className="absolute -inset-1 rounded-full bg-slate-400/20 animate-ping" />
                              )}
                              <span className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 ${bgBorderClass}`}>
                                <IconComp className={`h-4 w-4 ${iconColor}`} strokeWidth={2.5} />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700">
                                {action.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {log.performed_by_name || "System"} • {new Date(log.createdAt).toLocaleString("en-IN")}
                              </p>
                              {log.remarks && (
                                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100/80 leading-relaxed">{log.remarks}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shrink-0 border-b border-slate-800 shadow-md">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold">Secure Penalty Payment</h2>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Amount Due</span>
                <span className="text-lg font-extrabold text-slate-800">₹{parseFloat(detailEntry?.penalty_amount || 0).toLocaleString("en-IN")}</span>
              </div>

              {/* Credit Card payment details form */}
              <div className="space-y-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
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
