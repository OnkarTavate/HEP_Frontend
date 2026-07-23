"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  DollarSign,
  Shield,
  Info,
  Loader2,
  Edit3,
  Check,
  X,
  Search,
  Filter,
  Calculator,
  Truck,
  User,
  Building2,
  Camera,
  Layers,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

const REASON_META = {
  "001": {
    label: "Unauthorized Parking",
    description: "Vehicle or entity parked in a prohibited area within port premises. Geotag & photo proof required.",
    icon: "🚗",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    color: "border-l-amber-500",
    reqPhoto: true,
    category: "Traffic & Parking",
  },
  "002": {
    label: "Tampering of Documents",
    description: "Fraudulent alteration, falsification or forgery of port passes or identity credentials.",
    icon: "📄",
    badgeBg: "bg-red-50 text-red-700 border-red-200",
    color: "border-l-red-600",
    reqPhoto: false,
    category: "Security & Fraud",
  },
  "003": {
    label: "Misbehaviour with Port Officials",
    description: "Misconduct, physical aggression, verbal abuse or non-compliance towards port officers.",
    icon: "⚠️",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    color: "border-l-orange-500",
    reqPhoto: false,
    category: "Conduct",
  },
  "004": {
    label: "Criminal Offense Inside Port",
    description: "Theft, contraband possession, property damage or unlawful acts inside port jurisdiction.",
    icon: "🚨",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    color: "border-l-purple-600",
    reqPhoto: false,
    category: "Legal & Security",
  },
  "005": {
    label: "Unauthorized Entry Without Passes",
    description: "Bypassing security gates or entering restricted operational zone without an active permit.",
    icon: "🚫",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    color: "border-l-rose-600",
    reqPhoto: false,
    category: "Access Control",
  },
  "006": {
    label: "Traffic Violation",
    description: "Speeding, reckless driving, improper lane usage or lane blockage inside port roads.",
    icon: "🚦",
    badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-200",
    color: "border-l-yellow-500",
    reqPhoto: false,
    category: "Traffic & Parking",
  },
  "007": {
    label: "Others",
    description: "General compliance breach or custom administrative reason authorized by Traffic Manager.",
    icon: "📋",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    color: "border-l-slate-400",
    reqPhoto: false,
    category: "General",
  },
};

