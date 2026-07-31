"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  IndianRupee,
  RefreshCw,
  CheckCircle2,
  Info,
  Loader2,
  Edit3,
  Check,
  X,
  Calculator,
  Truck,
  User,
  Package,
  Layers,
  Sparkles,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from "lucide-react";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5005/api";

/* Presentation metadata per category — the numeric rates always come from the
   backend (single source of truth); this only styles the cards. */
const CATEGORY_META = {
  INDIVIDUAL: {
    icon: User,
    accent: "border-l-indigo-500",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    tint: "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-400 shadow-indigo-200",
    tileBg: "from-indigo-50 to-white border-indigo-100",
    tileValue: "text-indigo-700",
    glow: "bg-indigo-400",
    ring: "ring-indigo-300",
  },
  VEHICLE: {
    icon: Truck,
    accent: "border-l-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    tint: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400 shadow-emerald-200",
    tileBg: "from-emerald-50 to-white border-emerald-100",
    tileValue: "text-emerald-700",
    glow: "bg-emerald-400",
    ring: "ring-emerald-300",
  },
  CARGO: {
    icon: Package,
    accent: "border-l-amber-500",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    tint: "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-400 shadow-amber-200",
    tileBg: "from-amber-50 to-white border-amber-100",
    tileValue: "text-amber-700",
    glow: "bg-amber-400",
    ring: "ring-amber-300",
  },
};

