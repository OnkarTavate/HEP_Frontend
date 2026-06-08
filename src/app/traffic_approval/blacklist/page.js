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
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  FileText,
  Loader2,
  CircleDot,
  Camera,
  MapPin,
  Download,
  Globe,
  ArrowRight,
  ClipboardCheck,
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

const STATUS_CONFIG = {
  BLACKLISTED: { color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Blacklisted" },
  UNBLACKLIST_REQUESTED: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Unblacklist Requested" },
  UNBLACKLISTED: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Reinstated" },
};

const PENALTY_STATUS_CONFIG = {
  NOT_APPLICABLE: { color: "text-slate-400", label: "N/A" },
  PENDING: { color: "text-amber-600 font-bold", label: "Pending" },
  PAID: { color: "text-emerald-600 font-bold", label: "Paid" },
};

export default function TrafficCompanyBlacklistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Blacklist Modal & Form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    identifier: "",
    entity_name: "",
    reason: "",
    has_penalty: false,
    penalty_amount: "",
    reason_code: "001",
    authorizing_officer: "",
    geotag_latitude: "",
    geotag_longitude: "",
    geotag_accuracy: "",
  });
  const [supportingFile, setSupportingFile] = useState(null);
  const [geotagStatus, setGeotagStatus] = useState("No location tagged");
  const [createLoading, setCreateLoading] = useState(false);

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reinstatement action state
  const [reinstatementJustification, setReinstatementJustification] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
          authorizing_officer: u.username ? u.username.split("@")[0] : "Traffic Officer",
        }));
      }
    }
  }, [isCreateOpen]);

  /* ── Fetch data ── */
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100", entity_type: "COMPANY" });
      if (activeTab === "active") params.set("status", "BLACKLISTED");
      else if (activeTab === "history") params.set("status", "UNBLACKLISTED");
      if (searchInput) params.set("search", searchInput);

      const res = await axios.get(`${ADMIN_API}/blacklist/list?${params}`, {
        headers: getAuthHeaders(),
      });

      if (res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load company blacklist records");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchInput]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

  /* ── Create company blacklist entry ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.identifier.trim() || !createForm.reason.trim()) {
      toast.warning("Please fill in all required fields");
      return;
    }
    if (createForm.has_penalty && (!createForm.penalty_amount || parseFloat(createForm.penalty_amount) <= 0)) {
      toast.warning("Please enter a valid penalty amount");
      return;
    }

    setCreateLoading(true);
    try {
      const formData = new FormData();
      formData.append("entity_type", "COMPANY");
      formData.append("identifier", createForm.identifier.trim().toLowerCase());
      formData.append("entity_name", createForm.entity_name);
      formData.append("reason", createForm.reason);
      formData.append("scenario", "TRAFFIC_VIOLATION");
      formData.append("has_penalty", createForm.has_penalty);
      formData.append("penalty_amount", createForm.has_penalty ? parseFloat(createForm.penalty_amount) : 0);
      formData.append("reason_code", createForm.reason_code);
      formData.append("authorizing_officer", createForm.authorizing_officer);
      formData.append("geotag_latitude", createForm.geotag_latitude);
      formData.append("geotag_longitude", createForm.geotag_longitude);
      formData.append("geotag_accuracy", createForm.geotag_accuracy);

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
        toast.success("Company blacklisted successfully", {
          description: `User ID/Name: ${createForm.identifier}`,
        });
        setIsCreateOpen(false);
        setCreateForm({
          identifier: "", entity_name: "", reason: "", has_penalty: false, penalty_amount: "",
          reason_code: "001", authorizing_officer: currentUser?.username?.split("@")[0] || "Traffic Officer",
          geotag_latitude: "", geotag_longitude: "", geotag_accuracy: "",
        });
        setSupportingFile(null);
        setGeotagStatus("No location tagged");
        fetchEntries();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to blacklist company";
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
      toast.error("Failed to load company details");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Reinstate Company ── */
  const handleReinstate = async () => {
    if (!reinstatementJustification.trim()) {
      toast.warning("Please provide a mandatory justification for reinstatement.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.patch(
        `${ADMIN_API}/blacklist/${detailEntry.id}/reinstate`,
        { justification: reinstatementJustification },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success("Company reinstated successfully!");
        setDetailEntry(res.data.data);
        setReinstatementJustification("");
        setIsDetailOpen(false);
        fetchEntries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reinstate company");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Export reports (CSV / MD) ── */
  const exportReport = (format) => {
    if (entries.length === 0) {
      toast.warning("No records to export.");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const reportType = activeTab === "active" ? "active_company_blacklist" : "reinstated_companies";
    const filename = `${reportType}_report_${timestamp}.${format}`;

    let fileContent = "";

    if (format === "csv") {
      const headers = ["ID", "Company ID (Identifier)", "Company Name", "Reason", "Reason Code", "Penalty", "Penalty Status", "Status", "Blacklisted Date"];
      const rows = entries.map((e) => [
        e.id,
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
      fileContent += `| ID | Company ID | Name | Reason | Reason Code | Penalty (₹) | Penalty Status | Status | Blacklisted Date |\n`;
      fileContent += `|---|---|---|---|---|---|---|---|---|\n`;

      entries.forEach((e) => {
        const name = e.entity_name || "—";
        const amt = e.has_penalty ? parseFloat(e.penalty_amount).toLocaleString("en-IN") : "0";
        const dateStr = new Date(e.blacklisted_at).toLocaleDateString("en-IN");
        fileContent += `| ${e.id} | **${e.identifier}** | ${name} | ${e.reason} | ${e.reason_code || "N/A"} | ${amt} | ${e.penalty_status} | ${e.status} | ${dateStr} |\n`;
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

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl ring-1 ring-slate-200/50 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1e4d] tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#ff6b00]" strokeWidth={2.5} />
            Company Blacklisting & Reinstatement
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Restrict company operations or reinstate access with documented justifications. (Traffic Department Authority)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEntries}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white text-sm font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Blacklist Company
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { id: "active", label: "Active Blacklisted Companies" },
          { id: "history", label: "Reinstatement History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchInput(""); }}
            className={`relative px-6 py-3 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? "bg-[#0a1e4d] text-white shadow"
                : "text-slate-500 hover:text-[#0a1e4d] hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/60 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            {activeTab === "active" ? (
              <><ShieldBan className="h-4 w-4 text-red-500" /> Active Blocks</>
            ) : (
              <><ShieldCheck className="h-4 w-4 text-emerald-500" /> Reinstated Records</>
            )}
          </h3>

          <div className="flex items-center w-full md:w-auto gap-3 justify-end">
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

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by Company ID, Name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toLowerCase())}
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#ff6b00]"
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
                {["Company ID (Identifier)", "Company Name", "Reason / Code", "Penalty (₹)", "Status", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-500">
                    <Loader2 className="h-10 w-10 mx-auto text-slate-300 mb-3 animate-spin" />
                    <p className="text-sm font-medium">Loading records...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-500">
                    <Building2 className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No records found</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const sConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.BLACKLISTED;
                  const pConfig = PENALTY_STATUS_CONFIG[entry.penalty_status] || PENALTY_STATUS_CONFIG.NOT_APPLICABLE;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => openDetail(entry.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800 font-mono tracking-wide">
                        {entry.identifier}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {entry.entity_name || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-slate-800 truncate max-w-[250px]">{entry.reason}</div>
                        {entry.reason_code && (
                          <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Code {entry.reason_code}</span>
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
                      <td className="px-5 py-3.5">
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
      {/* CREATE BLACKLIST COMPANY MODAL               */}
      {/* ════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-600 to-red-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                <h2 className="text-lg font-bold">Blacklist Company</h2>
              </div>
              <button
                onClick={() => { setIsCreateOpen(false); setSupportingFile(null); setGeotagStatus("No location tagged"); }}
                className="text-white/80 hover:text-white active:scale-90 transition-all bg-white/10 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Reason Code */}
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

              {/* Identifier (Company User ID) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Company User ID / Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.identifier}
                  onChange={(e) => setCreateForm((f) => ({ ...f, identifier: e.target.value.toLowerCase() }))}
                  placeholder="e.g. comp-001 or vendor"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Company Name (optional)
                </label>
                <input
                  type="text"
                  value={createForm.entity_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entity_name: e.target.value }))}
                  placeholder="e.g. Standard Cargo Logistics Ltd."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 focus:outline-none transition-all"
                />
              </div>

              {/* Reason Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={createForm.reason}
                  onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Provide precise reason / context for blacklisting this company..."
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Supporting Evidence / Photos</label>
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
                      captureGeotag();
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{geotagStatus}</span>
                </div>
              </div>

              {/* Penalty */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.has_penalty}
                    onChange={(e) => setCreateForm((f) => ({ ...f, has_penalty: e.target.checked, penalty_amount: "" }))}
                    className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-700">Apply administrative penalty</span>
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
                        placeholder="e.g. 15000"
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
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-800 text-white text-sm font-bold tracking-wider uppercase rounded-xl hover:from-red-700 hover:to-red-900 shadow-lg shadow-red-600/20 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createLoading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><ShieldBan className="h-4 w-4" /> Blacklist Company</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* DETAIL / VIEW MODAL & REINSTATEMENT         */}
      {/* ════════════════════════════════════════════ */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-bold">Company Blacklist Details</h2>
              </div>
              <button
                onClick={() => { setIsDetailOpen(false); setDetailEntry(null); setReinstatementJustification(""); }}
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
                {/* Status + Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-50">
                      <Building2 className="h-6 w-6 text-red-500" />
                    </span>
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 font-mono">{detailEntry.identifier}</p>
                      <p className="text-sm text-slate-500">{detailEntry.entity_name || "—"} • COMPANY</p>
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reason for Blacklisting</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{detailEntry.reason}</p>
                  </div>
                  {detailEntry.reinstatement_justification && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reinstatement Justification</p>
                      <p className="text-sm text-slate-700 leading-relaxed bg-emerald-50/50 p-2.5 rounded border border-emerald-200">{detailEntry.reinstatement_justification}</p>
                    </div>
                  )}
                </div>

                {/* Audit Trail */}
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
                            log.action.includes("BLACKLISTED") ? "bg-red-50 border-red-300" :
                            log.action === "REINSTATED" ? "bg-emerald-50 border-emerald-300" :
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

                {/* Reinstatement Action Panel */}
                {detailEntry.status === "BLACKLISTED" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                      Senior Official Reinstatement Workflow
                    </div>
                    <p className="text-xs text-emerald-700 leading-normal">
                      Provide a detailed reinstatement justification to reactivate this company's port access. An email alert containing this confirmation will be auto-delivered to the registered company email.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Justification / Authorization Remarks <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={reinstatementJustification}
                        onChange={(e) => setReinstatementJustification(e.target.value)}
                        placeholder="State technical justification or policy reasons for reinstating this company..."
                        className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none font-medium text-slate-800"
                        required
                      />
                    </div>
                    <button
                      onClick={handleReinstate}
                      disabled={actionLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition shadow active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Approve Reinstatement & Release Access
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