const PRESET_AMOUNTS = [0, 500, 750, 1000, 1025, 2000, 5000];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export default function PenaltyConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFilter, setFilterFilter] = useState("all"); // 'all', 'mandatory', 'photo', 'fine'

  // Live Fine Simulator state
  const [simEntity, setSimEntity] = useState("VEHICLE");
  const [simCode, setSimCode] = useState("001");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/blacklist/penalty-config`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setConfigs(res.data.data || []);
      }
    } catch (err) {
      console.error("fetchConfig error:", err);
      toast.error("Failed to load penalty configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const startEdit = (cfg) => {
    setEditingCode(cfg.reason_code);
    setEditValues({
      default_amount: String(cfg.default_amount),
      is_mandatory: cfg.is_mandatory,
      min_amount: String(cfg.min_amount || 0),
    });
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditValues({});
  };

  const handleSave = async (reasonCode) => {
    const amount = parseFloat(editValues.default_amount);
    const minAmt = parseFloat(editValues.min_amount || 0);

    if (isNaN(amount) || amount < 0) {
      toast.warning("Default amount must be a valid non-negative number.");
      return;
    }
    if (editValues.is_mandatory && minAmt > amount) {
      toast.warning("Minimum amount cannot exceed the default amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.put(
        `${ADMIN_API}/blacklist/penalty-config/${reasonCode}`,
        {
          default_amount: amount,
          is_mandatory: editValues.is_mandatory,
          min_amount: minAmt,
        },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success(`Reason code ${reasonCode} penalty updated to ₹${amount.toLocaleString("en-IN")}`);
        setEditingCode(null);
        setEditValues({});
        fetchConfig();
      }
    } catch (err) {
      console.error("save config error:", err);
      toast.error(err.response?.data?.message || "Failed to update penalty settings.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered configurations
  const filteredConfigs = useMemo(() => {
    return configs.filter((cfg) => {
      const meta = REASON_META[cfg.reason_code] || {};
      const matchesSearch =
        cfg.reason_code.includes(searchTerm) ||
        cfg.reason_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (meta.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterFilter === "mandatory") return cfg.is_mandatory;
      if (filterFilter === "photo") return meta.reqPhoto;
      if (filterFilter === "fine") return parseFloat(cfg.default_amount) > 0;
      return true;
    });
  }, [configs, searchTerm, filterFilter]);

  // Statistics
  const totalDefaultFines = useMemo(
    () => configs.reduce((sum, c) => sum + parseFloat(c.default_amount || 0), 0),
    [configs]
  );
  const mandatoryCount = useMemo(() => configs.filter((c) => c.is_mandatory).length, [configs]);
  const photoRequiredCount = useMemo(
    () => configs.filter((c) => REASON_META[c.reason_code]?.reqPhoto).length,
    [configs]
  );

  // Live Fine Calculation Simulation
  const simulatedFine = useMemo(() => {
    const cfg = configs.find((c) => c.reason_code === simCode);
    const baseAmt = cfg ? parseFloat(cfg.default_amount || 0) : 0;
    let finalAmt = baseAmt;
    if (simEntity === "VEHICLE") {
      finalAmt = Math.max(baseAmt, 1025); // Vehicle release minimum ₹1,025 rule
    }
    const gstAmt = Math.round(finalAmt * 0.18);
    const grandTotal = finalAmt + gstAmt;
    return { baseAmt, finalAmt, gstAmt, grandTotal, cfg };
  }, [configs, simEntity, simCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 font-sans">
      {/* ── Hero Header (Consistent Navy/Indigo Theme) ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 py-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  ATM Pass Section Control
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Live System Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Settings className="w-7 h-7 text-indigo-300" />
                Blacklist Penalty Configuration
              </h1>
              <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Configure standardized baseline fine rates, policy enforcement locks, and mandatory payment minimums for Chennai Port Authority reason codes (001–007).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchConfig}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl text-xs font-bold shadow-inner backdrop-blur-md border border-white/20"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Config
              </button>
            </div>
          </div>

          {/* ── Hero Stat Cards (Uniform Glassmorphism) ── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Reason Codes</span>
                <Layers className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{configs.length}</div>
              <div className="text-[10px] text-indigo-300 mt-0.5">Codes 001–007</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Mandatory Locked</span>
                <Lock className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">{mandatoryCount}</div>
              <div className="text-[10px] text-amber-200 mt-0.5">Non-waivable policy</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Photo Evidence Req.</span>
                <Camera className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">{photoRequiredCount}</div>
              <div className="text-[10px] text-emerald-200 mt-0.5">Geotagged proof</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Avg Default Fine</span>
                <DollarSign className="w-4 h-4 text-purple-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">
                ₹{configs.length > 0 ? Math.round(totalDefaultFines / configs.length).toLocaleString("en-IN") : 0}
              </div>
              <div className="text-[10px] text-indigo-300 mt-0.5">Baseline rate average</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Live Fine Calculator Widget (Uniform White Card Theme) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Interactive Fine Simulator
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full uppercase">
                  Real-time Preview
                </span>
              </h2>
              <p className="text-xs text-slate-500">Test how fine rates dynamically resolve for different entity types.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Entity Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "VEHICLE", label: "Vehicle", icon: Truck },
                  { id: "PERSON", label: "Person", icon: User },
                  { id: "COMPANY", label: "Firm", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = simEntity === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSimEntity(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        active
                          ? "bg-[#0a1e4d] border-[#0a1e4d] text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason Code</label>
              <select
                value={simCode}
                onChange={(e) => setSimCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {configs.map((c) => (
                  <option key={c.reason_code} value={c.reason_code}>
                    {c.reason_code} - {c.reason_label} (₹{parseFloat(c.default_amount).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            {/* Calculation output box */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base Penalty</div>
                <div className="text-xl font-black text-slate-800">
                  ₹{simulatedFine.finalAmt.toLocaleString("en-IN")}
                </div>
                {simEntity === "VEHICLE" && simulatedFine.baseAmt < 1025 && (
                  <div className="text-[10px] text-amber-600 font-semibold">Includes ₹1,025 vehicle floor</div>
                )}
              </div>
              <div className="text-right border-l border-slate-200 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">+18% GST Estimated</div>
                <div className="text-sm font-bold text-emerald-700">
                  ₹{simulatedFine.grandTotal.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Toolbar: Search & Filters ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code 001–007, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filter:
            </span>
            {[
              { id: "all", label: `All (${configs.length})` },
              { id: "mandatory", label: `Mandatory (${mandatoryCount})` },
              { id: "photo", label: `Photo Req. (${photoRequiredCount})` },
              { id: "fine", label: "Fine > ₹0" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterFilter === f.id
                    ? "bg-[#0a1e4d] text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Policy Cards Grid ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
            <p className="text-sm font-medium">Loading rules...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 space-y-3">
            <Shield className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
            <p className="font-bold text-slate-700">No reason codes match your filter</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterFilter("all");
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredConfigs.map((cfg) => {
              const meta = REASON_META[cfg.reason_code] || {
                label: cfg.reason_label,
                description: "",
                icon: "📋",
                badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
                color: "border-l-slate-400",
                reqPhoto: false,
                category: "General",
              };
              const isEditing = editingCode === cfg.reason_code;

              return (
                <div
                  key={cfg.reason_code}
                  className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm border-l-4 ${meta.color} transition-all duration-200 hover:shadow-md ${
                    isEditing ? "ring-2 ring-indigo-300" : ""
                  }`}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">{meta.icon}</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                            CODE {cfg.reason_code}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeBg}`}>
                            {meta.category}
                          </span>

                          {cfg.is_mandatory && (
                            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Mandatory
                            </span>
                          )}

                          {meta.reqPhoto && (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Photo Req.
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-800">{meta.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">{meta.description}</p>
                      </div>

                      {/* Right Amount Display or Inline Form */}
                      {isEditing ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 lg:w-[440px] space-y-4 shadow-sm animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" /> Modify Penalty Policy
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Code {cfg.reason_code}</span>
                          </div>

                          {/* Presets */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Quick Presets
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {PRESET_AMOUNTS.map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() =>
                                    setEditValues((v) => ({ ...v, default_amount: String(amt) }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                                    parseFloat(editValues.default_amount) === amt
                                      ? "bg-[#0a1e4d] text-white border-[#0a1e4d]"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  ₹{amt.toLocaleString("en-IN")}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Default Fine (₹)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={editValues.default_amount}
                                  onChange={(e) => setEditValues((v) => ({ ...v, default_amount: e.target.value }))}
                                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Minimum Floor (₹)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="50"
                                  value={editValues.min_amount}
                                  onChange={(e) => setEditValues((v) => ({ ...v, min_amount: e.target.value }))}
                                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Mandatory Toggle */}
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              {editValues.is_mandatory ? <Lock className="w-3.5 h-3.5 text-red-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                              Enforce Mandatory Lock
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditValues((v) => ({ ...v, is_mandatory: !v.is_mandatory }))}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                editValues.is_mandatory ? "bg-red-600" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  editValues.is_mandatory ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(cfg.reason_code)}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                            >
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6 lg:min-w-[280px] justify-between lg:justify-end">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Rate</div>
                            <div className="text-xl font-black text-slate-800">
                              {parseFloat(cfg.default_amount) > 0 ? (
                                `₹${parseFloat(cfg.default_amount).toLocaleString("en-IN")}`
                              ) : (
                                <span className="text-slate-400 text-sm font-semibold">No Fine</span>
                              )}
                            </div>
                            {parseFloat(cfg.min_amount) > 0 && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Min floor: ₹{parseFloat(cfg.min_amount).toLocaleString("en-IN")}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => startEdit(cfg)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-[#0a1e4d] hover:text-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all active:scale-95 shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Rate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer Guidance Banner ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-800 text-sm mb-0.5">Port Authority Policy Notes</h4>
            <p>
              Rule changes saved on this dashboard update the baseline defaults in real-time for all newly created blacklisting records across both the <strong>ATM Dashboard</strong> and <strong>Traffic Department Approval</strong> views. 
              Sub-rule: <strong>Code 005</strong> retains a mandatory minimum floor of ₹1,025. Vehicle releases are enforced at ₹1,025 minimum regardless of lower base rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