const PERIODS = [
  { key: "daily_rate", label: "Daily", icon: CalendarDays, hint: "Per day" },
  { key: "monthly_rate", label: "Monthly", icon: CalendarRange, hint: "Per month" },
  { key: "yearly_rate", label: "Yearly", icon: CalendarClock, hint: "Per year" },
];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const inr = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function HepRatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  // Live charge simulator
  const [simCategory, setSimCategory] = useState("INDIVIDUAL");
  const [simPeriod, setSimPeriod] = useState("daily_rate");
  const [simDays, setSimDays] = useState(1);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/hep-rate`, {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setRates(res.data.data || []);
      }
    } catch (err) {
      console.error("fetchRates error:", err);
      toast.error("Failed to load HEP rate configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const startEdit = (rate) => {
    setEditingCategory(rate.category);
    setEditValues({
      daily_rate: String(rate.daily_rate),
      monthly_rate: String(rate.monthly_rate),
      yearly_rate: String(rate.yearly_rate),
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditValues({});
  };

  const handleSave = async (category) => {
    const daily = parseFloat(editValues.daily_rate);
    const monthly = parseFloat(editValues.monthly_rate);
    const yearly = parseFloat(editValues.yearly_rate);

    for (const [name, val] of [
      ["Daily", daily],
      ["Monthly", monthly],
      ["Yearly", yearly],
    ]) {
      if (isNaN(val) || val < 0) {
        toast.warning(`${name} rate must be a valid non-negative number.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await axios.put(
        `${ADMIN_API}/hep-rate/${category}`,
        { daily_rate: daily, monthly_rate: monthly, yearly_rate: yearly },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success(`${category} rates updated successfully.`);
        setEditingCategory(null);
        setEditValues({});
        fetchRates();
      }
    } catch (err) {
      console.error("save rate error:", err);
      toast.error(err.response?.data?.message || "Failed to update HEP rates.");
    } finally {
      setSaving(false);
    }
  };

  // ── Statistics ──
  const highestYearly = useMemo(
    () =>
      rates.reduce((max, r) => Math.max(max, parseFloat(r.yearly_rate || 0)), 0),
    [rates]
  );
  const lowestDaily = useMemo(() => {
    if (!rates.length) return 0;
    return rates.reduce(
      (min, r) => Math.min(min, parseFloat(r.daily_rate || 0)),
      Infinity
    );
  }, [rates]);

  // ── Live charge simulation ──
  const simulatedCharge = useMemo(() => {
    const rate = rates.find((r) => r.category === simCategory);
    if (!rate) return { amount: 0, breakdown: "" };
    const days = Math.max(1, parseInt(simDays, 10) || 1);
    if (simPeriod === "daily_rate") {
      const perDay = parseFloat(rate.daily_rate || 0);
      return {
        amount: perDay * days,
        breakdown: `${inr(perDay)} × ${days} day${days > 1 ? "s" : ""}`,
      };
    }
    const flat = parseFloat(rate[simPeriod] || 0);
    return {
      amount: flat,
      breakdown: simPeriod === "monthly_rate" ? "Flat monthly rate" : "Flat yearly rate",
    };
  }, [rates, simCategory, simPeriod, simDays]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 font-sans">
      {/* ── Hero Header ── */}
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
                  GST Inclusive
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <IndianRupee className="w-7 h-7 text-indigo-300" />
                HEP Rate Configuration
              </h1>
              <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Revise the Harbour Entry Permit charges for Individuals, Vehicles and Cargo Handling Equipment. These rates are updated every year and apply instantly to all new pass requests.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRates}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl text-xs font-bold shadow-inner backdrop-blur-md border border-white/20"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Rates
              </button>
            </div>
          </div>

          {/* ── Hero Stat Cards ── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Rate Categories</span>
                <Layers className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{rates.length}</div>
              <div className="text-[10px] text-indigo-300 mt-0.5">Individual / Vehicle / Cargo</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Lowest Daily</span>
                <CalendarDays className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                {rates.length ? inr(lowestDaily) : "₹0"}
              </div>
              <div className="text-[10px] text-emerald-200 mt-0.5">Cheapest per-day permit</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Highest Yearly</span>
                <CalendarClock className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">{inr(highestYearly)}</div>
              <div className="text-[10px] text-amber-200 mt-0.5">Top annual permit</div>
            </div>

            <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5">
              <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
                <span>Tax Status</span>
                <CheckCircle2 className="w-4 h-4 text-purple-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">Incl. GST</div>
              <div className="text-[10px] text-indigo-300 mt-0.5">Amount shown = payable</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Live Charge Simulator ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Interactive Charge Simulator
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full uppercase">
                  Real-time Preview
                </span>
              </h2>
              <p className="text-xs text-slate-500">Preview the exact HEP charge an agent will see at checkout.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {["INDIVIDUAL", "VEHICLE", "CARGO"].map((cat) => {
                  const Icon = CATEGORY_META[cat].icon;
                  const active = simCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSimCategory(cat)}
                      title={cat}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                        active
                          ? "bg-[#0a1e4d] border-[#0a1e4d] text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat === "INDIVIDUAL" ? "Indiv." : cat === "VEHICLE" ? "Vehicle" : "Cargo"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pass Period</label>
              <select
                value={simPeriod}
                onChange={(e) => setSimPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                No. of Days {simPeriod !== "daily_rate" && <span className="text-slate-300">(daily only)</span>}
              </label>
              <input
                type="number"
                min="1"
                value={simDays}
                disabled={simPeriod !== "daily_rate"}
                onChange={(e) => setSimDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            {/* Output */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1e4d] via-indigo-900 to-slate-900 rounded-2xl p-4 shadow-md">
              <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-400 opacity-20 blur-2xl" />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Total Payable</div>
                <div className="text-2xl font-black text-white">{inr(simulatedCharge.amount)}</div>
                <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
                  {simulatedCharge.breakdown} · incl. GST
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Rate Cards ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
            <p className="text-sm font-medium">Loading rates...</p>
          </div>
        ) : rates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 space-y-3">
            <IndianRupee className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
            <p className="font-bold text-slate-700">No rate categories configured yet</p>
            <button
              onClick={fetchRates}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Reload
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rates.map((rate) => {
              const meta = CATEGORY_META[rate.category] || CATEGORY_META.INDIVIDUAL;
              const Icon = meta.icon;
              const isEditing = editingCategory === rate.category;

              return (
                <div
                  key={rate.category}
                  className={`relative bg-white border border-slate-200/80 rounded-2xl shadow-sm border-l-4 ${meta.accent} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${
                    isEditing ? `ring-2 ${meta.ring}` : ""
                  }`}
                >
                  {/* soft decorative category glow */}
                  <div
                    className={`pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full ${meta.glow} opacity-[0.07] blur-3xl`}
                  />
                  <div className="relative p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      {/* Left: identity */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-md ${meta.tint}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeBg}`}>
                            {rate.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{rate.label}</h3>
                        {rate.description && (
                          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">{rate.description}</p>
                        )}
                        {rate.updatedAt && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Last revised: {new Date(rate.updatedAt).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>

                      {/* Right: rates display OR edit form */}
                      {isEditing ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 lg:w-[460px] space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" /> Revise {rate.label} Rates
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{rate.category}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            {PERIODS.map((p) => (
                              <div key={p.key}>
                                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                                  <p.icon className="w-3 h-3 text-slate-400" /> {p.label}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={editValues[p.key]}
                                    onChange={(e) =>
                                      setEditValues((v) => ({ ...v, [p.key]: e.target.value }))
                                    }
                                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-7 pr-2 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(rate.category)}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Save Rates
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
                        <div className="flex items-center gap-4 lg:gap-6">
                          <div className="grid grid-cols-3 gap-3">
                            {PERIODS.map((p) => (
                              <div
                                key={p.key}
                                className={`bg-gradient-to-br ${meta.tileBg} border rounded-xl px-4 py-3 text-center min-w-[92px] transition-transform hover:scale-[1.03]`}
                              >
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                                  <p.icon className="w-3 h-3" /> {p.label}
                                </div>
                                <div className={`text-lg font-black mt-1 ${meta.tileValue}`}>
                                  {inr(rate[p.key])}
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => startEdit(rate)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-[#0a1e4d] hover:text-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all active:scale-95 shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
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

        {/* ── Footer Guidance ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-800 text-sm mb-0.5">Rate Revision Policy</h4>
            <p>
              HEP charges are revised annually by the Chennai Port Authority. Rates saved here are <strong>inclusive of GST</strong> — the figure shown is the exact amount payable, so no tax is added on top at checkout. Any change takes effect immediately for all newly created pass requests across the agent portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
