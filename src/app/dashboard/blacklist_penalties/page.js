"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ShieldAlert,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Building,
  User,
  Truck,
  FileText,
  BadgeAlert,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:3002/api";

const ENTITY_CONFIGS = {
  VEHICLE: { label: "Vehicle", icon: Truck, color: "bg-blue-50 text-blue-700 border-blue-200" },
  PERSON: { label: "Person", icon: User, color: "bg-teal-50 text-teal-700 border-teal-200" },
  DRIVER: { label: "Driver", icon: CreditCard, color: "bg-purple-50 text-purple-700 border-purple-200" },
  COMPANY: { label: "Company", icon: Building, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const REASON_MAP = {
  "001": "Unauthorized parking",
  "002": "Tampering of documents",
  "003": "Misbehaviour with port officials",
  "004": "Criminal offense inside port",
  "005": "Unauthorized entry without passes caught",
  "006": "Traffic Violation",
  "007": "Others",
};

export default function BlacklistPenaltiesPage() {
  const [entries, setEntries] = useState([]);
  const [overstayCharges, setOverstayCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'history' | 'overstay'
  
  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isOverstayTarget, setIsOverstayTarget] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet"); // 'wallet' or 'gateway'
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Gateway simulator states
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  // Unblock / Exception Request Modal States
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [unblockRemarks, setUnblockRemarks] = useState("");
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  const getAuthHeaders = () => {
    let token = localStorage.getItem("accessToken");
    if (!token) return {};
    token = token.replace(/^["']|["']$/g, "");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const [blRes, ovRes] = await Promise.allSettled([
        axios.get(`${ADMIN_API}/blacklist/my-blacklist`, { headers: getAuthHeaders() }),
        axios.get(`${ADMIN_API}/overstay/my-charges`, { headers: getAuthHeaders() }),
      ]);
      if (blRes.status === "fulfilled" && blRes.value.data?.success) {
        setEntries(blRes.value.data.data || []);
      }
      if (ovRes.status === "fulfilled" && ovRes.value.data?.success) {
        setOverstayCharges(ovRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
      toast.error("Failed to load your blacklist & penalty records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const openPaymentModal = (entry, isOverstay = false) => {
    setSelectedEntry(entry);
    setIsOverstayTarget(isOverstay);
    setPaymentMethod("wallet");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setPaymentRemarks("");
    setPaymentModalOpen(true);
  };
  const handleProcessPayment = async () => {
    if (!selectedEntry) return;

    if (paymentMethod === "gateway") {
      if (!cardName.trim()) { toast.warning("Please enter the cardholder name."); return; }
      if (cardNumber.replace(/\s/g, "").length < 16) { toast.warning("Please enter a valid 16-digit card number."); return; }
      if (!cardExpiry.trim() || cardExpiry.length < 5) { toast.warning("Please enter a valid card expiry in MM/YY format."); return; }
      if (!cardCvv.trim() || cardCvv.length < 3) { toast.warning("Please enter a valid 3-digit CVV."); return; }
    }

    setPaymentProcessing(true);
    try {
      const txnId = `TXN-${paymentMethod === "gateway" ? "GW" : "WL"}-${Date.now()}`;
      const remarks = paymentRemarks.trim() || `Paid via ${paymentMethod === "wallet" ? "Agent Wallet" : "Payment Gateway"}`;
      
      const endpoint = isOverstayTarget 
        ? `${ADMIN_API}/overstay/${selectedEntry.id}/pay`
        : `${ADMIN_API}/blacklist/${selectedEntry.id}/pay-penalty`;

      const res = await axios.patch(
        endpoint,
        { remarks, payment_method: paymentMethod.toUpperCase(), transaction_id: txnId },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success("Payment completed successfully!");
        setPaymentModalOpen(false);
        setCardName(""); setCardNumber(""); setCardExpiry(""); setCardCvv(""); setPaymentRemarks("");
        fetchEntries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process payment.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const openUnblockModal = (entry, isOverstay = false) => {
    setSelectedEntry(entry);
    setIsOverstayTarget(isOverstay);
    setUnblockRemarks("");
    setUnblockModalOpen(true);
  };

  const handleRequestUnblock = async () => {
    if (!selectedEntry) return;
    if (!unblockRemarks.trim()) {
      toast.warning("Please provide remarks / justification");
      return;
    }
    setUnblockSubmitting(true);
    try {
      const endpoint = isOverstayTarget
        ? `${ADMIN_API}/overstay/${selectedEntry.id}/request-exception`
        : `${ADMIN_API}/blacklist/${selectedEntry.id}/request-unblacklist`;

      const payload = isOverstayTarget
        ? { exception_reason: unblockRemarks.trim() }
        : { remarks: unblockRemarks.trim() };

      const res = await axios.patch(endpoint, payload, { headers: getAuthHeaders() });

      if (res.data.success) {
        toast.success(isOverstayTarget ? "Exception request submitted to Traffic Manager." : "Unblock request submitted to ATM Pass Section.");
        setUnblockModalOpen(false);
        fetchEntries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setUnblockSubmitting(false);
    }
  };

  // Filter entries
  const companyBlacklistEntry = entries.find(
    (e) => e.entity_type === "COMPANY" && ["BLACKLISTED", "UNBLACKLIST_REQUESTED", "PENDING_BLACKLIST"].includes(e.status)
  );

  const activeViolations = entries.filter((e) => ["BLACKLISTED", "UNBLACKLIST_REQUESTED", "PENDING_BLACKLIST"].includes(e.status));
  const historicalViolations = entries.filter((e) => ["UNBLACKLISTED", "REJECTED"].includes(e.status));

  const visibleEntries = activeTab === "active" ? activeViolations : historicalViolations;

  return (
    <div className="space-y-6 font-sans w-full text-slate-800 relative">
      {/* Halo Backgrounds */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-12 h-[350px] bg-gradient-to-b from-red-100/30 via-transparent to-transparent blur-2xl"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-[#0a1e4d] flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-red-600 animate-pulse" />
            Blacklist & Penalties
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            View active suspensions, settle port penalties, and submit reinstatement appeals
          </p>
        </div>
        <button
          onClick={fetchEntries}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-semibold text-xs shadow-sm transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Company Blacklist Warning Banner */}
      {companyBlacklistEntry && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-red-500/20">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-radial-gradient from-transparent to-black/10 opacity-30 pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="h-14 w-14 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20 shrink-0 shadow-lg">
              <BadgeAlert className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-1">
              <span className="bg-white/25 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">
                CRITICAL WARNING
              </span>
              <h3 className="text-xl font-black">Your Company is Suspended / Blacklisted!</h3>
              <p className="text-sm text-red-100 max-w-3xl leading-relaxed">
                Your firm is currently blocked from creating, submitting, or modifying any pass requests at Chennai Port. 
                Reason: <strong>{companyBlacklistEntry.reason}</strong> (Reason Code: {companyBlacklistEntry.reason_code || "007"}).
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                {companyBlacklistEntry.has_penalty && companyBlacklistEntry.penalty_status === "PENDING" ? (
                  <button
                    onClick={() => openPaymentModal(companyBlacklistEntry)}
                    className="bg-white text-red-700 hover:bg-slate-100 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Pay Company Penalty (₹{parseFloat(companyBlacklistEntry.penalty_amount).toLocaleString("en-IN")})
                  </button>
                ) : companyBlacklistEntry.status === "BLACKLISTED" ? (
                  <button
                    onClick={() => openUnblockModal(companyBlacklistEntry)}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-5 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Submit Reinstatement Appeal
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-200 font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Clock className="h-3.5 w-3.5" /> Reinstatement Appeal Pending Approval
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-8 py-4 text-sm transition-all flex items-center gap-2 ${
            activeTab === "active"
              ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]"
              : "font-semibold text-slate-500 hover:text-[#0a1e4d]"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Active Violations & Penalties ({activeViolations.length})
        </button>
        <button
          onClick={() => setActiveTab("overstay")}
          className={`px-8 py-4 text-sm transition-all flex items-center gap-2 ${
            activeTab === "overstay"
              ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]"
              : "font-semibold text-slate-500 hover:text-[#0a1e4d]"
          }`}
        >
          <Clock className="h-4 w-4 text-red-500" />
          Overstay Charges ({overstayCharges.length})
          {overstayCharges.some(c => c.status === "PENDING" || c.status === "EXCEPTION_REJECTED") && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-8 py-4 text-sm transition-all flex items-center gap-2 ${
            activeTab === "history"
              ? "font-bold text-[#0a1e4d] border-b-2 border-[#0a1e4d]"
              : "font-semibold text-slate-500 hover:text-[#0a1e4d]"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Historical Clearance Log ({historicalViolations.length})
        </button>
      </div>

      {/* List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden pb-6">
        {loading ? (
          <div className="p-16 text-center italic text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
            Loading records...
          </div>
        ) : activeTab === "overstay" ? (
          overstayCharges.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div>
                <p className="font-bold text-slate-600">No Overstay Charges</p>
                <p className="text-xs text-slate-400 mt-1">Your company has zero active or pending overstay penalties.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Summary strip */}
              <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap gap-4 items-center text-xs">
                <span className="font-bold text-slate-500">
                  Total: <span className="text-[#0a1e4d]">{overstayCharges.length}</span>
                </span>
                <span className="font-bold text-red-500">
                  Pending: {overstayCharges.filter(c => c.status === "PENDING").length}
                </span>
                <span className="font-bold text-sky-600">
                  Notified: {overstayCharges.filter(c => c.status === "NOTIFIED").length}
                </span>
                <span className="font-bold text-emerald-500">
                  Paid: {overstayCharges.filter(c => c.status === "PAID").length}
                </span>
                <span className="font-bold text-amber-500">
                  Exception Requested: {overstayCharges.filter(c => c.status === "EXCEPTION_REQUESTED").length}
                </span>
                <span className="ml-auto font-black text-slate-700">
                  Total Pending: ₹{overstayCharges
                    .filter(c => c.status === "PENDING" || c.status === "EXCEPTION_REJECTED")
                    .reduce((s, c) => s + parseFloat(c.current_total_amount ?? c.total_amount ?? 0), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0a1e4d] text-white text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">SI No.</th>
                      <th className="px-5 py-3.5">Entity & Identifier</th>
                      <th className="px-5 py-3.5">Pass No</th>
                      <th className="px-5 py-3.5">
                        <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Entry Date</span>
                      </th>
                      <th className="px-5 py-3.5">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Expiry Date</span>
                      </th>
                      <th className="px-5 py-3.5">Overstay / Rate</th>
                      <th className="px-5 py-3.5">Total Penalty</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
<tbody className="divide-y divide-slate-100">
  {overstayCharges.map((charge, idx) => {
    const fmtD = (d) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const daysNum = [
      "PENDING",
      "EXCEPTION_REQUESTED",
      "EXCEPTION_REJECTED",
    ].includes(charge.status)
      ? parseInt(charge.current_overstay_days || 0, 10)
      : parseInt(charge.overstay_days || 0, 10);

    const isNotifiedOnly = charge.status === "NOTIFIED";

    const severityClass =
      daysNum >= 30
        ? "bg-rose-100 text-rose-800 border-rose-300"
        : daysNum >= 14
        ? "bg-red-50 text-red-700 border-red-200"
        : daysNum >= 7
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-yellow-50 text-yellow-700 border-yellow-200";

    return (
      <tr
        key={charge.id}
        className="hover:bg-slate-50 transition-colors"
      >
        {/* SI No. */}
        <td className="px-5 py-4 font-mono font-bold text-slate-500 text-sm">
          #{idx + 1}
        </td>

        {/* Entity & Identifier */}
        <td className="px-5 py-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
            {charge.entity_type}
          </span>

          <p className="font-bold text-[#0a1e4d] uppercase text-sm">
            {charge.identifier}
          </p>

          {charge.entity_name &&
            charge.entity_name !== charge.identifier && (
              <p className="text-xs text-slate-500 mt-0.5">
                {charge.entity_name}
              </p>
            )}
        </td>

        {/* Pass No */}
        <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-600">
          {charge.pass_no || "—"}
        </td>

        {/* Entry Date */}
        <td className="px-5 py-4 text-sm font-medium text-emerald-700">
          {fmtD(charge.date_from)}
        </td>

        {/* Expiry Date */}
        <td className="px-5 py-4 text-sm font-medium text-red-600">
          {fmtD(charge.date_to)}
        </td>

        {/* Overstay / Rate */}
        <td className="px-5 py-4 text-sm font-medium">
          <span
            className={`font-extrabold px-2 py-0.5 rounded-md border text-xs ${severityClass}`}
          >
            {daysNum} day{daysNum !== 1 ? "s" : ""}
          </span>

          {isNotifiedOnly ? (
            <p className="text-sky-600 mt-0.5 font-semibold">
              {" "}
            </p>
          ) : (
            <p className="text-slate-500 mt-0.5 text-sm">
              ₹{charge.daily_rate}/day
            </p>
          )}
        </td>

        {/* Total Penalty */}
        <td className="px-5 py-4 font-black text-slate-900 text-base">
          {isNotifiedOnly ? (
            <span className="text-slate-400 font-semibold text-sm">
              Not levied yet
            </span>
          ) : (
            <>
              ₹
              {parseFloat(
                [
                  "PENDING",
                  "EXCEPTION_REQUESTED",
                  "EXCEPTION_REJECTED",
                ].includes(charge.status)
                  ? charge.current_total_amount
                  : charge.total_amount
              ).toLocaleString("en-IN")}
            </>
          )}
        </td>

        {/* Status */}
        <td className="px-5 py-4">
          <span
            className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full border ${
              charge.status === "PAID"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : charge.status === "NOTIFIED"
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : charge.status === "EXCEPTION_REQUESTED"
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : charge.status === "EXCEPTION_APPROVED" ||
                  charge.status === "WAIVED"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : charge.status === "EXCEPTION_REJECTED"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {charge.status.replace(/_/g, " ")}
          </span>
        </td>

        {/* Actions */}
        <td className="px-5 py-4 text-center">
          {charge.status === "PENDING" ||
          charge.status === "EXCEPTION_REJECTED" ? (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => openPaymentModal(charge, true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Pay Fine
              </button>

              {charge.status === "PENDING" && (
                <button
                  onClick={() => openUnblockModal(charge, true)}
                  className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[#0a1e4d] rounded-xl text-sm font-bold transition-all flex items-center gap-1"
                >
                  Request Exception
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 font-semibold italic">
              No Action Needed
            </span>
          )}
        </td>
      </tr>
    );
  })}
</tbody>
                </table>
              </div>
            </div>
          )
        ) : visibleEntries.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-slate-300" />
            <div>
              <p className="font-bold text-slate-600">No records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === "active"
                  ? "Everything is clear. There are no active violations or pending penalties registered for your company."
                  : "No archived or resolved blacklistings found."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0a1e4d] text-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Entity & ID</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Reason Details</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Authorizer / Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Penalty Info</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                  {activeTab === "active" && (
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const entityConf = ENTITY_CONFIGS[entry.entity_type] || {
                    label: entry.entity_type,
                    icon: HelpCircle,
                    color: "bg-slate-50 text-slate-600 border-slate-200",
                  };
                  const EntityIcon = entityConf.icon;

                  const dateStr = new Date(entry.blacklisted_at || entry.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Entity Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${entityConf.color} shrink-0`}>
                            <EntityIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {entityConf.label}
                            </span>
                            <p className="text-sm font-bold text-[#0a1e4d] uppercase">{entry.identifier}</p>
                            {entry.entity_name && (
                              <p className="text-xs text-slate-500 font-medium">{entry.entity_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reason Column */}
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Code {entry.reason_code || "007"} • {REASON_MAP[entry.reason_code] || "Others"}
                        </p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-2">
                          {entry.reason}
                        </p>
                      </td>

                      {/* Authorizer Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {entry.authorizing_officer || entry.blacklisted_by_name || "Traffic Dept"}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{dateStr}</p>
                      </td>

                      {/* Penalty Info Column */}
                      <td className="px-6 py-4">
                        {entry.has_penalty ? (
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">
                              ₹{parseFloat(entry.penalty_amount || 0).toLocaleString("en-IN")}
                            </p>
                            <span
                              className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                entry.penalty_status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                              }`}
                            >
                              {entry.penalty_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">No Penalty</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                            entry.status === "BLACKLISTED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : entry.status === "UNBLACKLIST_REQUESTED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : entry.status === "PENDING_BLACKLIST"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : entry.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              entry.status === "BLACKLISTED"
                                ? "bg-red-500"
                                : entry.status === "UNBLACKLIST_REQUESTED"
                                ? "bg-amber-500"
                                : entry.status === "PENDING_BLACKLIST"
                                ? "bg-blue-500"
                                : entry.status === "REJECTED"
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {entry.status === "BLACKLISTED"
                            ? "Suspended"
                            : entry.status === "UNBLACKLIST_REQUESTED"
                            ? "Appeal Pending"
                            : entry.status === "PENDING_BLACKLIST"
                            ? "Pending Review"
                            : entry.status === "REJECTED"
                            ? "Rejected"
                            : "Reinstated"}
                        </span>
                      </td>

                      {/* Actions Column */}
                      {activeTab === "active" && (
                        <td className="px-6 py-4 text-center">
                          {entry.has_penalty && entry.penalty_status === "PENDING" ? (
                            <button
                              onClick={() => openPaymentModal(entry)}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 transition-all flex items-center gap-1 mx-auto"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Penalty
                            </button>
                          ) : entry.status === "BLACKLISTED" ? (
                            <button
                              onClick={() => openUnblockModal(entry)}
                              className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-[#0a1e4d] shadow-sm transition-all flex items-center gap-1 mx-auto"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Appeal Release
                            </button>
                          ) : entry.status === "UNBLACKLIST_REQUESTED" ? (
                            <span className="text-xs text-slate-400 font-semibold italic flex items-center justify-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Appeal Pending
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold italic">No Actions</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🚀 PAYMENT DIALOG MODAL */}
      {paymentModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0a1e4d] text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Wallet className="text-orange-400 h-5 w-5" />
                Online Penalty Payment
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-white/70 hover:text-white p-1 transition-colors bg-white/10 hover:bg-red-500 rounded-lg"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entity Details</p>
                <p className="text-sm font-bold text-[#0a1e4d] uppercase">{selectedEntry.identifier}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedEntry.entity_name || "Port Pass Holder"}</p>
                <div className="border-t border-slate-200/60 mt-3 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-500">Fine/Penalty Amount:</span>
                  <span className="text-2xl font-black text-slate-800">
                    ₹{parseFloat(
                      isOverstayTarget
                        ? (selectedEntry.current_total_amount ?? selectedEntry.total_amount)
                        : selectedEntry.penalty_amount
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("wallet")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                      paymentMethod === "wallet"
                        ? "border-[#0a1e4d] bg-blue-50/20 text-[#0a1e4d] font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Wallet className="h-6 w-6" />
                    <span className="text-xs">Port Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("gateway")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                      paymentMethod === "gateway"
                        ? "border-[#0a1e4d] bg-blue-50/20 text-[#0a1e4d] font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="text-xs">Payment Gateway</span>
                  </button>
                </div>
              </div>

              {/* Payment Gateway Card Simulator */}
              {paymentMethod === "gateway" && (
                <div className="space-y-2.5 border border-slate-200 bg-gradient-to-b from-slate-50 to-white rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-sm" />
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Secure Card Payment Simulator</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1e4d]/20 focus:border-[#0a1e4d] outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Card Number (e.g. 4111 1111 1111 1111)"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(
                        e.target.value
                          .replace(/\D/g, "")
                          .replace(/(\d{4})/g, "$1 ")
                          .trim()
                          .substring(0, 19)
                      )
                    }
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono tracking-wider focus:ring-2 focus:ring-[#0a1e4d]/20 focus:border-[#0a1e4d] outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1e4d]/20 focus:border-[#0a1e4d] outline-none transition-all"
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.substring(0, 3))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1e4d]/20 focus:border-[#0a1e4d] outline-none transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Payment Remarks (optional)"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1e4d]/20 focus:border-[#0a1e4d] outline-none transition-all"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold text-slate-400">256-bit SSL encryption · All data simulated · No real transaction</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2.5 bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold rounded-xl transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paymentProcessing}
                onClick={handleProcessPayment}
                className={`px-5 py-2.5 font-bold rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-md text-white ${
                  paymentMethod === "gateway"
                    ? "bg-gradient-to-r from-slate-900 to-[#0a1e4d] hover:from-slate-800 hover:to-[#0a1e4d]/90 shadow-slate-900/10"
                    : "bg-[#0a1e4d] hover:bg-[#0a1e4d]/90 shadow-blue-900/10"
                }`}
              >
              {paymentMethod === "gateway" ? (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  Authorize ₹{parseFloat(
                    isOverstayTarget
                      ? (selectedEntry.current_total_amount ?? selectedEntry.total_amount)
                      : selectedEntry.penalty_amount
                  ).toLocaleString("en-IN")}
                </>
              ) : (
                <>
                  <Wallet className="h-3.5 w-3.5" />
                  Pay ₹{parseFloat(
                    isOverstayTarget
                      ? (selectedEntry.current_total_amount ?? selectedEntry.total_amount)
                      : selectedEntry.penalty_amount
                  ).toLocaleString("en-IN")}
                </>
              )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 UNBLOCK APPEAL DIALOG MODAL */}
      {unblockModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#0a1e4d] text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck className="text-emerald-400 h-5 w-5" />
                Request Overstay Charge Exception
              </h3>
              <button
                onClick={() => setUnblockModalOpen(false)}
                className="text-white/70 hover:text-white p-1 transition-colors bg-white/10 hover:bg-red-500 rounded-lg"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Use this form to request an exception for the overstay charge. Your request will be forwarded to the Traffic Department for review and approval. If approved, the overstay charge may be waived in accordance with APACS procedures.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Reason for Exception Request
                </label>
                <textarea
                  rows={4}
                  value={unblockRemarks}
                  onChange={(e) => setUnblockRemarks(e.target.value)}
                  placeholder="Enter the reason for requesting an exception to the overstay charge. Include any supporting information or circumstances that should be considered during review."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setUnblockModalOpen(false)}
                className="px-4 py-2.5 bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold rounded-xl transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unblockSubmitting}
                onClick={handleRequestUnblock}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                {unblockSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Appeal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
